export function movingAverage(series: number[], horizon: number): number[] {
  if (horizon <= 0) return [];
  if (series.length === 0) {
    return Array.from({ length: horizon }, () => 0);
  }
  const window = series.slice(-3);
  const mean = window.reduce((acc, v) => acc + v, 0) / window.length;
  return Array.from({ length: horizon }, () => mean);
}

export function linearTrend(series: number[], horizon: number): number[] {
  if (horizon <= 0) return [];
  const n = series.length;
  if (n === 0) {
    return Array.from({ length: horizon }, () => 0);
  }
  if (n === 1) {
    const val = Math.max(0, series[0]);
    return Array.from({ length: horizon }, () => val);
  }

  const meanX = (n - 1) / 2;
  const meanY = series.reduce((acc, v) => acc + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = i - meanX;
    numerator += dx * (series[i] - meanY);
    denominator += dx * dx;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  return Array.from({ length: horizon }, (_, idx) => {
    const predicted = intercept + slope * (n + idx);
    return Math.max(0, predicted);
  });
}

export function mae(predicted: number[], actual: number[]): number {
  if (predicted.length === 0 || predicted.length !== actual.length) {
    throw new Error("predicted and actual must have the same non-zero length");
  }
  let sum = 0;
  for (let i = 0; i < predicted.length; i += 1) {
    sum += Math.abs(predicted[i] - actual[i]);
  }
  return sum / predicted.length;
}

export function rmse(predicted: number[], actual: number[]): number {
  if (predicted.length === 0 || predicted.length !== actual.length) {
    throw new Error("predicted and actual must have the same non-zero length");
  }
  let sumSq = 0;
  for (let i = 0; i < predicted.length; i += 1) {
    const diff = predicted[i] - actual[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / predicted.length);
}
