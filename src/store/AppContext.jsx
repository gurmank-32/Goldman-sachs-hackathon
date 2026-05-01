import { createContext, useContext, useMemo, useState } from "react";
import { alexChenPortfolio } from "../data/portfolio.js";

/**
 * selectedScenario shape: `{ type, name, color }` — see `scenarioSelectionFromType`
 * in `src/constants/scenarios.js`.
 */

const AppContext = createContext(null);

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
  const [userProfile, setUserProfile] = useState({
    name: alexChenPortfolio.user.name,
    riskScore: null,
    riskLabel: initialRiskLabelFromPortfolio(alexChenPortfolio),
  });
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);

  const value = useMemo(
    () => ({
      userProfile,
      setUserProfile,
      selectedGoal,
      setSelectedGoal,
      selectedScenario,
      setSelectedScenario,
      portfolio: alexChenPortfolio,
    }),
    [userProfile, selectedGoal, selectedScenario],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}
