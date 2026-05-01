import { useMemo, useState } from "react";

const QUESTIONS = [
  {
    id: "drawdown",
    prompt:
      "If your portfolio dropped 20% in a week, what would you most likely do?",
    options: [
      {
        key: "sell",
        label: "Sell and move to something that feels safer",
        weight: 0,
      },
      {
        key: "wait",
        label: "Do nothing and give it time",
        weight: 1,
      },
      {
        key: "buy",
        label: "Buy more while prices are lower",
        weight: 2,
      },
    ],
  },
  {
    id: "horizon",
    prompt: "How long could you leave this money invested without needing it?",
    options: [
      {
        key: "short",
        label: "Under a year—I may need it soon",
        weight: 0,
      },
      {
        key: "medium",
        label: "A few years",
        weight: 1,
      },
      {
        key: "long",
        label: "Five years or more",
        weight: 2,
      },
    ],
  },
  {
    id: "priority",
    prompt: "When you think about this money, what matters most?",
    options: [
      {
        key: "preserve",
        label: "Keeping what I have—not taking big hits",
        weight: 0,
      },
      {
        key: "balance",
        label: "Steady growth with some ups and downs",
        weight: 1,
      },
      {
        key: "grow",
        label: "Growing as much as possible over time",
        weight: 2,
      },
    ],
  },
  {
    id: "hot_tip",
    prompt:
      "A friend mentions a fast-moving opportunity: big upside, but it could also go badly. You’d probably…",
    options: [
      {
        key: "pass",
        label: "Pass—it’s not for me",
        weight: 0,
      },
      {
        key: "dabble",
        label: "Maybe try a small amount I’m OK losing",
        weight: 1,
      },
      {
        key: "lean_in",
        label: "Dig in and consider a meaningful stake",
        weight: 2,
      },
    ],
  },
  {
    id: "swings",
    prompt: "Big swings in your balance over a few months usually make you feel…",
    options: [
      {
        key: "stressed",
        label: "Stressed—I prefer things calmer",
        weight: 0,
      },
      {
        key: "tolerate",
        label: "Uneasy, but fine if the plan still makes sense",
        weight: 1,
      },
      {
        key: "fine",
        label: "Fine—I’m thinking in years, not months",
        weight: 2,
      },
    ],
  },
];

function scoreToProfile(total) {
  if (total <= 3) {
    return {
      label: "Conservative",
      summary:
        "You value stability and sleep-at-night comfort. A steadier mix with less drama in the short run is likely a better fit.",
    };
  }
  if (total <= 6) {
    return {
      label: "Moderate",
      summary:
        "You’re open to some bumps for better long-term growth, but you don’t want a rollercoaster. A balanced approach usually matches this mindset.",
    };
  }
  return {
    label: "Aggressive",
    summary:
      "You’re comfortable with bigger swings if it supports stronger long-term growth. A growth-leaning mix may suit you—if your timeline truly matches that patience.",
  };
}

export default function RiskProfilerQuiz({ onComplete }) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState({});
  const [complete, setComplete] = useState(false);

  const current = QUESTIONS[step];
  const selected = choices[current.id];
  const isLast = step === QUESTIONS.length - 1;

  const result = useMemo(() => {
    const total = QUESTIONS.reduce((sum, q) => sum + (choices[q.id] ?? 0), 0);
    return scoreToProfile(total);
  }, [choices]);

  const canGoNext = selected !== undefined;

  function selectOption(questionId, weight) {
    setChoices((prev) => ({ ...prev, [questionId]: weight }));
  }

  function goNext() {
    if (!canGoNext) return;
    if (isLast) {
      const total = QUESTIONS.reduce(
        (sum, q) => sum + (choices[q.id] ?? 0),
        0,
      );
      onComplete?.(scoreToProfile(total));
      setComplete(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    if (complete) {
      setComplete(false);
      setStep(QUESTIONS.length - 1);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  }

  function restart() {
    setStep(0);
    setChoices({});
    setComplete(false);
  }

  if (complete) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-10 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Your risk profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
            {result.label}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            {result.summary}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={restart}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Retake quiz
            </button>
            <button
              type="button"
              onClick={goBack}
              className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
            >
              Edit last answer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-8 flex items-center justify-between text-xs text-neutral-500">
        <span>
          Question {step + 1} of {QUESTIONS.length}
        </span>
        <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-neutral-100"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-300 ease-out"
          style={{
            width: `${((step + 1) / QUESTIONS.length) * 100}%`,
          }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="text-lg font-semibold leading-snug text-neutral-900">
          {current.prompt}
        </h1>

        <div
          className="mt-6 space-y-3"
          role="radiogroup"
          aria-labelledby={`question-${current.id}`}
        >
          <span id={`question-${current.id}`} className="sr-only">
            {current.prompt}
          </span>
          {current.options.map((opt) => {
            const active = selected === opt.weight;
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectOption(current.id, opt.weight)}
                className={`flex w-full rounded-xl border px-4 py-3 text-left text-sm leading-relaxed transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
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

        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            {isLast ? "See my profile" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
