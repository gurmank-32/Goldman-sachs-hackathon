import { Link, Navigate } from "react-router-dom";
import { isValidScenarioType } from "../constants/scenarios.js";
import { useAppContext } from "../store/AppContext.jsx";

export default function ImpactPreview() {
  const { selectedScenario } = useAppContext();
  const scenarioType = selectedScenario?.type;

  if (
    !selectedScenario ||
    !isValidScenarioType(scenarioType)
  ) {
    return <Navigate to="/scenarios" replace />;
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-[#F8F7F4] px-4 py-10">
      <Link
        to="/scenarios"
        className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        ← Scenarios
      </Link>
      <h1 className="mt-6 text-xl font-semibold text-neutral-900">
        Impact preview
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Placeholder for <strong>{selectedScenario.name}</strong>.
      </p>
      <Link
        to="/rebalance"
        className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: "#534AB7" }}
      >
        Continue to rebalance →
      </Link>
    </main>
  );
}
