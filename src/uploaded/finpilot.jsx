import { useState, useEffect, useRef } from "react";
import {
  DEFAULT_DISPLAY_NAME,
  useAppContext,
  useAuth,
} from "../store/AppContext.jsx";
import { askAssistant } from "../services/marketApi.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const RISK_LEVELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

const DEFAULT_PORTFOLIO = {
  totalValue: 85420,
  allocation: { stocks: 72, bonds: 18, cash: 10 },
  assets: [
    { name: "Tech Stocks", ticker: "TECH", value: 28500, gain: 12.4, risk: "High", sector: "Technology", type: "stock" },
    { name: "S&P 500 Index", ticker: "SPX", value: 18200, gain: 8.1, risk: "Medium", sector: "Diversified", type: "stock" },
    { name: "Healthcare Fund", ticker: "HLTH", value: 15100, gain: 5.2, risk: "Medium", sector: "Healthcare", type: "mutual" },
    { name: "US Treasury Bonds", ticker: "BOND", value: 12300, gain: 2.8, risk: "Low", sector: "Fixed Income", type: "bond" },
    { name: "Real Estate Fund", ticker: "REIT", value: 6800, gain: -1.4, risk: "Medium", sector: "Real Estate", type: "mutual" },
    { name: "Cash & Equivalents", ticker: "CASH", value: 4520, gain: 0.5, risk: "Low", sector: "Cash", type: "cash" },
  ],
};

const SCENARIOS = [
  { id: "market_drop", label: "Market drops 20%", icon: "📉", desc: "Simulate a significant correction", params: { drop: 20 } },
  { id: "inflation", label: "Inflation spikes", icon: "🔥", desc: "High inflation environment", params: { drop: 8 } },
  { id: "withdraw", label: "Need cash urgently", icon: "💸", desc: "Emergency fund withdrawal", params: { drop: 0, withdraw: 15000 } },
  { id: "rate_hike", label: "Interest rates rise", icon: "📈", desc: "Rate hike impact", params: { drop: 12 } },
  { id: "recession", label: "Recession hits", icon: "⚠️", desc: "Economic downturn scenario", params: { drop: 35 } },
];

const GOALS = [
  { label: "Retire comfortably", icon: "🏖️", targetYears: 20, targetAmount: 1000000 },
  { label: "Buy a house", icon: "🏠", targetYears: 5, targetAmount: 300000 },
  { label: "Kids' education", icon: "🎓", targetYears: 10, targetAmount: 200000 },
  { label: "Emergency fund", icon: "🛡️", targetYears: 2, targetAmount: 50000 },
];

