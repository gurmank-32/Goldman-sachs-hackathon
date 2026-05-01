import { Link } from "react-router-dom";

const DOT_REBALANCE = "#534AB7";
const DOT_INFO = "#5DCAA5";

const ENTRIES = [
  {
    date: new Date(2026, 4, 1),
    relativeLabel: "Today",
    dotColor: DOT_REBALANCE,
    title: "Portfolio rebalanced — Market drop scenario",
    reason:
      "Markets have been volatile. We moved $2,000 from stocks to bonds to reduce your downside risk.",
    chip: {
      label: "Market drop",
      backgroundColor: "#FAECE7",
      color: "#993C1D",
    },
  },
  {
    date: new Date(2026, 3, 17),
    relativeLabel: "2 weeks ago",
    dotColor: DOT_INFO,
    title: "Risk profile updated",
    reason:
      "You completed the risk quiz and were matched to a Moderate risk profile.",
    chip: {
      label: "Moderate",
      backgroundColor: "#E1F5EE",
      color: "#085041",
    },
  },
  {
    date: new Date(2026, 3, 1),
    relativeLabel: "1 month ago",
    dotColor: DOT_INFO,
    title: "Portfolio first connected",
    reason:
      "Alex's portfolio was set up with 4 holdings across stocks and mutual funds.",
    chip: {
      label: "Welcome",
      backgroundColor: "#f5f5f5",
      color: "#404040",
    },
  },
];

function formatLogDate(d) {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DecisionLog() {
  return (
    <main className="mx-auto min-h-dvh w-full min-w-0 max-w-lg overflow-x-hidden bg-[#F8F7F4] px-4 pb-10 pt-4">
      <Link
        to="/dashboard"
        className="-ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-700 hover:text-neutral-900"
        aria-label="Back to dashboard"
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

      <h1 className="mt-6 text-xl font-semibold tracking-tight text-neutral-900">
        Your decision log
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        Every recommendation we&apos;ve made and why.
      </p>

      <div className="mt-10">
        <ul className="space-y-0">
          {ENTRIES.map((entry, index) => (
            <li key={entry.title} className="flex gap-4">
              <div className="flex w-[22px] shrink-0 flex-col items-center">
                {index > 0 ? (
                  <div
                    className="h-4 w-px shrink-0 bg-neutral-300"
                    aria-hidden
                  />
                ) : (
                  <div className="h-4 shrink-0" aria-hidden />
                )}
                <div
                  className="z-[1] h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_4px_#F8F7F4]"
                  style={{ backgroundColor: entry.dotColor }}
                  aria-hidden
                />
                {index < ENTRIES.length - 1 ? (
                  <div
                    className="mt-2 min-h-[5.5rem] w-px flex-1 bg-neutral-300"
                    aria-hidden
                  />
                ) : (
                  <div className="h-6 shrink-0" aria-hidden />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-10">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <time
                    dateTime={entry.date.toISOString().slice(0, 10)}
                    className="text-sm font-medium text-neutral-700"
                  >
                    {formatLogDate(entry.date)}
                  </time>
                  <span className="text-xs text-neutral-400">
                    · {entry.relativeLabel}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-base font-bold leading-snug text-neutral-900">
                    {entry.title}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs"
                    style={{
                      backgroundColor: entry.chip.backgroundColor,
                      color: entry.chip.color,
                    }}
                  >
                    {entry.chip.label}
                  </span>
                </div>

                <p className="mt-2 max-w-prose text-sm leading-relaxed text-neutral-500">
                  {entry.reason}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
