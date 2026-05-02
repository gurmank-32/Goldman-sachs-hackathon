import { useState, useEffect, useRef } from "react";
import {
  DEFAULT_DISPLAY_NAME,
  useAppContext,
  useAuth,
} from "../store/AppContext.jsx";
import { askAssistant } from "../services/marketApi.js";
import { MarcusStrokeIcon } from "../components/MarcusStrokeIcon.jsx";
import {
  FINPILOT_ONBOARDING_KEY,
  SIGNUP_QUIZ_QUESTIONS as ONBOARDING_QUESTIONS,
  finPilotRiskFromQuizScore as getRiskProfile,
} from "../constants/signupQuiz.js";

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
  {
    id: "market_drop",
    label: "Market downturn",
    icon: "chart-down",
    desc: "Explore a patch where markets dip, then typically recover over time",
    params: { drop: 20 },
  },
  {
    id: "inflation",
    label: "Prices are rising (inflation)",
    icon: "flame",
    desc: "Everyday costs climb — your buying power can feel tighter",
    params: { drop: 8 },
  },
  {
    id: "withdraw",
    label: "Need cash soon",
    icon: "wallet-out",
    desc: "You take money out — your invested balance adjusts",
    params: { drop: 0, withdraw: 15000 },
  },
  {
    id: "rate_hike",
    label: "Rates are increasing",
    icon: "trending-up",
    desc: "Borrowing costs rise; some parts of the market often feel bumpier",
    params: { drop: 12 },
  },
  {
    id: "recession",
    label: "Economy slows down",
    icon: "activity-dip",
    desc: "Slower growth can mean more ups and downs for a while",
    params: { drop: 35 },
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
  primary: "#0A1628",
  accent: "#B8962E",
  accentHover: "#9A7A22",
  accentSoft: "#F5EDD6",
  warning: "#B45309",
  danger: "#9B1C1C",
  success: "#1A7F5A",
  muted: "#718096",
  surface: "#FFFFFF",
  surfaceAlt: "#F9F8F6",
  border: "#E8E4DC",
  text: "#0A1628",
  textMuted: "#718096",
  textSecondary: "#4A5568",
};

