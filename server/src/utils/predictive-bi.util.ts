/**
 * Indicateurs BI simples : tendances et projection linéaire légère.
 */

export type MonthlyPoint = { label: string; amount: number };

export function linearForecast(points: MonthlyPoint[], periodsAhead = 3): MonthlyPoint[] {
  if (points.length < 2) {
    const last = points[points.length - 1];
    return Array.from({ length: periodsAhead }, (_, i) => ({
      label: `Proj.+${i + 1}`,
      amount: last?.amount ?? 0,
    }));
  }
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  points.forEach((p, i) => {
    sumX += i;
    sumY += p.amount;
    sumXY += i * p.amount;
    sumXX += i * i;
  });
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: periodsAhead }, (_, i) => {
    const x = n + i;
    return {
      label: `Proj.+${i + 1}`,
      amount: Math.max(0, Math.round(intercept + slope * x)),
    };
  });
}

export function growthRate(points: MonthlyPoint[]): number | null {
  if (points.length < 2) return null;
  const a = points[points.length - 2]!.amount;
  const b = points[points.length - 1]!.amount;
  if (a === 0) return b === 0 ? 0 : 100;
  return Math.round(((b - a) / Math.abs(a)) * 1000) / 10;
}
