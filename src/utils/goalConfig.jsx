/** Reference year for "years to …" copy on Goal Progress (dashboard). */
export const GOAL_PROGRESS_REFERENCE_YEAR = 2026;

function IconHouse({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8962E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" />
    </svg>
  );
}

function IconKey({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8962E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="16" r="3" />
      <path d="M10.5 13.5 19 5l2 2-2 2-1.5-1.5M16 8l2 2" />
    </svg>
  );
}

function IconGradCap({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8962E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10 12 6l8 4-8 4-8-4Z" />
      <path d="M4 10v5c0 2 3.5 4 8 4s8-2 8-4v-5" />
    </svg>
  );
}

function IconArrowUp({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8962E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5M12 5 7 10M12 5l5 5" />
    </svg>
  );
}

function IconShield({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8962E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

const CONFIGS = {
  retire: {
    label: "Retirement",
    Icon: IconHouse,
    defaultTargetAmount: 1_000_000,
    defaultTargetYear: 2050,
    description: "Long-term financial freedom",
    milestoneLabel: "years to retirement",
    tagline: "Consistency today builds freedom tomorrow.",
  },
  home: {
    label: "Buy a Home",
    Icon: IconKey,
    defaultTargetAmount: 300_000,
    defaultTargetYear: 2030,
    description: "Your down payment target",
    milestoneLabel: "years to purchase",
    tagline: "Every dollar saved brings you closer to the keys.",
  },
  education: {
    label: "Education Fund",
    Icon: IconGradCap,
    defaultTargetAmount: 100_000,
    defaultTargetYear: 2035,
    description: "Tuition and living costs",
    milestoneLabel: "years to enrollment",
    tagline: "Investing in education is investing in the future.",
  },
  grow: {
    label: "Wealth Growth",
    Icon: IconArrowUp,
    defaultTargetAmount: 500_000,
    defaultTargetYear: 2040,
    description: "Building long-term wealth",
    milestoneLabel: "years to target",
    tagline: "Stay the course — compounding works in your favor.",
  },
  protect: {
    label: "Capital Protection",
    Icon: IconShield,
    defaultTargetAmount: 200_000,
    defaultTargetYear: 2035,
    description: "Preserving what you've built",
    milestoneLabel: "years to target",
    tagline: "Steady and secure — you're building a strong foundation.",
  },
};

const ALLOWED = new Set(["retire", "home", "education", "grow", "protect"]);

/**
 * @param {string | undefined} goalType
 * @param {{ targetAmount?: number, targetYear?: number } | null | undefined} goal
 */
export function getGoalConfig(goalType, goal) {
  const t = ALLOWED.has(goalType) ? goalType : "retire";
  const c = CONFIGS[t];
  const rawAmt = goal?.targetAmount;
  const rawYr = goal?.targetYear;
  const targetAmount =
    Number.isFinite(Number(rawAmt)) && Number(rawAmt) > 0
      ? Number(rawAmt)
      : c.defaultTargetAmount;
  const targetYear =
    Number.isFinite(Number(rawYr)) && Number(rawYr) > 1900 && Number(rawYr) <= 2200
      ? Number(rawYr)
      : c.defaultTargetYear;

  return {
    type: t,
    label: c.label,
    Icon: c.Icon,
    targetAmount,
    targetYear,
    description: c.description,
    milestoneLabel: c.milestoneLabel,
    tagline: c.tagline,
  };
}