const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F9F8F6;
    color: #0A1628;
    -webkit-font-smoothing: antialiased;
  }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input, select { font-family: inherit; }
  .fp-app { min-height: 100vh; display: flex; }
  .fp-sidebar {
    width: 196px;
    background: #0A1628;
    color: #F9F8F6;
    padding: 22px 10px 20px;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    height: 100dvh;
    z-index: 100;
    box-shadow: 4px 0 48px rgba(8, 12, 28, 0.35);
  }
  .fp-logo {
    padding: 0 12px 18px;
    border-bottom: none;
  }
  .fp-logo::after {
    content: "";
    display: block;
    height: 1px;
    margin-top: 16px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  }
  .fp-logo h1 {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 1.25rem;
    color: #B8962E;
    letter-spacing: -0.03em;
    font-weight: 600;
    line-height: 1.15;
  }
  .fp-logo span {
    display: block;
    margin-top: 6px;
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(249, 248, 246, 0.42);
  }
  .fp-nav {
    flex: 1;
    padding: 14px 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .fp-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 2px 6px;
    padding: 10px 12px 10px 14px;
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: rgba(249, 248, 246, 0.55);
    cursor: pointer;
    border-radius: 12px;
    border: 1px solid transparent;
    transition:
      color 0.22s ease,
      background 0.22s ease,
      box-shadow 0.28s ease,
      border-color 0.22s ease,
      transform 0.22s ease;
  }
  .fp-nav-item:hover {
    color: rgba(255,255,255,0.92);
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.06);
  }
  .fp-nav-item.active {
    padding-left: 18px;
    color: #B8962E;
    background: rgba(184, 150, 46, 0.14);
    border-color: rgba(184, 150, 46, 0.22);
    box-shadow:
      0 0 24px rgba(184, 150, 46, 0.12),
      inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .fp-nav-item.active::before {
    content: "";
    position: absolute;
    left: 7px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 56%;
    border-radius: 99px;
    background: linear-gradient(180deg, #f0dc85 0%, #B8962E 100%);
    box-shadow: 0 0 14px rgba(184, 150, 46, 0.55);
  }
  .fp-nav-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.92;
    color: inherit;
  }
  .fp-nav-item:not(.active) .fp-nav-icon { opacity: 0.72; color: rgba(249, 248, 246, 0.72); }
  .fp-nav-item.active .fp-nav-icon { opacity: 1; color: #B8962E; }
  .fp-sidebar-footer {
    margin-top: auto;
    padding-top: 12px;
  }
  .fp-profile-card {
    padding: 16px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,0.055);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow:
      0 12px 40px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .fp-profile-label {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.38);
    margin-bottom: 6px;
  }
  .fp-profile-name {
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: rgba(255,255,255,0.96);
    line-height: 1.35;
  }
  .fp-profile-email {
    font-size: 0.6875rem;
    color: rgba(255,255,255,0.45);
    margin-top: 2px;
    word-break: break-all;
    line-height: 1.35;
  }
  .fp-profile-avatar {
    margin-top: 10px;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #B8962E;
    letter-spacing: -0.02em;
  }
  .fp-profile-risk-row {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .fp-profile-risk {
    margin-top: 5px;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #B8962E;
  }
  .fp-sidebar-link {
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.42);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s ease;
  }
  .fp-sidebar-link:hover {
    color: rgba(184, 150, 46, 0.95);
  }
  .fp-sign-out-btn {
    margin-top: 14px;
    width: 100%;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: rgba(255,255,255,0.88);
    padding: 11px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    transition:
      background 0.22s ease,
      border-color 0.22s ease,
      box-shadow 0.28s ease,
      transform 0.22s ease;
  }
  .fp-sign-out-btn:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.22);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
  .fp-sign-out-btn:active {
    transform: scale(0.98);
  }
  .fp-main {
    position: relative;
    z-index: 1;
    margin-left: 196px;
    flex: 1;
    width: calc(100% - 196px);
    padding: 40px clamp(28px, 4vw, 56px) 56px;
    max-width: min(1320px, calc(100vw - 196px));
  }
  .fp-header { margin-bottom: 28px; }
  .fp-header h2 { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 28px; font-weight: 600; color: #0A1628; }
  .fp-header p { color: #718096; font-size: 14px; margin-top: 4px; }
  .card {
    background: rgba(255, 255, 255, 0.94);
    border-radius: 20px;
    border: 1px solid rgba(226, 232, 240, 0.72);
    padding: clamp(22px, 3vw, 28px);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.035),
      0 16px 48px rgba(15, 23, 42, 0.055);
  }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  /* Scenario Simulator: wider picker column so titles fit one line */
  .scenario-sim-layout {
    display: grid;
    grid-template-columns: minmax(480px, 1.62fr) minmax(280px, 1fr);
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .scenario-sim-layout {
      grid-template-columns: minmax(360px, 1.35fr) minmax(280px, 1fr);
    }
  }
  @media (max-width: 900px) {
    .scenario-sim-layout {
      grid-template-columns: 1fr;
    }
  }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .metric-card { background: #f8fafc; border-radius: 12px; padding: 18px; }
  .metric-label { font-size: 12px; color: #64748b; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: .5px; }
  .metric-value { font-size: 26px; font-weight: 600; color: #0f172a; }
  .metric-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .badge-green { background: #dcfce7; color: #1A7F5A; }
  .badge-yellow { background: #fef3e2; color: #B45309; }
  .badge-red { background: #fee2e2; color: #9B1C1C; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .progress-bar { height: 8px; border-radius: 4px; background: #e2e8f0; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width .6s ease; }
  .btn-primary { background: #B8962E; color: #ffffff; padding: 10px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; transition: all .15s; }
  .btn-primary:hover { background: #9A7A22; transform: translateY(-1px); }
  .btn-outline { border: 1.5px solid #E8E4DC; color: #0A1628; padding: 10px 22px; border-radius: 10px; font-size: 14px; font-weight: 500; transition: all .15s; }
  .btn-outline:hover { border-color: #B8962E; color: #B8962E; }
  .section-title { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 16px; }
  .insight-card { border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
  .donut-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
  .donut-center { position: absolute; text-align: center; }
  .scenario-card {
    position: relative;
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 18px;
    padding: 18px 18px 18px 20px;
    cursor: pointer;
    transition:
      transform 0.22s cubic-bezier(0.34, 1.15, 0.48, 1),
      box-shadow 0.28s ease,
      border-color 0.22s ease,
      background 0.22s ease;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .scenario-card:hover {
    transform: translateY(-3px) scale(1.012);
    box-shadow:
      0 14px 36px rgba(15, 23, 42, 0.1),
      0 4px 12px rgba(184, 150, 46, 0.08);
    border-color: rgba(184, 150, 46, 0.38);
  }
  .scenario-card:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px rgba(184, 150, 46, 0.35),
      0 10px 28px rgba(15, 23, 42, 0.08);
  }
  .scenario-card.selected {
    border-color: rgba(184, 150, 46, 0.55);
    background: linear-gradient(145deg, rgba(184, 150, 46, 0.08) 0%, rgba(255, 255, 255, 0.96) 100%);
    box-shadow:
      0 0 0 1px rgba(184, 150, 46, 0.15),
      0 10px 32px rgba(184, 150, 46, 0.12);
  }
  .scenario-card-selected-badge {
    position: absolute;
    top: 12px;
    right: 14px;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #146b4d;
    background: rgba(220, 252, 231, 0.95);
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }
  .scenario-card-custom {
    position: relative;
    cursor: default;
    border-style: dashed;
    border-width: 2px;
    border-color: rgba(184, 150, 46, 0.42);
    background: linear-gradient(165deg, rgba(245, 237, 214, 0.55) 0%, rgba(255, 255, 255, 0.96) 55%, rgba(249, 248, 246, 0.92) 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
  }
  .scenario-card-custom:hover {
    border-color: rgba(184, 150, 46, 0.58);
    box-shadow:
      0 6px 22px rgba(10, 22, 40, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }
  .scenario-card-custom.selected {
    border-style: solid;
    border-color: rgba(184, 150, 46, 0.72);
    background: linear-gradient(165deg, rgba(245, 237, 214, 0.72) 0%, rgba(255, 255, 255, 0.98) 100%);
    box-shadow:
      0 0 0 1px rgba(184, 150, 46, 0.2),
      0 12px 36px rgba(10, 22, 40, 0.08);
  }
  .scenario-helper-text {
    font-size: 0.875rem;
    line-height: 1.55;
    color: #64748b;
    letter-spacing: -0.01em;
    margin-bottom: 18px;
    max-width: 42rem;
  }
  .scenario-result-card {
    border-radius: 20px;
    border: 1px solid rgba(226, 232, 240, 0.85);
    background: rgba(255, 255, 255, 0.96);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 16px 48px rgba(15, 23, 42, 0.06);
    overflow: hidden;
  }
  .scenario-risk-strip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    margin-bottom: 16px;
  }
  .scenario-risk-strip--safe {
    background: rgba(220, 252, 231, 0.85);
    color: #1A7F5A;
    border: 1px solid rgba(34, 197, 94, 0.25);
  }
  .scenario-risk-strip--moderate {
    background: rgba(254, 243, 226, 0.92);
    color: #B45309;
    border: 1px solid rgba(180, 83, 9, 0.28);
  }
  .scenario-risk-strip--high {
    background: rgba(254, 226, 226, 0.75);
    color: #9B1C1C;
    border: 1px solid rgba(239, 68, 68, 0.22);
  }
  .scenario-section-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 8px;
  }
  .scenario-alloc-compare {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 14px;
    background: rgba(248, 250, 252, 0.95);
    border: 1px solid rgba(226, 232, 240, 0.75);
    margin-top: 8px;
  }
  .scenario-alloc-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .scenario-alloc-row span.muted {
    font-weight: 500;
    color: #94a3b8;
    font-size: 0.8125rem;
  }
  .scenario-impact-callout {
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(249, 248, 246, 0.95);
    border: 1px solid rgba(232, 228, 220, 0.95);
    border-left: 3px solid #B8962E;
    margin-bottom: 20px;
  }
  .scenario-impact-callout p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.62;
    color: #334155;
  }
  .scenario-alloc-highlight {
    margin-top: 8px;
    padding: 18px 16px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 248, 246, 0.65) 100%);
    border: 1px solid rgba(232, 228, 220, 0.95);
  }
  .scenario-alloc-highlight-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  }
  .scenario-alloc-highlight-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .scenario-alloc-highlight-row:first-child {
    padding-top: 0;
  }
  .scenario-alloc-highlight-label {
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #718096;
  }
  .scenario-alloc-highlight-values {
    font-size: 1.125rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: #0A1628;
    text-align: right;
  }
  .scenario-alloc-highlight-values span.arrow {
    color: #94a3b8;
    font-weight: 500;
    margin: 0 6px;
    font-size: 0.9375rem;
  }
  .scenario-why-collapsible {
    margin-top: 14px;
    padding: 0 16px;
    border-radius: 12px;
    background: rgba(248, 250, 252, 0.92);
    border: 1px solid rgba(226, 232, 240, 0.85);
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.35s ease,
      opacity 0.25s ease,
      padding 0.35s ease,
      margin-top 0.35s ease;
  }
  .scenario-why-collapsible.is-open {
    max-height: 280px;
    opacity: 1;
    padding: 14px 16px;
    margin-top: 16px;
  }
  .scenario-why-collapsible p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.65;
    color: #475569;
  }
  .scenario-why-collapsible-hint {
    margin-top: 10px;
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.45;
  }
  .scenario-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
  }
  .scenario-btn-primary {
    flex: 1;
    min-width: 160px;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    color: #ffffff;
    background: #B8962E;
    box-shadow: 0 4px 14px rgba(10, 22, 40, 0.12);
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }
  .scenario-btn-primary:hover {
    transform: translateY(-1px);
    background: #9A7A22;
    box-shadow: 0 8px 22px rgba(10, 22, 40, 0.14);
  }
  .scenario-btn-secondary {
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    color: #475569;
    background: #fff;
    border: 1px solid rgba(226, 232, 240, 0.95);
    transition: border-color 0.2s ease, color 0.2s ease;
  }
  .scenario-btn-secondary:hover {
    border-color: rgba(184, 150, 46, 0.45);
    color: #0f172a;
  }
  .scenario-why-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .scenario-why-modal {
    max-width: 440px;
    width: 100%;
    border-radius: 20px;
    padding: 24px 26px;
    background: #fff;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
    border: 1px solid rgba(226, 232, 240, 0.85);
  }
  .scenario-why-modal h3 {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 1.25rem;
    margin-bottom: 12px;
    color: #0f172a;
    letter-spacing: -0.03em;
  }
  .scenario-why-modal p {
    font-size: 0.9375rem;
    line-height: 1.62;
    color: #475569;
    margin-bottom: 18px;
  }
  .scenario-placeholder-card {
    text-align: center;
    padding: clamp(40px, 6vw, 56px) 28px;
    border-radius: 20px;
    border: 1px dashed rgba(203, 213, 225, 0.95);
    background: rgba(248, 250, 252, 0.65);
    color: #94a3b8;
  }
  @media (prefers-reduced-motion: reduce) {
    .scenario-card:hover {
      transform: none;
    }
    .scenario-why-collapsible {
      transition: none;
    }
  }
  .chat-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .chat-input:focus {
    border-color: rgba(184, 150, 46, 0.55);
    box-shadow:
      inset 0 1px 2px rgba(15, 23, 42, 0.04),
      0 0 0 3px rgba(184, 150, 46, 0.12);
  }

  /* ─── AI Assistant (premium copilot) ─────────────────────────────────── */
  .assistant-page {
    position: relative;
    max-width: 920px;
    margin: 0 auto;
    padding-bottom: 48px;
  }
  .assistant-page::before {
    content: "";
    position: fixed;
    inset: 0;
    left: 196px;
    pointer-events: none;
    z-index: 0;
    background:
      radial-gradient(ellipse 55% 45% at 92% 8%, rgba(184, 150, 46, 0.09) 0%, transparent 58%),
      radial-gradient(ellipse 45% 40% at 4% 96%, rgba(15, 52, 96, 0.06) 0%, transparent 55%);
    opacity: 1;
  }
  .assistant-page::after {
    content: "";
    position: fixed;
    inset: 0;
    left: 196px;
    pointer-events: none;
    z-index: 0;
    background-image: radial-gradient(rgba(15, 23, 42, 0.025) 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.55;
    mask-image: radial-gradient(ellipse 85% 75% at 50% 35%, black 15%, transparent 72%);
  }
  .assistant-page-header {
    position: relative;
    z-index: 1;
    margin-bottom: clamp(28px, 4vw, 40px);
    padding-right: 8px;
  }
  .assistant-page-eyebrow {
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #9A7A22;
    margin-bottom: 10px;
  }
  .assistant-page-title {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: clamp(1.75rem, 3.5vw, 2.25rem);
    font-weight: 600;
    letter-spacing: -0.035em;
    color: #0a1020;
    line-height: 1.12;
  }
  .assistant-page-subtitle {
    margin-top: 12px;
    max-width: 42rem;
    font-size: 0.9375rem;
    font-weight: 400;
    line-height: 1.55;
    color: #64748b;
    letter-spacing: -0.01em;
  }
  .assistant-chat-card {
    position: relative;
    z-index: 1;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(252, 253, 255, 0.99) 100%);
    border: 1px solid rgba(226, 232, 240, 0.65);
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 24px 64px rgba(15, 23, 42, 0.08),
      0 0 0 1px rgba(255, 255, 255, 0.8) inset;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: min(560px, calc(100vh - 220px));
  }
  .assistant-chat-scroll {
    flex: 1;
    overflow-y: auto;
    padding: clamp(22px, 3vw, 28px) clamp(22px, 3vw, 32px);
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
  }
  .assistant-chat-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .assistant-chat-scroll::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.35);
    border-radius: 99px;
  }
  .assistant-msg-row {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 14px;
  }
  .assistant-msg-row--user {
    justify-content: flex-end;
  }
  .assistant-page .chat-msg {
    padding: 14px 18px;
    border-radius: 18px;
    font-size: 0.9375rem;
    line-height: 1.62;
    letter-spacing: -0.015em;
    max-width: 70%;
    margin-bottom: 0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .assistant-page .chat-ai {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 237, 214, 0.45) 100%);
    color: #0A1628;
    border: 1px solid rgba(226, 232, 240, 0.85);
    border-bottom-left-radius: 8px;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 8px 24px rgba(15, 52, 96, 0.045);
  }
  .assistant-page .chat-ai.assistant-thinking {
    color: #94a3b8;
    font-weight: 500;
    font-size: 0.875rem;
    border-style: dashed;
    background: rgba(248, 250, 252, 0.9);
  }
  .assistant-page .chat-user {
    margin-left: 0;
    background: linear-gradient(155deg, #1e293b 0%, #141e33 48%, #12182c 100%);
    color: rgba(255, 255, 255, 0.96);
    border-radius: 22px;
    border-bottom-right-radius: 10px;
    border: 1px solid rgba(184, 150, 46, 0.35);
    box-shadow:
      0 0 0 1px rgba(184, 150, 46, 0.15),
      0 10px 28px rgba(184, 150, 46, 0.12),
      0 12px 36px rgba(15, 23, 42, 0.18);
    padding: 12px 18px;
  }
  .assistant-chat-footer {
    position: relative;
    padding: 18px clamp(18px, 2.5vw, 26px) 22px;
    border-top: 1px solid rgba(241, 245, 249, 0.95);
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(255, 255, 255, 0.92) 100%);
  }
  .assistant-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
  }
  .assistant-chip {
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #475569;
    padding: 9px 14px;
    border-radius: 999px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    background: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition:
      transform 0.22s cubic-bezier(0.34, 1.15, 0.48, 1),
      border-color 0.22s ease,
      background 0.22s ease,
      box-shadow 0.28s ease,
      color 0.22s ease;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  }
  .assistant-chip:hover {
    transform: translateY(-2px);
    border-color: rgba(184, 150, 46, 0.35);
    color: #0f172a;
    box-shadow:
      0 4px 14px rgba(15, 23, 42, 0.06),
      0 2px 6px rgba(184, 150, 46, 0.08);
  }
  .assistant-chip--active {
    border-color: rgba(184, 150, 46, 0.55);
    background: #F5EDD6;
    color: #0A1628;
    box-shadow:
      0 0 0 1px rgba(184, 150, 46, 0.15),
      0 4px 16px rgba(10, 22, 40, 0.06);
  }
  .assistant-compose {
    display: flex;
    align-items: stretch;
    flex-wrap: wrap;
    gap: 12px;
  }
  .assistant-input {
    flex: 1;
    min-height: 52px;
    padding: 14px 22px;
    font-size: 0.9375rem;
    font-weight: 500;
    letter-spacing: -0.015em;
    color: #0f172a;
    border-radius: 999px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    outline: none;
    background: rgba(248, 250, 252, 0.85);
    box-shadow:
      inset 0 2px 6px rgba(15, 23, 42, 0.045),
      inset 0 -1px 0 rgba(255, 255, 255, 0.9);
    transition:
      border-color 0.22s ease,
      box-shadow 0.28s ease,
      background 0.22s ease;
  }
  .assistant-input::placeholder {
    color: #94a3b8;
    font-weight: 400;
  }
  .assistant-input:focus {
    border-color: rgba(184, 150, 46, 0.45);
    background: #fff;
    box-shadow:
      inset 0 2px 6px rgba(15, 23, 42, 0.035),
      0 0 0 3px rgba(184, 150, 46, 0.14);
  }
  .assistant-send-btn {
    flex-shrink: 0;
    width: 52px;
    height: 52px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    color: #ffffff;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 48%),
      linear-gradient(155deg, #e8cf6a 0%, #B8962E 42%, #9A7A22 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.45),
      0 4px 14px rgba(154, 122, 34, 0.18),
      0 2px 6px rgba(15, 23, 42, 0.06);
    transition:
      transform 0.22s cubic-bezier(0.34, 1.15, 0.48, 1),
      box-shadow 0.28s ease,
      filter 0.22s ease;
  }
  .assistant-send-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.03);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      0 0 0 1px rgba(184, 150, 46, 0.22),
      0 10px 28px rgba(184, 150, 46, 0.28),
      0 16px 40px rgba(184, 150, 46, 0.14);
  }
  .assistant-send-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.96);
  }
  .assistant-send-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    transform: none;
    filter: grayscale(0.2);
    box-shadow: none;
  }
  .assistant-send-btn svg {
    display: block;
  }

  @media (max-width: 900px) {
    .assistant-page .chat-msg {
      max-width: 88%;
    }
    .assistant-chat-card {
      min-height: min(520px, calc(100vh - 180px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .assistant-chip:hover,
    .assistant-send-btn:hover:not(:disabled),
    .assistant-send-btn:active:not(:disabled),
    .fp-sign-out-btn:active,
    .fp-nav-item {
      transition: none !important;
      transform: none !important;
    }
  }
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
  @keyframes onboard-next-ripple {
    0% {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.42),
        inset 0 -1px 0 rgba(10, 22, 40, 0.08),
        0 0 0 0 rgba(184, 150, 46, 0.35);
    }
    100% {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.42),
        inset 0 -1px 0 rgba(10, 22, 40, 0.08),
        0 0 0 10px transparent;
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
      radial-gradient(ellipse 95% 70% at 50% -5%, rgba(184, 150, 46, 0.13) 0%, transparent 58%),
      radial-gradient(ellipse 70% 55% at 95% 15%, rgba(56, 189, 248, 0.09) 0%, transparent 55%),
      radial-gradient(ellipse 65% 50% at 5% 25%, rgba(184, 150, 46, 0.06) 0%, transparent 52%),
      linear-gradient(118deg, rgba(184, 150, 46, 0.045) 0%, transparent 48%),
      linear-gradient(305deg, rgba(96, 165, 250, 0.055) 0%, transparent 52%),
      linear-gradient(195deg, transparent 40%, rgba(15, 52, 96, 0.22) 100%),
      radial-gradient(ellipse 85% 70% at 100% 100%, rgba(15, 52, 96, 0.55) 0%, transparent 52%),
      radial-gradient(ellipse 75% 60% at 0% 100%, rgba(26, 26, 46, 0.42) 0%, transparent 50%),
      radial-gradient(ellipse 85% 38% at 50% 108%, rgba(184, 150, 46, 0.07) 0%, transparent 58%),
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
      radial-gradient(circle 42vmin at 22% 32%, rgba(184, 150, 46, 0.2) 0%, transparent 58%),
      radial-gradient(circle 48vmin at 82% 22%, rgba(125, 211, 252, 0.14) 0%, transparent 58%),
      radial-gradient(circle 50vmin at 78% 88%, rgba(15, 52, 96, 0.38) 0%, transparent 56%),
      radial-gradient(circle 38vmin at 12% 82%, rgba(184, 150, 46, 0.11) 0%, transparent 54%);
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
      radial-gradient(rgba(255, 255, 255, 0.026) 1px, transparent 1px),
      radial-gradient(rgba(255, 255, 255, 0.014) 1px, transparent 1px),
      radial-gradient(ellipse 72% 68% at 50% 45%, transparent 22%, rgba(8, 12, 28, 0.34) 100%);
    background-size: 21px 21px, 9px 9px, auto;
    background-position: 0 0, 7px 11px, center;
    background-blend-mode: soft-light, soft-light, normal;
    opacity: 0.48;
    mix-blend-mode: soft-light;
    mask-image: radial-gradient(ellipse 88% 82% at 50% 44%, black 16%, transparent 76%);
  }
  .onboard-card-wrap {
    position: relative;
    z-index: 1;
    border-radius: 28px;
    padding: 1px;
    max-width: min(540px, 94vw);
    background: linear-gradient(
      155deg,
      rgba(184, 150, 46, 0.26) 0%,
      rgba(255, 255, 255, 0.1) 42%,
      rgba(255, 255, 255, 0.05) 100%
    );
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 48px 100px rgba(8, 12, 28, 0.45),
      0 24px 56px rgba(15, 23, 42, 0.18),
      0 0 100px rgba(184, 150, 46, 0.12);
    animation: onboard-card-float 9s ease-in-out infinite;
  }
  .onboard-card-wrap::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 112%;
    height: 118%;
    z-index: -1;
    pointer-events: none;
    border-radius: 36px;
    background: radial-gradient(
      ellipse 58% 54% at 50% 46%,
      rgba(184, 150, 46, 0.32) 0%,
      rgba(184, 150, 46, 0.1) 45%,
      transparent 72%
    );
    filter: blur(40px);
    opacity: 0.72;
  }
  .onboard-card {
    position: relative;
    background: linear-gradient(
      165deg,
      rgba(255, 255, 255, 0.97) 0%,
      rgba(252, 253, 255, 0.94) 100%
    );
    backdrop-filter: blur(26px) saturate(190%);
    -webkit-backdrop-filter: blur(26px) saturate(190%);
    border-radius: 27px;
    padding: clamp(40px, 7.5vw, 56px) clamp(30px, 5.5vw, 44px);
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.92);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.98),
      inset 0 0 0 1px rgba(255, 255, 255, 0.45),
      0 2px 6px rgba(15, 23, 42, 0.04),
      0 28px 56px rgba(15, 23, 42, 0.09),
      0 14px 32px rgba(15, 52, 96, 0.07);
  }
  .onboard-brand {
    text-align: center;
    margin-bottom: clamp(32px, 5.5vw, 44px);
  }
  .onboard-brand-mark {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: clamp(1.625rem, 4.5vw, 2rem);
    font-weight: 600;
    color: #B8962E;
    letter-spacing: -0.035em;
    margin-bottom: 8px;
    line-height: 1.1;
  }
  .onboard-brand-tag {
    font-size: 0.8125rem;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.92);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.45;
  }
  .onboard-progress {
    margin-bottom: clamp(32px, 4.5vw, 40px);
  }
  .onboard-progress-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 0 3px;
  }
  .onboard-progress-meta {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.88);
  }
  .onboard-progress-count {
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: rgba(71, 85, 105, 0.88);
    letter-spacing: 0.02em;
  }
  .onboard-progress-track {
    height: 6px;
    border-radius: 999px;
    background: rgba(252, 253, 255, 0.92);
    overflow: hidden;
    box-shadow:
      inset 0 1px 3px rgba(15, 23, 42, 0.055),
      inset 0 -1px 0 rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.22);
  }
  .onboard-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #9A7A22 0%, #B8962E 42%, #f5ebd0 100%);
    box-shadow:
      0 0 14px rgba(184, 150, 46, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.45);
    transition: width 0.55s cubic-bezier(0.25, 0.85, 0.35, 1);
  }
  .onboard-step-body {
    animation: onboard-content-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .onboard-step-badge {
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 700;
    color: #9A7A22;
    letter-spacing: 0.14em;
    margin-bottom: 22px;
    text-align: center;
    text-transform: uppercase;
    width: 100%;
    opacity: 0.95;
  }
  .onboard-question {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: clamp(1.5rem, 4.2vw, 2rem);
    font-weight: 600;
    color: #050910;
    text-align: center;
    line-height: 1.16;
    letter-spacing: -0.038em;
    margin-bottom: 18px;
    max-width: 18.5em;
    margin-left: auto;
    margin-right: auto;
    text-wrap: balance;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
  }
  .onboard-hint {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 0.9375rem;
    font-weight: 400;
    color: #64748b;
    text-align: center;
    margin-bottom: clamp(30px, 4.5vw, 40px);
    line-height: 1.62;
    max-width: 32rem;
    margin-left: auto;
    margin-right: auto;
    letter-spacing: -0.01em;
  }
  .onboard-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .onboard-option {
    position: relative;
    border: none;
    border-radius: 22px;
    padding: 18px 20px;
    min-height: 44px;
    cursor: pointer;
    font-size: 15px;
    transition:
      transform 0.32s cubic-bezier(0.34, 1.2, 0.48, 1),
      box-shadow 0.32s ease,
      background 0.32s ease;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: inherit;
    box-shadow:
      0 0 0 1px rgba(236, 241, 245, 0.98),
      0 2px 6px rgba(15, 23, 42, 0.032),
      0 14px 36px rgba(15, 52, 96, 0.048);
    -webkit-tap-highlight-color: transparent;
  }
  .onboard-option:hover {
    transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.96);
    box-shadow:
      0 0 0 1px rgba(184, 150, 46, 0.32),
      0 10px 28px rgba(15, 23, 42, 0.06),
      0 22px 48px rgba(184, 150, 46, 0.1);
  }
  .onboard-option:active {
    transform: translateY(-1px) scale(0.992);
    transition-duration: 0.12s;
  }
  .onboard-option.selected:active {
    transform: translateY(-1px) scale(0.993);
  }
  .onboard-option:hover:active {
    transform: translateY(-2px) scale(0.993);
  }
  .onboard-option.selected:hover:active {
    transform: translateY(-2px) scale(0.993);
  }
  .onboard-option:focus-visible {
    outline: 2px solid #B8962E;
    outline-offset: 3px;
  }
  .onboard-option.selected {
    background: linear-gradient(
      165deg,
      rgba(184, 150, 46, 0.12) 0%,
      rgba(255, 255, 255, 0.95) 52%,
      rgba(236, 253, 249, 0.35) 100%
    );
    box-shadow:
      0 0 0 2px rgba(184, 150, 46, 0.85),
      0 0 0 1px rgba(255, 255, 255, 0.7) inset,
      0 0 44px rgba(184, 150, 46, 0.28),
      0 14px 40px rgba(15, 23, 42, 0.08);
    transform: translateY(-2px);
  }
  .onboard-option.selected .onboard-opt-title { color: #050a14; }
  .onboard-opt-icon {
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(150deg, rgba(184, 150, 46, 0.14) 0%, rgba(184, 150, 46, 0.05) 100%);
    border: 1px solid rgba(184, 150, 46, 0.12);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      0 3px 10px rgba(15, 52, 96, 0.06);
    transition:
      transform 0.32s cubic-bezier(0.34, 1.2, 0.48, 1),
      background 0.32s ease,
      box-shadow 0.32s ease,
      border-color 0.32s ease;
  }
  .onboard-option:hover .onboard-opt-icon {
    transform: scale(1.06);
    background: linear-gradient(150deg, rgba(184, 150, 46, 0.2) 0%, rgba(184, 150, 46, 0.08) 100%);
    border-color: rgba(184, 150, 46, 0.22);
  }
  .onboard-option.selected .onboard-opt-icon {
    background: linear-gradient(150deg, rgba(184, 150, 46, 0.28) 0%, rgba(184, 150, 46, 0.1) 100%);
    border-color: rgba(184, 150, 46, 0.35);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.55),
      0 0 24px rgba(184, 150, 46, 0.32);
  }
  .onboard-opt-text { flex: 1; min-width: 0; padding-top: 1px; }
  .onboard-opt-title {
    display: block;
    font-size: 0.96875rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.4;
    letter-spacing: -0.018em;
  }
  .onboard-opt-desc {
    display: block;
    font-size: 0.8125rem;
    color: #7c8c9f;
    margin-top: 7px;
    line-height: 1.55;
    font-weight: 400;
    letter-spacing: -0.005em;
  }
  .onboard-next-btn {
    --onboard-next-glow: rgba(184, 150, 46, 0.22);
    margin-top: clamp(36px, 5.5vw, 44px);
    width: 100%;
    min-height: 54px;
    padding: 16px 28px;
    border-radius: 18px;
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
    color: #ffffff !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 42%),
      linear-gradient(168deg, #e8cf6a 0%, #B8962E 42%, #9A7A22 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.42),
      inset 0 -1px 0 rgba(10, 22, 40, 0.08),
      0 1px 2px rgba(8, 20, 33, 0.06),
      0 4px 14px rgba(154, 122, 34, 0.14),
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
      inset 0 -1px 0 rgba(10, 22, 40, 0.06),
      0 0 0 1px rgba(184, 150, 46, 0.18),
      0 6px 18px rgba(154, 122, 34, 0.18),
      0 14px 36px var(--onboard-next-glow),
      0 28px 56px rgba(184, 150, 46, 0.12);
  }
  .onboard-next-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.987);
    filter: brightness(0.99);
    transition:
      transform 0.1s cubic-bezier(0.33, 1, 0.68, 1),
      box-shadow 0.1s ease,
      filter 0.1s ease;
    box-shadow:
      inset 0 2px 10px rgba(8, 25, 42, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 2px 10px rgba(154, 122, 34, 0.14),
      0 1px 3px rgba(15, 23, 42, 0.06);
    animation: none;
  }
  .onboard-next-btn:focus-visible:not(:disabled) {
    outline: 2px solid #B8962E;
    outline-offset: 3px;
    animation: onboard-next-ripple 0.85s ease-out 1;
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
    .onboard-option:active,
    .onboard-option:hover:active,
    .onboard-option.selected:hover:active,
    .onboard-option.selected,
    .onboard-option.selected:active,
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
    .onboard-next-btn:focus-visible:not(:disabled) {
      animation: none !important;
    }
  }
  @media (max-width: 520px) {
    .onboard-container {
      padding: clamp(18px, 4vw, 28px) clamp(14px, 4vw, 20px);
    }
    .onboard-card-wrap::before {
      width: 104%;
      height: 110%;
      filter: blur(28px);
      opacity: 0.62;
    }
    .onboard-card {
      padding: 34px 22px 42px;
      border-radius: 24px;
    }
    .onboard-options {
      gap: 12px;
    }
    .onboard-option {
      padding: 16px 17px;
    }
    .onboard-question {
      font-size: clamp(1.375rem, 5.5vw, 1.8125rem);
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
                  <span className="onboard-opt-icon" aria-hidden>
                    <MarcusStrokeIcon name={opt.icon} size={22} stroke="#B8962E" />
                  </span>
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
                    strokeWidth="1.5"
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
    { label: "Stocks & ETFs", value: (sums.stock / total) * 100, color: "#0A1628" },
    { label: "Mutual Funds", value: (sums.mutual / total) * 100, color: "#B8962E" },
    { label: "Bonds", value: (sums.bond / total) * 100, color: "#718096" },
    { label: "Cash", value: (sums.cash / total) * 100, color: "#94a3b8" },
  ];
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ portfolio, riskProfile, onPanic }) {
  const [homePortfolioTab, setHomePortfolioTab] = useState("holdings");
  const typeIconNames = { stock: "chart-bar", mutual: "building-columns", bond: "scroll-text", cash: "banknote" };
  const typeColors = { stock: "#F5EDD6", mutual: "#F5EDD6", bond: "#e8f5f0", cash: "#f1f5f9" };
  const breakdownRows = portfolioBreakdownByType(portfolio);
  const ytdGain = Math.round(portfolio.totalValue * 0.093);

  const risk = calcRisk(portfolio.allocation.stocks);
  const health = calcHealthScore(portfolio.allocation, riskProfile);
  const donutData = [
    { label: "Stocks", value: portfolio.allocation.stocks, color: "#0A1628" },
    { label: "Bonds", value: portfolio.allocation.bonds, color: "#718096" },
    { label: "Cash", value: portfolio.allocation.cash, color: "#94a3b8" },
  ];

  const insights = [
    { color: "#fef3e2", icon: "alert-triangle", stroke: "#B45309", text: "You're slightly overweight in stocks vs your Balanced profile. Consider trimming by 10–15%.", type: "warn" },
    { color: "#e8f5f0", icon: "check-circle", stroke: "#1A7F5A", text: "Your bond allocation keeps you stable during downturns. Great buffer!", type: "ok" },
    { color: "#F5EDD6", icon: "lightbulb", stroke: "#B8962E", text: "Your portfolio grew 9.3% this year — ahead of the 7% market average.", type: "info" },
  ];

  return (
    <div>
      <div className="fp-header">
        <h2>Good morning, Investor</h2>
        <p>Here's how your financial health looks today</p>
      </div>

      <div className="grid4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">Total value</div>
          <div className="metric-value">{fmt(portfolio.totalValue)}</div>
          <div className="metric-sub" style={{ color: "#1A7F5A" }}>↑ +9.3% this year</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Health score</div>
          <div className="metric-value" style={{ color: health > 70 ? "#1A7F5A" : health > 45 ? "#B45309" : "#9B1C1C" }}>{health}/100</div>
          <div className="metric-sub">{health > 70 ? "You're in great shape!" : health > 45 ? "Small adjustments needed" : "Action required"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Risk level</div>
          <div className="metric-value" style={{ color: risk === "High" ? "#9B1C1C" : risk === "Medium" ? "#B45309" : "#1A7F5A" }}>{risk}</div>
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
              <MarcusStrokeIcon name={ins.icon} size={22} stroke={ins.stroke} />
              <span style={{ fontSize: 14, lineHeight: 1.5, color: "#0A1628" }}>{ins.text}</span>
            </div>
          ))}
          <button className="btn-outline" style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
            onClick={onPanic}>
            <MarcusStrokeIcon name="octagon-alert" size={20} stroke="#B45309" />
            Market volatility? Open calm checklist
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
                <div className="asset-icon" style={{ background: typeColors[asset.type] }}>
                  <MarcusStrokeIcon name={typeIconNames[asset.type]} size={18} stroke="#0A1628" />
                </div>
                <div className="asset-info">
                  <div className="asset-name">{asset.name}</div>
                  <div className="asset-sub">{asset.sector} · <span className={`badge badge-${asset.risk === "High" ? "red" : asset.risk === "Medium" ? "yellow" : "green"}`}>{asset.risk} risk</span></div>
                </div>
                <div className="asset-value">
                  <div className="asset-val">{fmt(asset.value)}</div>
                  <div className="asset-gain" style={{ color: asset.gain >= 0 ? "#1A7F5A" : "#9B1C1C" }}>
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
              <div style={{ fontSize: 13, color: "#1A7F5A", marginTop: 2 }}>↑ +{fmt(ytdGain)} this year</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">Goal Progress</div>
        <div className="grid2">
          {[
            { icon: "sun", label: "Retirement", progress: 65, target: fmt(1000000), current: fmt(portfolio.totalValue), years: 20 },
            { icon: "home", label: "Buy a House", progress: 28, target: fmt(300000), current: fmt(85420), years: 5 },
          ].map((g) => (
            <div key={g.label} style={{ padding: "4px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 500 }}>
                  <MarcusStrokeIcon name={g.icon} size={18} stroke="#B8962E" />
                  {g.label}
                </span>
                <span style={{ fontSize: 13, color: "#1A7F5A", fontWeight: 600 }}>{g.progress}%</span>
              </div>
              <div className="progress-bar" style={{ height: 10, marginBottom: 8 }}>
                <div className="progress-fill" style={{ width: `${g.progress}%`, background: "#B8962E" }} />
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
function buildScenarioInsight(scenLike, portfolio, riskProfile) {
  const drop = scenLike.params?.drop ?? 0;
  const withdraw = scenLike.params?.withdraw ?? 0;
  const total = portfolio.totalValue || 1;
  const withdrawPct = (withdraw / total) * 100;
  const stress = drop + withdrawPct * 0.9;

  const S = portfolio.allocation.stocks;
  const B = portfolio.allocation.bonds;
  const C = portfolio.allocation.cash;
  const steadierBefore = Math.round(B + C);

  let riskBand = "safe";
  if (stress > 22) riskBand = "high";
  else if (stress > 11) riskBand = "moderate";

  const impactByBand = {
    safe: "In this scenario, your balance may shift modestly. Many people still feel comfortable staying invested while making small adjustments.",
    moderate: "In this scenario, you may notice more ups and downs than usual. That is normal—and planning ahead helps you stay steady.",
    high: "In this scenario, your investments may swing more widely. Extra steadier holdings can help your plan feel easier to stick with.",
  };

  const rp = riskProfile || "Balanced";
  let profilePhrase = "";
  if (rp === "Conservative") {
    profilePhrase = `Since your profile is conservative and about ${S}% of your mix is in stocks, `;
  } else if (rp === "Balanced") {
    profilePhrase = `Since your profile is balanced and you have a meaningful share in stocks (${S}%), `;
  } else {
    profilePhrase = `Since your profile leans toward growth with a larger share in stocks (${S}%), `;
  }

  let tailPhrase = "";
  if (riskBand === "high") {
    tailPhrase = "this kind of stretch can feel busier unless you keep some extra cushion in steadier choices like bonds and mutual funds.";
  } else if (riskBand === "moderate") {
    tailPhrase = "this environment can add a bit more movement than usual—a slight tilt toward steadier holdings often feels reassuring.";
  } else {
    tailPhrase = "this scenario still lines up reasonably well if your timeline matches staying invested.";
  }

  const personalizedInsight = profilePhrase + tailPhrase;

  let deltaStocks = 0;
  if (stress < 9) deltaStocks = -2;
  else if (stress < 15) deltaStocks = -6;
  else if (stress < 24) deltaStocks = -10;
  else if (stress < 32) deltaStocks = -13;
  else deltaStocks = -15;

  if (riskProfile === "Aggressive") deltaStocks = Math.round(deltaStocks * 0.72);
  if (riskProfile === "Conservative") deltaStocks = Math.round(deltaStocks * 1.08);
  if (scenLike.id === "withdraw") deltaStocks = Math.min(deltaStocks, -5);

  const proposedShift = Math.abs(Math.round(Math.max(28, Math.min(88, S + deltaStocks)) / 5) * 5 - S);

  /* Mild stress + already-balanced mix → reassuring “no change” path more often */
  const noChangesNeeded =
    stress <= 12 &&
    S <= 56 &&
    B >= 15 &&
    proposedShift <= 5;

  let targetStocks = S;
  let targetBonds = B;
  let targetCash = C;

  if (!noChangesNeeded) {
    targetStocks = Math.round(Math.max(28, Math.min(88, S + deltaStocks)) / 5) * 5;
    const remaining = 100 - targetStocks;
    const bRatio = steadierBefore > 0 ? B / steadierBefore : 0.62;
    targetBonds = Math.round((remaining * bRatio) / 5) * 5;
    targetCash = remaining - targetBonds;
    if (targetCash < 5) {
      targetCash = 5;
      targetBonds = remaining - targetCash;
    }
    if (targetBonds < 8) {
      targetBonds = 8;
      targetCash = remaining - targetBonds;
    }
    targetStocks = 100 - targetBonds - targetCash;
    targetStocks = Math.round(targetStocks / 5) * 5;
  }

  const steadierAfter = Math.round(targetBonds + targetCash);
  const shiftPct = Math.abs(S - targetStocks);

  let recommendation = "";
  if (noChangesNeeded) {
    recommendation =
      "You're already well-positioned for this scenario. No changes needed 👍";
  } else {
    const lo = Math.max(6, shiftPct - 3);
    const hi = shiftPct + 4;
    recommendation = `We suggest shifting about ${lo}–${hi}% from stocks toward steadier mutual funds and bonds so your mix feels calmer for this scenario.`;
  }

  const whyById = {
    market_drop:
      "When stock prices dip for a stretch, easing slightly out of stocks can make it easier to stay patient and stick to your plan.",
    inflation:
      "When everyday prices climb, blending in steadier holdings can help month-to-month swings feel gentler on your nerves.",
    withdraw:
      "When you take cash out, your invested balance shrinks. A little extra in steadier choices supports what stays invested while you use the money you need.",
    rate_hike:
      "When borrowing costs rise, markets sometimes get choppy. Tilting a bit toward bonds and steady mutual funds can feel smoother.",
    recession:
      "When the economy slows, investments often bounce around more. A small shift toward steadier choices is a familiar way to stay grounded.",
    custom:
      "For your custom test, small step-by-step tweaks usually feel clearer than one big jump—and still nudge you toward a steadier mix.",
  };

  const whyExplanation =
    whyById[scenLike.id] ||
    whyById.custom;

  const newValue = Math.max(0, portfolio.totalValue * (1 - drop / 100) - withdraw);
  const changeFromToday = portfolio.totalValue - newValue;
  const changePctApprox =
    portfolio.totalValue > 0 ? (changeFromToday / portfolio.totalValue) * 100 : 0;

  let stressAllocStocks = Math.round(S * (1 - (drop / 100) * 0.75));
  stressAllocStocks = Math.min(100 - C, Math.max(0, stressAllocStocks));
  let stressAllocBonds = Math.min(B + Math.round(drop / 6), 100 - stressAllocStocks - C);
  stressAllocBonds = Math.max(0, stressAllocBonds);

  return {
    riskBand,
    impactMessage: impactByBand[riskBand],
    personalizedInsight,
    recommendation,
    whyExplanation,
    noChangesNeeded,
    beforeStocks: S,
    beforeSteadier: steadierBefore,
    afterStocks: targetStocks,
    afterSteadier: steadierAfter,
    targetBonds,
    targetCash,
    newValue,
    changeFromToday,
    changePctApprox,
    newAlloc: {
      stocks: stressAllocStocks,
      bonds: stressAllocBonds,
      cash: C,
    },
  };
}

function Scenarios({ portfolio, riskProfile, onReviewChanges }) {
  const [selected, setSelected] = useState(null);
  const [customDrop, setCustomDrop] = useState(20);
  const [customWithdraw, setCustomWithdraw] = useState(0);
  const [result, setResult] = useState(null);
  const [whyExpanded, setWhyExpanded] = useState(false);

  const runScenario = (scen) => {
    setSelected(scen.id);
    setWhyExpanded(false);
    const insight = buildScenarioInsight(scen, portfolio, riskProfile);
    setResult({
      scenLabel: scen.label || "Custom scenario",
      scenId: scen.id,
      ...insight,
    });
  };

  const runCustom = () => {
    const scen = {
      id: "custom",
      label: "Your custom scenario",
      params: { drop: customDrop, withdraw: customWithdraw },
    };
    setSelected("custom");
    setWhyExpanded(false);
    const insight = buildScenarioInsight(scen, portfolio, riskProfile);
    setResult({
      scenLabel: scen.label,
      scenId: "custom",
      ...insight,
    });
  };

  const riskStripClass =
    result?.riskBand === "safe"
      ? "scenario-risk-strip scenario-risk-strip--safe"
      : result?.riskBand === "moderate"
        ? "scenario-risk-strip scenario-risk-strip--moderate"
        : "scenario-risk-strip scenario-risk-strip--high";

  const riskStripLabel =
    result?.riskBand === "safe"
      ? "Steadier path — mostly calm conditions"
      : result?.riskBand === "moderate"
        ? "Mixed path — expect some movement"
        : "Bumpy path — steadier choices may help";

  return (
    <div>
      <div className="fp-header">
        <h2>Scenario Simulator</h2>
        <p>
          Explore calm what-if stories, see how they fit <em>your</em> mix, and choose a clear next
          step—without the noise.
        </p>
      </div>
      <div className="scenario-sim-layout" style={{ marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>
            Choose a scenario
          </div>
          <p className="scenario-helper-text">
            We&apos;ll show you what this means for your money—and what you can do next.
          </p>
          {SCENARIOS.map((scen) => (
            <div
              key={scen.id}
              role="button"
              tabIndex={0}
              className={`scenario-card ${selected === scen.id ? "selected" : ""}`}
              style={{ marginBottom: 12 }}
              onClick={() => runScenario(scen)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  runScenario(scen);
                }
              }}
            >
              {selected === scen.id ? (
                <span className="scenario-card-selected-badge">Selected</span>
              ) : null}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ display: "flex", flexShrink: 0 }} aria-hidden>
                  <MarcusStrokeIcon name={scen.icon} size={26} stroke="#B8962E" />
                </span>
                <div style={{ paddingRight: selected === scen.id ? 56 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>
                    {scen.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.45, marginTop: 4 }}>
                    {scen.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            className={`card scenario-card-custom ${selected === "custom" ? "selected" : ""}`}
            style={{ marginTop: 18 }}
          >
            {selected === "custom" ? (
              <span className="scenario-card-selected-badge">Selected</span>
            ) : null}
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15, letterSpacing: "-0.02em" }}>
              ➕ Create Your Own Scenario
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.45 }}>
              Customize based on your situation
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 14 }}>Market dip</label>
                <span style={{ fontWeight: 600, color: "#B45309" }}>-{customDrop}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={1}
                value={customDrop}
                onChange={(e) => setCustomDrop(+e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 14 }}>Cash you take out</label>
                <span style={{ fontWeight: 600, color: "#B45309" }}>{fmt(customWithdraw)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={1000}
                value={customWithdraw}
                onChange={(e) => setCustomWithdraw(+e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <button type="button" className="btn-primary" onClick={runCustom}>
              Run my scenario →
            </button>
          </div>
        </div>

        <div>
          {result ? (
            <div className="scenario-result-card" style={{ padding: "22px 22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, letterSpacing: "-0.02em" }}>
                {result.scenLabel}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
                Guided view · numbers are round and illustrative—meant for direction, not precision.
              </div>

              <div className={riskStripClass}>{riskStripLabel}</div>

              <div className="scenario-section-label">Impact</div>
              <div className="scenario-impact-callout">
                <p>{result.impactMessage}</p>
              </div>

              <div className="scenario-section-label">Personalized insight</div>
              <p style={{ fontSize: 15, lineHeight: 1.58, color: "#0f172a", marginBottom: 18 }}>
                {result.personalizedInsight}
              </p>

              <div className="scenario-section-label">Recommendation</div>
              <p style={{ fontSize: 15, lineHeight: 1.58, color: "#0f172a", marginBottom: 16 }}>
                {result.recommendation}
              </p>

              <div className="scenario-section-label">Before vs after mix</div>
              <p style={{ fontSize: 13, color: "#718096", marginBottom: 10, lineHeight: 1.5 }}>
                Stocks vs steadier picks (mutual funds, bonds &amp; cash grouped)—how your guided mix
                might shift.
              </p>
              <div className="scenario-alloc-highlight">
                <div className="scenario-alloc-highlight-row">
                  <span className="scenario-alloc-highlight-label">Stocks</span>
                  <span className="scenario-alloc-highlight-values">
                    {result.beforeStocks}%
                    <span className="arrow">→</span>
                    {result.afterStocks}%
                  </span>
                </div>
                <div className="scenario-alloc-highlight-row">
                  <span className="scenario-alloc-highlight-label">Mutual funds &amp; steadier picks</span>
                  <span className="scenario-alloc-highlight-values">
                    {result.beforeSteadier}%
                    <span className="arrow">→</span>
                    {result.afterSteadier}%
                  </span>
                </div>
              </div>

              <div
                className="grid2"
                style={{
                  marginTop: 18,
                  gap: 12,
                }}
              >
                <div className="metric-card" style={{ borderRadius: 14 }}>
                  <div className="metric-label">Illustrative balance in this storyline</div>
                  <div className="metric-value" style={{ fontSize: 19 }}>
                    {fmt(result.newValue)}
                  </div>
                  <div className="metric-sub" style={{ color: "#64748b" }}>
                    Roughly {result.changePctApprox.toFixed(1)}% compared with where you are today
                    (illustrative).
                  </div>
                </div>
                <div className="metric-card" style={{ borderRadius: 14 }}>
                  <div className="metric-label">During the scenario (illustrative tilt)</div>
                  <div className="metric-value" style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>
                    Stocks {result.newAlloc.stocks}% · Bonds {result.newAlloc.bonds}% · Cash{" "}
                    {result.newAlloc.cash}%
                  </div>
                  <div className="metric-sub">
                    {result.noChangesNeeded
                      ? "Your current mix already lines up well for this scenario."
                      : "One way your mix might tilt while this storyline plays out—not a prediction."}
                  </div>
                </div>
              </div>

              <div className="scenario-actions-row">
                <button type="button" className="scenario-btn-primary" onClick={() => onReviewChanges?.()}>
                  Review Suggested Changes
                </button>
                <button
                  type="button"
                  className="scenario-btn-secondary"
                  aria-expanded={whyExpanded}
                  aria-controls="scenario-why-panel"
                  onClick={() => setWhyExpanded((v) => !v)}
                >
                  Why this?
                </button>
              </div>

              <div
                id="scenario-why-panel"
                className={`scenario-why-collapsible ${whyExpanded ? "is-open" : ""}`}
                role="region"
                aria-labelledby="scenario-why-heading"
              >
                <div className="scenario-section-label" id="scenario-why-heading" style={{ marginBottom: 8 }}>
                  Plain-English note
                </div>
                <p>{result.whyExplanation}</p>
                <p className="scenario-why-collapsible-hint">
                  Still unsure? Chat with the assistant anytime—it explains ideas without jargon.
                </p>
              </div>
            </div>
          ) : (
            <div className="scenario-placeholder-card">
              <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }} aria-hidden>
                <MarcusStrokeIcon name="orbit" size={48} stroke="#B8962E" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#64748b" }}>
                Your guided snapshot appears here
              </div>
              <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.55, maxWidth: 300, margin: "10px auto 0" }}>
                Tap a scenario on the left—we&apos;ll spell out impact, what it means for you, and gentle
                actions you can take.
              </div>
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
      icon: c.diff > 0 ? "arrow-up" : "arrow-down",
      color: c.diff > 0 ? "#1A7F5A" : "#B45309",
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
                <span style={{ fontSize: 13, color: c.diff > 2 ? "#1A7F5A" : c.diff < -2 ? "#9B1C1C" : "#64748b", fontWeight: 600 }}>
                  {c.current}% → {c.recommended}%
                  {Math.abs(c.diff) > 2 ? (c.diff > 0 ? " up" : " down") : " on target"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>Now</div>
                  <MiniBar value={c.current} color="#94a3b8" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#B8962E", marginBottom: 3 }}>Target</div>
                  <MiniBar value={c.recommended} color="#B8962E" />
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
                <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                  <MarcusStrokeIcon name={a.icon} size={20} stroke={a.color} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{a.label}</span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, paddingLeft: 28 }}>{a.why}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, marginBottom: 10, fontSize: 15 }}>
              <MarcusStrokeIcon name="clipboard" size={20} stroke="#B8962E" />
              Cost & Tax Summary
            </div>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Estimated transaction fees: <strong>~$12</strong></div>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 6 }}>Tax impact: <strong>Minimal</strong> (mostly within tax-advantaged accounts)</div>
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 16 }}>Time to rebalance: <strong>~1 business day</strong></div>
            {!applied ? (
              <button className="btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={handleApply}>
                <MarcusStrokeIcon name="check-circle" size={20} stroke="#ffffff" />
                Apply Rebalancing
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#e8f5f0", borderRadius: 10, padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#1A7F5A" }}>
                <MarcusStrokeIcon name="check-circle" size={22} stroke="#1A7F5A" />
                Rebalancing applied. Your portfolio is now optimized.
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
    { role: "ai", text: `Hi, I'm your FinPilot assistant. I can answer questions about your portfolio in plain English. Try asking "Is my portfolio safe?" or "Should I sell now?"` },
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
    <div className="assistant-page">
      <header className="assistant-page-header">
        <span className="assistant-page-eyebrow">Portfolio copilot</span>
        <h2 className="assistant-page-title">AI Assistant</h2>
        <p className="assistant-page-subtitle">
          Ask anything about your money — no jargon, just plain answers
        </p>
      </header>

      <div className="assistant-chat-card">
        <div className="assistant-chat-scroll">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`assistant-msg-row ${m.role === "user" ? "assistant-msg-row--user" : ""}`}
            >
              <div className={`chat-msg ${m.role === "user" ? "chat-user" : "chat-ai"}`}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="assistant-msg-row">
              <div className="chat-msg chat-ai assistant-thinking">Thinking...</div>
            </div>
          )}
          <div ref={msgEnd} />
        </div>
        <div className="assistant-chat-footer">
          <div className="assistant-chips">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={`assistant-chip ${input.trim() === s ? "assistant-chip--active" : ""}`}
                onClick={() => setInput(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="assistant-compose">
            <input
              className="assistant-input"
              value={input}
              placeholder="Ask me anything about your portfolio..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              aria-label="Message to assistant"
            />
            <button
              type="button"
              className="assistant-send-btn"
              onClick={sendMessage}
              disabled={loading}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M22 2 11 13M22 2l-7 20-4-9-9-4 18-5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
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
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
          <MarcusStrokeIcon name="octagon-alert" size={52} stroke="#9B1C1C" />
        </div>
        <h2 style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 24, marginBottom: 12, color: "#9B1C1C", fontWeight: 600 }}>Market in freefall?</h2>
        <p style={{ fontSize: 15, color: "#718096", lineHeight: 1.7, marginBottom: 24 }}>
          Take a breath. Market drops are temporary. Selling in panic usually makes losses permanent. Here&apos;s what many long-term investors consider instead:
        </p>
        {[
          { icon: "ban", text: "Don't sell in panic — you lock in the loss" },
          { icon: "chart-bar", text: "Check your allocation — rebalance if needed" },
          { icon: "coins", text: "If cash is available, this could be a buying opportunity" },
          { icon: "target", text: "Your goals haven't changed — stay the course" },
        ].map((tip) => (
          <div key={tip.text} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #fee2e2", textAlign: "left" }}>
            <MarcusStrokeIcon name={tip.icon} size={22} stroke="#B8962E" />
            <span style={{ fontSize: 14, color: "#0A1628" }}>{tip.text}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onClose}>
            Run scenario sim
            <MarcusStrokeIcon name="arrow-up" size={18} stroke="#ffffff" className="rotate-90" />
          </button>
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
    { icon: "alert-triangle", stroke: "#B45309", title: "Portfolio drift detected", desc: "Your stocks allocation rose to 72% — 7% above your target. Consider trimming.", color: "#fef3e2", action: "Rebalance now" },
    { icon: "chart-down", stroke: "#9B1C1C", title: "Tech sector down 5%", desc: "Your Tech holding dropped. This is within normal range — no action needed yet.", color: "#fee2e2", action: "View details" },
    { icon: "check-circle", stroke: "#1A7F5A", title: "You're on track for retirement", desc: "Great news! Your portfolio is 65% toward your retirement goal. Keep contributing.", color: "#e8f5f0", action: null },
    { icon: "lightbulb", stroke: "#B8962E", title: "Rebalance opportunity", desc: "Bond yields have risen — a good time to increase your bond allocation for stability.", color: "#F5EDD6", action: "See recommendations" },
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
            <MarcusStrokeIcon name={a.icon} size={26} stroke={a.stroke} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: "#0A1628", lineHeight: 1.6 }}>{a.desc}</div>
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
              <p style={{ fontSize: 13, color: "#9B1C1C", marginBottom: 12 }}>{error}</p>
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

