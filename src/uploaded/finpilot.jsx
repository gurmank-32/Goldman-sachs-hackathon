import { useState, useEffect, useRef } from "react";
import { useAppContext, useAuth } from "../store/AppContext.jsx";

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
  .onboard-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); }
  .onboard-card { background: white; border-radius: 24px; padding: 48px; width: 560px; max-width: 95vw; }
  .onboard-option { border: 2px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; cursor: pointer; font-size: 15px; transition: all .15s; text-align: left; width: 100%; display: flex; align-items: flex-start; gap: 14px; }
  .onboard-option:hover { border-color: #00d4aa; background: rgba(0,212,170,.04); }
  .onboard-option.selected { border-color: #00d4aa; background: rgba(0,212,170,.08); font-weight: 500; }
  .onboard-opt-icon { font-size: 22px; line-height: 1.2; flex-shrink: 0; width: 32px; text-align: center; }
  .onboard-opt-text { flex: 1; min-width: 0; }
  .onboard-opt-title { font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.35; }
  .onboard-opt-desc { font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.4; font-weight: 400; }
  .onboard-step-badge { font-size: 12px; font-weight: 600; color: #00d4aa; letter-spacing: 0.02em; margin-bottom: 10px; text-align: center; text-transform: uppercase; }
  .onboard-hint { font-size: 14px; color: #64748b; text-align: center; margin-bottom: 20px; line-height: 1.5; max-width: 420px; margin-left: auto; margin-right: auto; }
  .step-dots { display: flex; gap: 8px; justify-content: center; margin-bottom: 28px; }
  .step-dot { width: 8px; height: 8px; border-radius: 4px; background: #e2e8f0; transition: all .2s; }
  .step-dot.active { background: #00d4aa; width: 24px; }
  .step-dot.done { background: #10b981; }
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
      <style>{globalStyle}</style>
      <div className="onboard-card">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#00d4aa", marginBottom: 4 }}>FinPilot</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Your beginner-friendly financial co-pilot</div>
        </div>
        <div className="step-dots">
          {ONBOARDING_QUESTIONS.map((_, i) => (
            <div key={i} className={`step-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
          ))}
        </div>
        <div style={{ marginBottom: 8, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
          Question {step + 1} of {ONBOARDING_QUESTIONS.length}
        </div>
        <div className="onboard-step-badge">
          Question {step + 1}: {q.stepLabel}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, textAlign: "center", lineHeight: 1.4 }}>{q.question}</h2>
        <p className="onboard-hint">{q.hint}</p>
        {q.options.map((opt, idx) => (
          <button
            key={`${q.id}-${idx}`}
            type="button"
            className={`onboard-option ${selectedIdx === idx ? "selected" : ""}`}
            onClick={() => setSelectedIdx(idx)}
          >
            <span className="onboard-opt-icon" aria-hidden>{opt.icon}</span>
            <span className="onboard-opt-text">
              <div className="onboard-opt-title">{opt.label}</div>
              <div className="onboard-opt-desc">{opt.description}</div>
            </span>
          </button>
        ))}
        <button className="btn-primary" style={{ width: "100%", marginTop: 20, opacity: selectedIdx === null ? 0.5 : 1 }}
          type="button"
          disabled={selectedIdx === null}
          onClick={handleNext}>
          {step < ONBOARDING_QUESTIONS.length - 1 ? "Next →" : "See My Profile"}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ portfolio, riskProfile, onPanic }) {
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

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────
function Portfolio({ portfolio }) {
  const typeIcons = { stock: "📊", mutual: "🏦", bond: "📜", cash: "💵" };
  const typeColors = { stock: "#dbeafe", mutual: "#ede9fe", bond: "#dcfce7", cash: "#f1f5f9" };

  return (
    <div>
      <div className="fp-header"><h2>Your Portfolio</h2><p>All your investments in one simple view</p></div>
      <div className="grid2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Stocks & Funds</div>
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
        <div className="card">
          <div className="section-title">Portfolio Breakdown</div>
          {[
            { label: "Stocks & ETFs", value: 63.5, color: "#1a1a2e" },
            { label: "Mutual Funds", value: 25.6, color: "#00d4aa" },
            { label: "Bonds", value: 5.3, color: "#f59e0b" },
            { label: "Cash", value: 5.6, color: "#94a3b8" },
          ].map((s) => (
            <div key={s.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{s.value}%</span>
              </div>
              <MiniBar value={s.value} color={s.color} />
            </div>
          ))}
          <div style={{ marginTop: 20, padding: "14px", background: "#f8fafc", borderRadius: 10 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Total portfolio value</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(portfolio.totalValue)}</div>
            <div style={{ fontSize: 13, color: "#10b981", marginTop: 2 }}>↑ +{fmt(7290)} this year</div>
          </div>
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

    const systemPrompt = `You are FinPilot, a friendly financial advisor for beginners. The user's portfolio:
- Total value: ${fmt(portfolio.totalValue)}
- Allocation: Stocks ${portfolio.allocation.stocks}%, Bonds ${portfolio.allocation.bonds}%, Cash ${portfolio.allocation.cash}%
- Risk profile: ${riskProfile}
- Health score: ${calcHealthScore(portfolio.allocation, riskProfile)}/100
Answer in plain English with NO financial jargon. Keep responses under 3 sentences. Be warm, reassuring but honest. Use simple emojis. Never say "Alpha", "Beta", "Sharpe ratio" etc.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((c) => c.type === "text")?.text || "I'm not sure about that — try rephrasing!";
      setMessages((m) => [...m, { role: "ai", text }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Oops! I had a hiccup. Try again in a moment 🙏" }]);
    }
    setLoading(false);
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

// ─── ALERTS ───────────────────────────────────────────────────────────────────
function Alerts() {
  const alerts = [
    { icon: "⚠️", title: "Portfolio drift detected", desc: "Your stocks allocation rose to 72% — 7% above your target. Consider trimming.", color: "#fef9c3", action: "Rebalance now" },
    { icon: "📉", title: "Tech sector down 5%", desc: "Your Tech holding dropped. This is within normal range — no action needed yet.", color: "#fee2e2", action: "View details" },
    { icon: "✅", title: "You're on track for retirement", desc: "Great news! Your portfolio is 65% toward your retirement goal. Keep contributing.", color: "#dcfce7", action: null },
    { icon: "💡", title: "Rebalance opportunity", desc: "Bond yields have risen — a good time to increase your bond allocation for stability.", color: "#dbeafe", action: "See recommendations" },
  ];
  return (
    <div>
      <div className="fp-header"><h2>Alerts & Insights</h2><p>Important updates about your portfolio</p></div>
      {alerts.map((a, i) => (
        <div key={i} className="card" style={{ marginBottom: 16, background: a.color, borderColor: "transparent" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.6 }}>{a.desc}</div>
            </div>
            {a.action && <button className="btn-outline" style={{ fontSize: 13, padding: "7px 16px", flexShrink: 0 }}>{a.action}</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function FinPilot() {
  const { currentUser, signOut } = useAuth();
  const { setRiskProfile: setRiskProfileCtx } = useAppContext();
  const [page, setPage] = useState("onboarding");
  const [riskProfile, setRiskProfile] = useState("Balanced");
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [showPanic, setShowPanic] = useState(false);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "portfolio", label: "My Portfolio", icon: "💼" },
    { id: "scenarios", label: "What-If Scenarios", icon: "🔮" },
    { id: "rebalance", label: "Rebalancing", icon: "⚖️" },
    { id: "assistant", label: "AI Assistant", icon: "🤖" },
    { id: "alerts", label: "Alerts", icon: "🔔" },
  ];

  const handleOnboardingComplete = (profile) => {
    setRiskProfile(profile);
    setRiskProfileCtx(profile);
    setPage("dashboard");
  };

  const handleApplyRebalance = (newAlloc) => {
    setPortfolio((p) => ({ ...p, allocation: newAlloc }));
  };

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
      case "portfolio": return <Portfolio portfolio={portfolio} />;
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
                <div style={{ fontSize: 14, color: "white", fontWeight: 600 }}>{currentUser.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{currentUser.email}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#00d4aa", fontWeight: 700 }}>{currentUser.avatar}</div>
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>Risk profile</div>
            <div style={{ fontSize: 14, color: "#00d4aa", fontWeight: 600 }}>{riskProfile}</div>
            <button type="button" style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "underline" }}
              onClick={() => setPage("onboarding")}>Update profile</button>
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
        <main className="fp-main">
          {renderPage()}
        </main>
        {showPanic && <PanicMode onClose={() => { setShowPanic(false); setPage("scenarios"); }} />}
      </div>
    </>
  );
}
