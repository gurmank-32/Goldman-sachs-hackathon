import { useMemo } from "react";
import { useAppContext } from "../store/AppContext.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";
import { formatUsd } from "../utils/formatUsd.js";

const EQUITY_ICON_BG = "#7F77DD";
const DEBT_ICON_BG = "#5DCAA5";

function isDebtCategory(category) {
  const c = (category ?? "").toLowerCase();
  return c.includes("debt") || c.includes("bond");
}

function plainCategoryLabel(kind, category) {
  if (kind === "stock") return "Shares in a big company";
  if (isDebtCategory(category)) return "Low-risk savings pool";
  return "Long-term growth pool";
}

function stockInitials(symbol) {
  const s = (symbol ?? "??").toUpperCase().replace(/[^A-Z]/g, "");
  return (s.slice(0, 2) || "??").padEnd(2, s[0] ?? "?");
}

function fundInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "??";
  const w0 = words[0];
  if (w0.length >= 2 && w0 === w0.toUpperCase()) {
    return w0.slice(0, 2);
  }
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function buildRows(portfolio) {
  const stocks = portfolio?.stocks ?? [];
  const funds = portfolio?.mutualFunds ?? [];

  const stockRows = stocks.map((s) => {
    const current = s.shares * s.currentPrice;
    const invested = s.shares * s.averageBuyPrice;
    return {
      key: `stock-${s.symbol}`,
      kind: "stock",
      name: s.name,
      categoryLabel: plainCategoryLabel("stock", null),
      initials: stockInitials(s.symbol),
      isDebt: false,
      currentValue: current,
      pnl: current - invested,
    };
  });

  const fundRows = funds.map((f, i) => {
    const debt = isDebtCategory(f.category);
    return {
      key: `fund-${i}-${f.name}`,
      kind: "fund",
      name: f.name,
      categoryLabel: plainCategoryLabel("fund", f.category),
      initials: fundInitials(f.name),
      isDebt: debt,
      currentValue: f.currentValue,
      pnl: f.currentValue - f.investedAmount,
    };
  });

  return [...stockRows, ...fundRows];
}

export default function HoldingsList() {
  const { portfolio } = useAppContext();
  const rows = useMemo(() => buildRows(portfolio), [portfolio]);

  function handleRowTap() {
    window.alert("Detail view coming soon");
  }

  return (
    <section className={`${CARD_CLASS} min-w-0 overflow-hidden`}>
      <h2 className="text-[15px] font-medium text-neutral-900">
        What you own
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Tap any row to learn more
      </p>

      <div className="mt-4">
        {rows.map((row, index) => (
          <div key={row.key}>
            <button
              type="button"
              onClick={handleRowTap}
              className="flex w-full min-w-0 items-center gap-2 py-4 text-left transition hover:bg-neutral-50/80 focus:outline-none focus-visible:bg-neutral-50 sm:gap-3"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{
                  backgroundColor: row.isDebt ? DEBT_ICON_BG : EQUITY_ICON_BG,
                }}
                aria-hidden
              >
                {row.initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-neutral-900">
                  {row.name}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {row.categoryLabel}
                </p>
              </div>

              <div className="min-w-0 max-w-[45%] shrink text-right">
                <p className="truncate text-sm font-bold tabular-nums text-neutral-900">
                  {formatUsd(row.currentValue)}
                </p>
                <p
                  className={
                    row.pnl >= 0
                      ? "mt-0.5 break-words text-[11px] font-medium leading-snug tabular-nums text-emerald-600 sm:text-xs"
                      : "mt-0.5 break-words text-[11px] font-medium leading-snug tabular-nums text-red-600 sm:text-xs"
                  }
                >
                  {row.pnl >= 0 ? "+" : "−"}
                  {formatUsd(Math.abs(row.pnl))} since you bought
                </p>
              </div>

              <span
                className="shrink-0 text-lg text-neutral-300"
                aria-hidden
              >
                ›
              </span>
            </button>
            {index < rows.length - 1 ? (
              <div className="h-px w-full bg-neutral-200/90" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
