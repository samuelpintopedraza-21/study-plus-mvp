import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSchemaErrorMessage, isMissingTableError } from '@/lib/app-data';

export async function GET() {
  try {
    const sessions = await db.classSession.findMany({ include: { course: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] });
    return NextResponse.json(sessions);
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json([]);
    return NextResponse.json({ error: 'No se pudo cargar el horario de clases.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId = String(body.courseId || '').trim();
    const weekday = Number(body.weekday);
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const location = String(body.location || '').trim() || 'Uniandes';

    if (!courseId || !Number.isInteger(weekday) || weekday < 1 || weekday > 5 || !startTime || !endTime) {
      return NextResponse.json({ error: 'Completa materia, día hábil, hora de inicio y hora final.' }, { status: 400 });
    }

    const session = await db.classSession.create({ data: { courseId, weekday, startTime, endTime, location }, include: { course: true } });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    return NextResponse.json({ error: 'No se pudo guardar la clase.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id.' }, { status: 400 });
    await db.classSession.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    return NextResponse.json({ error: 'No se pudo eliminar la clase.' }, { status: 500 });
  }
}
