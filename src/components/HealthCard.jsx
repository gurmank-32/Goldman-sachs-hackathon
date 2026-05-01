import { useMemo } from "react";
import { useAppContext } from "../store/AppContext.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";
import { formatUsd } from "../utils/formatUsd.js";

function firstName(fullName) {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "there";
}

function portfolioTotals(portfolio) {
  const stocks = portfolio?.stocks ?? [];
  const funds = portfolio?.mutualFunds ?? [];

  const stocksInvested = stocks.reduce(
    (s, x) => s + x.shares * x.averageBuyPrice,
    0,
  );
  const stocksCurrent = stocks.reduce(
    (s, x) => s + x.shares * x.currentPrice,
    0,
  );

  const fundsInvested = funds.reduce((s, x) => s + x.investedAmount, 0);
  const fundsCurrent = funds.reduce((s, x) => s + x.currentValue, 0);

  return {
    invested: stocksInvested + fundsInvested,
    current: stocksCurrent + fundsCurrent,
  };
}

export default function HealthCard() {
  const { portfolio, userProfile } = useAppContext();

  const { invested, current } = useMemo(
    () => portfolioTotals(portfolio),
    [portfolio],
  );

  const pnl = current - invested;
  const positive = pnl >= 0;

  const name = firstName(userProfile.name);

  return (
    <section className={`${CARD_CLASS} min-w-0 overflow-hidden`}>
      <p className="text-sm text-neutral-600">
        Good morning, {name}
      </p>

      <p className="mt-3 min-w-0 break-words text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        {formatUsd(current)}
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
        Your money is in good shape and moving in the right direction.
      </p>
    </section>
  );
}
