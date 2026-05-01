/**
 * Dollar formatting via `toLocaleString('en-US')`:
 * — Whole dollars by default (no cents).
 * — `formatUsdPrecise` uses exactly 2 decimals (tax / precise figures).
 */

export function formatUsd(n) {
  const rounded = Math.round(Number(n) || 0);
  return rounded.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Currency with exactly two decimal places (taxes, precise calculations). */
export function formatUsdPrecise(n) {
  const num = Number(n);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Grouped digits only (no $), whole dollars — for inputs / placeholders. */
export function formatUsdAmountDigits(n) {
  return Math.round(Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
