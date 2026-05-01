import { Link, useNavigate } from "react-router-dom";
import MainTabBar from "../components/MainTabBar.jsx";
import {
  SCENARIO_DEFINITIONS,
  SCENARIO_TYPE_ORDER,
  scenarioSelectionFromType,
} from "../constants/scenarios.js";
import { useAppContext } from "../store/AppContext.jsx";

const ICON_BY_TYPE = {
  "market-drop": IconDownArrow,
  inflation: IconFlame,
  "cash-need": IconCashTimeline,
};

function IconDownArrow({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 5v14M12 19l-5-5M12 19l5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFlame({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2c2 3.5 6 6 6 11a6 6 0 1 1-12 0c0-3 2-6 4-9 1 2 1.5 4.5 2 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCashTimeline({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="3"
        y="6"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M7 6V4M17 6V4M3 11h18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 14h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SCENARIO_CARDS = SCENARIO_TYPE_ORDER.map((type) => {
  const def = SCENARIO_DEFINITIONS[type];
  return {
    type,
    title: def.name,
    description: def.description,
    iconBg: def.color.iconBg,
    iconColor: def.color.iconFg,
    Icon: ICON_BY_TYPE[type],
  };
});

export default function Scenarios() {
  const navigate = useNavigate();
  const { setSelectedScenario } = useAppContext();

  function handlePick(scenarioType) {
    const sel = scenarioSelectionFromType(scenarioType);
    if (sel) setSelectedScenario(sel);
    navigate("/impact");
  }

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden bg-[#F8F7F4]">
      <main className="min-w-0 flex-1 px-4 pb-28 pt-4">
      <div className="mx-auto max-w-lg min-w-0">
        <div className="flex items-start gap-3">
          <Link
            to="/dashboard"
            className="-ml-1 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-neutral-700 hover:text-neutral-900"
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
          <div className="min-w-0 flex-1 pt-1.5">
            <h1 className="text-[20px] font-medium leading-snug tracking-tight text-neutral-900">
              What would you like to plan for?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Pick a situation and we&apos;ll show you exactly what to do
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {SCENARIO_CARDS.map(
            ({ type, title, description, iconBg, iconColor, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => handlePick(type)}
                className="flex w-full min-w-0 items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                <div
                  className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: iconBg, color: iconColor }}
                  aria-hidden
                >
                  <Icon className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-neutral-900">{title}</p>
                  <p className="mt-1 line-clamp-1 text-sm leading-snug text-neutral-600">
                    {description}
                  </p>
                </div>
                <span
                  className="shrink-0 text-xl text-neutral-300"
                  aria-hidden
                >
                  ›
                </span>
              </button>
            ),
          )}
        </div>
      </div>
      </main>
      <MainTabBar />
    </div>
  );
}
