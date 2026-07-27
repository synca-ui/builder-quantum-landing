/**
 * Kleine, reine Rechenhelfer für die Analytics-Schicht.
 * Absichtlich abhängigkeitsfrei - keine Statistikbibliothek nötig.
 */

export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;

/** Ganze Tage zwischen zwei ISO-Zeitpunkten (a - b), nie negativ gerundet. */
export function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.floor((Date.parse(a) - Date.parse(b)) / MS_PER_DAY));
}

/** Stunden zwischen zwei ISO-Zeitpunkten (a - b). */
export function hoursBetween(a: string, b: string): number {
  return (Date.parse(a) - Date.parse(b)) / MS_PER_HOUR;
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function round(x: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Geglättete Erfolgsquote nach Wilson (untere Schranke, z≈1).
 * Verhindert, dass "1 von 1 No-Shows = 100 % Risiko" überreagiert - kleine
 * Stichproben werden zur Mitte gezogen. Rückgabe 0-1.
 */
export function smoothedRate(successes: number, total: number): number {
  if (total <= 0) return 0;
  const z = 1;
  const phat = successes / total;
  const denom = 1 + (z * z) / total;
  const center = phat + (z * z) / (2 * total);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
  return clamp01((center - margin) / denom);
}

/**
 * Steigung und nächster Wert einer einfachen linearen Regression (Kleinste
 * Quadrate) über eine gleichmäßig verteilte Reihe. `next` ist die Extrapolation
 * auf den Folgeindex.
 */
export function linearForecast(series: number[]): { slope: number; next: number } {
  const n = series.length;
  if (n === 0) return { slope: 0, next: 0 };
  if (n === 1) return { slope: 0, next: series[0] };
  const xs = series.map((_, i) => i);
  const xbar = mean(xs);
  const ybar = mean(series);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xbar) * (series[i] - ybar);
    den += (xs[i] - xbar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = ybar - slope * xbar;
  return { slope, next: Math.max(0, Math.round(intercept + slope * n)) };
}