const ONBOARDING_QUESTIONS = [
  {
    id: "goal",
    stepLabel: "Goal",
    question: "What are you hoping your money will do for you?",
    hint: "Pick the one that feels most like you right now.",
    options: [
      { value: 2, icon: "🏠", label: "Buy a home or big purchase", description: "Within the next few years" },
      { value: 2, icon: "🎓", label: "Save for education", description: "Mine or my child's future" },
      { value: 4, icon: "🌴", label: "Retire comfortably", description: "Long-term financial freedom" },
      { value: 5, icon: "📈", label: "Grow my wealth", description: "Build it up over time" },
      { value: 1, icon: "🛡️", label: "Protect what I have", description: "Safety over growth" },
    ],
  },
  {
    id: "timeline",
    stepLabel: "Timeline",
    question: "How long can you leave your money invested?",
    hint: "Be honest — this shapes everything.",
    options: [
      { value: 1, icon: "⚡", label: "Less than 2 years", description: "I may need it soon" },
      { value: 2, icon: "📅", label: "2–5 years", description: "Medium horizon" },
      { value: 3, icon: "🗓️", label: "5–10 years", description: "I'm patient" },
      { value: 4, icon: "♾️", label: "10+ years", description: "I'm in no rush at all" },
    ],
  },
  {
    id: "risk_gut",
    stepLabel: "Risk Gut-Check",
    question:
      "Imagine your $10,000 drops to $7,500 overnight. What do you do?",
    hint: "Be honest — there's no wrong answer.",
    options: [
      { value: 1, icon: "😱", label: "Sell everything", description: "I can't stomach this loss" },
      { value: 2, icon: "😟", label: "Sell some of it", description: "Reduce my risk a bit" },
      { value: 3, icon: "😐", label: "Do nothing", description: "Wait and see what happens" },
      { value: 4, icon: "😏", label: "Buy a little more", description: "Looks like a discount to me" },
      { value: 5, icon: "😎", label: "Buy a lot more", description: "I fully trust the long game" },
    ],
  },
  {
    id: "amount",
    stepLabel: "Investment Amount",
    question: "What are you working with?",
    hint: "Rough estimates are totally fine.",
    options: [
      { value: 1, icon: "🌱", label: "Under $1,000", description: "Just getting started" },
      { value: 2, icon: "💵", label: "$1,000 – $10,000", description: "Building momentum" },
      { value: 3, icon: "💰", label: "$10,000 – $50,000", description: "Solid foundation" },
      { value: 4, icon: "🏦", label: "$50,000+", description: "Serious about this" },
    ],
  },
  {
    id: "involvement",
    stepLabel: "Involvement",
    question: "How hands-on do you want to be?",
    hint: "There's no wrong answer — it's your money.",
    options: [
      { value: 2, icon: "🤖", label: "Fully automatic", description: "Just handle it for me" },
      { value: 3, icon: "📬", label: "Notify me when needed", description: "I'll approve the changes" },
      { value: 3, icon: "🔍", label: "Explain before acting", description: "I want to understand first" },
      { value: 4, icon: "🎮", label: "Full control", description: "Show me everything" },
    ],
  },
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
function calcRisk(stocksPct) {
  if (stocksPct > 65) return RISK_LEVELS.HIGH;
  if (stocksPct > 40) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
}

function calcHealthScore(allocation, riskProfile) {
  const diversification = allocation.stocks < 80 && allocation.bonds > 10 ? 30 : 15;
  const riskMatch =
    (riskProfile === "Conservative" && allocation.stocks < 50) ||
    (riskProfile === "Balanced" && allocation.stocks >= 40 && allocation.stocks <= 70) ||
    (riskProfile === "Aggressive" && allocation.stocks > 60)
      ? 40
      : 20;
  const cashBuffer = allocation.cash >= 5 && allocation.cash <= 20 ? 30 : 10;
  return Math.min(100, diversification + riskMatch + cashBuffer);
}

/** Score sum ~5–22 from five questions (weighted values per answer). */
function getRiskProfile(score) {
  if (score <= 10) return "Conservative";
  if (score <= 16) return "Balanced";
  return "Aggressive";
}

function getRebalanceRecommendation(profile) {
  const recs = {
    Conservative: { stocks: 35, bonds: 50, cash: 15 },
    Balanced: { stocks: 55, bonds: 35, cash: 10 },
    Aggressive: { stocks: 80, bonds: 15, cash: 5 },
  };
  return recs[profile] || recs.Balanced;
}

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1a1a2e",
  accent: "#00d4aa",
  accentSoft: "#00d4aa22",
  warning: "#f59e0b",
  danger: "#ef4444",
  success: "#10b981",
  muted: "#64748b",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f1f5f9; color: #0f172a; }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input, select { font-family: inherit; }
  .fp-app { min-height: 100vh; display: flex; }
  .fp-sidebar { width: 220px; background: #1a1a2e; color: white; padding: 24px 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 100; }
  .fp-logo { padding: 0 24px 28px; border-bottom: 1px solid rgba(255,255,255,.1); }
  .fp-logo h1 { font-family: 'DM Serif Display', serif; font-size: 22px; color: #00d4aa; letter-spacing: -0.5px; }
  .fp-logo span { font-size: 11px; color: rgba(255,255,255,.4); }
  .fp-nav { flex: 1; padding: 16px 0; }
  .fp-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 24px; font-size: 14px; color: rgba(255,255,255,.6); cursor: pointer; transition: all .15s; border-left: 3px solid transparent; }
  .fp-nav-item:hover { color: white; background: rgba(255,255,255,.05); }
  .fp-nav-item.active { color: #00d4aa; background: rgba(0,212,170,.1); border-left-color: #00d4aa; }
  .fp-nav-icon { font-size: 16px; width: 20px; text-align: center; }
  .fp-main { margin-left: 220px; flex: 1; padding: 32px 36px; max-width: 1100px; }
  .fp-header { margin-bottom: 28px; }
  .fp-header h2 { font-family: 'DM Serif Display', serif; font-size: 28px; color: #0f172a; }
  .fp-header p { color: #64748b; font-size: 14px; margin-top: 4px; }
  .card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .metric-card { background: #f8fafc; border-radius: 12px; padding: 18px; }
  .metric-label { font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: .5px; }
  .metric-value { font-size: 26px; font-weight: 600; color: #0f172a; }
  .metric-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-yellow { background: #fef9c3; color: #a16207; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .progress-bar { height: 8px; border-radius: 4px; background: #e2e8f0; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width .6s ease; }
  .btn-primary { background: #00d4aa; color: #0f172a; padding: 10px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; transition: all .15s; }
  .btn-primary:hover { background: #00bfa0; transform: translateY(-1px); }
  .btn-outline { border: 1.5px solid #e2e8f0; color: #0f172a; padding: 10px 22px; border-radius: 10px; font-size: 14px; font-weight: 500; transition: all .15s; }
  .btn-outline:hover { border-color: #00d4aa; color: #00d4aa; }
  .section-title { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 16px; }
  .insight-card { border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
  .donut-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
  .donut-center { position: absolute; text-align: center; }
  .scenario-card { border: 2px solid #e2e8f0; border-radius: 14px; padding: 20px; cursor: pointer; transition: all .2s; }
  .scenario-card:hover, .scenario-card.selected { border-color: #00d4aa; background: rgba(0,212,170,.04); }
  .chat-msg { padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.6; max-width: 85%; margin-bottom: 12px; }
  .chat-user { background: #1a1a2e; color: white; margin-left: auto; border-bottom-right-radius: 4px; }
  .chat-ai { background: #f1f5f9; color: #0f172a; border-bottom-left-radius: 4px; }
  .chat-input-row { display: flex; gap: 10px; margin-top: 16px; }
  .chat-input { flex: 1; padding: 12px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 14px; outline: none; transition: border .15s; }
  .chat-input:focus { border-color: #00d4aa; }
  .risk-meter { display: flex; gap: 4px; margin: 12px 0; }
  .risk-bar { flex: 1; height: 10px; border-radius: 5px; }
  .alloc-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .alloc-label { width: 100px; font-size: 14px; color: #0f172a; }
  .alloc-track { flex: 1; }
  .alloc-pct { width: 40px; text-align: right; font-size: 14px; font-weight: 600; }
  .asset-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
  .asset-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
  .asset-info { flex: 1; }
  .asset-name { font-size: 14px; font-weight: 500; }
  .asset-sub { font-size: 12px; color: #64748b; }
  .asset-value { text-align: right; }
  .asset-val { font-size: 15px; font-weight: 600; }
  .asset-gain { font-size: 12px; }
  @keyframes onboard-card-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes onboard-content-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .onboard-container {
    position: relative;
    isolation: isolate;
    overflow-x: hidden;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(24px, 5vw, 48px) clamp(18px, 4vw, 28px);
    /* Stack: top layers first — center stays readable; base navy unchanged */
    background:
      radial-gradient(ellipse 52% 48% at 50% 44%, rgba(255, 255, 255, 0.03) 0%, transparent 62%),
      radial-gradient(ellipse 95% 70% at 50% -5%, rgba(0, 212, 170, 0.13) 0%, transparent 58%),
      radial-gradient(ellipse 70% 55% at 95% 15%, rgba(56, 189, 248, 0.09) 0%, transparent 55%),
      radial-gradient(ellipse 65% 50% at 5% 25%, rgba(0, 212, 170, 0.06) 0%, transparent 52%),
      linear-gradient(118deg, rgba(0, 212, 170, 0.045) 0%, transparent 48%),
      linear-gradient(305deg, rgba(96, 165, 250, 0.055) 0%, transparent 52%),
      linear-gradient(195deg, transparent 40%, rgba(15, 52, 96, 0.22) 100%),
      radial-gradient(ellipse 85% 70% at 100% 100%, rgba(15, 52, 96, 0.55) 0%, transparent 52%),
      radial-gradient(ellipse 75% 60% at 0% 100%, rgba(26, 26, 46, 0.42) 0%, transparent 50%),
      linear-gradient(155deg, #1a1a2e 0%, #0f3460 48%, #141e33 100%);
    background-color: #141e33;
  }
  /* Soft teal / blue blur orbs — luxury depth, very low contrast */
  .onboard-container::before {
    content: "";
    position: absolute;
    inset: -12%;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(circle 42vmin at 22% 32%, rgba(0, 212, 170, 0.2) 0%, transparent 58%),
      radial-gradient(circle 48vmin at 82% 22%, rgba(125, 211, 252, 0.14) 0%, transparent 58%),
      radial-gradient(circle 50vmin at 78% 88%, rgba(15, 52, 96, 0.38) 0%, transparent 56%),
      radial-gradient(circle 38vmin at 12% 82%, rgba(0, 212, 170, 0.11) 0%, transparent 54%);
    filter: blur(76px);
    opacity: 0.72;
    transform: translateZ(0);
  }
  /* Minimal noise + gentle vignette — keeps center brightest for the card */
  .onboard-container::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image:
      radial-gradient(rgba(255, 255, 255, 0.022) 1px, transparent 1px),
      radial-gradient(ellipse 72% 68% at 50% 45%, transparent 22%, rgba(8, 12, 28, 0.38) 100%);
    background-size: 19px 19px, auto;
    background-blend-mode: soft-light, normal;
    opacity: 0.42;
    mix-blend-mode: soft-light;
    mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 18%, transparent 78%);
  }
  .onboard-card-wrap {
    position: relative;
    z-index: 1;
    border-radius: 28px;
    padding: 1px;
    max-width: min(520px, 94vw);
    background: linear-gradient(
      155deg,
      rgba(0, 212, 170, 0.22) 0%,
      rgba(255, 255, 255, 0.08) 48%,
      rgba(255, 255, 255, 0.06) 100%
    );
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.06),
      0 40px 80px rgba(15, 23, 42, 0.35),
      0 16px 40px rgba(15, 23, 42, 0.12),
      0 0 80px rgba(0, 212, 170, 0.06);
    animation: onboard-card-float 8s ease-in-out infinite;
  }
  .onboard-card {
    position: relative;
    background: rgba(255, 255, 255, 0.985);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 27px;
    padding: clamp(36px, 7vw, 52px) clamp(28px, 5vw, 40px);
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.85);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 1),
      inset 0 -1px 0 rgba(15, 23, 42, 0.03),
      0 1px 2px rgba(15, 23, 42, 0.03),
      0 24px 48px rgba(15, 52, 96, 0.06),
      0 8px 16px rgba(15, 23, 42, 0.03);
  }
  .onboard-brand {
    text-align: center;
    margin-bottom: clamp(28px, 5vw, 40px);
  }
  .onboard-brand-mark {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(1.625rem, 4.5vw, 2rem);
    font-weight: 600;
    color: #00d4aa;
    letter-spacing: -0.035em;
    margin-bottom: 8px;
    line-height: 1.1;
  }
  .onboard-brand-tag {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1.4;
  }
  .onboard-progress {
    margin-bottom: clamp(28px, 4vw, 36px);
  }
  .onboard-progress-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    padding: 0 2px;
  }
  .onboard-progress-meta {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
  }
  .onboard-progress-count {
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #64748b;
    letter-spacing: 0.02em;
  }
  .onboard-progress-track {
    height: 4px;
    border-radius: 999px;
    background: #eef2f6;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .onboard-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #00c9a3 0%, #00d4aa 45%, #5eead4 100%);
    box-shadow: 0 0 12px rgba(0, 212, 170, 0.35);
    transition: width 0.5s cubic-bezier(0.33, 1, 0.68, 1);
  }
  .onboard-step-body {
    animation: onboard-content-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .onboard-step-badge {
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 700;
    color: #00d4aa;
    letter-spacing: 0.14em;
    margin-bottom: 20px;
    text-align: center;
    text-transform: uppercase;
    width: 100%;
    opacity: 0.92;
  }
  .onboard-question {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(1.375rem, 4vw, 1.75rem);
    font-weight: 600;
    color: #0f172a;
    text-align: center;
    line-height: 1.22;
    letter-spacing: -0.028em;
    margin-bottom: 16px;
    max-width: 22em;
    margin-left: auto;
    margin-right: auto;
  }
  .onboard-hint {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    font-weight: 400;
    color: #64748b;
    text-align: center;
    margin-bottom: clamp(28px, 4vw, 36px);
    line-height: 1.65;
    max-width: 34rem;
    margin-left: auto;
    margin-right: auto;
  }
  .onboard-options {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .onboard-option {
    position: relative;
    border: 1px solid #e6eef0;
    border-radius: 20px;
    padding: 17px 18px;
    cursor: pointer;
    font-size: 15px;
    transition:
      transform 250ms cubic-bezier(0.34, 1.25, 0.64, 1),
      box-shadow 250ms ease,
      border-color 250ms ease,
      background 250ms ease;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 15px;
    background: #ffffff;
    color: inherit;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.035),
      0 10px 28px rgba(15, 52, 96, 0.045),
      0 4px 12px rgba(15, 23, 42, 0.03);
    -webkit-tap-highlight-color: transparent;
  }
  .onboard-option:hover {
    transform: translateY(-2px) scale(1.012);
    border-color: rgba(0, 212, 170, 0.45);
    background: #ffffff;
    box-shadow:
      0 2px 4px rgba(15, 23, 42, 0.04),
      0 12px 32px rgba(15, 52, 96, 0.08),
      0 0 0 1px rgba(0, 212, 170, 0.12);
  }
  .onboard-option:focus-visible {
    outline: 2px solid #00d4aa;
    outline-offset: 3px;
  }
  .onboard-option.selected {
    border: 2px solid #00d4aa;
    padding: 16px 17px;
    background: linear-gradient(180deg, rgba(0, 212, 170, 0.09) 0%, rgba(0, 212, 170, 0.04) 100%);
    box-shadow:
      0 0 0 1px rgba(0, 212, 170, 0.1),
      0 0 28px rgba(0, 212, 170, 0.2),
      0 10px 28px rgba(15, 23, 42, 0.07);
    transform: translateY(-1px) scale(1.01);
  }
  .onboard-option.selected .onboard-opt-title { color: #0b1220; }
  .onboard-opt-icon {
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(145deg, rgba(0, 212, 170, 0.12) 0%, rgba(0, 212, 170, 0.06) 100%);
    border: 1px solid rgba(0, 212, 170, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.75),
      0 2px 6px rgba(15, 52, 96, 0.06);
    filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.4));
    transition:
      transform 250ms cubic-bezier(0.34, 1.25, 0.64, 1),
      background 250ms ease,
      box-shadow 250ms ease,
      border-color 250ms ease;
  }
  .onboard-option:hover .onboard-opt-icon {
    transform: scale(1.04);
    background: linear-gradient(145deg, rgba(0, 212, 170, 0.16) 0%, rgba(0, 212, 170, 0.08) 100%);
    border-color: rgba(0, 212, 170, 0.2);
  }
  .onboard-option.selected .onboard-opt-icon {
    background: linear-gradient(145deg, rgba(0, 212, 170, 0.22) 0%, rgba(0, 212, 170, 0.1) 100%);
    border-color: rgba(0, 212, 170, 0.25);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      0 0 20px rgba(0, 212, 170, 0.25);
  }
  .onboard-opt-text { flex: 1; min-width: 0; padding-top: 1px; }
  .onboard-opt-title {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.42;
    letter-spacing: -0.012em;
  }
  .onboard-opt-desc {
    display: block;
    font-size: 0.8125rem;
    color: #94a3b8;
    margin-top: 8px;
    line-height: 1.52;
    font-weight: 400;
    letter-spacing: 0.008em;
  }
  .onboard-next-btn {
    --onboard-next-glow: rgba(0, 212, 170, 0.22);
    margin-top: clamp(32px, 5vw, 40px);
    width: 100%;
    min-height: 54px;
    padding: 16px 28px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-family: inherit;
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: -0.018em;
    line-height: 1.2;
    border: none;
    cursor: pointer;
    position: relative;
    isolation: isolate;
    overflow: hidden;
    transition:
      transform 0.45s cubic-bezier(0.34, 1.15, 0.48, 1),
      box-shadow 0.45s cubic-bezier(0.34, 1.15, 0.48, 1),
      opacity 0.25s ease,
      filter 0.35s ease;
    color: #081421 !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 42%),
      linear-gradient(168deg, #12e4bd 0%, #00d4aa 42%, #00b896 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.42),
      inset 0 -1px 0 rgba(0, 90, 76, 0.08),
      0 1px 2px rgba(8, 20, 33, 0.06),
      0 4px 14px rgba(0, 140, 118, 0.14),
      0 2px 6px rgba(15, 23, 42, 0.05);
  }
  .onboard-next-btn::before {
    content: "";
    position: absolute;
    inset: -40%;
    background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.45) 0%, transparent 55%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    z-index: 0;
  }
  .onboard-next-btn:hover:not(:disabled)::before {
    opacity: 0.35;
  }
  .onboard-next-btn:hover:not(:disabled) {
    transform: translateY(-3px);
    filter: brightness(1.02);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      inset 0 -1px 0 rgba(0, 90, 76, 0.06),
      0 0 0 1px rgba(0, 212, 170, 0.18),
      0 6px 18px rgba(0, 160, 136, 0.18),
      0 14px 36px var(--onboard-next-glow),
      0 28px 56px rgba(0, 212, 170, 0.12);
  }
  .onboard-next-btn:active:not(:disabled) {
    transform: translateY(-1px) scale(0.985);
    filter: brightness(0.99);
    transition:
      transform 0.12s cubic-bezier(0.33, 1, 0.68, 1),
      box-shadow 0.12s ease,
      filter 0.12s ease;
    box-shadow:
      inset 0 2px 8px rgba(8, 25, 42, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      0 2px 8px rgba(0, 140, 118, 0.12),
      0 1px 3px rgba(15, 23, 42, 0.06);
  }
  .onboard-next-btn:focus-visible {
    outline: 2px solid #00d4aa;
    outline-offset: 3px;
  }
  .onboard-next-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
    filter: none;
    background: linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%) !important;
    color: #94a3b8 !important;
  }
  .onboard-next-btn:disabled::before {
    display: none;
  }
  .onboard-next-btn-inner {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .onboard-next-btn-label {
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .onboard-next-btn-arrow {
    display: inline-flex;
    flex-shrink: 0;
    transition: transform 0.42s cubic-bezier(0.34, 1.15, 0.48, 1);
  }
  .onboard-next-btn:hover:not(:disabled) .onboard-next-btn-arrow {
    transform: translateX(5px);
  }
  .onboard-next-btn:active:not(:disabled) .onboard-next-btn-arrow {
    transform: translateX(2px);
    transition-duration: 0.12s;
  }
  @media (prefers-reduced-motion: reduce) {
    .onboard-card-wrap,
    .onboard-step-body {
      animation: none !important;
    }
    .onboard-progress-fill {
      transition: none !important;
    }
    .onboard-option,
    .onboard-next-btn,
    .onboard-opt-icon {
      transition: none !important;
    }
    .onboard-option:hover,
    .onboard-option.selected,
    .onboard-option:hover .onboard-opt-icon {
      transform: none;
    }
    .onboard-next-btn:hover:not(:disabled),
    .onboard-next-btn:active:not(:disabled) {
      transform: none;
      filter: none;
    }
    .onboard-next-btn:hover:not(:disabled) .onboard-next-btn-arrow,
    .onboard-next-btn:active:not(:disabled) .onboard-next-btn-arrow {
      transform: none;
    }
  }
  .panic-overlay { position: fixed; inset: 0; background: rgba(239,68,68,.15); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px); }
  .panic-card { background: white; border-radius: 20px; padding: 40px; max-width: 480px; text-align: center; border: 2px solid #fee2e2; }
`;

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const cx = size / 2, cy = size / 2, r = size * 0.38, strokeWidth = size * 0.18;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const pct = d.value / total;
        const offset = circumference * (1 - cumulative);
        const dash = circumference * pct;
        cumulative += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={d.color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset} style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
        );
      })}
    </svg>
  );
}

// ─── MINI BAR ────────────────────────────────────────────────────────────────
function MiniBar({ value, max = 100, color }) {
  return (
    <div className="progress-bar" style={{ flex: 1 }}>
      <div className="progress-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

// ─── ONBOARDING ──────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedIdx, setSelectedIdx] = useState(null);

  const q = ONBOARDING_QUESTIONS[step];
  const totalSteps = ONBOARDING_QUESTIONS.length;
  const progressPct = ((step + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (selectedIdx === null) return;
    const chosen = q.options[selectedIdx];
    const newAnswers = { ...answers, [q.id]: chosen.value };
    setAnswers(newAnswers);
    setSelectedIdx(null);
    if (step < ONBOARDING_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const score = Object.values(newAnswers).reduce((a, b) => a + b, 0);
      const profile = getRiskProfile(score);
      onComplete(profile);
    }
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card-wrap">
        <div className="onboard-card">
          <header className="onboard-brand">
            <div className="onboard-brand-mark">FinPilot</div>
            <p className="onboard-brand-tag">Your beginner-friendly financial co-pilot</p>
          </header>

          <div className="onboard-progress">
            <span className="sr-only">
              Question {step + 1} of {totalSteps}
            </span>
            <div className="onboard-progress-label" aria-hidden>
              <span className="onboard-progress-meta">Your profile</span>
              <span className="onboard-progress-count">
                {step + 1} / {totalSteps}
              </span>
            </div>
            <div
              className="onboard-progress-track"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={step + 1}
              aria-valuetext={`Step ${step + 1} of ${totalSteps}`}
            >
              <div
                className="onboard-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div key={step} className="onboard-step-body">
            <p className="onboard-step-badge">{q.stepLabel}</p>

            <h2 id={`onboard-q-${q.id}`} className="onboard-question">
              {q.question}
            </h2>
            <p className="onboard-hint">{q.hint}</p>

            <div className="onboard-options" role="group" aria-labelledby={`onboard-q-${q.id}`}>
              {q.options.map((opt, idx) => (
                <button
                  key={`${q.id}-${idx}`}
                  type="button"
                  className={`onboard-option ${selectedIdx === idx ? "selected" : ""}`}
                  aria-pressed={selectedIdx === idx}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <span className="onboard-opt-icon" aria-hidden>{opt.icon}</span>
                  <span className="onboard-opt-text">
                    <span className="onboard-opt-title">{opt.label}</span>
                    <span className="onboard-opt-desc">{opt.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary onboard-next-btn"
            disabled={selectedIdx === null}
            onClick={handleNext}
          >
            <span className="onboard-next-btn-inner">
              <span className="onboard-next-btn-label">
                {step < ONBOARDING_QUESTIONS.length - 1 ? "Continue" : "See my profile"}
              </span>
              <span className="onboard-next-btn-arrow" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function portfolioBreakdownByType(portfolio) {
  const total = portfolio.totalValue || 1;
  const sums = { stock: 0, mutual: 0, bond: 0, cash: 0 };
  for (const a of portfolio.assets) {
    if (sums[a.type] !== undefined) sums[a.type] += a.value;
  }
  return [
    { label: "Stocks & ETFs", value: (sums.stock / total) * 100, color: "#1a1a2e" },
    { label: "Mutual Funds", value: (sums.mutual / total) * 100, color: "#00d4aa" },
    { label: "Bonds", value: (sums.bond / total) * 100, color: "#f59e0b" },
    { label: "Cash", value: (sums.cash / total) * 100, color: "#94a3b8" },
  ];
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ portfolio, riskProfile, onPanic }) {
  const [homePortfolioTab, setHomePortfolioTab] = useState("holdings");
  const typeIcons = { stock: "📊", mutual: "🏦", bond: "📜", cash: "💵" };
  const typeColors = { stock: "#dbeafe", mutual: "#ede9fe", bond: "#dcfce7", cash: "#f1f5f9" };
  const breakdownRows = portfolioBreakdownByType(portfolio);
  const ytdGain = Math.round(portfolio.totalValue * 0.093);

  const risk = calcRisk(portfolio.allocation.stocks);
  const health = calcHealthScore(portfolio.allocation, riskProfile);
  const donutData = [
    { label: "Stocks", value: portfolio.allocation.stocks, color: "#1a1a2e" },
    { label: "Bonds", value: portfolio.allocation.bonds, color: "#00d4aa" },
    { label: "Cash", value: portfolio.allocation.cash, color: "#94a3b8" },
  ];

  const insights = [
    { color: "#fef9c3", icon: "⚠️", text: "You're slightly overweight in stocks vs your Balanced profile. Consider trimming by 10–15%.", type: "warn" },
    { color: "#dcfce7", icon: "✅", text: "Your bond allocation keeps you stable during downturns. Great buffer!", type: "ok" },
    { color: "#dbeafe", icon: "💡", text: "Your portfolio grew 9.3% this year — ahead of the 7% market average.", type: "info" },
  ];

  return (
    <div>
      <div className="fp-header">
        <h2>Good morning, Investor 👋</h2>
        <p>Here's how your financial health looks today</p>
      </div>

      <div className="grid4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">Total value</div>
          <div className="metric-value">{fmt(portfolio.totalValue)}</div>
          <div className="metric-sub" style={{ color: "#10b981" }}>↑ +9.3% this year</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Health score</div>
          <div className="metric-value" style={{ color: health > 70 ? "#10b981" : health > 45 ? "#f59e0b" : "#ef4444" }}>{health}/100</div>
          <div className="metric-sub">{health > 70 ? "You're in great shape!" : health > 45 ? "Small adjustments needed" : "Action required"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Risk level</div>
          <div className="metric-value" style={{ color: risk === "High" ? "#ef4444" : risk === "Medium" ? "#f59e0b" : "#10b981" }}>{risk}</div>
          <div className="metric-sub">Your profile: {riskProfile}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Your persona</div>
          <div className="metric-value" style={{ fontSize: 17, lineHeight: 1.4 }}>{riskProfile === "Conservative" ? "Cautious Planner" : riskProfile === "Balanced" ? "Steady Builder" : "Bold Grower"}</div>
          <div className="metric-sub">Based on your answers</div>
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Asset Allocation</div>
          <div className="donut-wrap" style={{ height: 170 }}>
            <DonutChart data={donutData} size={160} />
            <div className="donut-center">
              <div style={{ fontSize: 11, color: "#64748b" }}>Stocks</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{portfolio.allocation.stocks}%</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            {donutData.map((d) => (
              <div key={d.label} className="alloc-row">
                <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <div className="alloc-label">{d.label}</div>
                <div className="alloc-track"><MiniBar value={d.value} color={d.color} /></div>
                <div className="alloc-pct">{d.value}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Smart Insights</div>
          {insights.map((ins, i) => (
            <div key={i} className="insight-card" style={{ background: ins.color }}>
              <span style={{ fontSize: 20 }}>{ins.icon}</span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: "#0f172a" }}>{ins.text}</span>
            </div>
          ))}
          <button className="btn-outline" style={{ width: "100%", marginTop: 8 }}
            onClick={onPanic}>
            🚨 Market Crash? Hit the Panic Button
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Your investments</div>
        <div
          role="tablist"
          aria-label="Portfolio holdings and breakdown"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: 12,
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={homePortfolioTab === "holdings"}
            className={homePortfolioTab === "holdings" ? "btn-primary" : "btn-outline"}
            style={{ fontSize: 14, padding: "10px 18px", borderRadius: 10 }}
            onClick={() => setHomePortfolioTab("holdings")}
          >
            Holdings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={homePortfolioTab === "breakdown"}
            className={homePortfolioTab === "breakdown" ? "btn-primary" : "btn-outline"}
            style={{ fontSize: 14, padding: "10px 18px", borderRadius: 10 }}
            onClick={() => setHomePortfolioTab("breakdown")}
          >
            Breakdown
          </button>
        </div>

        {homePortfolioTab === "holdings" ? (
          <div role="tabpanel">
            <div className="section-title" style={{ marginBottom: 12 }}>Stocks & Funds</div>
            {portfolio.assets.filter((a) => a.type !== "cash").map((asset) => (
              <div key={asset.ticker} className="asset-row">
                <div className="asset-icon" style={{ background: typeColors[asset.type] }}>{typeIcons[asset.type]}</div>
                <div className="asset-info">
                  <div className="asset-name">{asset.name}</div>
                  <div className="asset-sub">{asset.sector} · <span className={`badge badge-${asset.risk === "High" ? "red" : asset.risk === "Medium" ? "yellow" : "green"}`}>{asset.risk} risk</span></div>
                </div>
                <div className="asset-value">
                  <div className="asset-val">{fmt(asset.value)}</div>
                  <div className="asset-gain" style={{ color: asset.gain >= 0 ? "#10b981" : "#ef4444" }}>
                    {asset.gain >= 0 ? "+" : ""}{asset.gain}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div role="tabpanel">
            <div className="section-title" style={{ marginBottom: 12 }}>By investment type</div>
            {breakdownRows.map((s) => (
              <div key={s.label} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{s.value.toFixed(1)}%</span>
                </div>
                <MiniBar value={Math.min(100, s.value)} color={s.color} />
              </div>
            ))}
            <div style={{ marginTop: 20, padding: "14px", background: "#f8fafc", borderRadius: 10 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Total portfolio value</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(portfolio.totalValue)}</div>
              <div style={{ fontSize: 13, color: "#10b981", marginTop: 2 }}>↑ +{fmt(ytdGain)} this year</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">Goal Progress</div>
        <div className="grid2">
          {[
            { label: "🏖️ Retirement", progress: 65, target: fmt(1000000), current: fmt(portfolio.totalValue), years: 20 },
            { label: "🏠 Buy a House", progress: 28, target: fmt(300000), current: fmt(85420), years: 5 },
          ].map((g) => (
            <div key={g.label} style={{ padding: "4px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{g.label}</span>
                <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>{g.progress}%</span>
              </div>
              <div className="progress-bar" style={{ height: 10, marginBottom: 8 }}>
                <div className="progress-fill" style={{ width: `${g.progress}%`, background: "#00d4aa" }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {g.current} of {g.target} · {g.years} years left
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCENARIO SIMULATOR ───────────────────────────────────────────────────────
function Scenarios({ portfolio }) {
  const [selected, setSelected] = useState(null);
  const [customDrop, setCustomDrop] = useState(20);
  const [customWithdraw, setCustomWithdraw] = useState(0);
  const [result, setResult] = useState(null);

  const runScenario = (scen) => {
    setSelected(scen.id);
    const drop = scen.params.drop || 0;
    const withdraw = scen.params.withdraw || 0;
    const newVal = portfolio.totalValue * (1 - drop / 100) - withdraw;
    const newStocks = Math.round(portfolio.allocation.stocks * (1 - (drop / 100) * 0.8));
    const newBonds = Math.min(100 - newStocks - portfolio.allocation.cash, portfolio.allocation.bonds + Math.round(drop / 5));
    setResult({
      newValue: Math.max(0, newVal),
      loss: portfolio.totalValue - newVal,
      lossPct: drop + (withdraw / portfolio.totalValue) * 100,
      newAlloc: { stocks: newStocks, bonds: newBonds, cash: portfolio.allocation.cash },
      riskChange: drop > 15 ? "Increased" : "Stable",
      recommendation: drop > 20 ? "Switch to defensive assets — increase bonds and cash" :
        drop > 10 ? "Reduce high-risk stocks by 10–15%" : "Hold steady — short-term volatility is normal",
      why: drop > 20 ? "Large market drops hurt stocks most. Bonds and cash provide stability." :
        drop > 10 ? "Moderate drops are common. A small rebalance protects future gains." :
        "Small drops happen often. Selling in panic usually costs more than waiting.",
    });
  };

  const runCustom = () => {
    const scen = { id: "custom", params: { drop: customDrop, withdraw: customWithdraw } };
    runScenario(scen);
  };

  return (
    <div>
      <div className="fp-header"><h2>Scenario Simulator</h2><p>See what happens to your money in different market conditions</p></div>
      <div className="grid2" style={{ marginBottom: 24, alignItems: "start" }}>
        <div>
          <div className="section-title" style={{ marginBottom: 14 }}>Choose a scenario</div>
          {SCENARIOS.map((scen) => (
            <div key={scen.id} className={`scenario-card ${selected === scen.id ? "selected" : ""}`}
              style={{ marginBottom: 12 }} onClick={() => runScenario(scen)}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 24 }}>{scen.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{scen.label}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{scen.desc}</div>
                </div>
              </div>
            </div>
          ))}

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>🎛️ Build your own scenario</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 14 }}>Market drop</label>
                <span style={{ fontWeight: 600, color: "#ef4444" }}>-{customDrop}%</span>
              </div>
              <input type="range" min={0} max={60} step={1} value={customDrop}
                onChange={(e) => setCustomDrop(+e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 14 }}>Emergency withdrawal</label>
                <span style={{ fontWeight: 600, color: "#f59e0b" }}>{fmt(customWithdraw)}</span>
              </div>
              <input type="range" min={0} max={50000} step={1000} value={customWithdraw}
                onChange={(e) => setCustomWithdraw(+e.target.value)} style={{ width: "100%" }} />
            </div>
            <button className="btn-primary" onClick={runCustom}>Run My Scenario →</button>
          </div>
        </div>

        <div>
          {result ? (
            <div>
              <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #ef4444" }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>📊 Simulation Result</div>
                <div className="grid2" style={{ marginBottom: 16 }}>
                  <div className="metric-card">
                    <div className="metric-label">New portfolio value</div>
                    <div className="metric-value" style={{ fontSize: 20 }}>{fmt(result.newValue)}</div>
                    <div className="metric-sub" style={{ color: "#ef4444" }}>↓ {fmt(result.loss)} estimated loss</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Impact</div>
                    <div className="metric-value" style={{ fontSize: 20, color: "#ef4444" }}>-{result.lossPct.toFixed(1)}%</div>
                    <div className="metric-sub">Risk: {result.riskChange}</div>
                  </div>
                </div>
                <div style={{ background: "#fff7ed", borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>💡 What we recommend</div>
                  <div style={{ fontSize: 14, color: "#0f172a" }}>{result.recommendation}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#64748b", marginBottom: 4 }}>WHY?</div>
                  <div style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.6 }}>{result.why}</div>
                </div>
              </div>
              <div className="card">
                <div className="section-title">New Allocation After Scenario</div>
                {Object.entries(result.newAlloc).map(([k, v]) => (
                  <div key={k} className="alloc-row">
                    <div className="alloc-label" style={{ textTransform: "capitalize" }}>{k}</div>
                    <div className="alloc-track">
                      <MiniBar value={v} color={k === "stocks" ? "#1a1a2e" : k === "bonds" ? "#00d4aa" : "#94a3b8"} />
                    </div>
                    <div className="alloc-pct">{v}%</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔮</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Pick a scenario to see the impact</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>We'll show you what happens and what to do</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── REBALANCE ────────────────────────────────────────────────────────────────
function Rebalance({ portfolio, riskProfile, onApply }) {
  const [applied, setApplied] = useState(false);
  const recommended = getRebalanceRecommendation(riskProfile);
  const current = portfolio.allocation;

  const changes = Object.entries(recommended).map(([key, val]) => ({
    key, current: current[key], recommended: val, diff: val - current[key],
  }));

  const actions = changes
    .filter((c) => Math.abs(c.diff) > 2)
    .map((c) => ({
      label: c.diff > 0
        ? `Increase ${c.key} by ${Math.abs(c.diff)}%`
        : `Reduce ${c.key} by ${Math.abs(c.diff)}%`,
      icon: c.diff > 0 ? "↑" : "↓",
      color: c.diff > 0 ? "#10b981" : "#f59e0b",
      why: c.key === "stocks" && c.diff < 0
        ? "You're overweight in stocks for your risk level — reducing adds safety."
        : c.key === "bonds" && c.diff > 0
        ? "More bonds cushion against market drops while keeping returns steady."
        : "Keeping this level gives you a balance of safety and growth.",
    }));

  const handleApply = () => { setApplied(true); onApply(recommended); };

  return (
    <div>
      <div className="fp-header"><h2>Rebalancing Engine</h2><p>Simple steps to align your portfolio with your goals</p></div>
      <div className="grid2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Current vs Recommended</div>
          {changes.map((c) => (
            <div key={c.key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>{c.key}</span>
                <span style={{ fontSize: 13, color: c.diff > 2 ? "#10b981" : c.diff < -2 ? "#ef4444" : "#64748b", fontWeight: 600 }}>
                  {c.current}% → {c.recommended}%
                  {Math.abs(c.diff) > 2 ? (c.diff > 0 ? " ↑" : " ↓") : " ✓"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>Now</div>
                  <MiniBar value={c.current} color="#94a3b8" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#00d4aa", marginBottom: 3 }}>Target</div>
                  <MiniBar value={c.recommended} color="#00d4aa" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Recommended Actions</div>
            {actions.map((a, i) => (
              <div key={i} style={{ padding: "14px", background: "#f8fafc", borderRadius: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, color: a.color, fontWeight: 700 }}>{a.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{a.label}</span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, paddingLeft: 28 }}>{a.why}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}>📋 Cost & Tax Summary</div>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Estimated transaction fees: <strong>~$12</strong></div>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Tax impact: <strong>Minimal</strong> (mostly within tax-advantaged accounts)</div>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 16 }}>Time to rebalance: <strong>~1 business day</strong></div>
            {!applied ? (
              <button className="btn-primary" style={{ width: "100%" }} onClick={handleApply}>
                ✅ Apply Rebalancing
              </button>
            ) : (
              <div style={{ background: "#dcfce7", borderRadius: 10, padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#15803d" }}>
                🎉 Rebalancing applied! Your portfolio is now optimized.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function Assistant({ portfolio, riskProfile }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: `Hi! I'm your FinPilot assistant 👋 I can answer questions about your portfolio in plain English. Try asking "Is my portfolio safe?" or "Should I sell now?"` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgEnd = useRef(null);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    const context = `FinPilot user portfolio snapshot:
- Total value: ${fmt(portfolio.totalValue)}
- Allocation: Stocks ${portfolio.allocation.stocks}%, Bonds ${portfolio.allocation.bonds}%, Cash ${portfolio.allocation.cash}%
- Risk profile: ${riskProfile}
- Health score: ${calcHealthScore(portfolio.allocation, riskProfile)}/100`;

    const priorHistory = messages
      .slice(1)
      .slice(-14)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

    try {
      const text = await askAssistant(userMsg, context, priorHistory);
      setMessages((m) => [...m, { role: "ai", text }]);
    } catch (err) {
      console.error("[FinPilot assistant]", err);
      const msg = err instanceof Error ? err.message : String(err);
      const hint =
        msg.includes("GEMINI_API_KEY") || msg.includes("gemini_not_configured")
          ? " Add GEMINI_API_KEY to backend/.env or root .env, then restart the Python server (npm run dev)."
          : "";
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: `Something went wrong talking to the assistant.${hint ? ` ${hint}` : ""} Details: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["Is my portfolio safe?", "Should I sell now?", "How do I reduce risk?", "Am I on track for retirement?"];

  return (
    <div>
      <div className="fp-header"><h2>AI Assistant</h2><p>Ask anything about your money — no jargon, just plain answers</p></div>
      <div className="card" style={{ maxWidth: 680 }}>
        <div style={{ height: 400, overflowY: "auto", paddingBottom: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div className={`chat-msg ${m.role === "user" ? "chat-user" : "chat-ai"}`}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex" }}>
              <div className="chat-msg chat-ai" style={{ color: "#94a3b8" }}>Thinking...</div>
            </div>
          )}
          <div ref={msgEnd} />
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {suggestions.map((s) => (
              <button key={s} className="btn-outline" style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => { setInput(s); }}>
                {s}
              </button>
            ))}
          </div>
          <div className="chat-input-row">
            <input className="chat-input" value={input} placeholder="Ask me anything about your portfolio..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
            <button className="btn-primary" onClick={sendMessage} disabled={loading}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PANIC MODE ───────────────────────────────────────────────────────────────
function PanicMode({ onClose }) {
  return (
    <div className="panic-overlay" onClick={onClose}>
      <div className="panic-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😰</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 12, color: "#ef4444" }}>Market in freefall?</h2>
        <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>
          Take a breath. Market drops are temporary. Selling in panic usually makes losses permanent. Here's what smart investors do instead:
        </p>
        {[
          { icon: "🛑", text: "Don't sell in panic — you lock in the loss" },
          { icon: "📊", text: "Check your allocation — rebalance if needed" },
          { icon: "💰", text: "If cash is available, this could be a buying opportunity" },
          { icon: "🎯", text: "Your goals haven't changed — stay the course" },
        ].map((tip) => (
          <div key={tip.icon} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #fee2e2", textAlign: "left" }}>
            <span style={{ fontSize: 20 }}>{tip.icon}</span>
            <span style={{ fontSize: 14, color: "#0f172a" }}>{tip.text}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>Run Scenario Sim →</button>
        </div>
      </div>
    </div>
  );
}

const FINPILOT_ALERTS_SUBSCRIBE_KEY = "finpilot_alerts_subscribed_email";
const FINPILOT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── ALERTS ───────────────────────────────────────────────────────────────────
function Alerts() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  const alerts = [
    { icon: "⚠️", title: "Portfolio drift detected", desc: "Your stocks allocation rose to 72% — 7% above your target. Consider trimming.", color: "#fef9c3", action: "Rebalance now" },
    { icon: "📉", title: "Tech sector down 5%", desc: "Your Tech holding dropped. This is within normal range — no action needed yet.", color: "#fee2e2", action: "View details" },
    { icon: "✅", title: "You're on track for retirement", desc: "Great news! Your portfolio is 65% toward your retirement goal. Keep contributing.", color: "#dcfce7", action: null },
    { icon: "💡", title: "Rebalance opportunity", desc: "Bond yields have risen — a good time to increase your bond allocation for stability.", color: "#dbeafe", action: "See recommendations" },
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FINPILOT_ALERTS_SUBSCRIBE_KEY);
      if (stored) {
        setEmail(stored);
        setSubscribed(true);
        return;
      }
    } catch {
      /* ignore */
    }
    if (currentUser?.email) setEmail(currentUser.email);
  }, [currentUser?.email]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    setError("");
    const em = email.trim();
    if (!FINPILOT_EMAIL_RE.test(em)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      localStorage.setItem(FINPILOT_ALERTS_SUBSCRIBE_KEY, em);
    } catch {
      /* ignore */
    }
    const subject = encodeURIComponent("You're subscribed to FinPilot updates");
    const body = encodeURIComponent(
      "Thanks for subscribing to FinPilot market and portfolio updates.\n\nYou're on the list — we'll send important alerts and insights for your plan.\n\n— FinPilot",
    );
    const href = `mailto:${encodeURIComponent(em)}?subject=${subject}&body=${body}`;
    const a = document.createElement("a");
    a.href = href;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setSubscribed(true);
  };

  const handleChangeEmail = () => {
    try {
      localStorage.removeItem(FINPILOT_ALERTS_SUBSCRIBE_KEY);
    } catch {
      /* ignore */
    }
    setSubscribed(false);
    setError("");
  };

  return (
    <div>
      <div className="fp-header">
        <h2>Alerts & Insights</h2>
        <p>Important updates about your portfolio</p>
      </div>

      {alerts.map((a, i) => (
        <div key={i} className="card" style={{ marginBottom: 16, background: a.color, borderColor: "transparent" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.6 }}>{a.desc}</div>
            </div>
            {a.action && <button type="button" className="btn-outline" style={{ fontSize: 13, padding: "7px 16px", flexShrink: 0 }}>{a.action}</button>}
          </div>
        </div>
      ))}

      <div className="section-title" style={{ marginTop: 28, marginBottom: 12 }}>Subscribe to latest updates</div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Get FinPilot updates by email</div>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
          Subscribe to the latest market and portfolio insights. After you confirm, your mail app opens with a short message — send it to yourself to see the subscription confirmation in your inbox.
        </p>
        {!subscribed ? (
          <form onSubmit={handleSubscribe}>
            <label htmlFor="fp-subscribe-email" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
              Email address
            </label>
            <input
              id="fp-subscribe-email"
              type="email"
              autoComplete="email"
              className="chat-input"
              style={{ width: "100%", marginBottom: 12 }}
              placeholder="you@example.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
            {error ? (
              <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 12 }}>{error}</p>
            ) : null}
            <button type="submit" className="btn-primary">
              Subscribe
            </button>
          </form>
        ) : (
          <div>
            <div
              className="badge badge-green"
              style={{ display: "inline-block", marginBottom: 12, fontSize: 13, padding: "8px 14px" }}
            >
              Subscribed as {email}
            </div>
            <p style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.6, marginBottom: 16 }}>
              If your mail app opened, send the draft message to yourself — you’ll get the confirmation in your inbox (or check your Sent folder).
            </p>
            <button type="button" className="btn-outline" onClick={handleChangeEmail}>
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const FINPILOT_ONBOARDING_KEY = "finpilot_onboarding_done";

export default function FinPilot() {
  const { currentUser, signOut } = useAuth();
  const { setRiskProfile: setRiskProfileCtx } = useAppContext();
  const [page, setPage] = useState(() =>
    typeof localStorage !== "undefined" &&
    localStorage.getItem(FINPILOT_ONBOARDING_KEY) === "true"
      ? "dashboard"
      : "onboarding",
  );
  const [riskProfile, setRiskProfile] = useState("Balanced");
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [showPanic, setShowPanic] = useState(false);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "scenarios", label: "What-If Scenarios", icon: "🔮" },
    { id: "rebalance", label: "Rebalancing", icon: "⚖️" },
    { id: "assistant", label: "AI Assistant", icon: "🤖" },
    { id: "alerts", label: "Alerts", icon: "🔔" },
  ];

  const handleOnboardingComplete = (profile) => {
    setRiskProfile(profile);
    setRiskProfileCtx(profile);
    try {
      localStorage.setItem(FINPILOT_ONBOARDING_KEY, "true");
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("finpilot-onboarding-complete"));
    }
    setPage("dashboard");
  };

  const handleApplyRebalance = (newAlloc) => {
    setPortfolio((p) => ({ ...p, allocation: newAlloc }));
  };

  /** Questions only — no sidebar until complete (full FinPilot opens after). */
  if (page === "onboarding") {
    return (
      <>
        <style>{globalStyle}</style>
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200 }}>
          <button
            type="button"
            className="btn-outline"
            style={{ fontSize: 13, padding: "8px 14px", background: "white" }}
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>
        <Onboarding onComplete={handleOnboardingComplete} />
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard portfolio={portfolio} riskProfile={riskProfile} onPanic={() => setShowPanic(true)} />;
      case "scenarios": return <Scenarios portfolio={portfolio} />;
      case "rebalance": return <Rebalance portfolio={portfolio} riskProfile={riskProfile} onApply={handleApplyRebalance} />;
      case "assistant": return <Assistant portfolio={portfolio} riskProfile={riskProfile} />;
      case "alerts": return <Alerts />;
      default: return null;
    }
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div className="fp-app">
        <div className="fp-sidebar">
          <div className="fp-logo">
            <h1>FinPilot</h1>
            <span>Your financial co-pilot</span>
          </div>
          <nav className="fp-nav">
            {nav.map((n) => (
              <div key={n.id} className={`fp-nav-item ${page === n.id ? "active" : ""}`}
                onClick={() => setPage(n.id)}>
                <span className="fp-nav-icon">{n.icon}</span>
                {n.label}
              </div>
            ))}
          </nav>
          <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
            {currentUser ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 4 }}>
                  Signed in
                </div>
                <div style={{ fontSize: 14, color: "white", fontWeight: 600 }}>
                  {currentUser?.name?.trim() || DEFAULT_DISPLAY_NAME}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{currentUser.email}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#00d4aa", fontWeight: 700 }}>{currentUser.avatar}</div>
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>Risk profile</div>
            <div style={{ fontSize: 14, color: "#00d4aa", fontWeight: 600 }}>{riskProfile}</div>
            <button type="button" style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "underline" }}
              onClick={() => {
                try {
                  localStorage.removeItem(FINPILOT_ONBOARDING_KEY);
                } catch {
                  /* ignore */
                }
                setPage("onboarding");
              }}
            >
              Update profile
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              style={{
                marginTop: 14,
                width: "100%",
                fontSize: 12,
                color: "rgba(255,255,255,.85)",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.2)",
                background: "rgba(255,255,255,.06)",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <main className="fp-main">{renderPage()}</main>
        {showPanic && <PanicMode onClose={() => { setShowPanic(false); setPage("scenarios"); }} />}
      </div>
    </>
  );
}
