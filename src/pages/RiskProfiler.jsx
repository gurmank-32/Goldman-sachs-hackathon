import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../store/AppContext.jsx";

const QUESTIONS = [
  {
    id: "drawdown",
    prompt: "How would you react if your portfolio dropped 20% in a month?",
    options: [
      { label: "I'd sell everything and move to cash", points: 1 },
      { label: "I'd be worried but wait it out", points: 2 },
      { label: "I'd see it as a buying opportunity", points: 3 },
    ],
  },
  {
    id: "horizon",
    prompt: "When do you need this money?",
    options: [
      { label: "Within 2 years", points: 1 },
      { label: "In 3–7 years", points: 2 },
      { label: "More than 7 years away", points: 3 },
    ],
  },
  {
    id: "goal",
    prompt: "What's your main financial goal?",
    options: [
      { label: "Protect what I have", points: 1 },
      { label: "Grow steadily over time", points: 2 },
      { label: "Maximize growth, I can handle risk", points: 3 },
    ],
  },
  {
    id: "income",
    prompt: "What's your monthly income situation?",
    options: [
      { label: "Fixed salary, very stable", points: 1 },
      { label: "Mostly stable with some variation", points: 2 },
      { label: "Variable — freelance or business", points: 3 },
    ],
  },
  {
    id: "allocation",
    prompt: "How much of your savings are you investing here?",
    options: [
      { label: "More than 50% of my savings", points: 1 },
      { label: "Around 25–50%", points: 2 },
      { label: "Less than 25%, this is extra money", points: 3 },
    ],
  },
];

function scoreToResult(total) {
  if (total <= 8) {
    return {
      label: "Conservative",
      summary:
        "You prioritize capital preservation and predictability. A cautious mix aligned with shorter horizons or lower volatility may suit you best.",
    };
  }
  if (total <= 11) {
    return {
      label: "Moderate",
      summary:
        "You balance growth with stability. A middle path—some stocks for growth, some bonds or stability for balance—often fits this profile.",
    };
  }
  return {
    label: "Aggressive",
    summary:
      "You’re comfortable with higher ups and downs for long-term growth. A growth-oriented allocation can make sense if your timeline matches.",
  };
}

export default function RiskProfiler() {
  const navigate = useNavigate();
  const { setUserProfile } = useAppContext();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const current = QUESTIONS[step];
  const selectedPoints = answers[current.id];
  const isLast = step === QUESTIONS.length - 1;
  const canAdvance = selectedPoints !== undefined;

  const progress = useMemo(
    () => ((step + 1) / QUESTIONS.length) * 100,
    [step],
  );

  function selectOption(questionId, points) {
    setAnswers((prev) => ({ ...prev, [questionId]: points }));
  }

  function finish(total) {
    const { label } = scoreToResult(total);
    setUserProfile((prev) => ({
      ...prev,
      riskScore: total,
      riskLabel: label,
    }));
    navigate("/goal");
  }

  function goNext() {
    if (!canAdvance) return;
    if (isLast) {
      const total = QUESTIONS.reduce(
        (sum, q) => sum + (answers[q.id] ?? 0),
        0,
      );
      finish(total);
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-lg overflow-x-hidden px-4 py-8 pb-10 sm:py-10">
      <div className="mb-6 flex min-w-0 items-center justify-between gap-2 text-xs text-neutral-500">
        <span>
          Question {step + 1} of {QUESTIONS.length}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={`Quiz progress, question ${step + 1} of ${QUESTIONS.length}`}
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-10">
        <h1 className="text-base font-semibold leading-snug text-neutral-900 sm:text-lg">
          {current.prompt}
        </h1>

        <div
          className="mt-6 space-y-3"
          role="radiogroup"
          aria-labelledby={`q-${current.id}`}
        >
          <span id={`q-${current.id}`} className="sr-only">
            {current.prompt}
          </span>
          {current.options.map((opt) => {
            const active = selectedPoints === opt.points;
            return (
              <button
                key={opt.points}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectOption(current.id, opt.points)}
                className={`flex min-h-[48px] w-full min-w-0 rounded-xl border px-3 py-3 text-left text-sm leading-relaxed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:px-4 ${
                  active
                    ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/80"
                }`}
              >
                <span
                  className={`mt-0.5 mr-3 flex h-4 w-4 shrink-0 rounded-full border ${
                    active
                      ? "border-neutral-900 bg-neutral-900"
                      : "border-neutral-300 bg-white"
                  }`}
                  aria-hidden
                />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex min-w-0 flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="min-h-[44px] min-w-[4.5rem] text-sm font-medium text-neutral-600 transition hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="min-h-[44px] rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:px-6"
          >
            {isLast ? "See result" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}
