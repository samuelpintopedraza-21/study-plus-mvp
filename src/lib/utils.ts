export const BOGOTA_TIME_ZONE = 'America/Bogota';

function bogotaParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
  };
}

export function bogotaDateKey(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date);
  const { year, month, day } = bogotaParts(d);
  return `${year}-${month}-${day}`;
}

export function bogotaTodayKey() {
  return bogotaDateKey(new Date());
}

export function dateFromBogotaKey(key: string) {
  // Medio día de Bogotá evita corrimientos de fecha al guardar en SQLite/UTC.
  return new Date(`${key}T12:00:00-05:00`);
}

export function startOfBogotaToday() {
  return dateFromBogotaKey(bogotaTodayKey());
}

export function addDays(date: Date, days: number) {
  const base = new Date(date);
  base.setUTCDate(base.getUTCDate() + days);
  return base;
}

export function addDaysBogota(date: Date, days: number) {
  const key = bogotaDateKey(date);
  const noon = dateFromBogotaKey(key);
  noon.setUTCDate(noon.getUTCDate() + days);
  return dateFromBogotaKey(bogotaDateKey(noon));
}

export function isWeekendBogota(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIME_ZONE,
    weekday: 'short',
  }).format(d);
  return weekday === 'Sat' || weekday === 'Sun';
}

export function weekdayIndexBogota(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TIME_ZONE,
    weekday: 'short',
  }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? d.getDay();
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('es-CO', {
    timeZone: BOGOTA_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPlanDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-CO', {
    timeZone: BOGOTA_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function weekdayEs(date: string | Date) {
  return new Date(date).toLocaleDateString('es-CO', { timeZone: BOGOTA_TIME_ZONE, weekday: 'long' });
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function startOfDay(date: Date) {
  return dateFromBogotaKey(bogotaDateKey(date));
}

export function differenceInHours(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / 36e5;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
