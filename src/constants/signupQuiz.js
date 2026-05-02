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

function goalRecord(goalOptionIndex) {
  const y = new Date().getFullYear();
  const rows = [
    {
      type: "home_purchase",
      title: "Buy a home or big purchase",
      targetAmount: 350_000,
      targetYear: y + 5,
    },
    {
      type: "education",
      title: "Save for education",
      targetAmount: 80_000,
      targetYear: y + 10,
    },
    {
      type: "retirement",
      title: "Retire comfortably",
      targetAmount: 500_000,
      targetYear: y + 25,
    },
    {
      type: "wealth_growth",
      title: "Grow my wealth",
      targetAmount: 250_000,
      targetYear: y + 15,
    },
    {
      type: "capital_preservation",
      title: "Protect what I have",
      targetAmount: 120_000,
      targetYear: y + 10,
    },
  ];
  return rows[goalOptionIndex] ?? rows[2];
}

/** Persisted bundle keys align with AppContext profileStorageKey JSON. */
export function buildSignupProfilePayload(optionIndices, quizAnswersSnapshot) {
  const score = signupQuizScore(optionIndices);
  const finPilotRiskProfile = finPilotRiskFromQuizScore(score);
  const goalIdx = optionIndices[0];
  const goal = goalRecord(goalIdx);
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
