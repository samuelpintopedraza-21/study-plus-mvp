import { db } from '@/lib/db';

function isPrismaMissingTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | undefined)?.code;
  return code === 'P2021' || /does not exist in the current database/i.test(message) || /table .* does not exist/i.test(message);
}

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (isPrismaMissingTable(error)) {
      console.warn('[Study+] Base sin inicializar o incompleta. Se usa fallback seguro de lectura.');
      return fallback;
    }
    throw error;
  }
}

export async function getHomeSnapshot() {
  const [courseCount, eventCount, classCount, latestPlan, profile] = await Promise.all([
    safeQuery(() => db.course.count(), 0),
    safeQuery(() => db.academicEvent.count(), 0),
    safeQuery(() => db.classSession.count(), 0),
    safeQuery(() => db.generatedPlan.findFirst({ include: { items: true }, orderBy: { createdAt: 'desc' } }), null),
    safeQuery(() => db.studentProfile.findFirst({ orderBy: { updatedAt: 'desc' } }), null),
  ]);

  return { courseCount, eventCount, classCount, latestPlan, profile };
}

export async function getDashboardSnapshot() {
  const [courses, events, classSessions, latestPlan, profile] = await Promise.all([
    safeQuery(() => db.course.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }), []),
    safeQuery(() => db.academicEvent.findMany({ include: { course: true }, orderBy: { dueDate: 'asc' }, take: 6 }), []),
    safeQuery(() => db.classSession.findMany({ include: { course: true }, orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], take: 8 }), []),
    safeQuery(() => db.generatedPlan.findFirst({ include: { items: { orderBy: { order: 'asc' } } }, orderBy: { createdAt: 'desc' } }), null),
    safeQuery(() => db.studentProfile.findFirst({ orderBy: { updatedAt: 'desc' } }), null),
  ]);

  return { courses, events, classSessions, latestPlan, profile };
}

export async function getPlannerSnapshot() {
  const [latestPlan, profile] = await Promise.all([
    safeQuery(() => db.generatedPlan.findFirst({ include: { items: { orderBy: { order: 'asc' } } }, orderBy: { createdAt: 'desc' } }), null),
    safeQuery(() => db.studentProfile.findFirst({ orderBy: { updatedAt: 'desc' } }), null),
  ]);

  return { latestPlan, profile };
}

export function getSchemaErrorMessage() {
  return 'La base aún no está lista. Ejecuta: npx.cmd prisma db push --force-reset y luego npm.cmd run dev';
}

export function isMissingTableError(error: unknown) {
  return isPrismaMissingTable(error);
}
