import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { isValidScenarioType } from "../constants/scenarios.js";
import { useAppContext } from "../store/AppContext.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";
import { formatUsd, formatUsdPrecise } from "../utils/formatUsd.js";

const PURPLE = "#534AB7";
const COLORS = {
  equity: "#7F77DD",
  debt: "#5DCAA5",
  cash: "#D3D1C7",
  alternatives: "#C49A3C",
};

const CORAL = {
  border: "#F29979",
  label: "#993C1D",
};
const TEAL = {
  border: "#5DCAA5",
  label: "#085041",
};
const HOLD_GRAY = {
  border: "#d4d4d4",
  label: "#737373",
};

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

function roundPct(part, total) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function portfolioTotals(portfolio) {
  const stocks = portfolio?.stocks ?? [];
  const funds = portfolio?.mutualFunds ?? [];

  const invested =
    stocks.reduce((s, x) => s + x.shares * x.averageBuyPrice, 0) +
    funds.reduce((s, x) => s + x.investedAmount, 0);

  const current =
    stocks.reduce((s, x) => s + x.shares * x.currentPrice, 0) +
    funds.reduce((s, x) => s + x.currentValue, 0);

  return { invested, current };
}

/** Recommended allocation targets (%), matching ImpactPreview. */
const AFTER_TARGETS = {
  "market-drop": [
    { key: "equity", pct: 50, fill: COLORS.equity },
    { key: "debt", pct: 40, fill: COLORS.debt },
    { key: "cash", pct: 10, fill: COLORS.cash },
  ],
  inflation: [
    { key: "equity", pct: 65, fill: COLORS.equity },
    { key: "debt", pct: 20, fill: COLORS.debt },
    { key: "alternatives", pct: 15, fill: COLORS.alternatives },
  ],
  "cash-need": [
    { key: "equity", pct: 40, fill: COLORS.equity },
    { key: "debt", pct: 35, fill: COLORS.debt },
    { key: "cash", pct: 25, fill: COLORS.cash },
  ],
};

const PLAN_MOVES = {
  "market-drop": [
    {
      kind: "sell",
      description:
        "Sell $2,000 of your Apple shares — locking in gains before any crash",
      why:
        "Trimming Apple frees up cash while prices are still strong. That way part of your winner is locked in before a pullback instead of riding it all the way down.",
    },
    {
      kind: "buy",
      description:
        "Move $2,000 into Fidelity Total Bond Fund — bonds are safer in downturns",
      why:
        "Bond funds usually bounce around less than stocks when markets tumble. Adding here steadies your overall balance without abandoning growth everywhere.",
    },
    {
      kind: "hold",
      description:
        "Keep your Microsoft shares — they're already a stable position",
      why:
        "Microsoft stays put so you avoid extra trades and taxes. You're already shifting risk elsewhere, so this slice can stay as your diversified anchor.",
    },
  ],
  inflation: [
    {
      kind: "sell",
      description:
        "Move $1,500 out of bonds — they lose value when inflation is high",
      why:
        "Bond payments don't climb as fast as rising prices, so they often lag when inflation sticks around. Pulling some money back stops that drag from dominating your portfolio.",
    },
    {
      kind: "buy",
      description:
        "Add $1,500 to Vanguard S&P 500 — stocks historically beat inflation",
      why:
        "Companies can raise prices over time, which helps earnings keep pace with inflation. Adding to broad US stocks tilts you toward assets that have tended to hold purchasing power.",
    },
    {
      kind: "hold",
      description:
        "Keep your current stock positions — no changes needed there",
      why:
        "You're already adjusting bonds and index exposure elsewhere. Leaving other stocks untouched avoids churn while still fixing the overall tilt.",
    },
  ],
  "cash-need": [
    {
      kind: "sell",
      description:
        "Sell $3,408 of Vanguard S&P 500 — this is your withdrawal amount",
      why:
        "Taking cash from a broad fund spreads the sale across many names instead of dumping one favorite stock. That keeps your withdrawal orderly before you need the money.",
    },
    {
      kind: "buy",
      description:
        "Add $1,000 to bonds — helps stabilize the remaining portfolio",
      why:
        "Once you withdraw cash, what's left should lean slightly safer. Bonds add cushion so everyday swings don't shake the dollars you're still counting on.",
    },
    {
      kind: "hold",
      description:
        "Keep Apple and Microsoft — don't touch your core equity",
      why:
        "Your individual stocks stay put so your core growth engine remains intact. We're funding the withdrawal from index shares instead of unraveling concentrated picks.",
    },
  ],
};

const ESTIMATED_TAX_USD = {
  "market-drop": 53,
  inflation: 40,
  "cash-need": 125,
};

