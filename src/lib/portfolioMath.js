/** Summarize mock portfolio for Marcus-style dashboard visuals. */
export function summarizePortfolio(portfolio) {
  if (!portfolio) {
    return { total: 0, segments: [] };
  }
  let stocksVal = 0;
  for (const s of portfolio.stocks ?? []) {
    stocksVal += (s.shares ?? 0) * (s.currentPrice ?? 0);
  }
  let equityFunds = 0;
  let bondFunds = 0;
  for (const f of portfolio.mutualFunds ?? []) {
    const v = f.currentValue ?? 0;
    if (String(f.category ?? "").toLowerCase().includes("bond")) {
      bondFunds += v;
    } else {
      equityFunds += v;
    }
  }
  const total = stocksVal + equityFunds + bondFunds;
  const segments = [
    { key: "stocks", label: "Stocks", value: stocksVal, color: "#6DB6FF" },
    {
      key: "equityFunds",
      label: "Equity funds",
      value: equityFunds,
      color: "#00C48C",
    },
    { key: "bonds", label: "Bonds", value: bondFunds, color: "#8EB8FF" },
  ].filter((s) => s.value > 0);

  return { total, segments };
}

export function formatUsd(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
