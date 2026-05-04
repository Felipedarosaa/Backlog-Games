export function validateNonEmpty(value: string) {
  const v = value.trim();
  if (!v) return { ok: false as const, message: 'Campo obrigatório.' };
  return { ok: true as const, value: v };
}

export function validateMinutes(value: string) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { ok: false as const, message: 'Informe um valor maior que zero.' };
  }
  if (minutes > 60 * 24) {
    return { ok: false as const, message: 'Valor muito alto. Verifique os minutos.' };
  }
  return { ok: true as const, value: Math.round(minutes) };
}

export function clampRating(value: number | undefined) {
  if (value == null) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.min(10, Math.max(0, Math.round(value)));
}

export function validateTargetHours(value: string) {
  if (!value.trim()) return { ok: true as const, value: undefined as number | undefined };
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) {
    return { ok: false as const, message: 'Informe horas maiores que zero.' };
  }
  if (hours > 10000) {
    return { ok: false as const, message: 'Valor muito alto. Verifique a meta.' };
  }
  return { ok: true as const, value: Math.round(hours * 10) / 10 };
}
