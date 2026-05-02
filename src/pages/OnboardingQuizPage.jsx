import { Navigate, useNavigate } from "react-router-dom";
import {
  INAPP_QUIZ_INDICES_KEY,
  INAPP_READY_FOR_LINK_KEY,
  PENDING_LINK_ACCOUNTS_KEY,
} from "../constants/inappOnboarding.js";
import { VERITE_ONBOARDING_KEY } from "../constants/signupQuiz.js";
import { useAuth } from "../store/AppContext.jsx";
import { RiskProfilerQuiz, globalStyle } from "../uploaded/finpilot.jsx";

function quizEntryRedirect() {
  if (typeof localStorage === "undefined") return null;
  if (localStorage.getItem(VERITE_ONBOARDING_KEY) === "true") {
    return "/dashboard";
  }
  if (localStorage.getItem(PENDING_LINK_ACCOUNTS_KEY) === "true") {
    return "/link-accounts";
  }
  if (localStorage.getItem(INAPP_READY_FOR_LINK_KEY) === "true") {
    return "/link-accounts";
  }
  return null;
}

export default function OnboardingQuizPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const redirect = quizEntryRedirect();
  if (redirect) return <Navigate to={redirect} replace />;

  const handleComplete = (indices) => {
    try {
      localStorage.setItem(INAPP_QUIZ_INDICES_KEY, JSON.stringify(indices));
    } catch {
      /* ignore */
    }
    navigate("/goal", { replace: true });
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
      <RiskProfilerQuiz onComplete={handleComplete} />
    </>
  );
}
