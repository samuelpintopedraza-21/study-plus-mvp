'use client';

import { useState } from 'react';


type PlanItem = {
  id: string;
  title: string;
  day: string;
  dateIso: string;
  hours: number;
  type: string;
  courseName: string;
  placeRecommendation: string;
  commuteMinutes?: number | null;
  weatherLabel?: string | null;
  priorityScore?: number | null;
  plannedTimeLabel?: string | null;
  classContext?: string | null;
  note?: string | null;
};

type PlanResponse = {
  ok: boolean;
  error?: string;
  plan: {
    rationale: string;
    distanceKm?: number | null;
    commuteMinutes?: number | null;
    addressLabel: string;
    routeMode: string;
    weatherSummary?: string | null;
    items: PlanItem[];
  };
  mobility: { distanceKm: number; minutes: number; summary: string; mode: 'carro' | 'publico' };
  weather: Array<{ date: string; label: string; precipitationProbabilityMax: number; temperatureMin: number; temperatureMax: number; severity: string }>;
  expertAdvice: string;
  weatherSummary: string;
  calendarToday?: { key: string; label: string; timezone: string; generatedAt: string };
};

function dateKey(date: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function parseBogotaDate(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T12:00:00-05:00`);
  }
  return new Date(date);
}

function formatGroupDate(date: string) {
  return parseBogotaDate(date).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function isWeekend(date: string) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short' }).format(parseBogotaDate(date));
  return weekday === 'Sun' || weekday === 'Sat';
}

export default function PlannerPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<PlanResponse | null>(null);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/plans/generate', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) return setError(body.error || 'No se pudo generar el plan.');
      setData(body);
    } catch {
      setError('No se pudo generar el plan. Revisa tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  }

  const items = data?.plan.items || [];
  const grouped = items.reduce((acc: Record<string, PlanItem[]>, item) => {
    const key = dateKey(item.dateIso);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const orderedDates = Object.keys(grouped).sort((a, b) => parseBogotaDate(a).getTime() - parseBogotaDate(b).getTime());
  const totalHours = items.reduce((sum, item) => sum + item.hours, 0);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="section-head split">
          <div>
            <span className="eyebrow">Motor experto semanal</span>
            <h1>Genera tu plan con clima y movilidad</h1>
            <p className="muted">Calcula bloques a partir de la fecha real en Bogotá y combina urgencia, dificultad, trayecto, clima y clases registradas.</p>
          </div>
          <div className="hero-stats-inline">
            <div className="mini-metric"><span>Bloques</span><strong>{items.length}</strong></div>
            <div className="mini-metric"><span>Horas</span><strong>{totalHours}</strong></div>
          </div>
        </div>
        <div className="hero-actions">
          <button className="button primary" onClick={generate} disabled={loading}>{loading ? 'Calculando plan...' : 'Generar plan semanal'}</button>
          <span className="muted">Ideal para mostrar en la demo cómo el sistema prioriza académicamente sin depender de una IA generativa.</span>
        </div>
        {data?.calendarToday && (
          <div className="success" style={{ marginTop: 16 }}>
            Fecha detectada para este cálculo: <strong>{data.calendarToday.label}</strong> · zona horaria: {data.calendarToday.timezone}.
          </div>
        )}
        {!!error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      </section>

      <section className="grid-main planner-top-grid">
        <div className="card">
          <div className="section-head split">
            <h2>Rationale del sistema</h2>
            <span className="badge">Explicable</span>
          </div>
          <p className="muted prewrap">{data?.plan.rationale || 'Aún no has generado un plan.'}</p>
        </div>

        <div className="card">
          <div className="section-head split">
            <h2>Movilidad y clima</h2>
            <span className="badge">Bogotá</span>
          </div>
          {data ? (
            <div className="stack-md">
              <div className="info-line"><strong>Ruta entre semana:</strong><span>{data.mobility.summary}</span></div>
              <div className="info-line"><strong>Dirección:</strong><span>{data.plan.addressLabel}</span></div>
              <div className="info-line"><strong>Clima:</strong><span>{data.weatherSummary}</span></div>
              <div className="weather-strip">
                {data.weather.slice(0, 4).map((item) => (
                  <div key={item.date} className="weather-chip">
                    <strong>{new Date(`${item.date}T12:00:00-05:00`).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: 'numeric' })}</strong>
                    <span>{item.label}</span>
                    <small>{item.precipitationProbabilityMax}% · {item.temperatureMin}°/{item.temperatureMax}°</small>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="empty-state">Aquí aparecerá el diagnóstico de movilidad y clima cuando generes el plan.</div>}
        </div>
      </section>

      <section className="card">
        <div className="section-head split">
          <h2>Recomendación experta</h2>
          <span className="badge">Motor local</span>
        </div>
        <p className="muted prewrap">{data?.expertAdvice || 'Genera el plan para ver una recomendación estratégica.'}</p>
      </section>

      <section className="card">
        <div className="section-head split">
          <h2>Bloques sugeridos</h2>
          <span className="badge">Plan visual</span>
        </div>

        {orderedDates.length === 0 ? (
          <div className="empty-state">Todavía no hay bloques generados.</div>
        ) : (
          <div className="planner-grid-v6">
            {orderedDates.map((date) => {
              const weekend = isWeekend(date);
              return (
                <div key={date} className="day-column">
                  <div className="day-head">
                    <span>{formatGroupDate(date)}</span>
                    {weekend && <small>Sin clases · casa</small>}
                  </div>
                  <div className="stack-sm">
                    {grouped[date].map((item) => (
                      <article key={item.id} className="plan-block">
                        <div className="plan-block-top">
                          <div>
                            <h3>{item.title}</h3>
                            <p>{item.courseName}</p>
                          </div>
                          <div className="plan-meta-right">
                            <span className="badge accent">{item.type}</span>
                            <span className="time-chip">{item.hours} h</span>
                          </div>
                        </div>
                        <div className="stack-sm" style={{ marginTop: 12 }}>
                          <div className="info-line"><strong>Fecha:</strong><span>{formatGroupDate(item.dateIso)}</span></div>
                          <div className="info-line"><strong>Franja:</strong><span>{item.plannedTimeLabel || 'Bloque flexible'}</span></div>
                          <div className="info-line"><strong>Clases:</strong><span>{item.classContext || 'No hay clases registradas'}</span></div>
                          <div className="info-line"><strong>Dónde conviene:</strong><span>{item.placeRecommendation}</span></div>
                          <div className="info-line"><strong>Clima:</strong><span>{item.weatherLabel || 'Clima sin impacto relevante'}</span></div>
                          <div className="info-line"><strong>Trayecto:</strong><span>{item.commuteMinutes ? `${item.commuteMinutes} min desde Uniandes` : 'No aplica para este bloque'}</span></div>
                          <div className="info-line"><strong>Nota:</strong><span>{item.note || 'Bloque planificado según prioridad académica.'}</span></div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
