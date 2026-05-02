import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { isValidScenarioType } from "../constants/scenarios.js";
import { formatUsd, summarizePortfolio } from "../lib/portfolioMath.js";
import { useAppContext } from "../store/AppContext.jsx";

function AllocationBar({ label, pct, tone }) {
  const safe = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-[12px] font-medium text-white/55">
        <span>{label}</span>
        <span className="tabular-nums text-white">{safe}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${tone === "equity" ? "bg-[#6DB6FF]" : "bg-[#00C48C]"}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

/** Marcus-style transfer drawer: before/after + single CTA. */
export default function RebalanceWizard() {
  const navigate = useNavigate();
  const { selectedScenario, portfolio } = useAppContext();
  const scenarioType = selectedScenario?.type;

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 120);
    return () => window.clearTimeout(t);
  }, []);

  if (!selectedScenario || !isValidScenarioType(scenarioType)) {
    return <Navigate to="/scenarios" replace />;
  }

  const { total } = summarizePortfolio(portfolio);

  const beforeEq = 62;
  const beforeBd = 38;
  let afterEq = 55;
  let afterBd = 45;
  if (scenarioType === "market-drop") {
    afterEq = 52;
    afterBd = 48;
  } else if (scenarioType === "inflation") {
    afterEq = 48;
    afterBd = 52;
  } else if (scenarioType === "cash-need") {
    afterEq = 45;
    afterBd = 55;
  }

  function handleConfirm() {
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="relative min-h-dvh bg-[#0A1628]">
      <main className="mx-auto max-w-lg px-4 pb-[min(85vh,540px)] pt-6">
        <Link
          to="/impact"
          className="inline-flex text-sm font-medium text-[#6DB6FF] hover:text-[#8EC9FF]"
        >
          ← Back
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-white">Rebalance</h1>
        <p className="mt-2 text-sm text-white/55">
          Scenario:{" "}
          <span className="font-semibold text-white">
            {selectedScenario.name}
          </span>
        </p>
        <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-wider text-white/35">
          Portfolio reference
        </p>
        <p className="mt-1 text-center text-3xl font-bold tabular-nums text-white">
          {formatUsd(total)}
        </p>
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="mx-auto max-w-lg rounded-t-[16px] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_40px_rgba(0,0,0,0.45)]"
          style={{
            background:
              "linear-gradient(180deg, #243558 0%, #1C2B47 40%, #152238 100%)",
          }}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

          <div className="rounded-2xl border border-white/10 bg-[#0A1628]/40 p-5 ring-1 ring-white/5">
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-[#6DB6FF]">
              Suggested allocation shift
            </p>
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Before
                </p>
                <AllocationBar label="Equities" pct={beforeEq} tone="equity" />
                <AllocationBar label="Bonds & cash" pct={beforeBd} tone="bond" />
              </div>
              <div>
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#00C48C]">
                  After
                </p>
                <AllocationBar label="Equities" pct={afterEq} tone="equity" />
                <AllocationBar label="Bonds & cash" pct={afterBd} tone="bond" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="mt-5 w-full min-h-[52px] rounded-2xl bg-[#6DB6FF] text-[16px] font-bold text-[#0A1628] shadow-lg shadow-[#6DB6FF]/20 transition hover:bg-[#5AACF5] active:scale-[0.98]"
          >
            Apply plan & return home
          </button>
          <p className="mt-3 pb-2 text-center text-[11px] text-white/35">
            Illustrative only · not a trade execution
          </p>
        </div>
      </div>
    </div>
  );
}
