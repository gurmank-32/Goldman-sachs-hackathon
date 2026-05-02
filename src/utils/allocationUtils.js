/** @typedef {{ value: number, percentage: number, color: string, label: string }} AllocationSlice */

export const ALLOCATION_COLORS = {
  checking: "#2563EB",
  savings: "#16A34A",
  stocks: "#B8962E",
  mutualFunds: "#7C3AED",
  bonds: "#0A1628",
  cash: "#9CA3AF",
};

const LABELS = {
  checking: "Checking",
  savings: "Savings",
  stocks: "Stocks",
  mutualFunds: "Mutual funds",
  bonds: "Bonds",
  cash: "Cash",
};

const RETIREMENT_STYLE_WEIGHTS = {
  aggressive: { stocks: 0.85, bonds: 0.1, cash: 0.05 },
  moderate: { stocks: 0.6, bonds: 0.35, cash: 0.05 },
  conservative: { stocks: 0.25, bonds: 0.65, cash: 0.1 },
  unsure: { stocks: 0.5, bonds: 0.4, cash: 0.1 },
};

function accountType(a) {
  return a?.type || a?.category || "";
}

function accountBalance(a) {
  const n = Number(a?.totalBalance ?? a?.balance);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function bankSubType(a) {
  const s = String(a?.subType || a?.accountSubtype || "").toLowerCase();
  if (s === "checking") return "checking";
  if (s === "savings") return "savings";
  return null;
}

function scaleBreakdownToTotal(stocks, mutualFunds, bonds, cash, total) {
  const sum = stocks + mutualFunds + bonds + cash;
  if (total <= 0) return { stocks: 0, mutualFunds: 0, bonds: 0, cash: 0 };
  if (sum <= 0) return { stocks: 0, mutualFunds: 0, bonds: 0, cash: total };
  const k = total / sum;
  let s = stocks * k;
  let m = mutualFunds * k;
  let b = bonds * k;
  let c = cash * k;
  const drift = total - (s + m + b + c);
  c += drift;
  return {
    stocks: Math.max(0, s),
    mutualFunds: Math.max(0, m),
    bonds: Math.max(0, b),
    cash: Math.max(0, c),
  };
}

/**
 * @param {unknown[]} linkedAccounts
 * @param {unknown[]} manualHoldings
 * @returns {{
 *   checking?: AllocationSlice,
 *   savings?: AllocationSlice,
 *   stocks?: AllocationSlice,
 *   mutualFunds?: AllocationSlice,
 *   bonds?: AllocationSlice,
 *   cash?: AllocationSlice,
 *   total: number,
 * }}
 */
export function calculateAllocationBreakdown(linkedAccounts, manualHoldings) {
  let checking = 0;
  let savings = 0;
  let stocks = 0;
  let mutualFunds = 0;
  let bonds = 0;
  let cashInvested = 0;

  const list = Array.isArray(linkedAccounts) ? linkedAccounts : [];
  for (const raw of list) {
    if (raw?.connectionActive === false) continue;
    const t = accountType(raw);
    const bal = accountBalance(raw);
    if (bal <= 0) continue;

    if (t === "bank") {
      const sub = bankSubType(raw);
      if (sub === "checking") checking += bal;
      else if (sub === "savings") savings += bal;
      else {
        checking += bal * 0.5;
        savings += bal * 0.5;
      }
      continue;
    }

    if (t === "brokerage") {
      const bd = raw?.breakdown;
      let s = Math.max(0, Number(bd?.stocks) || 0);
      let m = Math.max(0, Number(bd?.mutualFunds) || 0);
      let b = Math.max(0, Number(bd?.bonds) || 0);
      let c = Math.max(0, Number(bd?.cash) || 0);
      const scaled = scaleBreakdownToTotal(s, m, b, c, bal);
      stocks += scaled.stocks;
      mutualFunds += scaled.mutualFunds;
      bonds += scaled.bonds;
      cashInvested += scaled.cash;
      continue;
    }

    if (t === "retirement") {
      const style = String(raw?.investmentStyle || "unsure").toLowerCase();
      const w =
        RETIREMENT_STYLE_WEIGHTS[style] || RETIREMENT_STYLE_WEIGHTS.unsure;
      let bd = raw?.breakdown;
      if (
        bd &&
        typeof bd === "object" &&
        (Number(bd.stocks) > 0 ||
          Number(bd.bonds) > 0 ||
          Number(bd.cash) > 0)
      ) {
        let s = Math.max(0, Number(bd.stocks) || 0);
        let b = Math.max(0, Number(bd.bonds) || 0);
        let c = Math.max(0, Number(bd.cash) || 0);
        const scaled = scaleBreakdownToTotal(s, 0, b, c, bal);
        stocks += scaled.stocks;
        bonds += scaled.bonds;
        cashInvested += scaled.cash;
      } else {
        stocks += bal * w.stocks;
        bonds += bal * w.bonds;
        cashInvested += bal * w.cash;
      }
      continue;
    }
  }

  const manuals = Array.isArray(manualHoldings) ? manualHoldings : [];
  for (const h of manuals) {
    const v = Number(h?.value) || 0;
    if (v <= 0) continue;
    const it = String(h?.instrumentType || "stock").toLowerCase();
    if (it === "mutual") mutualFunds += v;
    else if (it === "bond") bonds += v;
    else stocks += v;
  }

  const total =
    checking + savings + stocks + mutualFunds + bonds + cashInvested;

  const mk = (key, value) => {
    if (value <= 0) return undefined;
    return {
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: ALLOCATION_COLORS[key],
      label: LABELS[key],
    };
  };

  return {
    checking: mk("checking", checking),
    savings: mk("savings", savings),
    stocks: mk("stocks", stocks),
    mutualFunds: mk("mutualFunds", mutualFunds),
    bonds: mk("bonds", bonds),
    cash: mk("cash", cashInvested),
    total,
  };
}

/**
 * Risk / rebalance style percentages (of total wealth) from the same breakdown.
 * @param {ReturnType<typeof calculateAllocationBreakdown>} breakdown
 */
export function toDerivedRiskAllocation(breakdown) {
  const t = breakdown.total;
  if (t <= 0) {
    return {
      stocks: 0,
      mutualFunds: 0,
      bonds: 0,
      cash: 100,
      brokerageUnallocated: 0,
    };
  }
  const liq =
    (breakdown.checking?.value || 0) +
    (breakdown.savings?.value || 0) +
    (breakdown.cash?.value || 0);
  return {
    stocks: ((breakdown.stocks?.value || 0) / t) * 100,
    mutualFunds: ((breakdown.mutualFunds?.value || 0) / t) * 100,
    bonds: ((breakdown.bonds?.value || 0) / t) * 100,
    cash: (liq / t) * 100,
    brokerageUnallocated: 0,
  };
}

/** Legend rows sorted by value descending. */
export function allocationBreakdownToLegendRows(breakdown) {
  const keys = [
    "checking",
    "savings",
    "stocks",
    "mutualFunds",
    "bonds",
    "cash",
  ];
  const rows = keys
    .map((k) => {
      const s = breakdown[k];
      if (!s || s.value <= 0) return null;
      return { key: k, ...s };
    })
    .filter(Boolean);
  rows.sort((a, b) => b.value - a.value);
  return rows;
}
