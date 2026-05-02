/**
 * Canonical scenario types for planning / rebalance flows.
 * @typedef {'market-drop' | 'inflation' | 'cash-need'} ScenarioType
 */

export const SCENARIO_DEFINITIONS = {
  "market-drop": {
    type: "market-drop",
    name: "Market drops 20%",
    color: {
      chipBg: "#FAECE7",
      chipFg: "#993C1D",
      iconBg: "#FAECE7",
      iconFg: "#993C1D",
    },
  },
  inflation: {
    type: "inflation",
    name: "Inflation stays high",
    color: {
      chipBg: "#FAEEDA",
      chipFg: "#633806",
      iconBg: "#FAEEDA",
      iconFg: "#633806",
    },
  },
  "cash-need": {
    type: "cash-need",
    name: "I need cash in 1 year",
    color: {
      chipBg: "#E1F5EE",
      chipFg: "#085041",
      iconBg: "#E1F5EE",
      iconFg: "#085041",
    },
  },
};

export function isValidScenarioType(type) {
  return (
    typeof type === "string" &&
    Object.prototype.hasOwnProperty.call(SCENARIO_DEFINITIONS, type)
  );
}

export function scenarioSelectionFromType(type) {
  const def = SCENARIO_DEFINITIONS[type];
  if (!def) return null;
  return {
    type: def.type,
    name: def.name,
    color: { ...def.color },
  };
}