export default function FinPilot() {
  const { currentUser, signOut } = useAuth();
  const {
    riskProfile: persistedRiskProfile,
    setRiskProfile: setRiskProfileCtx,
  } = useAppContext();
  const [page, setPage] = useState(() =>
    typeof localStorage !== "undefined" &&
    localStorage.getItem(FINPILOT_ONBOARDING_KEY) === "true"
      ? "dashboard"
      : "onboarding",
  );
  const [riskProfile, setRiskProfile] = useState(
    () => persistedRiskProfile ?? "Balanced",
  );

  useEffect(() => {
    if (persistedRiskProfile) setRiskProfile(persistedRiskProfile);
  }, [persistedRiskProfile]);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [showPanic, setShowPanic] = useState(false);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "scenarios", label: "What-If Scenarios", icon: "orbit" },
    { id: "rebalance", label: "Rebalancing", icon: "scale" },
    { id: "assistant", label: "AI Assistant", icon: "message-circle" },
    { id: "alerts", label: "Alerts", icon: "bell" },
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
      case "scenarios": return (
          <Scenarios
            portfolio={portfolio}
            riskProfile={riskProfile}
            onReviewChanges={() => setPage("rebalance")}
          />
        );
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
                <span className="fp-nav-icon">
                  <MarcusStrokeIcon name={n.icon} size={20} stroke="currentColor" />
                </span>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="fp-sidebar-footer">
            <div className="fp-profile-card">
              {currentUser ? (
                <>
                  <div className="fp-profile-label">Signed in</div>
                  <div className="fp-profile-name">
                    {currentUser?.name?.trim() || DEFAULT_DISPLAY_NAME}
                  </div>
                  <div className="fp-profile-email">{currentUser.email}</div>
                  {currentUser.avatar ? (
                    <div className="fp-profile-avatar">{currentUser.avatar}</div>
                  ) : null}
                </>
              ) : null}
              <div className="fp-profile-risk-row">
                <div className="fp-profile-label">Risk profile</div>
                <div className="fp-profile-risk">{riskProfile}</div>
              </div>
              <button
                type="button"
                className="fp-sidebar-link"
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
              <button type="button" className="fp-sign-out-btn" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          </div>
        </div>
        <main className="fp-main">{renderPage()}</main>
        {showPanic && <PanicMode onClose={() => { setShowPanic(false); setPage("scenarios"); }} />}
      </div>
    </>
  );
}
