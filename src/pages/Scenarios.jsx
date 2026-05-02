import { Link, useNavigate } from "react-router-dom";
import { scenarioSelectionFromType } from "../constants/scenarios.js";
import { useAppContext } from "../store/AppContext.jsx";

/** Scenario picker — large tap targets, Marcus spacing (ties into impact → rebalance). */
export default function Scenarios() {
  const navigate = useNavigate();
  const { setSelectedScenario } = useAppContext();

  function pick(type) {
    const sel = scenarioSelectionFromType(type);
    if (sel) setSelectedScenario(sel);
    navigate("/impact");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-white px-5 pb-16 pt-8">
      <Link
        to="/dashboard"
        className="text-sm font-semibold text-[#6DB6FF] hover:text-[#4A9FE8]"
      >
        ← Home
      </Link>
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A1A2E]/45">
        What-if lab
      </p>
      <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight text-[#1A1A2E]">
        Stress-test your plan
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A2E]/55">
        Pick one scenario to preview impact, then rebalance in the Marcus-style
        drawer.
      </p>
      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => pick("market-drop")}
          className="min-h-[72px] w-full rounded-2xl border-2 border-[#E8ECF2] bg-white px-5 py-4 text-left text-[17px] font-semibold text-[#1A1A2E] shadow-sm transition hover:border-[#6DB6FF]/45 hover:shadow-md active:scale-[0.99]"
        >
          Market drops 20%
        </button>
        <button
          type="button"
          onClick={() => pick("inflation")}
          className="min-h-[72px] w-full rounded-2xl border-2 border-[#E8ECF2] bg-white px-5 py-4 text-left text-[17px] font-semibold text-[#1A1A2E] shadow-sm transition hover:border-[#6DB6FF]/45 hover:shadow-md active:scale-[0.99]"
        >
          Inflation stays high
        </button>
        <button
          type="button"
          onClick={() => pick("cash-need")}
          className="min-h-[72px] w-full rounded-2xl border-2 border-[#E8ECF2] bg-white px-5 py-4 text-left text-[17px] font-semibold text-[#1A1A2E] shadow-sm transition hover:border-[#6DB6FF]/45 hover:shadow-md active:scale-[0.99]"
        >
          I need cash in 1 year
        </button>
      </div>
    </main>
  );
}
