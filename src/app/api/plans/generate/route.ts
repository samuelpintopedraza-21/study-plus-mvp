import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildExpertPlan } from '@/lib/planner-engine';
import { getSchemaErrorMessage, isMissingTableError } from '@/lib/app-data';
import { bogotaTodayKey, formatPlanDate, startOfBogotaToday } from '@/lib/utils';

export async function POST() {
  try {
    const [profile, courses, events, classSessions] = await Promise.all([
      db.studentProfile.findFirst({ orderBy: { updatedAt: 'desc' } }),
      db.course.findMany({ orderBy: { createdAt: 'asc' } }),
      db.academicEvent.findMany({ include: { course: true }, orderBy: { dueDate: 'asc' } }),
      db.classSession.findMany({ include: { course: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Primero registra una dirección y el modo de transporte en Onboarding.' }, { status: 400 });
    }

    if (!courses.length || !events.length) {
      return NextResponse.json({ error: 'Debes registrar al menos una materia y un evento académico.' }, { status: 400 });
    }

    const detectedToday = startOfBogotaToday();
    const insights = await buildExpertPlan(profile, events, classSessions);

    await db.generatedPlanItem.deleteMany();
    await db.generatedPlan.deleteMany();

    const plan = await db.generatedPlan.create({
      data: {
        rationale: insights.rationale,
        routeMode: profile.transportMode,
        addressLabel: profile.homeAddress,
        distanceKm: insights.commute.distanceKm,
        commuteMinutes: insights.commute.minutes,
        weatherSummary: insights.weatherSummary,
        items: {
          create: insights.blocks.map((block, index) => ({
            title: block.title,
            day: block.day,
            dateIso: block.dateIso,
            hours: block.hours,
            order: index + 1,
            type: block.type,
            courseName: block.courseName,
            placeRecommendation: block.placeRecommendation,
            commuteMinutes: block.commuteMinutes,
            weatherLabel: block.weatherLabel,
            priorityScore: block.priorityScore,
            plannedTimeLabel: block.plannedTimeLabel,
            classContext: block.classContext,
            note: block.note,
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({
      ok: true,
      plan,
      mobility: insights.commute,
      weather: insights.weather,
      expertAdvice: insights.expertAdvice,
      weatherSummary: insights.weatherSummary,
      calendarToday: {
        key: bogotaTodayKey(),
        label: formatPlanDate(detectedToday),
        timezone: 'America/Bogota',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/plans/generate error:', error);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo generar el plan semanal.' }, { status: 500 });
  }
}
