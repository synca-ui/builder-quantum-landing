/**
 * Trend und Prognose für eine Kennzahl-Zeitreihe (z. B. Aufrufe über 6 Monate).
 * Lineare Regression liefert die Fortschreibung, plus zwei lesbare Kennzahlen:
 * Veränderung zur Vorperiode und durchschnittliches Wachstum je Periode.
 */

import { linearForecast, round } from "./math";
import type { ForecastResult } from "./types";

export function forecastSeries(series: number[]): ForecastResult {
  if (series.length < 2) {
    return { next: series[0] ?? 0, periodChangePercent: 0, averageGrowthPercent: 0, trend: "flat" };
  }

  const { slope, next } = linearForecast(series);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const first = series[0];

  const periodChangePercent = prev === 0 ? 0 : round(((last - prev) / prev) * 100);

  // Durchschnittliches geometrisches Wachstum je Periode über die ganze Reihe.
  const periods = series.length - 1;
  const averageGrowthPercent =
    first <= 0 ? 0 : round(((last / first) ** (1 / periods) - 1) * 100);

  const trend: ForecastResult["trend"] = slope > 0.5 ? "up" : slope < -0.5 ? "down" : "flat";

  return { next, periodChangePercent, averageGrowthPercent, trend };
}
