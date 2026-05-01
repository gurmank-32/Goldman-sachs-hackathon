import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { isValidScenarioType } from "../constants/scenarios.js";
import { useAppContext } from "../store/AppContext.jsx";
import { formatUsd } from "../utils/formatUsd.js";

const COLORS = {
  equity: "#7F77DD",
  debt: "#5DCAA5",
  cash: "#D3D1C7",
  alternatives: "#C49A3C",
};

/** Mirrors AllocationChart: synthetic cash slice for visualization parity. */
function isDebtFund(category) {
  const c = (category ?? "").toLowerCase();
  return c.includes("debt") || c.includes("bond");
}

function allocationFromPortfolio(portfolio) {
  const stocks = portfolio?.stocks ?? [];
  const funds = portfolio?.mutualFunds ?? [];

  let growth = stocks.reduce((s, x) => s + x.shares * x.currentPrice, 0);

  let stable = 0;
  for (const f of funds) {
    const v = f.currentValue;
    if (isDebtFund(f.category)) stable += v;
    else growth += v;
  }

  const investedExCash = growth + stable;
  const cash = investedExCash > 0 ? (0.05 * investedExCash) / 0.95 : 0;
  const total = growth + stable + cash;

  return { equity: growth, debt: stable, cash, total };
}

function scenarioAfterTotal(scenarioType, { equity, debt, cash, total }) {
  switch (scenarioType) {
    case "market-drop":
      return equity * 0.8 + debt + cash;
    case "inflation":
      return total * 0.97;
    case "cash-need":
      return total * 0.8;
    default:
      return total;
  }
}

const RECOMMENDED = {
  "market-drop": [
    { key: "eq", pct: 50, label: "Equity", color: COLORS.equity },
    { key: "db", pct: 40, label: "Bonds", color: COLORS.debt },
    { key: "ca", pct: 10, label: "Cash", color: COLORS.cash },
  ],
  inflation: [
    { key: "eq", pct: 65, label: "Equity", color: COLORS.equity },
    { key: "db", pct: 20, label: "Bonds", color: COLORS.debt },
    { key: "alt", pct: 15, label: "Alternatives", color: COLORS.alternatives },
  ],
  "cash-need": [
    { key: "eq", pct: 40, label: "Equity", color: COLORS.equity },
    { key: "db", pct: 35, label: "Bonds", color: COLORS.debt },
    { key: "ca", pct: 25, label: "Cash", color: COLORS.cash },
  ],
};

function pctWidth(part, total) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function StackedAllocationBar({ segments, ariaLabel }) {
  return (
    <div
      className="flex h-8 w-full min-w-0 overflow-hidden rounded-lg ring-1 ring-neutral-200/80"
      role="img"
      aria-label={ariaLabel}
    >
      {segments.map((s) =>
        s.pct > 0 ? (
          <div
            key={s.key}
            className="min-w-0 shrink-0 transition-[width]"
            style={{
              width: `${s.pct}%`,
              backgroundColor: s.color,
            }}
            title={`${s.label} ${Math.round(s.pct)}%`}
          />
        ) : null,
      )}
    </div>
  );
}

function explanationCopy(scenarioType, alloc, afterTotal) {
  const { equity, debt, cash, total } = alloc;
  const equityAfterCrash = equity * 0.8;
  const crashLoss = total - afterTotal;
  const inflationLoss = total - afterTotal;
  const withdrawal = total * 0.2;

  switch (scenarioType) {
    case "market-drop":
      return `If markets fall 20%, your ${formatUsd(equity)} in stocks and equity funds could drop to around ${formatUsd(
        equityAfterCrash,
      )}. Your bonds would hold steady at ${formatUsd(debt)}. Overall you'd be down about ${formatUsd(crashLoss)}.`;
    case "inflation":
      return `With sustained inflation and your current mix, your money loses about 3% of its real buying power each year. That's ${formatUsd(
        inflationLoss,
      )} in purchasing power gone.`;
    case "cash-need":
      return `Withdrawing 20% (${formatUsd(withdrawal)}) would leave you with ${formatUsd(
        afterTotal,
      )} invested. Without rebalancing, this could hurt your long-term growth.`;
    default:
      return "";
  }
}

