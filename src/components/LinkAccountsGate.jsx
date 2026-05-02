import { Navigate } from "react-router-dom";
import {
  INAPP_READY_FOR_LINK_KEY,
  PENDING_LINK_ACCOUNTS_KEY,
} from "../constants/inappOnboarding.js";
import { FINPILOT_ONBOARDING_KEY } from "../constants/signupQuiz.js";

export default function LinkAccountsGate({ children }) {
  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem(FINPILOT_ONBOARDING_KEY) === "true"
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  const pending = localStorage.getItem(PENDING_LINK_ACCOUNTS_KEY) === "true";
  const ready = localStorage.getItem(INAPP_READY_FOR_LINK_KEY) === "true";
  if (!pending && !ready) {
    return <Navigate to="/" replace />;
  }
  return children;
}
