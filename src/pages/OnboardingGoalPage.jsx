import { Navigate, useNavigate } from "react-router-dom";
import {
  INAPP_QUIZ_INDICES_KEY,
  INAPP_READY_FOR_LINK_KEY,
  PENDING_LINK_ACCOUNTS_KEY,
} from "../constants/inappOnboarding.js";
import { FINPILOT_ONBOARDING_KEY } from "../constants/signupQuiz.js";
import { SIGNUP_QUIZ_QUESTIONS } from "../constants/signupQuiz.js";
import { useAppContext, useAuth } from "../store/AppContext.jsx";
import { GoalTargetStep, globalStyle } from "../uploaded/finpilot.jsx";
import { persistProfilerAndGoal } from "../utils/persistProfilerGoal.js";

function readQuizIndices() {
  try {
    const raw = localStorage.getItem(INAPP_QUIZ_INDICES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== SIGNUP_QUIZ_QUESTIONS.length ||
      !parsed.every((x) => x !== null && Number.isInteger(x))
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function OnboardingGoalPage() {
  const navigate = useNavigate();
  const { signOut, currentUser } = useAuth();
  const { setSelectedGoal, setUserProfile, setRiskProfile } = useAppContext();

  const indices = readQuizIndices();

  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem(FINPILOT_ONBOARDING_KEY) === "true"
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem(PENDING_LINK_ACCOUNTS_KEY) === "true" &&
    !indices
  ) {
    return <Navigate to="/link-accounts" replace />;
  }

  if (!indices) {
    return <Navigate to="/" replace />;
  }

  const handleComplete = (profile, optionIndices, refinedGoal) => {
    persistProfilerAndGoal({
      email: currentUser?.email,
      optionIndices,
      refinedGoal,
      setSelectedGoal,
      setUserProfile,
      setRiskProfile,
      riskProfileLabel: profile,
    });
    try {
      localStorage.setItem(INAPP_READY_FOR_LINK_KEY, "true");
    } catch {
      /* ignore */
    }
    navigate("/link-accounts", { replace: true });
  };

  const handleBack = () => {
    navigate("/", { replace: true });
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200 }}>
        <button
          type="button"
          className="btn-outline"
          style={{ fontSize: 13, padding: "8px 14px", background: "white" }}
          onClick={() => signOut()}
        >
          Sign out
        </button>
      </div>
      <GoalTargetStep
        quizSelections={indices}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </>
  );
}
