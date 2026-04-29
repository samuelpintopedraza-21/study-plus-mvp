import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSchemaErrorMessage, isMissingTableError } from '@/lib/app-data';

export async function GET() {
  try {
    const events = await db.academicEvent.findMany({ include: { course: true }, orderBy: { dueDate: 'asc' } });
    return NextResponse.json(events);
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json([]);
    return NextResponse.json({ error: 'No se pudieron cargar los eventos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || '').trim();
    const type = String(body.type || 'Entrega');
    const estimatedHours = Number(body.estimatedHours || 2);
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const courseId = body.courseId ? String(body.courseId) : null;

    if (!title || !dueDate || Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Completa título y fecha del evento.' }, { status: 400 });
    }

    const event = await db.academicEvent.create({
      data: { title, type, estimatedHours, dueDate, courseId },
      include: { course: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    return NextResponse.json({ error: 'No se pudo guardar el evento.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id.' }, { status: 400 });
    await db.academicEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    return NextResponse.json({ error: 'No se pudo eliminar el evento.' }, { status: 500 });
  }
}
