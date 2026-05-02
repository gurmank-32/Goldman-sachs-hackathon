import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { alexChenPortfolio } from "../data/portfolio.js";

/**
 * selectedScenario shape: `{ type, name, color }` — optional scenarios module.
 */

const AppContext = createContext(null);
const AuthContext = createContext(null);

const SESSION_KEY = "nestegg_session";
const USERS_KEY = "nestegg_users";

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

  const [userProfile, setUserProfile] = useState({
    name: alexChenPortfolio.user.name,
    riskScore: null,
    riskLabel: initialRiskLabelFromPortfolio(alexChenPortfolio),
  });
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [riskProfile, setRiskProfile] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => readSessionUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!readSessionUser());
  const [isLoading, setIsLoading] = useState(false);

  const signUp = useCallback(async (name, email, password) => {
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
    /** Demo only — passwords stored in plain text for local simulation */
    const record = {
      name: trimmedName,
      email: trimmedEmail,
      password: String(password),
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
    if (!user || user.password !== String(password)) {
      setIsLoading(false);
      throw new Error("Invalid email or password.");
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
      selectedScenario,
      setSelectedScenario,
      portfolio: alexChenPortfolio,
      riskProfile,
      setRiskProfile,
    }),
    [userProfile, selectedGoal, selectedScenario, riskProfile],
  );

  const authValue = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isLoading,
      signUp,
      signIn,
      signOut,
    }),
    [currentUser, isAuthenticated, isLoading, signUp, signIn, signOut],
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
