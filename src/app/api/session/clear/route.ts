import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await db.generatedPlanItem.deleteMany();
    await db.generatedPlan.deleteMany();
    await db.academicEvent.deleteMany();
    await db.classSession.deleteMany();
    await db.course.deleteMany();
    await db.studentProfile.deleteMany();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'No se pudo limpiar la sesión.' },
      { status: 500 }
    );
  }
}
