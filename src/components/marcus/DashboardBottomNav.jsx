import { NavLink } from "react-router-dom";

const linkBase =
  "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors";

export default function DashboardBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0A1628]/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "text-[#6DB6FF]" : "text-white/45"}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ◎
          </span>
          Home
        </NavLink>
        <NavLink
          to="/scenarios"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "text-[#6DB6FF]" : "text-white/45"}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ◇
          </span>
          Scenarios
        </NavLink>
        <NavLink
          to="/finpilot"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "text-[#6DB6FF]" : "text-white/45"}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ✦
          </span>
          Plan
        </NavLink>
        <NavLink
          to="/decisions"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? "text-[#6DB6FF]" : "text-white/45"}`
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            ≡
          </span>
          Activity
        </NavLink>
      </div>
    </nav>
  );
}