export default function ImpactPreview() {
  const { portfolio, selectedScenario } = useAppContext();
  const scenarioType = selectedScenario?.type;

  const alloc = useMemo(
    () => allocationFromPortfolio(portfolio),
    [portfolio],
  );

  const afterTotal = scenarioAfterTotal(scenarioType, alloc);

  const currentSegments = useMemo(() => {
    const { equity, debt, cash, total } = alloc;
    return [
      {
        key: "eq",
        pct: pctWidth(equity, total),
        label: "Equity",
        color: COLORS.equity,
      },
      {
        key: "db",
        pct: pctWidth(debt, total),
        label: "Bonds",
        color: COLORS.debt,
      },
      {
        key: "ca",
        pct: pctWidth(cash, total),
        label: "Cash",
        color: COLORS.cash,
      },
    ];
  }, [alloc]);

  const recommendedSegments =
    scenarioType && RECOMMENDED[scenarioType]
      ? RECOMMENDED[scenarioType]
      : RECOMMENDED["market-drop"];

  if (
    !selectedScenario ||
    !isValidScenarioType(scenarioType) ||
    !RECOMMENDED[scenarioType]
  ) {
    return <Navigate to="/scenarios" replace />;
  }

  const narrative = explanationCopy(scenarioType, alloc, afterTotal);

  return (
    <main className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-[#F8F7F4] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0))] pt-4">
      <div className="mx-auto max-w-lg min-w-0">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/scenarios"
            className="-ml-1 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-neutral-700 hover:text-neutral-900"
            aria-label="Back to scenarios"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
          <span
            className="max-w-[min(100%,14rem)] truncate rounded-full px-3 py-1.5 text-center text-xs font-semibold sm:text-sm"
            style={{
              backgroundColor: selectedScenario.color.chipBg,
              color: selectedScenario.color.chipFg,
            }}
          >
            {selectedScenario.name}
          </span>
        </div>

        <h1 className="mt-8 text-[20px] font-bold leading-snug tracking-tight text-neutral-900">
          Here&apos;s what could happen
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="min-w-0 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-medium text-neutral-500">
              Your portfolio today
            </p>
            <p className="mt-2 truncate text-lg font-semibold tabular-nums text-neutral-900">
              {formatUsd(alloc.total)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-medium text-neutral-500">
              After this scenario
            </p>
            <p className="mt-2 truncate text-lg font-semibold tabular-nums text-neutral-900">
              {formatUsd(afterTotal)}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-neutral-600">
          {narrative}
        </p>

        <h2 className="mt-10 text-base font-semibold leading-snug text-neutral-900">
          Your current allocation vs what&apos;s recommended
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Current
            </p>
            <StackedAllocationBar
              segments={currentSegments}
              ariaLabel="Current allocation: stocks, bonds, and cash"
            />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Recommended
            </p>
            <StackedAllocationBar
              segments={recommendedSegments}
              ariaLabel="Recommended allocation after rebalancing"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: COLORS.equity }}
              aria-hidden
            />
            Equity
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: COLORS.debt }}
              aria-hidden
            />
            Bonds
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: COLORS.cash }}
              aria-hidden
            />
            Cash
          </span>
          {scenarioType === "inflation" ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: COLORS.alternatives }}
                aria-hidden
              />
              Alternatives
            </span>
          ) : null}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200/80 bg-[#F8F7F4]/95 pb-[env(safe-area-inset-bottom,0)] pt-3 backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4">
            <Link
              to="/rebalance"
              className="flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3.5 text-center text-sm font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:opacity-95 active:opacity-90"
              style={{ backgroundColor: "#534AB7" }}
            >
              Show me what to do →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
