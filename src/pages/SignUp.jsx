import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthTrustBadges from "../components/AuthTrustBadges.jsx";
import NestEggLogo from "../components/NestEggLogo.jsx";
import { useAuth } from "../store/AppContext.jsx";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function passwordStrengthSegments(password) {
  if (!password || password.length < 8) {
    return { filled: 0, tone: "none" };
  }
  const hasNum = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  if (hasNum && hasSymbol) {
    return { filled: 4, tone: "strong" };
  }
  if (hasNum) {
    return { filled: 2, tone: "fair" };
  }
  return { filled: 1, tone: "weak" };
}

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [bannerError, setBannerError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const strength = useMemo(() => passwordStrengthSegments(password), [password]);

  function validateName(value) {
    if (!String(value).trim()) {
      setNameError("Please enter your name");
      return false;
    }
    setNameError("");
    return true;
  }

  function validateEmail(value) {
    const v = String(value).trim();
    if (!EMAIL_REGEX.test(v)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePassword(value) {
    if (String(value).length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    setPasswordError("");
    return true;
  }

  function validateConfirm(pw, confirm) {
    if (String(confirm) !== String(pw)) {
      setConfirmError("Passwords don't match");
      return false;
    }
    setConfirmError("");
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBannerError("");
    const okName = validateName(name);
    const okEmail = validateEmail(email);
    const okPw = validatePassword(password);
    const okConfirm = validateConfirm(password, confirmPassword);
    if (!okName || !okEmail || !okPw || !okConfirm) return;

    try {
      await signUp(name.trim(), email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("already exists") ||
        msg.includes("An account with this email")
      ) {
        setBannerError(
          "An account with this email already exists. Sign in instead.",
        );
      } else {
        setBannerError(msg || "Sign up failed.");
      }
    }
  }

  const segmentColors = (index) => {
    if (index >= strength.filled) {
      return "#e5e7eb";
    }
    if (strength.tone === "weak") {
      return "#ef4444";
    }
    if (strength.tone === "fair") {
      return "#f59e0b";
    }
    return "#22c55e";
  };

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
              Create your account
            </h1>

            {bannerError ? (
              <div
                className="mt-4 w-full rounded-lg px-3 py-2.5 text-center text-sm"
                style={{ backgroundColor: "#FEF2EC", color: "#D85A30" }}
                role="alert"
              >
                {bannerError}
              </div>
            ) : null}

            <p className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-normal underline"
                style={{ color: "#B8962E" }}
              >
                Sign in
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="signup-name"
                  className="mb-1 block text-[13px] text-slate-500"
                >
                  Your name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Alex Chen"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  onBlur={() => validateName(name)}
                  className="auth-input w-full px-4 py-3 text-slate-900"
                />
                {nameError ? (
                  <p className="mt-1 text-[12px]" style={{ color: "#D85A30" }}>
                    {nameError}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-1 block text-[13px] text-slate-500"
                >
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="alex@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                    if (bannerError) setBannerError("");
                  }}
                  onBlur={() => validateEmail(email)}
                  className="auth-input w-full px-4 py-3 text-slate-900"
                />
                {emailError ? (
                  <p className="mt-1 text-[12px]" style={{ color: "#D85A30" }}>
                    {emailError}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-1 block text-[13px] text-slate-500"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPassword(next);
                      if (passwordError) setPasswordError("");
                      if (confirmPassword && next === confirmPassword) {
                        setConfirmError("");
                      }
                    }}
                    onBlur={() => validatePassword(password)}
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
                {passwordError ? (
                  <p className="mt-1 text-[12px]" style={{ color: "#D85A30" }}>
                    {passwordError}
                  </p>
                ) : null}

                <div className="mt-2 flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors"
                      style={{ backgroundColor: segmentColors(i) }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm"
                  className="mb-1 block text-[13px] text-slate-500"
                >
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Same password again"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError("");
                  }}
                  onBlur={() => validateConfirm(password, confirmPassword)}
                  className="auth-input w-full px-4 py-3 text-slate-900"
                />
                {confirmError ? (
                  <p className="mt-1 text-[12px]" style={{ color: "#D85A30" }}>
                    {confirmError}
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
                  "Create account"
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-slate-500">
              By creating an account you agree to our Terms and Privacy Policy
            </p>
          </div>

          <hr className="auth-page-divider my-8" />
          <AuthTrustBadges />
        </div>
      </main>
    </div>
  );
}
