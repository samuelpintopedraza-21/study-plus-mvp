import { AcademicEvent, ClassSession, Course, StudentProfile } from '@prisma/client';
import { CommuteEstimate, DailyWeather, estimateCommute, getDailyWeather } from '@/lib/geo';
import {
  addDaysBogota,
  bogotaDateKey,
  differenceInHours,
  formatPlanDate,
  isWeekendBogota,
  startOfBogotaToday,
  titleCase,
  weekdayEs,
  weekdayIndexBogota,
} from '@/lib/utils';

export type EventWithCourse = AcademicEvent & { course: Course | null };
export type SessionWithCourse = ClassSession & { course: Course };

export type GeneratedBlock = {
  title: string;
  day: string;
  dateIso: Date;
  hours: number;
  type: string;
  courseName: string;
  placeRecommendation: string;
  commuteMinutes: number;
  weatherLabel: string;
  priorityScore: number;
  plannedTimeLabel: string;
  classContext: string;
  note: string;
};

export type PlannerInsights = {
  commute: CommuteEstimate;
  weather: DailyWeather[];
  weatherSummary: string;
  rationale: string;
  expertAdvice: string;
  blocks: GeneratedBlock[];
};

function dateKey(date: Date) {
  return bogotaDateKey(date);
}

function weatherForDate(weather: DailyWeather[], date: Date) {
  return weather.find((item) => item.date === dateKey(date)) || null;
}

function readableDate(date: Date) {
  return date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'short' });
}

function classSessionsForDate(date: Date, sessions: SessionWithCourse[]) {
  if (isWeekendBogota(date)) return [];
  const weekday = weekdayIndexBogota(date);
  return sessions
    .filter((session) => session.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function classContextForDate(date: Date, sessions: SessionWithCourse[]) {
  const daySessions = classSessionsForDate(date, sessions);
  if (!daySessions.length) {
    return isWeekendBogota(date)
      ? 'No hay clases registradas en fin de semana.'
      : 'No hay clases registradas este día.';
  }

  return daySessions
    .map((session) => `${session.course.code || session.course.name} ${session.startTime}-${session.endTime}${session.location ? ` (${session.location})` : ''}`)
    .join(' · ');
}

function parseHour(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}

function classHoursForDate(date: Date, sessions: SessionWithCourse[]) {
  return classSessionsForDate(date, sessions).reduce((sum, session) => {
    return sum + Math.max(0, parseHour(session.endTime) - parseHour(session.startTime));
  }, 0);
}

function scoreEvent(event: EventWithCourse, profile: StudentProfile, commute: CommuteEstimate, weather: DailyWeather[]) {
  const now = new Date();
  const hoursToDue = Math.max(differenceInHours(new Date(event.dueDate), now), 1);
  const dueWeather = weatherForDate(weather, new Date(event.dueDate));
  const difficulty = event.course?.difficulty ?? 3;
  const hours = event.estimatedHours ?? 2;
  const urgency = 120 / Math.min(hoursToDue, 120);
  const commutePenalty = commute.minutes > 60 ? 2.2 : commute.minutes > 40 ? 1.3 : 0.5;
  const rainPenalty = dueWeather?.severity === 'alta' ? 2.3 : dueWeather?.severity === 'media' ? 1.1 : 0.3;
  const transitPenalty = profile.transportMode === 'publico' ? 1.2 : 0.4;
  const creditsBoost = (event.course?.credits ?? 3) * 0.45;

  return Number((urgency * 4 + difficulty * 2.5 + hours * 1.5 + commutePenalty + rainPenalty + transitPenalty + creditsBoost).toFixed(2));
}

function weatherText(weatherItem: DailyWeather | null) {
  if (!weatherItem) return 'Clima sin impacto relevante';
  return `${titleCase(weatherItem.label)} · ${weatherItem.precipitationProbabilityMax}% lluvia · ${weatherItem.temperatureMin}°-${weatherItem.temperatureMax}°`;
}

function recommendPlace(blockDate: Date, eventDueDate: Date, commute: CommuteEstimate, weather: DailyWeather[], profile: StudentProfile, sessions: SessionWithCourse[]) {
  const blockWeather = weatherForDate(weather, blockDate);
  const weekend = isWeekendBogota(blockDate);
  const hasClasses = classSessionsForDate(blockDate, sessions).length > 0;
  const isSoon = differenceInHours(eventDueDate, new Date()) < 36;
  const roughCommute = commute.minutes >= 55;
  const badWeather = blockWeather?.severity === 'alta';

  if (weekend) {
    return 'Casa. Fin de semana: no se programa ida a Uniandes porque normalmente no hay clases.';
  }

  if (!hasClasses) {
    return 'Casa. No tienes clases registradas este día, así que no conviene crear un desplazamiento extra a Uniandes.';
  }

  if (badWeather || (roughCommute && isSoon)) {
    return profile.transportMode === 'publico'
      ? 'Campus. Ya tienes clases este día; conviene aprovechar biblioteca/laboratorio antes de volver en transporte público.'
      : 'Campus. Ya tienes clases este día; resuelve el bloque antes de volver y evita partir la jornada con otro trayecto.';
  }

  if (profile.transportMode === 'publico' && commute.minutes > 70) {
    return 'Campus. El trayecto en transporte público consume mucho tiempo; aprovecha huecos entre clases.';
  }

  return 'Campus o casa. Si ya terminaste clases, puedes volver; si tienes hueco, adelanta el bloque en biblioteca.';
}

function plannedTimeLabel(date: Date, sessions: SessionWithCourse[]) {
  const daySessions = classSessionsForDate(date, sessions);
  if (isWeekendBogota(date)) return 'Franja sugerida: mañana o tarde en casa';
  if (!daySessions.length) return 'Franja sugerida: bloque flexible en casa';

  const earliest = daySessions[0];
  const latest = daySessions[daySessions.length - 1];
  if (parseHour(earliest.startTime) >= 10) return `Franja sugerida: antes de clase, antes de ${earliest.startTime}`;
  return `Franja sugerida: después de clases, desde ${latest.endTime}`;
}

function buildNote(blockDate: Date, commute: CommuteEstimate, weather: DailyWeather[], profile: StudentProfile, sessions: SessionWithCourse[]) {
  const blockWeather = weatherForDate(weather, blockDate);
  const weatherPart = weatherText(blockWeather);
  const daySessions = classSessionsForDate(blockDate, sessions);

  if (isWeekendBogota(blockDate)) {
    return `Fin de semana: no se asume ida a Uniandes. Plan sugerido desde casa. ${weatherPart}.`;
  }

  if (!daySessions.length) {
    return `No hay clases registradas este día: evita desplazarte solo por estudiar. ${weatherPart}.`;
  }

  const commutePart = `${commute.minutes} min ${profile.transportMode === 'carro' ? 'en carro' : 'en transporte público estimado'} desde Uniandes.`;
  return `${commutePart} ${weatherPart}. Clases del día: ${classContextForDate(blockDate, sessions)}.`;
}

function splitHours(totalHours: number) {
  const chunks: number[] = [];
  let remaining = Math.max(totalHours, 1);
  while (remaining > 0) {
    const block = remaining >= 4 ? 2 : remaining >= 3 ? 2 : remaining;
    chunks.push(block);
    remaining -= block;
  }
  return chunks;
}

function planningWindowForEvent(dueDate: Date) {
  const today = startOfBogotaToday();
  const dueDay = new Date(`${dateKey(dueDate)}T12:00:00-05:00`);
  const maxEnd = addDaysBogota(today, 6);
  const end = dueDay.getTime() < today.getTime() ? today : dueDay.getTime() > maxEnd.getTime() ? maxEnd : dueDay;
  const dates: Date[] = [];
  let cursor = today;
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor);
    cursor = addDaysBogota(cursor, 1);
  }
  return dates.length ? dates : [today];
}

