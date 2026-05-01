import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AllocationChart from "../components/AllocationChart.jsx";
import GoalProgress from "../components/GoalProgress.jsx";
import HealthCard from "../components/HealthCard.jsx";
import HoldingsList from "../components/HoldingsList.jsx";
import MainTabBar from "../components/MainTabBar.jsx";
import RiskMeter from "../components/RiskMeter.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";
import { useAppContext } from "../store/AppContext.jsx";

function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ScenariosPlaceholder({ onHome }) {
  return (
    <section className={`${CARD_CLASS} min-w-0`}>
      <h2 className="text-base font-semibold text-neutral-900">Scenarios</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Soon you&apos;ll be able to explore different paths for your savings
        here. For now this is a preview.
      </p>
      <button
        type="button"
        onClick={onHome}
        className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white"
      >
        Back to Home
      </button>
    </section>
  );
}

export default function Dashboard() {
  const { userProfile, selectedGoal } = useAppContext();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  const avatarInitials = initialsFromName(userProfile.name);

  useEffect(() => {
    const t = location.state?.dashboardTab;
    if (t === "portfolio" || t === "settings") setActiveTab(t);
  }, [location.state?.dashboardTab]);

  return (
    <div className="flex min-h-dvh min-h-screen max-w-[100vw] flex-col overflow-x-hidden bg-[#F8F7F4]">
      <header className="sticky top-0 z-20 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200/60 bg-[#F8F7F4]/95 px-4 py-3 backdrop-blur-sm">
        <span className="min-w-0 truncate text-lg font-semibold tracking-tight text-neutral-900">
          NestEgg
        </span>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white"
          aria-label={`${userProfile.name} avatar`}
        >
          {avatarInitials}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-28 pt-4">
        <div className="mx-auto w-full max-w-lg min-w-0 space-y-4">
          {activeTab === "home" && (
            <div className="min-w-0">
              <p className="break-words text-sm text-neutral-600">
                Hi,{" "}
                <span className="font-medium text-neutral-900">
                  {userProfile.name}
                </span>
              </p>
              {selectedGoal && (
                <p className="mt-1 text-xs text-neutral-500">
                  You have a savings goal we&apos;re tracking for you.
                </p>
              )}
            </div>
          )}

          {activeTab === "home" && (
            <>
              <HealthCard />
              <AllocationChart />
              <RiskMeter />
              <GoalProgress />
              <HoldingsList />
              <Link
                to="/scenarios"
                className="flex min-h-[48px] w-full min-w-0 items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:opacity-95 active:opacity-90"
                style={{ backgroundColor: "#534AB7" }}
              >
                Plan for what&apos;s next →
              </Link>
            </>
          )}

          {activeTab === "portfolio" && (
            <section className={`${CARD_CLASS} min-w-0 text-center`}>
              <p className="text-sm text-neutral-600">Portfolio — coming soon</p>
            </section>
          )}

          {activeTab === "scenarios" && (
            <ScenariosPlaceholder onHome={() => setActiveTab("home")} />
          )}

          {activeTab === "settings" && (
            <section className={`${CARD_CLASS} min-w-0 text-center`}>
              <p className="text-sm text-neutral-600">Settings — coming soon</p>
            </section>
          )}
        </div>
      </main>

      <MainTabBar setDashboardTab={setActiveTab} />
    </div>
  );
}
