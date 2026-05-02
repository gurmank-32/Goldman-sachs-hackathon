import { useNavigate } from "react-router-dom";
import OnboardingProgress from "../components/marcus/OnboardingProgress.jsx";
import { formatUsd } from "../lib/portfolioMath.js";
import {
  ONBOARDING_COMPLETE_KEY,
  profileStorageKey,
  useAppContext,
  useAuth,
} from "../store/AppContext.jsx";

/** Goal step — Marcus-style single hero screen with one primary CTA. */
export default function GoalSetter() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setSelectedGoal, userProfile, riskProfile, portfolio } =
    useAppContext();

  const targetAmount = portfolio?.goal?.targetAmount ?? 500_000;

  function handleLetsGo() {
    const goal = {
      type: "retirement",
      targetAmount: 500_000,
      targetYear: 2050,
    };
    setSelectedGoal(goal);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    const email = currentUser?.email;
    if (email) {
      localStorage.setItem(
        profileStorageKey(email),
        JSON.stringify({
          goal,
          riskLabel: userProfile.riskLabel,
          riskScore: userProfile.riskScore,
          riskProfile,
        }),
      );
    }
    navigate("/dashboard", { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-white px-5 pb-16 pt-3">
      <OnboardingProgress step={2} totalSteps={2} />

      <div className="mt-12 flex flex-1 flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A1A2E]/45">
          Your goal
        </p>
        <h1 className="mt-4 max-w-md text-[26px] font-semibold leading-tight tracking-tight text-[#1A1A2E]">
          Let&apos;s anchor everything to retirement
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-[#1A1A2E]/55">
          We&apos;ll use a clear target so every scenario and rebalance speaks
          your language.
        </p>

        <div className="mt-12 w-full max-w-sm rounded-2xl border border-[#E8ECF2] bg-gradient-to-b from-white to-[#F7FAFC] px-6 py-10 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
            Target nest egg
          </p>
          <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-[#1A1A2E]">
            {formatUsd(targetAmount)}
          </p>
          <p className="mt-2 text-sm text-[#1A1A2E]/45">
            Horizon ~2050 · Risk:{" "}
            <span className="font-semibold text-[#6DB6FF]">
              {userProfile?.riskLabel ?? "Moderate"}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleLetsGo}
          className="mt-12 w-full max-w-sm min-h-[56px] rounded-2xl bg-[#6DB6FF] px-6 text-[16px] font-semibold text-[#0A1628] shadow-lg shadow-[#6DB6FF]/25 transition hover:bg-[#5AACF5] active:scale-[0.98]"
        >
          Let&apos;s go
        </button>
      </div>
    </main>
  );
}
