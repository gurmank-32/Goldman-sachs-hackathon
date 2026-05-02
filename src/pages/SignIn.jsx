import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthTrustBadges from "../components/AuthTrustBadges.jsx";
import NestEggLogo from "../components/NestEggLogo.jsx";
import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_PASSWORD,
  SIGN_IN_ERROR_EMAIL_NOT_FOUND,
  SIGN_IN_ERROR_WRONG_PASSWORD,
  useAuth,
} from "../store/AppContext.jsx";

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 12s3.5 7 10 7 10-7 10-7-3.5-7-10-7-10 7-10 7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3l18 18M10.58 10.58a3 3 0 1 0 4.24 4.24" />
      <path d="M9.88 9.88A10.4 10.4 0 0 1 12 9c5 0 9 5.5 9 6 0 .38-.24.9-.64 1.55M6.34 6.34C8.1 5.12 10 4.5 12 4.5c5 0 9 5.5 9 6 0 .38-.24.9-.64 1.55" />
    </svg>
  );
}

/** Always land on FinPilot home (`/`); it shows questions first until completed. */
function postSignInPath() {
  return "/";
}

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, isLoading, ensureDemoAccount } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [banner, setBanner] = useState(null);

  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(postSignInPath(), { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => {
      setBanner(null);
    }, 5000);
    return () => window.clearTimeout(id);
  }, [banner]);

  function dismissBannerAndTimers() {
    setBanner(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    dismissBannerAndTimers();
    try {
      await signIn(email, password);
      navigate(postSignInPath(), { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === SIGN_IN_ERROR_WRONG_PASSWORD) {
        setBanner("wrong_password");
      } else if (msg === SIGN_IN_ERROR_EMAIL_NOT_FOUND) {
        setBanner("email_not_found");
      } else {
        setBanner("wrong_password");
      }
    }
  }

  async function handleDemoShortcut(e) {
    e.preventDefault();
    dismissBannerAndTimers();
    ensureDemoAccount();
    setEmail(DEMO_ACCOUNT_EMAIL);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    try {
      await signIn(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD);
      navigate("/", { replace: true });
    } catch {
      setBanner("wrong_password");
    }
  }

  return (
    <div className="min-h-dvh w-full bg-white">
      <main className="flex min-h-dvh w-full flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="flex justify-center">
            <div className="auth-logo-enter">
              <NestEggLogo />
            </div>
          </div>

          <div className="auth-form-enter">
            <h1
              className="mt-6 text-center text-[22px] font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Welcome back
            </h1>

            {banner === "wrong_password" ? (
              <div
                className="mt-4 w-full rounded-lg px-3 py-2.5 text-center text-sm"
                style={{ backgroundColor: "#FEF2EC", color: "#D85A30" }}
                role="alert"
              >
                Incorrect password. Please try again.
              </div>
            ) : null}

            {banner === "email_not_found" ? (
              <div
                className="mt-4 w-full rounded-lg px-3 py-2.5 text-center text-sm"
                style={{ backgroundColor: "#FEF2EC", color: "#D85A30" }}
                role="alert"
              >
                No account found with this email.{" "}
                <Link
                  to="/signup"
                  className="font-normal underline"
                  style={{ color: "#B8962E" }}
                >
                  Sign up
                </Link>{" "}
                instead.
              </div>
            ) : null}

            <p className="mt-4 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-normal underline"
                style={{ color: "#B8962E" }}
              >
                Sign up
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="signin-email"
                  className="mb-1 block text-[13px] text-slate-500"
                >
                  Email address
                </label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="alex@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    dismissBannerAndTimers();
                  }}
                  required
                  className="auth-input w-full px-4 py-3 text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="signin-password"
                  className="mb-1 block text-[13px] text-slate-500"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      dismissBannerAndTimers();
                    }}
                    required
                    className="auth-input w-full py-3 pl-4 pr-12 text-slate-900"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotOpen((o) => !o)}
                    className="text-[12px] font-normal underline-offset-2 hover:underline"
                    style={{ color: "#B8962E" }}
                  >
                    Forgot password?
                  </button>
                </div>
                {forgotOpen ? (
                  <p className="mt-2 text-right text-[11px] leading-relaxed text-slate-500">
                    For this demo, passwords are stored locally. Check your
                    browser&apos;s localStorage.
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn mt-1 flex h-12 w-full items-center justify-center rounded-[12px] font-medium text-white disabled:opacity-70"
              >
                {isLoading ? (
                  <span
                    className="signup-dot-loader flex items-center gap-1 text-white"
                    aria-live="polite"
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {isDev ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleDemoShortcut}
                  disabled={isLoading}
                  className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Use demo account →
                </button>
              </div>
            ) : null}
          </div>

          <hr className="auth-page-divider my-8" />
          <AuthTrustBadges />
        </div>
      </main>
    </div>
  );
}
