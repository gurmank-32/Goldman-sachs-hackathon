import {
  SIGNUP_QUIZ_QUESTIONS,
  buildSignupProfilePayload,
  normalizeStoredUserGoal,
} from "../constants/signupQuiz.js";
import {
  profileStorageKey,
  USER_GOAL_STORAGE_KEY,
} from "../store/AppContext.jsx";

/**
 * Persists quiz-derived profile + goal (same shape as legacy FinPilot onboarding).
 */
export function persistProfilerAndGoal({
  email,
  optionIndices,
  refinedGoal,
  setSelectedGoal,
  setUserProfile,
  setRiskProfile,
  riskProfileLabel,
}) {
  if (
    !Array.isArray(optionIndices) ||
    optionIndices.length !== SIGNUP_QUIZ_QUESTIONS.length ||
    !optionIndices.every((x) => x !== null)
  ) {
    return;
  }
  const quizSnapshot = optionIndices.map((idx, qi) => ({
    questionId: SIGNUP_QUIZ_QUESTIONS[qi].id,
    optionLabel: SIGNUP_QUIZ_QUESTIONS[qi].options[idx].label,
  }));
  const payload = buildSignupProfilePayload(optionIndices, quizSnapshot);
  const goalNorm =
    refinedGoal != null
      ? normalizeStoredUserGoal(refinedGoal)
      : payload.goal != null
        ? normalizeStoredUserGoal(payload.goal)
        : null;

  if (goalNorm && email) {
    try {
      const key = profileStorageKey(email);
      let merged = { ...payload };
      try {
        const prevRaw = localStorage.getItem(key);
        if (prevRaw) {
          const prev = JSON.parse(prevRaw);
          if (prev && typeof prev === "object") merged = { ...prev, ...payload };
        }
      } catch {
        /* ignore */
      }
      merged = { ...merged, goal: goalNorm };
      localStorage.setItem(key, JSON.stringify(merged));
      localStorage.setItem(USER_GOAL_STORAGE_KEY, JSON.stringify(goalNorm));
    } catch {
      /* ignore */
    }
    setSelectedGoal(goalNorm);
  }

  setUserProfile((prev) => ({
    ...prev,
    riskLabel: payload.riskLabel ?? prev.riskLabel,
    riskScore:
      payload.riskScore !== undefined ? payload.riskScore : prev.riskScore,
  }));

  if (riskProfileLabel != null && setRiskProfile) {
    setRiskProfile(riskProfileLabel);
  }
}
