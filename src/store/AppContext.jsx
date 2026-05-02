import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FINPILOT_ONBOARDING_KEY,
  SIGNUP_QUIZ_QUESTIONS,
  buildSignupProfilePayload,
} from "../constants/signupQuiz.js";
import { alexChenPortfolio } from "../data/portfolio.js";

const AppContext = createContext(null);
const AuthContext = createContext(null);

const SESSION_KEY = "nestegg_session";
const USERS_KEY = "nestegg_users";
export const ONBOARDING_COMPLETE_KEY = "nestegg_onboarding_complete";

/** Shown anywhere a user’s name is missing (session/UI fallbacks). */
export const DEFAULT_DISPLAY_NAME = "Investor";

const PASSWORD_SALT = "nestegg_salt";

/** Demo-local encoding — not real cryptography; avoids plaintext in localStorage. */
export function hashPassword(password) {
  return btoa(String(password) + PASSWORD_SALT);
}

export function profileStorageKey(email) {
  const key = String(email ?? "")
    .trim()
    .toLowerCase();
  return `nestegg_profile_${key}`;
}

function readPersistedProfileBundle(email) {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(profileStorageKey(email));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function computeInitialAppState() {
  const sessionUser = readSessionUser();
  const onboardingComplete =
    localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";

  let userProfile = {
    name: sessionUser?.name ?? DEFAULT_DISPLAY_NAME,
    riskScore: null,
    riskLabel: initialRiskLabelFromPortfolio(alexChenPortfolio),
  };
  let selectedGoal = null;
  let riskProfileState = null;

  if (sessionUser?.email && onboardingComplete) {
    const p = readPersistedProfileBundle(sessionUser.email);
    if (p) {
      if (p.goal != null) selectedGoal = p.goal;
      if (p.riskLabel !== undefined) userProfile.riskLabel = p.riskLabel;
      if (p.riskScore !== undefined) userProfile.riskScore = p.riskScore;
      userProfile.name =
        sessionUser.name?.trim() || DEFAULT_DISPLAY_NAME;
      if (p.riskProfile !== undefined) riskProfileState = p.riskProfile;
    }
  } else if (sessionUser) {
    userProfile.name =
      sessionUser.name?.trim() || DEFAULT_DISPLAY_NAME;
  }

  return {
    userProfile,
    selectedGoal,
    riskProfile: riskProfileState,
  };
}

/** Thrown from signIn — map to user-facing copy in SignIn. */
export const SIGN_IN_ERROR_EMAIL_NOT_FOUND = "SIGN_IN_EMAIL_NOT_FOUND";
export const SIGN_IN_ERROR_WRONG_PASSWORD = "SIGN_IN_WRONG_PASSWORD";

export const DEMO_ACCOUNT_EMAIL = "alex@nestegg.demo";
export const DEMO_ACCOUNT_PASSWORD = "Demo1234!";

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function initialsFromName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readSessionUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (
      u &&
      typeof u.name === "string" &&
      typeof u.email === "string" &&
      typeof u.avatar === "string"
    ) {
      return u;
    }
    return null;
  } catch {
    return null;
  }
}

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function initialRiskLabelFromPortfolio(portfolio) {
  const raw = portfolio?.user?.riskProfile;
  if (!raw || typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  const map = {
    conservative: "Conservative",
    moderate: "Moderate",
    aggressive: "Aggressive",
  };
  return map[key] ?? null;
}

export function AppProvider({ children }) {
  const navigate = useNavigate();

  const initialApp = computeInitialAppState();

  const [userProfile, setUserProfile] = useState(initialApp.userProfile);
  const [selectedGoal, setSelectedGoal] = useState(initialApp.selectedGoal);
  const [riskProfile, setRiskProfile] = useState(initialApp.riskProfile);

  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!readSessionUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const email = currentUser?.email;
    if (!email) return;
    if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) !== "true") return;
    const p = readPersistedProfileBundle(email);
    if (!p) return;
    setSelectedGoal(p.goal ?? null);
    setUserProfile((prev) => ({
      ...prev,
      name: currentUser.name || DEFAULT_DISPLAY_NAME,
      riskLabel:
        p.riskLabel !== undefined ? p.riskLabel : prev.riskLabel,
      riskScore:
        p.riskScore !== undefined ? p.riskScore : prev.riskScore,
    }));
    if (p.riskProfile !== undefined) setRiskProfile(p.riskProfile);
  }, [currentUser]);

  const signUp = useCallback(async (name, email, password, quizOptionIndices) => {
    if (
      !Array.isArray(quizOptionIndices) ||
      quizOptionIndices.length !== SIGNUP_QUIZ_QUESTIONS.length
    ) {
      throw new Error("Please answer every question to finish signing up.");
    }
    for (let qi = 0; qi < SIGNUP_QUIZ_QUESTIONS.length; qi++) {
      const idx = quizOptionIndices[qi];
      const nOpts = SIGNUP_QUIZ_QUESTIONS[qi].options.length;
      if (!Number.isInteger(idx) || idx < 0 || idx >= nOpts) {
        throw new Error("Please answer every question to finish signing up.");
      }
    }

    setIsLoading(true);
    await delay(1200);
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      setIsLoading(false);
      throw new Error("An account with this email already exists.");
    }
    const avatar = initialsFromName(trimmedName);
    const record = {
      name: trimmedName,
      email: trimmedEmail,
      passwordHash: hashPassword(password),
      avatar,
    };
    users.push(record);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const sessionUser = {
      name: record.name,
      email: record.email,
      avatar: record.avatar,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

    const quizSnapshot = quizOptionIndices.map((idx, qi) => ({
      questionId: SIGNUP_QUIZ_QUESTIONS[qi].id,
      optionLabel: SIGNUP_QUIZ_QUESTIONS[qi].options[idx].label,
    }));
    const profileBundle = buildSignupProfilePayload(
      quizOptionIndices,
      quizSnapshot,
    );
    try {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      localStorage.setItem(FINPILOT_ONBOARDING_KEY, "true");
      localStorage.setItem(
        profileStorageKey(trimmedEmail),
        JSON.stringify(profileBundle),
      );
    } catch {
      /* ignore quota errors */
    }

    setSelectedGoal(profileBundle.goal ?? null);
    setUserProfile((prev) => ({
      ...prev,
      name: trimmedName || DEFAULT_DISPLAY_NAME,
      riskLabel: profileBundle.riskLabel ?? prev.riskLabel,
      riskScore:
        profileBundle.riskScore !== undefined
          ? profileBundle.riskScore
          : prev.riskScore,
    }));
    if (profileBundle.riskProfile != null) {
      setRiskProfile(profileBundle.riskProfile);
    }

    setCurrentUser(sessionUser);
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  const signIn = useCallback(async (email, password) => {
    setIsLoading(true);
    await delay(1200);
    const trimmedEmail = String(email).trim().toLowerCase();
    const users = readUsers();
    const user = users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      setIsLoading(false);
      throw new Error(SIGN_IN_ERROR_EMAIL_NOT_FOUND);
    }
    const inputHash = hashPassword(password);
    let passwordOk = user.passwordHash === inputHash;
    if (!passwordOk && user.password === String(password)) {
      passwordOk = true;
      const list = readUsers();
      const ix = list.findIndex(
        (u) => u.email.toLowerCase() === trimmedEmail,
      );
      if (ix >= 0) {
        const next = { ...list[ix], passwordHash: inputHash };
        delete next.password;
        list[ix] = next;
        localStorage.setItem(USERS_KEY, JSON.stringify(list));
      }
    }
    if (!passwordOk) {
      setIsLoading(false);
      throw new Error(SIGN_IN_ERROR_WRONG_PASSWORD);
    }
    const sessionUser = {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setCurrentUser(sessionUser);
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  /**
   * Demo hackathon shortcut: ensure judges have a seeded account, onboarding
   * flag, and context aligned with the mock portfolio.
   */
  const ensureDemoAccount = useCallback(() => {
    const users = readUsers();
    const email = DEMO_ACCOUNT_EMAIL.toLowerCase();
    if (!users.some((u) => u.email.toLowerCase() === email)) {
      users.push({
        name: "Alex Chen",
        email,
        passwordHash: hashPassword(DEMO_ACCOUNT_PASSWORD),
        avatar: initialsFromName("Alex Chen"),
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    localStorage.setItem(FINPILOT_ONBOARDING_KEY, "true");
    const demoGoal = {
      type: "retirement",
      targetAmount: alexChenPortfolio.goal.targetAmount,
      targetYear: 2050,
    };
    const demoRiskLabel = initialRiskLabelFromPortfolio(alexChenPortfolio);
    setUserProfile((prev) => ({
      ...prev,
      name: alexChenPortfolio.user.name,
      riskLabel: demoRiskLabel,
    }));
    setSelectedGoal(demoGoal);
    localStorage.setItem(
      profileStorageKey(email),
      JSON.stringify({
        goal: demoGoal,
        riskLabel: demoRiskLabel,
        riskScore: null,
        riskProfile: null,
      }),
    );
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setIsAuthenticated(false);
    navigate("/signin", { replace: true });
  }, [navigate]);

  const appValue = useMemo(
    () => ({
      userProfile,
      setUserProfile,
      selectedGoal,
      setSelectedGoal,
      portfolio: alexChenPortfolio,
      riskProfile,
      setRiskProfile,
    }),
    [userProfile, selectedGoal, riskProfile],
  );

  const authValue = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isLoading,
      signUp,
      signIn,
      signOut,
      ensureDemoAccount,
    }),
    [currentUser, isAuthenticated, isLoading, signUp, signIn, signOut, ensureDemoAccount],
  );

  return (
    <AppContext.Provider value={appValue}>
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AppProvider");
  }
  return ctx;
}