function kindStyles(kind) {
  if (kind === "sell") return CORAL;
  if (kind === "buy") return TEAL;
  return HOLD_GRAY;
}

function kindLabel(kind) {
  if (kind === "sell") return "Sell";
  if (kind === "buy") return "Buy";
  return "Hold";
}

function StepDots({ step }) {
  return (
    <div className="flex justify-center gap-3 py-4" aria-hidden>
      {[1, 2, 3, 4].map((i) => {
        const filled = i < step || step === 4;
        const current = i === step && step < 4;
        return (
          <div
            key={i}
            className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-200 ${
              filled
                ? "bg-[#534AB7]"
                : current
                  ? "border-2 border-[#534AB7] bg-transparent"
                  : "border-2 border-neutral-300 bg-transparent"
            }`}
          />
        );
      })}
    </div>
  );
}

function ExpandWhy({ text, open }) {
  return (
    <div
      className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
        open ? "max-h-96" : "max-h-0"
      }`}
    >
      <div className={open ? "mt-3 border-t border-neutral-100 pt-3" : ""}>
        <p className="text-sm leading-relaxed text-neutral-600">{text}</p>
      </div>
    </div>
  );
}

function TaxImpactDescription({ scenarioType, taxUsd }) {
  const head = (
    <>
      Approximately {formatUsdPrecise(taxUsd)} in estimated short-term tax
    </>
  );
  if (scenarioType === "market-drop") {
    return (
      <>
        {head}{" "}
        ({formatUsd(2000)} Apple sale vs ~{formatUsd(1650)} cost basis; ~22%
        bracket).
      </>
    );
  }
  if (scenarioType === "inflation") {
    return (
      <>
        {head} on bond fund shares sold (~22% bracket).
      </>
    );
  }
  return (
    <>
      {head} on index fund shares sold (~22% bracket).
    </>
  );
}

function DonutPair({
  beforeData,
  afterData,
  afterIntro,
  labelsBefore,
  labelsAfter,
}) {
  const chartSize = 140;

  function MiniDonut({ data, animate, pieKey }) {
    return (
      <div className="mx-auto h-[140px] w-full min-w-0 max-w-[160px]">
        <ResponsiveContainer width="100%" height={chartSize}>
          <PieChart>
            <Pie
              key={pieKey}
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              stroke="none"
              paddingAngle={2}
              isAnimationActive={animate}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-4">
      <div className="min-w-0 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Before
        </p>
        <MiniDonut data={beforeData} animate={false} pieKey="before" />
        <div className="mt-2 space-y-0.5 text-[11px] text-neutral-600">
          {labelsBefore.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      </div>
      <div className="min-w-0 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          After
        </p>
        <MiniDonut
          data={afterData}
          animate={afterIntro}
          pieKey={afterIntro ? "after-on" : "after-off"}
        />
        <div className="mt-2 space-y-0.5 text-[11px] text-neutral-600">
          {labelsAfter.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function firstName(fullName) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "there";
}

function CompletedHealthSection({
  userName,
  displayTotal,
  invested,
  previousCurrent,
}) {
  const pnl = displayTotal - invested;
  const positive = pnl >= 0;

  return (
    <section className={`${CARD_CLASS} mt-8 min-w-0 overflow-hidden`}>
      <p className="text-sm text-neutral-600">
        Good morning, {firstName(userName)}
      </p>

      <p className="mt-3 min-w-0 break-words text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        {formatUsd(displayTotal)}
      </p>

      <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
        <span
          className={
            positive
              ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-800"
              : "inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-red-800"
          }
        >
          {positive ? "↑" : "↓"} {formatUsd(Math.abs(pnl))}{" "}
          {positive ? "up since you started" : "down since you started"}
        </span>
      </div>

      <p className="mt-4 text-sm text-neutral-500">
        Allocation updated for your scenario — still headed toward your goals.
      </p>
      <p className="mt-2 text-xs text-neutral-400">
        Reflects estimated taxes (
        {formatUsdPrecise(Math.abs(previousCurrent - displayTotal))}) from
        today&apos;s trades.
      </p>
    </section>
  );
}

function buildDeltaSummary(scenarioType, alloc) {
  const { equity, debt, cash, total } = alloc;
  const e0 = roundPct(equity, total);
  const d0 = roundPct(debt, total);
  const c0 = roundPct(cash, total);

  const targets = AFTER_TARGETS[scenarioType];
  const map = Object.fromEntries(targets.map((t) => [t.key, t.pct]));

  const afterEq = map.equity ?? e0;
  const afterDebt = map.debt ?? d0;
  const afterCash =
    scenarioType === "inflation"
      ? null
      : (map.cash ?? c0);
  const afterAlt = map.alternatives ?? 0;

  const lines = [];

  if (afterEq !== e0) {
    lines.push(
      `Equity ${afterEq > e0 ? "↑" : "↓"} from ${e0}% to ${afterEq}%`,
    );
  }
  if (afterDebt !== d0) {
    lines.push(
      `Bonds ${afterDebt > d0 ? "↑" : "↓"} from ${d0}% to ${afterDebt}%`,
    );
  }
  if (afterCash != null && afterCash !== c0) {
    lines.push(
      `Cash ${afterCash > c0 ? "↑" : "↓"} from ${c0}% to ${afterCash}%`,
    );
  }
  if (scenarioType === "inflation" && afterAlt > 0) {
    lines.push(`Alternatives ↑ from 0% to ${afterAlt}%`);
  }

  return lines.join(" · ");
}

export default function RebalanceWizard() {
  const { portfolio, selectedScenario, userProfile } = useAppContext();
  const scenarioType = selectedScenario?.type;
  const [step, setStep] = useState(1);
  const [whyOpen, setWhyOpen] = useState(null);
  const [afterIntro, setAfterIntro] = useState(false);

  const alloc = useMemo(
    () => allocationFromPortfolio(portfolio),
    [portfolio],
  );

  const holdings = useMemo(() => portfolioTotals(portfolio), [portfolio]);

  useEffect(() => {
    if (step !== 3) {
      setAfterIntro(false);
      return undefined;
    }
    setAfterIntro(false);
    const t = window.setTimeout(() => setAfterIntro(true), 120);
    return () => window.clearTimeout(t);
  }, [step]);

  useEffect(() => {
    setWhyOpen(null);
  }, [step]);

  const resolvedType =
    scenarioType &&
    isValidScenarioType(scenarioType) &&
    PLAN_MOVES[scenarioType] &&
    AFTER_TARGETS[scenarioType]
      ? scenarioType
      : null;

  if (!resolvedType) {
    return <Navigate to="/scenarios" replace />;
  }

  const moves = PLAN_MOVES[resolvedType];
  const targets = AFTER_TARGETS[resolvedType];

  const beforePieData = useMemo(
    () => [
      {
        key: "eq",
        value: alloc.equity,
        fill: COLORS.equity,
        name: "Equity",
      },
      {
        key: "db",
        value: alloc.debt,
        fill: COLORS.debt,
        name: "Bonds",
      },
      {
        key: "ca",
        value: alloc.cash,
        fill: COLORS.cash,
        name: "Cash",
      },
    ],
    [alloc],
  );

  const afterPieFull = useMemo(() => {
    const tAlloc = alloc.total;
    return targets.map((seg) => ({
      key: seg.key,
      value: (tAlloc * seg.pct) / 100,
      fill: seg.fill,
      name:
        seg.key === "debt"
          ? "Bonds"
          : seg.key === "alternatives"
            ? "Alternatives"
            : seg.key === "cash"
              ? "Cash"
              : "Equity",
    }));
  }, [alloc.total, targets]);

  const afterPieIntro = useMemo(
    () =>
      afterPieFull.map((x) => ({
        ...x,
        value: 0,
      })),
    [afterPieFull],
  );

  const afterPieDisplayed = afterIntro ? afterPieFull : afterPieIntro;

  const deltaPlain = buildDeltaSummary(resolvedType, alloc);

  const taxUsd = ESTIMATED_TAX_USD[resolvedType];
  const completedValue = holdings.current - taxUsd;

  const legendBefore = [
    `${roundPct(alloc.equity, alloc.total)}% equity`,
    `${roundPct(alloc.debt, alloc.total)}% bonds`,
    `${roundPct(alloc.cash, alloc.total)}% cash`,
  ];

  const legendAfter = targets.map((t) => {
    const label =
      t.key === "debt"
        ? "bonds"
        : t.key === "alternatives"
          ? "alternatives"
          : t.key === "cash"
            ? "cash"
            : "equity";
    return `${t.pct}% ${label}`;
  });

  return (
    <main className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden bg-[#F8F7F4]">
      <div className="sticky top-0 z-10 border-b border-neutral-200/70 bg-[#F8F7F4]/95 px-4 backdrop-blur-sm">
        <div className="relative mx-auto max-w-lg pb-3 pt-3">
          <Link
            to="/impact"
            className="absolute left-0 top-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-700 hover:text-neutral-900"
            aria-label="Back"
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
          <div className="flex justify-center px-14">
            <StepDots step={step} />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pb-28 pt-4">
        <div className="mx-auto w-full max-w-lg min-w-0 flex-1">
          {step === 1 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Here&apos;s your plan
              </p>
              <h1 className="mt-2 text-xl font-semibold text-neutral-900">
                We recommend 3 moves
              </h1>

              <div className="mt-8 flex flex-col gap-4">
                {moves.map((move, idx) => {
                  const styles = kindStyles(move.kind);
                  const open = whyOpen === idx;
                  return (
                    <div
                      key={idx}
                      className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white pl-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      style={{ borderLeftWidth: 4, borderLeftColor: styles.border }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setWhyOpen(open ? null : idx)
                        }
                        className="absolute right-3 top-3 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
                      >
                        Why?
                      </button>
                      <div className="px-4 pb-4 pr-14 pt-4">
                        <p
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{ color: styles.label }}
                        >
                          {kindLabel(move.kind)}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-800">
                          {move.description}
                        </p>
                        <ExpandWhy text={move.why} open={open} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                What this will cost
              </p>
              <h1 className="mt-2 text-xl font-semibold text-neutral-900">
                Before you confirm — here&apos;s the full picture
              </h1>

              <dl className="mt-8 space-y-5">
                <div className="rounded-xl border border-neutral-100 bg-white px-4 py-4 shadow-sm">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Transaction cost
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-neutral-900">
                    $0 — commission-free trades
                  </dd>
                </div>
                <div className="rounded-xl border border-neutral-100 bg-white px-4 py-4 shadow-sm">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Estimated tax impact
                  </dt>
                  <dd className="mt-1 text-sm font-medium leading-snug text-neutral-900">
                    <TaxImpactDescription
                      scenarioType={resolvedType}
                      taxUsd={taxUsd}
                    />
                  </dd>
                </div>
                <div className="rounded-xl border border-neutral-100 bg-white px-4 py-4 shadow-sm">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Time to complete
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-neutral-900">
                    Usually 1–2 business days to settle
                  </dd>
                </div>
              </dl>

              <div
                className="mt-8 rounded-2xl px-4 py-4 text-sm leading-relaxed text-neutral-800"
                style={{ backgroundColor: "#EAF3DE" }}
              >
                Even after taxes, this rebalance puts your portfolio in a much
                safer position for this scenario. The cost of NOT acting could be
                higher.
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Watch your portfolio change
              </p>
              <h1 className="mt-2 text-xl font-semibold text-neutral-900">
                Here&apos;s what&apos;s changing
              </h1>

              <DonutPair
                beforeData={beforePieData}
                afterData={afterPieDisplayed}
                afterIntro={afterIntro}
                labelsBefore={legendBefore}
                labelsAfter={legendAfter}
              />

              <p className="mt-6 text-sm leading-relaxed text-neutral-700">
                {deltaPlain}
              </p>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center pb-4 pt-2 text-center">
              <div
                className="flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow-lg ring-4 ring-emerald-100 outline outline-2 outline-offset-2 outline-emerald-700/40"
                aria-hidden
              >
                <svg
                  width="46"
                  height="46"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>

              <h1 className="mt-8 text-xl font-semibold text-neutral-900">
                Done! Your portfolio is rebalanced.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
                Here&apos;s what changed today
              </p>

              <ul className="mt-6 w-full max-w-md space-y-3 text-left text-sm leading-relaxed text-neutral-800">
                {moves.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-semibold text-[#534AB7]" aria-hidden>
                      •
                    </span>
                    <span>{m.description}</span>
                  </li>
                ))}
              </ul>

              <CompletedHealthSection
                userName={userProfile.name}
                displayTotal={completedValue}
                invested={holdings.invested}
                previousCurrent={holdings.current}
              />

              <div className="mt-10 w-full space-y-3">
                <Link
                  to="/dashboard"
                  className="flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                  style={{ backgroundColor: PURPLE }}
                >
                  Back to dashboard
                </Link>
                <Link
                  to="/decisions"
                  className="flex min-h-[52px] w-full items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  View decision log
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {step < 4 ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200/80 bg-[#F8F7F4]/95 pb-[env(safe-area-inset-bottom,0)] pt-3 backdrop-blur-sm">
          <div className="mx-auto max-w-lg px-4">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:opacity-90"
                style={{ backgroundColor: PURPLE }}
              >
                Looks good, let&apos;s do it →
              </button>
            ) : null}
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:opacity-90"
                style={{ backgroundColor: PURPLE }}
              >
                I understand, continue →
              </button>
            ) : null}
            {step === 3 ? (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:opacity-90"
                style={{ backgroundColor: PURPLE }}
              >
                Confirm rebalance →
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
