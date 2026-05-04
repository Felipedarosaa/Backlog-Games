export function minutesToHours(minutes: number) {
  return minutes / 60;
}

export function formatHours(totalMinutes: number) {
  const hours = minutesToHours(totalMinutes);
  if (hours < 1) return `${Math.round(totalMinutes)} min`;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
}

export function formatDuration(totalMinutes: number) {
  const raw = Math.round(totalMinutes);
  const sign = raw < 0 ? '-' : '';
  const minutes = Math.abs(raw);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${sign}${m} min`;
  if (m === 0) return `${sign}${h} h`;
  return `${sign}${h} h ${m} min`;
}

export function formatBoth(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  return `${formatDuration(minutes)} (${minutes} min)`;
}

export function nowISO() {
  return new Date().toISOString();
}
