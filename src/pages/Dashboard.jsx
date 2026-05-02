import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardBottomNav from "../components/marcus/DashboardBottomNav.jsx";
import MarcusDonut from "../components/marcus/MarcusDonut.jsx";
import { formatUsd, summarizePortfolio } from "../lib/portfolioMath.js";
import {
  DEFAULT_DISPLAY_NAME,
  useAppContext,
  useAuth,
} from "../store/AppContext.jsx";
import { checkHealth } from "../services/marketApi.js";

function initialsFromFullName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function firstNameFromFullName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[0] ?? "";
}

function greetingPrefix() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function GearIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v18M7 21h10a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1Z" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedGoal, userProfile, portfolio } = useAppContext();
  const { currentUser, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  const displayName =
    (currentUser?.name || userProfile?.name || "").trim() ||
    DEFAULT_DISPLAY_NAME;
  const email = currentUser?.email ?? "";
  const initials = initialsFromFullName(displayName);
  const firstName = firstNameFromFullName(displayName) || DEFAULT_DISPLAY_NAME;
  const greeting = `${greetingPrefix()}, ${firstName}`;

  const { total, segments } = summarizePortfolio(portfolio);
  const goal = portfolio?.goal;
  const goalProgress = goal?.targetAmount
    ? Math.min(100, Math.round((goal.savedSoFar / goal.targetAmount) * 100))
    : 0;

  useEffect(() => {
    checkHealth()
      .then((health) => {
        console.log("[FinPilot API health]", health);
      })
      .catch((err) => {
        console.warn("[FinPilot API health] unreachable:", err);
      });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event) {
      const el = wrapRef.current;
      if (!el || el.contains(event.target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-[#0A1628] text-white">
      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
        <header className="relative flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 pt-1 text-[15px] font-medium text-white/80">
            {greeting}
          </p>

          <div ref={wrapRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold leading-none text-[#0A1628] outline-none ring-2 ring-white/10 focus-visible:ring-[#6DB6FF]"
              style={{ background: "linear-gradient(135deg, #6DB6FF, #4A9FE8)" }}
            >
              {initials}
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 z-50 w-[220px] overflow-hidden rounded-2xl border border-white/10 py-2 shadow-xl"
                style={{
                  top: 52,
                  background:
                    "linear-gradient(180deg, #1C2B47 0%, #152238 100%)",
                }}
                role="menu"
              >
                <div className="px-3 pb-2">
                  <p className="text-[14px] font-bold text-white">
                    {displayName}
                  </p>
                  <p className="mt-0.5 text-[12px] text-white/50">{email}</p>
                </div>
                <div className="my-1 h-px bg-white/10" aria-hidden />
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/settings");
                  }}
                >
                  <GearIcon />
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                >
                  <DoorIcon />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <section className="mt-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Total portfolio
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
            {formatUsd(total)}
          </p>
          <p className="mt-2 text-sm font-medium text-[#00C48C]">
            +2.4% this month
            <span className="text-white/35"> · mock</span>
          </p>
        </section>

        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <MarcusDonut segments={segments} size={220} />
          <ul className="flex w-full max-w-xs flex-col gap-3 sm:max-w-[200px]">
            {segments.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 text-white/75">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums text-white">
                  {formatUsd(s.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Overview
          </h2>

          <Link
            to="/impact"
            className="block rounded-2xl bg-gradient-to-br from-[#1C2B47] to-[#152644] p-4 shadow-lg shadow-black/20 ring-1 ring-white/5 transition hover:ring-[#6DB6FF]/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6DB6FF]">
                  Goal
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {goal?.title ?? "Retirement"}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                  {formatUsd(goal?.savedSoFar ?? 0)}
                  <span className="text-base font-medium text-white/40">
                    {" "}
                    saved
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-[#00C48C]/15 px-3 py-1 text-sm font-bold text-[#00C48C]">
                {goalProgress}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6DB6FF] to-[#00C48C]"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            {selectedGoal ? (
              <p className="mt-3 text-xs text-white/45">
                Target {formatUsd(selectedGoal.targetAmount ?? goal?.targetAmount ?? 0)}{" "}
                · Risk{" "}
                <span className="text-white/70">{userProfile?.riskLabel ?? "—"}</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-white/45">
                Target {formatUsd(goal?.targetAmount ?? 0)}
              </p>
            )}
          </Link>

          <Link
            to="/scenarios"
            className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#1C2B47] to-[#152644] px-4 py-5 shadow-lg shadow-black/15 ring-1 ring-white/5 transition hover:ring-[#6DB6FF]/25"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase text-[#6DB6FF]">
                What-if
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                Explore scenarios
              </p>
            </div>
            <span className="text-2xl text-[#6DB6FF]" aria-hidden>
              →
            </span>
          </Link>

        </section>

        <p className="mt-8 text-center text-xs text-white/35">
          Mock data for demo · Not investment advice
        </p>
      </main>

      <DashboardBottomNav />
    </div>
  );
}
