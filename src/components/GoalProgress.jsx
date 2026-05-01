import { useMemo } from "react";
import { useAppContext } from "../store/AppContext.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";
import { formatUsd } from "../utils/formatUsd.js";

const CURRENT_YEAR = 2026;

const GOAL_LABELS = {
  retirement: "Retirement",
  home: "Buy a home",
  education: "A child's education",
  emergency: "Rainy day fund",
};

function portfolioCurrentValue(portfolio) {
  const stocks = portfolio?.stocks ?? [];
  const funds = portfolio?.mutualFunds ?? [];
  const stocksTotal = stocks.reduce((s, x) => s + x.shares * x.currentPrice, 0);
  const fundsTotal = funds.reduce((s, x) => s + x.currentValue, 0);
  return stocksTotal + fundsTotal;
}

function resolveTargetYear(portfolio, selectedGoal) {
  if (selectedGoal?.targetYear != null) return selectedGoal.targetYear;
  const title = portfolio?.goal?.title ?? "";
  const m = title.match(/(20\d{2})/);
  return m ? Number(m[1]) : 2045;
}

function resolveGoalTitle(portfolio, selectedGoal) {
  if (portfolio?.goal?.title) return portfolio.goal.title;
  if (selectedGoal) {
    const label = GOAL_LABELS[selectedGoal.type] ?? selectedGoal.type;
    return `${label} by ${selectedGoal.targetYear}`;
  }
  return "Your goal";
}

/** Progress toward goal: total portfolio value (live holdings) vs target — matches bar fill. */
function goalProgressPercent(currentPortfolioValue, targetAmount) {
  if (targetAmount <= 0) return 0;
  return Math.min(100, (currentPortfolioValue / targetAmount) * 100);
}

function formatGoalPercent(pct) {
  const rounded = Math.round(pct * 10) / 10;
  const whole = Number.isInteger(rounded);
  const s = whole
    ? Math.round(pct).toLocaleString("en-US")
    : rounded.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
  return s;
}

export default function GoalProgress() {
  const { portfolio, selectedGoal } = useAppContext();

  const targetAmount =
    selectedGoal?.targetAmount ?? portfolio?.goal?.targetAmount ?? 0;
  const currentValue = useMemo(
    () => portfolioCurrentValue(portfolio),
    [portfolio],
  );

  const goalTitle = resolveGoalTitle(portfolio, selectedGoal);
  const targetYear = resolveTargetYear(portfolio, selectedGoal);
  const yearsRemaining = Math.max(0, targetYear - CURRENT_YEAR);

  const progressPct = goalProgressPercent(currentValue, targetAmount);
  const pctLabel = formatGoalPercent(progressPct);

  if (!portfolio?.goal && !selectedGoal) {
    return (
      <section className={`${CARD_CLASS} min-w-0 overflow-hidden`}>
        <h2 className="text-[15px] font-medium text-neutral-900">Your goal</h2>
        <p className="mt-3 text-sm text-neutral-500">
          Add a goal to see how you&apos;re doing.
        </p>
      </section>
    );
  }

  return (
    <section className={`${CARD_CLASS} min-w-0 overflow-hidden`}>
      <h2 className="text-[15px] font-medium text-neutral-900">Your goal</h2>

      <p className="mt-2 break-words text-base font-medium text-neutral-900">
        {goalTitle}
      </p>

      <div
        className="mt-4 h-3 w-full min-w-0 overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressPct)}
        aria-label="How close you are to your savings goal"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${progressPct}%`,
            backgroundColor: "#7F77DD",
            borderRadius: 999,
          }}
        />
      </div>

      <p className="mt-3 break-words text-sm text-neutral-800">
        {formatUsd(currentValue)} toward your {formatUsd(targetAmount)} goal —{" "}
        {pctLabel}% of the way there
      </p>

      <p className="mt-2 text-sm text-neutral-500">
        If you keep a similar pace, you could hit your goal in about{" "}
        {yearsRemaining.toLocaleString("en-US")} years.
      </p>

      <p className="mt-3 text-sm italic text-neutral-500">
        Keep going — consistency beats timing every time.
      </p>
    </section>
  );
}
