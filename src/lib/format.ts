export function roundMm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits).replace(".", ",");
}

export function formatMeters(value: number, digits = 2): string {
  return `${formatNumber(value, digits)} m`;
}

export function formatArea(value: number): string {
  return `${formatNumber(value, 2)} m²`;
}

export function formatMetersAndCentimeters(value: number): string {
  return `${formatMeters(value)} · ${Math.round(value * 100)} cm`;
}

export function parseMeters(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(/m²|m2|m/gi, "").replace(",", ".");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
