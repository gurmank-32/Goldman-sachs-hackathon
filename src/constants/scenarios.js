/**
 * Canonical scenario types for planning / rebalance flows.
 * @typedef {'market-drop' | 'inflation' | 'cash-need'} ScenarioType
 */

/**
 * Stored on AppContext when the user picks a scenario card.
 * @typedef {{
 *   type: ScenarioType,
 *   name: string,
 *   color: { chipBg: string, chipFg: string, iconBg: string, iconFg: string }
 * }} SelectedScenario
 */

/** @type {readonly ScenarioType[]} */
export const SCENARIO_TYPE_ORDER = ["market-drop", "inflation", "cash-need"];

/** Card copy + chips/icons palette keyed by scenario type. */
export const SCENARIO_DEFINITIONS = {
  "market-drop": {
    type: "market-drop",
    name: "Market drops 20%",
    description:
      "See how a crash would hit your portfolio and how to protect it",
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
    description: "Find out if your money is keeping up with rising prices",
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
    description:
      "Plan a safe withdrawal without derailing your long-term goals",
    color: {
      chipBg: "#E1F5EE",
      chipFg: "#085041",
      iconBg: "#E1F5EE",
      iconFg: "#085041",
    },
  },
};

/**
 * @param {unknown} type
 * @returns {type is ScenarioType}
 */
export function isValidScenarioType(type) {
  return (
    typeof type === "string" &&
    Object.prototype.hasOwnProperty.call(SCENARIO_DEFINITIONS, type)
  );
}

/**
 * @param {ScenarioType} type
 * @returns {SelectedScenario | null}
 */
export function scenarioSelectionFromType(type) {
  const def = SCENARIO_DEFINITIONS[type];
  if (!def) return null;
  return {
    type: def.type,
    name: def.name,
    color: { ...def.color },
  };
}
