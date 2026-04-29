import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSchemaErrorMessage, isMissingTableError } from '@/lib/app-data';

export async function GET() {
  try {
    const courses = await db.course.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(courses);
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json([]);
    return NextResponse.json({ error: 'No se pudieron cargar las materias.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim();
    const difficulty = Number(body.difficulty);
    const weeklyHours = Number(body.weeklyHours);
    const credits = Number(body.credits);

    if (!name || !code || !difficulty || !weeklyHours || !credits) {
      return NextResponse.json({ error: 'Completa todos los campos de la materia.' }, { status: 400 });
    }

    const course = await db.course.create({ data: { name, code, difficulty, weeklyHours, credits } });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    return NextResponse.json({ error: 'No se pudo guardar la materia.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id.' }, { status: 400 });
    await db.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: getSchemaErrorMessage() }, { status: 500 });
    return NextResponse.json({ error: 'No se pudo eliminar la materia.' }, { status: 500 });
  }
}