function dayCapacity(date: Date, sessions: SessionWithCourse[]) {
  if (isWeekendBogota(date)) return 5;
  const classHours = classHoursForDate(date, sessions);
  if (classHours >= 5) return 2;
  if (classHours >= 3) return 3;
  return 4;
}

function pickBestDate(candidates: Date[], dailyLoad: Map<string, number>, eventRank: number, chunkIndex: number, sessions: SessionWithCourse[]) {
  const todayKey = dateKey(startOfBogotaToday());
  const ranked = candidates
    .map((date, index) => {
      const key = dateKey(date);
      const load = dailyLoad.get(key) ?? 0;
      const hasClasses = classSessionsForDate(date, sessions).length > 0;
      const capacityPenalty = load >= dayCapacity(date, sessions) ? 100 : 0;
      const todayBonus = key === todayKey && eventRank <= 2 ? -2.0 : 0;
      const avoidLatePenalty = index * 0.4;
      const balancePenalty = load * 0.95;
      const classDayBonus = hasClasses && !isWeekendBogota(date) ? -0.35 : 0;
      const chunkSpreadPenalty = chunkIndex > 0 && key === todayKey ? 0.75 : 0;
      return { date, score: capacityPenalty + avoidLatePenalty + balancePenalty + chunkSpreadPenalty + todayBonus + classDayBonus };
    })
    .sort((a, b) => a.score - b.score || a.date.getTime() - b.date.getTime());

  return ranked[0]?.date || candidates[0] || startOfBogotaToday();
}

