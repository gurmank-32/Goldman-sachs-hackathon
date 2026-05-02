/**
 * Shared signup + FinPilot onboarding questions (same scoring).
 * Options include emoji for signup UI and icon keys for FinPilot SVG icons.
 */

export const FINPILOT_ONBOARDING_KEY = "finpilot_onboarding_done";

export const SIGNUP_QUIZ_QUESTIONS = [
  {
    id: "goal",
    stepLabel: "Goal",
    question: "What are you hoping your money will do for you?",
    hint: "Pick the one that feels most like you right now.",
    options: [
      {
        value: 2,
        emoji: "🏠",
        icon: "home",
        label: "Buy a home or big purchase",
        description: "Within the next few years",
      },
      {
        value: 2,
        emoji: "🎓",
        icon: "book-open",
        label: "Save for education",
        description: "Mine or my child's future",
      },
      {
        value: 4,
        emoji: "🌴",
        icon: "sun",
        label: "Retire comfortably",
        description: "Long-term financial freedom",
      },
      {
        value: 5,
        emoji: "📈",
        icon: "trending-up",
        label: "Grow my wealth",
        description: "Build it up over time",
      },
      {
        value: 1,
        emoji: "🛡️",
        icon: "shield",
        label: "Protect what I have",
        description: "Safety over growth",
      },
    ],
  },
  {
    id: "timeline",
    stepLabel: "Timeline",
    question: "How long can you leave your money invested?",
    hint: "Be honest — this shapes everything.",
    options: [
      {
        value: 1,
        emoji: "⚡",
        icon: "zap",
        label: "Less than 2 years",
        description: "I may need it soon",
      },
      {
        value: 2,
        emoji: "📅",
        icon: "calendar",
        label: "2–5 years",
        description: "Medium horizon",
      },
      {
        value: 3,
        emoji: "🗓️",
        icon: "calendar-range",
        label: "5–10 years",
        description: "I'm patient",
      },
      {
        value: 4,
        emoji: "♾️",
        icon: "infinity",
        label: "10+ years",
        description: "I'm in no rush at all",
      },
    ],
  },
  {
    id: "risk_gut",
    stepLabel: "Risk Gut-Check",
    question:
      "Imagine your $10,000 drops to $7,500 overnight. What do you do?",
    hint: "Be honest — there's no wrong answer.",
    options: [
      {
        value: 1,
        emoji: "😱",
        icon: "alert-triangle",
        label: "Sell everything",
        description: "I can't stomach this loss",
      },
      {
        value: 2,
        emoji: "😟",
        icon: "minus-circle",
        label: "Sell some of it",
        description: "Reduce my risk a bit",
      },
      {
        value: 3,
        emoji: "😐",
        icon: "circle",
        label: "Do nothing",
        description: "Wait and see what happens",
      },
      {
        value: 4,
        emoji: "😏",
        icon: "plus-circle",
        label: "Buy a little more",
        description: "Looks like a discount to me",
      },
      {
        value: 5,
        emoji: "😎",
        icon: "trending-up",
        label: "Buy a lot more",
        description: "I fully trust the long game",
      },
    ],
  },
  {
    id: "amount",
    stepLabel: "Investment Amount",
    question: "What are you working with?",
    hint: "Rough estimates are totally fine.",
    options: [
      {
        value: 1,
        emoji: "🌱",
        icon: "sprout",
        label: "Under $1,000",
        description: "Just getting started",
      },
      {
        value: 2,
        emoji: "💵",
        icon: "banknote",
        label: "$1,000 – $10,000",
        description: "Building momentum",
      },
      {
        value: 3,
        emoji: "💰",
        icon: "coins",
        label: "$10,000 – $50,000",
        description: "Solid foundation",
      },
      {
        value: 4,
        emoji: "🏦",
        icon: "landmark",
        label: "$50,000+",
        description: "Serious about this",
      },
    ],
  },
  {
    id: "involvement",
    stepLabel: "Involvement",
    question: "How hands-on do you want to be?",
    hint: "There's no wrong answer — it's your money.",
    options: [
      {
        value: 2,
        emoji: "🤖",
        icon: "cpu",
        label: "Fully automatic",
        description: "Just handle it for me",
      },
      {
        value: 3,
        emoji: "📬",
        icon: "mail",
        label: "Notify me when needed",
        description: "I'll approve the changes",
      },
      {
        value: 3,
        emoji: "🔍",
        icon: "search",
        label: "Explain before acting",
        description: "I want to understand first",
      },
      {
        value: 4,
        emoji: "🎮",
        icon: "sliders",
        label: "Full control",
        description: "Show me everything",
      },
    ],
  },
];

/** Sum of weighted answer values (~6–22). */
export function signupQuizScore(optionIndices) {
  let sum = 0;
  for (let i = 0; i < SIGNUP_QUIZ_QUESTIONS.length; i++) {
    const q = SIGNUP_QUIZ_QUESTIONS[i];
    const idx = optionIndices[i];
    const opt = q.options[idx];
    if (!opt) continue;
    sum += opt.value;
  }
  return sum;
}

export function finPilotRiskFromQuizScore(score) {
  if (score <= 10) return "Conservative";
  if (score <= 16) return "Balanced";
  return "Aggressive";
}

