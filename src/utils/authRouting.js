import { VERITE_ONBOARDING_KEY } from "../constants/signupQuiz.js";
import {
  INAPP_READY_FOR_LINK_KEY,
  ONBOARDING_COMPLETE_KEY,
  PENDING_LINK_ACCOUNTS_KEY,
} from "../constants/inappOnboarding.js";

/** Call after link-accounts (or skip) so `/dashboard` and Vérité shell unlock. */
export function completeVeriteOnboardingUnlock() {
  try {
    localStorage.setItem(VERITE_ONBOARDING_KEY, "true");
    localStorage.removeItem(PENDING_LINK_ACCOUNTS_KEY);
    localStorage.removeItem(INAPP_READY_FOR_LINK_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("verite-onboarding-complete"));
  }
}

/** Where to send the user right after sign-in (or when auth becomes true). */
export function getPostAuthEntryPath() {
  if (typeof localStorage === "undefined") return "/";
  if (localStorage.getItem(VERITE_ONBOARDING_KEY) === "true") {
    return "/dashboard";
  }
  if (localStorage.getItem(PENDING_LINK_ACCOUNTS_KEY) === "true") {
    return "/link-accounts";
  }
  if (localStorage.getItem(INAPP_READY_FOR_LINK_KEY) === "true") {
    return "/link-accounts";
  }
  if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true") {
    return "/dashboard";
  }
  return "/";
}

/** If user may not open `/dashboard` yet, return redirect path; else null. */
export function getDashboardBlockRedirect() {
  if (typeof localStorage === "undefined") return "/";
  if (localStorage.getItem(VERITE_ONBOARDING_KEY) === "true") return null;
  if (localStorage.getItem(PENDING_LINK_ACCOUNTS_KEY) === "true") {
    return "/link-accounts";
  }
  if (localStorage.getItem(INAPP_READY_FOR_LINK_KEY) === "true") {
    return "/link-accounts";
  }
  if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true") return null;
  return "/";
}
