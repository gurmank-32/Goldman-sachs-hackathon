import { Navigate, useNavigate } from "react-router-dom";
import OnboardingProgress from "../components/marcus/OnboardingProgress.jsx";
import {
  DEFAULT_DISPLAY_NAME,
  ONBOARDING_COMPLETE_KEY,
  useAppContext,
  useAuth,
} from "../store/AppContext.jsx";

const OPTIONS = [
  {
    id: "conservative",
    title: "Preserve what I have",
    subtitle: "Smaller swings, more bonds · Conservative",
    riskLabel: "Conservative",
    riskScore: 28,
  },
  {
    id: "moderate",
    title: "Balance growth and calm",
    subtitle: "Stocks & bonds in sync · Moderate",
    riskLabel: "Moderate",
    riskScore: 55,
  },
  {
    id: "aggressive",
    title: "Maximize long-term growth",
    subtitle: "Higher equities · Aggressive",
    riskLabel: "Aggressive",
    riskScore: 82,
  },
];

export default function RiskProfiler() {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const { setUserProfile, setRiskProfile } = useAppContext();

  const onboardingComplete =
    typeof localStorage !== "undefined" &&
    localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";

  if (isAuthenticated && onboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  function chooseRisk(option) {
    setUserProfile((prev) => ({
      ...prev,
      name:
        (currentUser?.name && String(currentUser.name).trim()) ||
        prev.name ||
        DEFAULT_DISPLAY_NAME,
      riskLabel: option.riskLabel,
      riskScore: option.riskScore,
    }));
    setRiskProfile({
      level: option.id,
      riskLabel: option.riskLabel,
      riskScore: option.riskScore,
      source: "risk-profiler",
    });
    navigate("/goal");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-white px-5 pb-12 pt-3">
      <OnboardingProgress step={1} totalSteps={2} />

      <div className="mt-10 flex flex-1 flex-col">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A1A2E]/45">
          Comfort with risk
        </p>
        <h1 className="mt-4 text-center text-[26px] font-semibold leading-tight tracking-tight text-[#1A1A2E]">
          What feels right when markets move?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-[#1A1A2E]/55">
          One tap — we&apos;ll tailor your plan. You can refine this anytime.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => chooseRisk(opt)}
              className="group flex min-h-[72px] w-full flex-col items-start justify-center rounded-2xl border-2 border-[#E8ECF2] bg-white px-5 py-4 text-left shadow-sm transition hover:border-[#6DB6FF]/55 hover:shadow-md active:scale-[0.99]"
            >
              <span className="text-[17px] font-semibold text-[#1A1A2E]">
                {opt.title}
              </span>
              <span className="mt-1 text-[13px] text-[#1A1A2E]/50">
                {opt.subtitle}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