/** Canonical goal `type` values for `nestegg_user_goal` + AppContext. */
const GOAL_TYPES_BY_INDEX = ["home", "education", "retire", "grow", "protect"];

const GOAL_BASE_AMOUNTS = {
  home: 350_000,
  education: 80_000,
  retire: 500_000,
  grow: 250_000,
  protect: 120_000,
};

const TIMELINE_YEARS_FROM_NOW = [2, 4, 8, 20];
const AMOUNT_TIER_MULTIPLIER = [0.35, 0.7, 1.0, 1.45];

function labelForGoalType(type) {
  const map = {
    home: "Buy a home or big purchase",
    education: "Save for education",
    retire: "Retire comfortably",
    grow: "Grow my wealth",
    protect: "Protect what I have",
  };
  return map[type] ?? "Retire comfortably";
}

/**
 * Normalize goal objects from localStorage / legacy profile bundles.
 * @param {unknown} raw
 * @returns {{ type: string, label: string, targetAmount: number, targetYear: number, emoji: null } | null}
 */
export function normalizeStoredUserGoal(raw) {
  if (!raw || typeof raw !== "object") return null;
  const legacyTypeMap = {
    home_purchase: "home",
    retirement: "retire",
    wealth_growth: "grow",
    capital_preservation: "protect",
  };
  let type = legacyTypeMap[raw.type] ?? raw.type;
  const allowed = new Set(["home", "education", "retire", "grow", "protect"]);
  if (!allowed.has(type)) return null;
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim()
      : typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : labelForGoalType(type);
  const targetAmount = Number(raw.targetAmount);
  const targetYear = Number(raw.targetYear);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;
  if (!Number.isFinite(targetYear) || targetYear < 1900 || targetYear > 2200) return null;
  return {
    type,
    label,
    targetAmount,
    targetYear,
    emoji: raw.emoji === undefined || raw.emoji === null ? null : raw.emoji,
  };
}

/**
 * Build the persisted user goal from full quiz option indices (signup or FinPilot onboarding).
 * Uses goal choice, timeline (target year), and amount tier (target size).
 * @param {number[]} optionIndices
 */
/**
 * Override quiz-derived amounts with user-entered targets (signup / onboarding refine).
 * @param {{ type: string, label: string, targetAmount: number, targetYear: number, emoji?: null }} goal
 * @param {number} targetAmount
 * @param {number} targetYear
 */
export function mergeGoalWithTargets(goal, targetAmount, targetYear) {
  if (!goal || typeof goal !== "object") return null;
  const amt = Number(targetAmount);
  const yr = Number(targetYear);
  if (!Number.isFinite(amt) || amt <= 0) return null;
  if (!Number.isFinite(yr) || yr < 1900 || yr > 2200) return null;
  return normalizeStoredUserGoal({
    type: goal.type,
    label: typeof goal.label === "string" ? goal.label : labelForGoalType(goal.type),
    targetAmount: Math.round(amt),
    targetYear: Math.round(yr),
    emoji: goal.emoji === undefined || goal.emoji === null ? null : goal.emoji,
  });
}

export function buildNestEggUserGoal(optionIndices) {
  if (!Array.isArray(optionIndices) || optionIndices.length < SIGNUP_QUIZ_QUESTIONS.length) {
    return null;
  }
  const goalIdx = optionIndices[0];
  if (!Number.isInteger(goalIdx) || goalIdx < 0 || goalIdx >= GOAL_TYPES_BY_INDEX.length) {
    return null;
  }
  const type = GOAL_TYPES_BY_INDEX[goalIdx];
  const label = SIGNUP_QUIZ_QUESTIONS[0].options[goalIdx]?.label ?? labelForGoalType(type);

  const timelineIdx = optionIndices[1];
  const yearDelta =
    Number.isInteger(timelineIdx) && timelineIdx >= 0 && timelineIdx < TIMELINE_YEARS_FROM_NOW.length
      ? TIMELINE_YEARS_FROM_NOW[timelineIdx]
      : 8;
  const targetYear = new Date().getFullYear() + yearDelta;

  const amountIdx = optionIndices[3];
  const tierMult =
    Number.isInteger(amountIdx) && amountIdx >= 0 && amountIdx < AMOUNT_TIER_MULTIPLIER.length
      ? AMOUNT_TIER_MULTIPLIER[amountIdx]
      : 1;
  const targetAmount = Math.round(GOAL_BASE_AMOUNTS[type] * tierMult);

  return {
    type,
    label,
    targetAmount,
    targetYear,
    emoji: null,
  };
}

/** Persisted bundle keys align with AppContext profileStorageKey JSON. */
export function buildSignupProfilePayload(optionIndices, quizAnswersSnapshot) {
  const score = signupQuizScore(optionIndices);
  const finPilotRiskProfile = finPilotRiskFromQuizScore(score);
  const goal = buildNestEggUserGoal(optionIndices);
  const minScore = 6;
  const maxScore = 22;
  const riskScore = Math.round(
    Math.min(100, Math.max(0, ((score - minScore) / (maxScore - minScore)) * 100)),
  );
  return {
    goal,
    riskLabel: finPilotRiskProfile,
    riskScore,
    riskProfile: finPilotRiskProfile,
    signupQuiz: {
      answeredAt: new Date().toISOString(),
      selections: quizAnswersSnapshot,
      score,
      finPilotRiskProfile,
    },
  };
}