export async function buildExpertPlan(profile: StudentProfile, events: EventWithCourse[], sessions: SessionWithCourse[] = []): Promise<PlannerInsights> {
  const [commute, weather] = await Promise.all([
    estimateCommute(profile.homeLatitude, profile.homeLongitude, profile.transportMode as 'carro' | 'publico'),
    getDailyWeather(profile.homeLatitude, profile.homeLongitude),
  ]);

  const today = startOfBogotaToday();
  const weekendToday = isWeekendBogota(today);

  const ranked = events
    .map((event) => ({
      event,
      priorityScore: scoreEvent(event, profile, commute, weather),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || new Date(a.event.dueDate).getTime() - new Date(b.event.dueDate).getTime());

  const blocks: GeneratedBlock[] = [];
  const dailyLoad = new Map<string, number>();

  ranked.forEach(({ event, priorityScore }, rankedIndex) => {
    const chunks = splitHours(event.estimatedHours ?? 2);
    const candidates = planningWindowForEvent(new Date(event.dueDate));

    chunks.forEach((hours, chunkIndex) => {
      const blockDate = pickBestDate(candidates, dailyLoad, rankedIndex, chunkIndex, sessions);
      const key = dateKey(blockDate);
      dailyLoad.set(key, (dailyLoad.get(key) ?? 0) + hours);

      const weatherItem = weatherForDate(weather, blockDate);
      const hasClasses = classSessionsForDate(blockDate, sessions).length > 0;
      const weekend = isWeekendBogota(blockDate);
      const commuteMinutes = weekend || !hasClasses ? 0 : commute.minutes;
      const placeRecommendation = recommendPlace(blockDate, new Date(event.dueDate), commute, weather, profile, sessions);
      const note = buildNote(blockDate, commute, weather, profile, sessions);
      const classContext = classContextForDate(blockDate, sessions);

      blocks.push({
        title: chunks.length > 1 ? `${event.title} · bloque ${chunkIndex + 1}` : event.title,
        day: weekdayEs(blockDate),
        dateIso: blockDate,
        hours,
        type: event.type,
        courseName: event.course?.name ?? 'Sin materia',
        placeRecommendation,
        commuteMinutes,
        weatherLabel: weatherText(weatherItem),
        priorityScore: Number((priorityScore - chunkIndex * 0.15 - rankedIndex * 0.08).toFixed(2)),
        plannedTimeLabel: plannedTimeLabel(blockDate, sessions),
        classContext,
        note,
      });
    });
  });

  blocks.sort((a, b) => a.dateIso.getTime() - b.dateIso.getTime() || b.priorityScore - a.priorityScore);

  const highest = ranked[0];
  const roughWeather = weather.filter((item) => item.severity !== 'baja');
  const weatherSummary = roughWeather.length
    ? `Hay días con lluvia o clima variable: ${roughWeather.map((item) => `${formatPlanDate(item.date)} ${item.label} ${item.precipitationProbabilityMax}%`).join(' · ')}.`
    : 'Clima estable en la ventana de planificación; no se detecta penalización fuerte por lluvia.';

  const registeredClassDays = Array.from(new Set(sessions.map((session) => session.weekday))).length;
  const weekendNote = weekendToday
    ? `Hoy es ${readableDate(today)} en Bogotá. El plan empieza hoy y, al ser fin de semana, los primeros bloques se sugieren desde casa.`
    : `Hoy es ${readableDate(today)} en Bogotá. El plan empieza hoy y respeta tu horario semanal de clases.`;

  const rationale = [
    `El calendario se calcula con zona horaria de Bogotá; por eso el plan parte desde ${readableDate(today)} y no desde la fecha UTC del servidor.`,
    `El motor reparte bloques entre hoy y los próximos días antes de cada fecha límite.`,
    registeredClassDays
      ? `Se detectaron clases en ${registeredClassDays} día(s) hábil(es); esos días puede convenir usar campus entre clases.`
      : 'No registraste clases todavía; el motor evita inventar desplazamientos innecesarios a Uniandes.',
    weekendNote,
    `Trayecto base entre semana: ${commute.summary}`,
    weatherSummary,
    highest
      ? `Mayor riesgo detectado: ${highest.event.title} (${highest.event.course?.name ?? 'Sin materia'}) por cercanía de fecha, dificultad y esfuerzo.`
      : 'Aún no hay eventos suficientes para priorizar.',
  ].join(' ');

  const expertAdvice = [
    highest ? `Empieza hoy con ${highest.event.title}; no esperes al día límite para abrir el primer bloque.` : 'Carga eventos para activar recomendaciones personalizadas.',
    weekendToday
      ? 'Como hoy es domingo, usa bloques desde casa y no asumas desplazamiento a Uniandes.'
      : sessions.length
        ? 'En días con clases, aprovecha huecos en campus; en días sin clases, prioriza casa para evitar trayectos innecesarios.'
        : 'Registra tu horario de clases para que el sistema sepa cuándo realmente estás en campus.',
    roughWeather.length
      ? 'Si hay lluvia fuerte en un día con clases, intenta estudiar antes de salir de campus o mover bloques livianos a casa.'
      : 'Con clima estable, los bloques pueden moverse con menor riesgo según disponibilidad.',
  ].join(' ');

  return {
    commute,
    weather,
    weatherSummary,
    rationale,
    expertAdvice,
    blocks,
  };
}
