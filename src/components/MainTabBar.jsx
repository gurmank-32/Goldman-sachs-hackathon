import { useNavigate, useLocation } from "react-router-dom";

function IconHome({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function IconPortfolio({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}

function IconScenarios({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="M9.5 9.5 14.5 14.5" />
      <path d="m14.5 9.5 5 5" />
    </svg>
  );
}

function IconSettings({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

const TABS = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "portfolio", label: "Portfolio", Icon: IconPortfolio },
  { id: "scenarios", label: "Scenarios", Icon: IconScenarios },
  { id: "settings", label: "Settings", Icon: IconSettings },
];

/**
 * Bottom tabs shared by `/dashboard` and `/scenarios`.
 * Highlights Home on `/dashboard`, Scenarios on `/scenarios`.
 * @param {{ setDashboardTab?: (tab: string) => void }} props
 */
export default function MainTabBar({ setDashboardTab }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const homeRouteActive = pathname === "/dashboard";
  const scenariosRouteActive = pathname === "/scenarios";

  function tapHome() {
    if (pathname === "/dashboard") setDashboardTab?.("home");
    else navigate("/dashboard");
  }

  function tapScenarios() {
    navigate("/scenarios");
  }

  function tapPortfolio() {
    if (pathname === "/dashboard") setDashboardTab?.("portfolio");
    else navigate("/dashboard", { state: { dashboardTab: "portfolio" } });
  }

  function tapSettings() {
    if (pathname === "/dashboard") setDashboardTab?.("settings");
    else navigate("/dashboard", { state: { dashboardTab: "settings" } });
  }

  const handlers = {
    home: tapHome,
    scenarios: tapScenarios,
    portfolio: tapPortfolio,
    settings: tapSettings,
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 max-w-[100vw] overflow-hidden border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom,0)] backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex min-w-0 max-w-lg">
        {TABS.map(({ id, label, Icon }) => {
          const active =
            id === "home"
              ? homeRouteActive
              : id === "scenarios"
                ? scenariosRouteActive
                : false;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handlers[id]?.()}
              className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition sm:text-[11px] ${
                active
                  ? "text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Icon
                className={`h-6 w-6 shrink-0 ${active ? "text-neutral-900" : "text-neutral-400"}`}
              />
              <span className="max-w-full truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
