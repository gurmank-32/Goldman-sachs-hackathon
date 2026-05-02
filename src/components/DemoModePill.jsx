import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VERITE_ONBOARDING_KEY } from "../constants/signupQuiz.js";
import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_PASSWORD,
  useAuth,
} from "../store/AppContext.jsx";

function clearAllNesteggLocalStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("nestegg_")) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  try {
    localStorage.removeItem(VERITE_ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
}

export default function DemoModePill() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signIn,
    signOut,
    ensureDemoAccount,
    isAuthenticated,
    isLoading,
  } = useAuth();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);

  const path = location.pathname.replace(/\/+$/, "") || "/";

  /** Hide on auth and onboarding routes. */
  const hide =
    path === "/signin" ||
    path === "/signup" ||
    path === "/" ||
    path === "/goal" ||
    path === "/link-accounts";

  useEffect(() => {
    if (!open) return;
    function onDocDown(e) {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [open]);

  if (hide) return null;

  const disabled = isLoading || busy;

  async function signInAsAlexDemo() {
    if (disabled) return;
    setBusy(true);
    try {
      ensureDemoAccount();
      await signIn(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD);
      navigate("/dashboard", { replace: true });
      setOpen(false);
    } catch {
      /* keep panel open on failure */
    } finally {
      setBusy(false);
    }
  }

  function signOutAndRestart() {
    if (disabled) return;
    signOut();
    clearAllNesteggLocalStorageKeys();
    setOpen(false);
  }

  async function goHomeWithDemoAuth() {
    if (disabled) return;
    setBusy(true);
    try {
      if (!isAuthenticated) {
        ensureDemoAccount();
        await signIn(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD);
      }
      navigate("/dashboard", { replace: true });
      setOpen(false);
    } catch {
      /* auth failed */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={wrapRef} className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2">
      {open ? (
        <div
          className="mb-1 max-h-[min(70vh,420px)] w-[220px] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-lg"
          role="menu"
        >
          <div className="border-b border-slate-100 px-2 pb-2">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Demo mode
            </p>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void signInAsAlexDemo()}
            >
              Sign in as Alex (demo)
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              onClick={signOutAndRestart}
            >
              Sign out and restart
            </button>
          </div>
          <div className="px-2 pt-2">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              App
            </p>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void goHomeWithDemoAuth()}
            >
              Open Vérité (home)
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 shadow-md hover:bg-slate-200"
        aria-expanded={open}
      >
        Demo
      </button>
    </div>
  );
}
