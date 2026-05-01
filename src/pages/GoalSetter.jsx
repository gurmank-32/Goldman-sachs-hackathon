import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../store/AppContext.jsx";
import { formatUsd, formatUsdAmountDigits } from "../utils/formatUsd.js";

const YEARS = Array.from({ length: 2050 - 2026 + 1 }, (_, i) => 2026 + i);

const GOAL_CARDS = [
  {
    id: "retirement",
    title: "Retirement",
    defaultAmount: 1_000_000,
    defaultYear: 2045,
    Icon: IconRetirement,
  },
  {
    id: "home",
    title: "Buy a Home",
    defaultAmount: 500_000,
    defaultYear: 2032,
    Icon: IconKey,
  },
  {
    id: "education",
    title: "Child's Education",
    defaultAmount: 300_000,
    defaultYear: 2035,
    Icon: IconGradCap,
  },
  {
    id: "emergency",
    title: "Emergency Fund",
    defaultAmount: 50_000,
    defaultYear: 2028,
    Icon: IconShield,
  },
];

function IconRetirement({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" />
      <path d="M9 21v-6h6v6" />
      <circle cx="17.5" cy="6.5" r="2.25" />
    </svg>
  );
}

function IconKey({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="12" r="3.25" />
      <path d="M11.25 12h6.5l1.75 1.75V17" />
      <path d="M17.5 14.5v3" />
    </svg>
  );
}

function IconGradCap({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 10.5 12 7l7.5 3.5L12 14 4.5 10.5Z" />
      <path d="M6 11.2V16c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5v-4.8" />
      <path d="M19.5 10.5V16" />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 5 6v5.2c0 4.7 3.1 8.9 7 10 3.9-1.1 7-5.3 7-10V6l-7-3Z" />
    </svg>
  );
}

export default function GoalSetter() {
  const navigate = useNavigate();
  const { userProfile, setSelectedGoal } = useAppContext();
  const [selectedId, setSelectedId] = useState(null);
  const [amountInput, setAmountInput] = useState("");
  const [yearInput, setYearInput] = useState("");

  const selectedMeta = useMemo(
    () => GOAL_CARDS.find((g) => g.id === selectedId),
    [selectedId],
  );

  function resolveAmount() {
    const raw = amountInput.trim();
    if (raw === "") return selectedMeta.defaultAmount;
    const n = Number(raw.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : selectedMeta.defaultAmount;
  }

  function resolveYear() {
    if (yearInput === "") return selectedMeta.defaultYear;
    const y = Number(yearInput);
    return YEARS.includes(y) ? y : selectedMeta.defaultYear;
  }

  function handleLetsGo() {
    if (!selectedMeta) return;
    const targetAmount = resolveAmount();
    const targetYear = resolveYear();
    setSelectedGoal({
      type: selectedMeta.id,
      targetAmount,
      targetYear,
    });
    navigate("/dashboard");
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden px-4 py-8 pb-10 sm:py-10">
      <Link
        to="/"
        className="inline-flex min-h-[44px] items-center text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        ← Back to quiz
      </Link>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Goal setter
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          What are you saving for?
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-600">
          Choose a goal. You can leave amount and year blank—we’ll use sensible
          defaults for that goal.
        </p>
      </div>

      {userProfile.riskLabel ? (
        <div className="mt-6 rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-neutral-500">Risk profile</p>
          <p className="text-sm font-medium text-neutral-900">
            {userProfile.riskLabel}
            {userProfile.riskScore != null && (
              <span className="ml-2 font-normal text-neutral-500">
                ({userProfile.riskScore}/15)
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-neutral-600">
          No profile yet.{" "}
          <Link
            to="/"
            className="font-medium text-purple-700 underline underline-offset-2"
          >
            Take the quiz
          </Link>
          .
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {GOAL_CARDS.map(({ id, title, Icon, defaultAmount, defaultYear }) => {
          const selected = selectedId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`flex min-h-[132px] w-full min-w-0 flex-col items-start rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 sm:min-h-0 sm:p-6 ${
                selected
                  ? "border-purple-600 ring-2 ring-purple-200"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Icon className="h-9 w-9 shrink-0 text-purple-600 sm:h-10 sm:w-10" />
              <span className="mt-3 text-base font-semibold text-neutral-900 sm:mt-4 sm:text-lg">
                {title}
              </span>
              <span className="mt-1 break-words text-xs text-neutral-500">
                Suggested: {formatUsd(defaultAmount)} by {defaultYear}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">
            I want to save
          </span>
          <div className="mt-2 flex min-h-[48px] min-w-0 items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200">
            <span className="shrink-0 text-base text-neutral-500 sm:text-sm">
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder={
                selectedMeta
                  ? formatUsdAmountDigits(selectedMeta.defaultAmount)
                  : "Amount (optional)"
              }
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-neutral-900 outline-none sm:text-sm"
            />
          </div>
        </label>

        <label className="block min-w-0">
          <span className="text-sm font-medium text-neutral-800">
            By the year
          </span>
          <select
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
            className="mt-2 min-h-[48px] w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200 sm:text-sm"
          >
            <option value="">Select year (optional)</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={!selectedMeta}
        onClick={handleLetsGo}
        className="mt-8 min-h-[48px] w-full rounded-full bg-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
      >
        Let&apos;s go
      </button>
    </main>
  );
}
