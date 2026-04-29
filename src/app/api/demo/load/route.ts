import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geocodeBogotaAddress } from '@/lib/geo';
import { addDaysBogota, startOfBogotaToday } from '@/lib/utils';

export async function POST() {
  await db.generatedPlanItem.deleteMany();
  await db.generatedPlan.deleteMany();
  await db.academicEvent.deleteMany();
  await db.classSession.deleteMany();
  await db.course.deleteMany();
  await db.studentProfile.deleteMany();

  const systems = await db.course.create({ data: { name: 'Introducción a Ingeniería de Sistemas', code: 'ISIS-1001', difficulty: 3, weeklyHours: 3, credits: 3 } });
  const ip = await db.course.create({ data: { name: 'IP', code: 'ISIS-1221', difficulty: 4, weeklyHours: 4, credits: 3 } });
  const pre = await db.course.create({ data: { name: 'Precálculo', code: 'MATE-1201', difficulty: 4, weeklyHours: 4, credits: 3 } });

  await db.classSession.createMany({ data: [
    { courseId: systems.id, weekday: 1, startTime: '08:00', endTime: '09:20', location: 'Uniandes' },
    { courseId: ip.id, weekday: 2, startTime: '10:00', endTime: '11:20', location: 'ML-617' },
    { courseId: pre.id, weekday: 3, startTime: '14:00', endTime: '15:20', location: 'SD-803' },
    { courseId: ip.id, weekday: 4, startTime: '10:00', endTime: '11:20', location: 'ML-617' },
  ]});

  const today = startOfBogotaToday();
  const in2 = addDaysBogota(today, 2);
  const in3 = addDaysBogota(today, 3);
  const in5 = addDaysBogota(today, 5);

  await db.academicEvent.createMany({ data: [
    { title: 'Entrega MVP', type: 'Entrega', estimatedHours: 5, dueDate: in5, courseId: systems.id },
    { title: 'Parcial IP', type: 'Examen', estimatedHours: 3, dueDate: in2, courseId: ip.id },
    { title: 'Parcial Precálculo', type: 'Examen', estimatedHours: 5, dueDate: in3, courseId: pre.id },
  ]});

  const geo = await geocodeBogotaAddress('Carrera 15 #100-20, Bogotá');
  await db.studentProfile.create({
    data: {
      homeAddress: geo.address,
      homeLatitude: geo.latitude,
      homeLongitude: geo.longitude,
      transportMode: 'publico',
    },
  });

  return NextResponse.json({ ok: true });
}
