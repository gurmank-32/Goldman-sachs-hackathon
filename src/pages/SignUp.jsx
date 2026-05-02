import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthTrustBadges from "../components/AuthTrustBadges.jsx";
import VeriteLogo from "../components/VeriteLogo.jsx";
import {
  SIGNUP_QUIZ_QUESTIONS,
  buildVeriteUserGoal,
} from "../constants/signupQuiz.js";
import LinkAccountModal from "../components/LinkAccountModal.jsx";
import { useAppContext, useAuth } from "../store/AppContext.jsx";
import { SIGNUP_AWAITING_LINK_CHOICE_KEY } from "../constants/inappOnboarding.js";
import {
  completeVeriteOnboardingUnlock,
  getPostAuthEntryPath,
} from "../utils/authRouting.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOAL_TARGET_YEAR_MIN = 2026;
const GOAL_TARGET_YEAR_MAX = 2060;

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

const GOLD = "#B8962E";
const NAVY = "#0A1628";

/** Sign-up link step: pick app before opening connect modal (matches LinkAccounts broker ids). */
const SIGNUP_BROKERAGE_APPS = [
  {
    providerId: "robinhood",
    label: "Robinhood",
    name: "Robinhood",
    color: "#00C805",
    letter: "R",
  },
  {
    providerId: "fidelity",
    label: "Fidelity",
    name: "Fidelity",
    color: "#008000",
    letter: "F",
  },
  {
    providerId: "other-broker",
    label: "Other",
    name: "Other brokerage",
    color: "#64748b",
    letter: "+",
  },
];

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const { linkedAccounts } = useAppContext();
  const [linkModalInst, setLinkModalInst] = useState(null);
  const [brokeragePickerOpen, setBrokeragePickerOpen] = useState(false);
  const [signupBrokerProviderId, setSignupBrokerProviderId] = useState(
    SIGNUP_BROKERAGE_APPS[0].providerId,
  );
  /** Shown after closing the link modal without finishing a connection. */
  const [linkChoiceHint, setLinkChoiceHint] = useState("");
  /** True while signUp() is in flight so we don't redirect before `linkChoice` is shown. */
  const [pendingLinkChoice, setPendingLinkChoice] = useState(false);

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

  /** Questions → goal target → account details — one question per screen. */
  const [phase, setPhase] = useState("quiz");
  const [quizStep, setQuizStep] = useState(0);
  const [quizSelections, setQuizSelections] = useState(() =>
    Array(SIGNUP_QUIZ_QUESTIONS.length).fill(null),
  );
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetYear, setGoalTargetYear] = useState(
    String(GOAL_TARGET_YEAR_MIN),
  );

  const goalTargetYearOptions = useMemo(
    () =>
      Array.from(
        { length: GOAL_TARGET_YEAR_MAX - GOAL_TARGET_YEAR_MIN + 1 },
        (_, i) => GOAL_TARGET_YEAR_MIN + i,
      ),
    [],
  );

  function isAwaitingSignupLinkChoice() {
    try {
      return sessionStorage.getItem(SIGNUP_AWAITING_LINK_CHOICE_KEY) === "1";
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    if (
      phase === "linkChoice" ||
      pendingLinkChoice ||
      isAwaitingSignupLinkChoice()
    ) {
      return;
    }
    navigate(getPostAuthEntryPath(), { replace: true });
  }, [isAuthenticated, navigate, phase, pendingLinkChoice]);

  /** If we remount after sign-up (e.g. strict mode), restore the link step. */
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isAwaitingSignupLinkChoice()) return;
    setPhase("linkChoice");
  }, [isAuthenticated]);

  useEffect(() => {
    if (phase !== "goalTarget") return;
    if (!quizSelections.every((x) => x !== null)) return;
    const g = buildVeriteUserGoal(quizSelections);
    if (g) {
      setGoalTargetAmount(String(g.targetAmount));
      setGoalTargetYear(String(g.targetYear));
    }
  }, [phase, quizSelections]);

  useEffect(() => {
    if (!brokeragePickerOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setBrokeragePickerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [brokeragePickerOpen]);

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

  async function handleAccountNext() {
    setBannerError("");
    const complete = quizSelections.every((x) => x !== null);
    if (!complete) {
      setPhase("quiz");
      setQuizStep(0);
      setBannerError("Please answer each question before creating your account.");
      return;
    }
    const okName = validateName(name);
    const okEmail = validateEmail(email);
    const okPw = validatePassword(password);
    const okConfirm = validateConfirm(password, confirmPassword);
    if (!okName || !okEmail || !okPw || !okConfirm) return;

    const amt = Number(String(goalTargetAmount).replace(/,/g, ""));
    const yr = Number(goalTargetYear);
    if (!Number.isFinite(amt) || amt <= 0) {
      setBannerError("Enter a valid target amount (greater than zero).");
      return;
    }
    if (
      !Number.isFinite(yr) ||
      yr < GOAL_TARGET_YEAR_MIN ||
      yr > GOAL_TARGET_YEAR_MAX
    ) {
      setBannerError("Choose a target year between 2026 and 2060.");
      return;
    }

    try {
      sessionStorage.setItem(SIGNUP_AWAITING_LINK_CHOICE_KEY, "1");
    } catch {
      /* ignore */
    }
    setPendingLinkChoice(true);
    try {
      await signUp(name.trim(), email.trim(), password, quizSelections, {
        targetAmount: amt,
        targetYear: yr,
      });
      setPhase("linkChoice");
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
      try {
        sessionStorage.removeItem(SIGNUP_AWAITING_LINK_CHOICE_KEY);
      } catch {
        /* ignore */
      }
    } finally {
      setPendingLinkChoice(false);
    }
  }

  function handleContinueToDashboard() {
    setLinkChoiceHint("");
    try {
      sessionStorage.removeItem(SIGNUP_AWAITING_LINK_CHOICE_KEY);
    } catch {
      /* ignore */
    }
    completeVeriteOnboardingUnlock();
    navigate("/dashboard", { replace: true });
  }

  function handleLinkModalClose({ completed }) {
    setLinkModalInst(null);
    if (!completed) {
      setLinkChoiceHint(
        "No problem — you can link accounts anytime in Settings. Until then, Total Net Worth reflects your in-app portfolio only.",
      );
    } else {
      setLinkChoiceHint("");
    }
  }

  function openBrokerageAppPicker() {
    setLinkChoiceHint("");
    setSignupBrokerProviderId(SIGNUP_BROKERAGE_APPS[0].providerId);
    setBrokeragePickerOpen(true);
  }

  function confirmBrokerageAppPicker() {
    const picked = SIGNUP_BROKERAGE_APPS.find(
      (b) => b.providerId === signupBrokerProviderId,
    );
    if (!picked) return;
    setBrokeragePickerOpen(false);
    setLinkModalInst({
      category: "brokerage",
      providerId: picked.providerId,
      name: picked.name,
    });
  }

  function handleQuizBack() {
    setBannerError("");
    if (quizStep === 0) {
      navigate("/signin", { replace: true });
      return;
    }
    setQuizStep((s) => s - 1);
  }

  function handleQuizContinue() {
    setBannerError("");
    if (quizSelections[quizStep] === null) return;
    if (quizStep < SIGNUP_QUIZ_QUESTIONS.length - 1) {
      setQuizStep((s) => s + 1);
      return;
    }
    setPhase("goalTarget");
  }

  function handleGoalTargetBack() {
    setBannerError("");
    setQuizStep(SIGNUP_QUIZ_QUESTIONS.length - 1);
    setPhase("quiz");
  }

  function handleGoalTargetContinue() {
    setBannerError("");
    const amt = Number(String(goalTargetAmount).replace(/,/g, ""));
    const yr = Number(goalTargetYear);
    if (!Number.isFinite(amt) || amt <= 0) {
      setBannerError("Enter a valid target amount (greater than zero).");
      return;
    }
    if (
      !Number.isFinite(yr) ||
      yr < GOAL_TARGET_YEAR_MIN ||
      yr > GOAL_TARGET_YEAR_MAX
    ) {
      setBannerError("Choose a target year between 2026 and 2060.");
      return;
    }
    setPhase("account");
  }

  function selectQuizOption(optionIndex) {
    setQuizSelections((prev) => {
      const next = [...prev];
      next[quizStep] = optionIndex;
      return next;
    });
  }

  const totalQuizSteps = SIGNUP_QUIZ_QUESTIONS.length;
  const q = phase === "quiz" ? SIGNUP_QUIZ_QUESTIONS[quizStep] : null;
  const selectedForStep = phase === "quiz" ? quizSelections[quizStep] : null;
  const quizProgressPct = ((quizStep + 1) / totalQuizSteps) * 100;
  const isLastQuizStep = quizStep === totalQuizSteps - 1;

  function optionLetter(index) {
    return String.fromCharCode(65 + index);
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
      <main
        className={`flex min-h-dvh w-full flex-col px-5 sm:px-6 ${
          phase === "account" || phase === "linkChoice"
            ? "justify-center py-10"
            : "py-5 sm:py-6"
        }`}
      >
        <div
          className={`mx-auto flex w-full flex-col ${
            phase === "quiz" || phase === "goalTarget"
              ? "max-w-[480px] min-h-0 flex-1"
              : phase === "linkChoice"
                ? "max-w-[440px]"
                : "max-w-[400px]"
          }`}
        >
          <div className="flex shrink-0 justify-center">
            <div
              className={`auth-logo-enter ${phase === "quiz" || phase === "goalTarget" ? "scale-90 sm:scale-95" : ""}`}
            >
              <VeriteLogo />
            </div>
          </div>

          {phase === "quiz" && q ? (
            <div className="auth-form-enter mt-4 flex min-h-0 flex-1 flex-col">
              <p className="sr-only" aria-live="polite">
                Question {quizStep + 1} of {totalQuizSteps}: {q.question}
              </p>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <p
                  className="text-[13px] font-semibold tracking-wide text-[#0A1628]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  Question {quizStep + 1} of {totalQuizSteps}
                </p>
                <Link
                  to="/signin"
                  className="text-[13px] text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  style={{ color: "#B8962E" }}
                >
                  Sign in instead
                </Link>
              </div>

              <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {q.stepLabel}
              </p>

              {bannerError ? (
                <div
                  className="mt-3 w-full rounded-lg px-3 py-2.5 text-center text-sm"
                  style={{ backgroundColor: "#FEF2EC", color: "#D85A30" }}
                  role="alert"
                >
                  {bannerError}
                </div>
              ) : null}

              <div className="mt-3 shrink-0">
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={quizStep + 1}
                  aria-valuemin={1}
                  aria-valuemax={totalQuizSteps}
                  aria-valuetext={`Question ${quizStep + 1} of ${totalQuizSteps}`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{
                      width: `${quizProgressPct}%`,
                      backgroundColor: "#B8962E",
                    }}
                  />
                </div>
              </div>

              <div
                key={q.id}
                className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto pb-2 [-webkit-overflow-scrolling:touch]"
              >
                <h1
                  id={`signup-q-${q.id}`}
                  className="text-[19px] font-semibold leading-[1.35] text-[#0A1628] sm:text-[21px]"
                >
                  <span className="text-[#64748b]">“</span>
                  {q.question}
                  <span className="text-[#64748b]">”</span>
                </h1>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                  {q.hint}
                </p>

                <div
                  className="mt-5 flex flex-col gap-2.5 sm:gap-3"
                  role="group"
                  aria-labelledby={`signup-q-${q.id}`}
                >
                  {q.options.map((opt, idx) => (
                    <button
                      key={`${q.id}-${idx}`}
                      type="button"
                      aria-pressed={selectedForStep === idx}
                      aria-label={`${optionLetter(idx)}. ${opt.label}. ${opt.description}`}
                      onClick={() => selectQuizOption(idx)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition-colors sm:gap-3.5 sm:px-4 sm:py-3.5 ${
                        selectedForStep === idx
                          ? "border-[#B8962E] bg-[#F5EDD6] ring-1 ring-[#B8962E]/40"
                          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums ${
                          selectedForStep === idx
                            ? "bg-[#0A1628] text-[#F5EDD6]"
                            : "border border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                        aria-hidden
                      >
                        {optionLetter(idx)}
                      </span>
                      <span
                        className="shrink-0 text-[26px] leading-none sm:text-[28px]"
                        aria-hidden
                      >
                        {opt.emoji}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block text-[15px] font-semibold leading-snug text-slate-900">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">
                          {opt.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex shrink-0 gap-3 border-t border-slate-100 bg-white pt-4">
                <button
                  type="button"
                  onClick={handleQuizBack}
                  disabled={isLoading}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  {quizStep === 0 ? "Cancel" : "Back"}
                </button>
                <button
                  type="button"
                  disabled={selectedForStep === null || isLoading}
                  onClick={handleQuizContinue}
                  className="auth-submit-btn flex h-12 flex-[1.65] items-center justify-center rounded-xl text-[14px] font-medium text-white disabled:opacity-70"
                >
                  {isLastQuizStep ? "Set your goal target" : "Continue"}
                </button>
              </div>
            </div>
          ) : phase === "goalTarget" ? (
            <div className="auth-form-enter mt-4 flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <p
                  className="text-[13px] font-semibold tracking-wide text-[#0A1628]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  Your goal target
                </p>
                <Link
                  to="/signin"
                  className="text-[13px] text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  style={{ color: "#B8962E" }}
                >
                  Sign in instead
                </Link>
              </div>
              <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Almost there
              </p>
              {bannerError ? (
                <div
                  className="mt-3 w-full rounded-lg px-3 py-2.5 text-center text-sm"
                  style={{ backgroundColor: "#FEF2EC", color: "#D85A30" }}
                  role="alert"
                >
                  {bannerError}
                </div>
              ) : null}
              <h1 className="mt-5 text-[19px] font-semibold leading-[1.35] text-[#0A1628] sm:text-[21px]">
                How much are you aiming for — and when?
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Fine-tune your savings target. You chose{" "}
                <span className="font-semibold text-slate-800">
                  {SIGNUP_QUIZ_QUESTIONS[0].options[quizSelections[0]]?.label ??
                    "this goal"}
                </span>
                . Adjust the numbers to match your plan.
              </p>
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="signup-goal-amount"
                    className="mb-1 block text-[13px] text-slate-500"
                  >
                    Target amount ($)
                  </label>
                  <input
                    id="signup-goal-amount"
                    type="number"
                    min={1}
                    step={1}
                    value={goalTargetAmount}
                    onChange={(e) => {
                      setGoalTargetAmount(e.target.value);
                      if (bannerError) setBannerError("");
                    }}
                    className="auth-input w-full px-4 py-3 text-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-goal-year"
                    className="mb-1 block text-[13px] text-slate-500"
                  >
                    Target year
                  </label>
                  <select
                    id="signup-goal-year"
                    value={goalTargetYear}
                    onChange={(e) => {
                      setGoalTargetYear(e.target.value);
                      if (bannerError) setBannerError("");
                    }}
                    className="auth-input w-full px-4 py-3 text-slate-900"
                  >
                    {goalTargetYearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-auto flex shrink-0 gap-3 border-t border-slate-100 bg-white pt-4">
                <button
                  type="button"
                  onClick={handleGoalTargetBack}
                  disabled={isLoading}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoalTargetContinue}
                  className="auth-submit-btn flex h-12 flex-[1.65] items-center justify-center rounded-xl text-[14px] font-medium text-white disabled:opacity-70"
                >
                  Continue to account details
                </button>
              </div>
            </div>
          ) : phase === "linkChoice" ? (
            <div className="auth-form-enter mt-4">
              <h1
                className="mt-4 text-center text-[22px] font-semibold"
                style={{ color: NAVY }}
              >
                Link your accounts
              </h1>
              <p className="mx-auto mt-2 max-w-[36ch] text-center text-[14px] leading-relaxed text-slate-600">
                Optional — add a bank or brokerage to include those balances in your{" "}
                <span className="font-semibold text-slate-800">Total Net Worth</span> on the
                dashboard. You can add more later in Settings.
              </p>
              {linkedAccounts.length > 0 ? (
                <p
                  className="mt-3 text-center text-[13px] font-medium"
                  style={{ color: "#1A7F5A" }}
                >
                  {linkedAccounts.length} account
                  {linkedAccounts.length === 1 ? "" : "s"} linked
                </p>
              ) : null}

              {linkChoiceHint ? (
                <div
                  className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-[13px] leading-snug text-slate-700"
                  role="status"
                >
                  {linkChoiceHint}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLinkChoiceHint("");
                    setLinkModalInst({
                      category: "bank",
                      providerId: "other-bank",
                      name: "Your bank",
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-[#B8962E]/50 hover:bg-[#F5EDD6]/30"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white"
                    style={{ background: "#117ACA" }}
                  >
                    B
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-slate-900">Add a bank account</div>
                    <div className="text-[12px] text-slate-500">Checking or savings (read-only)</div>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold" style={{ color: GOLD }}>
                    Connect →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openBrokerageAppPicker}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-[#B8962E]/50 hover:bg-[#F5EDD6]/30"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[15px] font-bold text-white"
                    style={{ background: "#008000" }}
                  >
                    Br
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-slate-900">Add a brokerage account</div>
                    <div className="text-[12px] text-slate-500">Investments &amp; holdings (read-only)</div>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold" style={{ color: GOLD }}>
                    Connect →
                  </span>
                </button>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleContinueToDashboard}
                className="auth-submit-btn mt-8 flex h-12 w-full items-center justify-center rounded-xl text-[14px] font-medium text-white disabled:opacity-70"
              >
                Continue to dashboard
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleContinueToDashboard}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-70"
              >
                Skip for now
              </button>

              {brokeragePickerOpen ? (
                <div
                  className="fixed inset-0 z-[480] flex items-center justify-center bg-[rgba(10,22,40,0.55)] px-5 py-8"
                  role="presentation"
                  onClick={() => setBrokeragePickerOpen(false)}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="signup-broker-picker-title"
                    className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2
                      id="signup-broker-picker-title"
                      className="text-[17px] font-semibold text-[#0A1628]"
                    >
                      Choose your brokerage
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                      Select the app you use, then connect with OK.
                    </p>
                    <div
                      className="mt-4 flex flex-col gap-2"
                      role="radiogroup"
                      aria-labelledby="signup-broker-picker-title"
                    >
                      {SIGNUP_BROKERAGE_APPS.map((app) => {
                        const selected = signupBrokerProviderId === app.providerId;
                        return (
                          <button
                            key={app.providerId}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setSignupBrokerProviderId(app.providerId)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                              selected
                                ? "border-[#B8962E] bg-[#F5EDD6] ring-1 ring-[#B8962E]/40"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold text-white"
                              style={{ background: app.color }}
                            >
                              {app.letter}
                            </div>
                            <span className="text-[15px] font-semibold text-slate-900">
                              {app.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setBrokeragePickerOpen(false)}
                        className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmBrokerageAppPicker}
                        className="auth-submit-btn flex h-11 flex-1 items-center justify-center rounded-xl text-[14px] font-medium text-white"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <LinkAccountModal
                open={!!linkModalInst}
                institution={linkModalInst}
                onClose={handleLinkModalClose}
              />
            </div>
          ) : (
          <div className="auth-form-enter">
            <h1
              className="mt-6 text-center text-[22px] font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Almost there — secure your account
            </h1>
            <p className="mx-auto mt-2 max-w-[34ch] text-center text-[13px] leading-relaxed text-slate-600">
              You’ve answered every question. Add your details below and we’ll create your profile.
            </p>

            {bannerError ? (
              <div
                className="mt-4 w-full rounded-lg px-3 py-2.5 text-center text-sm"
                style={{ backgroundColor: "#FEF2EC", color: "#D85A30" }}
                role="alert"
              >
                {bannerError}
              </div>
            ) : null}

            <p className="mt-5 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-normal underline"
                style={{ color: "#B8962E" }}
              >
                Sign in
              </Link>
            </p>

            <button
              type="button"
              onClick={() => {
                setBannerError("");
                setPhase("quiz");
                setQuizStep(SIGNUP_QUIZ_QUESTIONS.length - 1);
              }}
              className="mx-auto mt-2 block text-[13px] font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
            >
              ← Review my answers
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAccountNext();
              }}
              className="mt-6 flex flex-col gap-4"
            >
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
                  "Next"
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-slate-500">
              By creating an account you agree to our Terms and Privacy Policy
            </p>
          </div>
          )}

          {phase === "account" || phase === "linkChoice" ? (
            <>
              <hr className="auth-page-divider my-8" />
              <AuthTrustBadges />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
