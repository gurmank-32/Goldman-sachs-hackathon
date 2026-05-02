import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SettingsPage from "../pages/Settings.jsx";
import LinkAccountModal from "../components/LinkAccountModal.jsx";
import AddFundsModal from "../components/AddFundsModal.jsx";
import {
  DEMO_ACCOUNT_EMAIL,
  DEFAULT_DISPLAY_NAME,
  USER_GOAL_STORAGE_KEY,
  profileStorageKey,
  useAppContext,
  useAuth,
} from "../store/AppContext.jsx";
import { askAssistant } from "../services/marketApi.js";
import { MarcusStrokeIcon } from "../components/MarcusStrokeIcon.jsx";
import {
  GOAL_PROGRESS_REFERENCE_YEAR,
  getGoalConfig,
} from "../utils/goalConfig.jsx";
import AllocationDonut from "../components/AllocationDonut.jsx";
import {
  calculateAllocationBreakdown,
  toDerivedRiskAllocation,
  allocationBreakdownToLegendRows,
} from "../utils/allocationUtils.js";
import {
  INAPP_QUIZ_INDICES_KEY,
  INAPP_READY_FOR_LINK_KEY,
  PENDING_LINK_ACCOUNTS_KEY,
} from "../constants/inappOnboarding.js";
import {
  VERITE_ONBOARDING_KEY,
  SIGNUP_QUIZ_QUESTIONS as ONBOARDING_QUESTIONS,
  buildVeriteUserGoal,
  finPilotRiskFromQuizScore as getRiskProfile,
  mergeGoalWithTargets,
  normalizeStoredUserGoal,
  signupQuizScore,
} from "../constants/signupQuiz.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const RISK_LEVELS = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

const DEFAULT_PORTFOLIO = {
  totalValue: 85420,
  assets: [
    { name: "Tech Stocks", ticker: "TECH", value: 28500, gain: 12.4, risk: "High", sector: "Technology", type: "stock" },
    { name: "S&P 500 Index", ticker: "SPX", value: 18200, gain: 8.1, risk: "Medium", sector: "Diversified", type: "stock" },
    { name: "Healthcare Fund", ticker: "HLTH", value: 15100, gain: 5.2, risk: "Medium", sector: "Healthcare", type: "mutual" },
    { name: "US Treasury Bonds", ticker: "BOND", value: 12300, gain: 2.8, risk: "Low", sector: "Fixed Income", type: "bond" },
    { name: "Real Estate Fund", ticker: "REIT", value: 6800, gain: -1.4, risk: "Medium", sector: "Real Estate", type: "mutual" },
    { name: "Cash & Equivalents", ticker: "CASH", value: 4520, gain: 0.5, risk: "Low", sector: "Cash", type: "cash" },
  ],
};

const ZERO_BASE_PORTFOLIO = {
  totalValue: 0,
  assets: [],
};

/** Target mix: stocks, mutual funds, bonds, cash (sums to 100). Migrates legacy { stocks, bonds, cash }. */
function normalizeAllocation(raw) {
  const fallback = { stocks: 45, mutualFunds: 27, bonds: 18, cash: 10 };
  if (!raw || typeof raw !== "object") return { ...fallback };

  let st = Number(raw.stocks);
  let mu = Number(raw.mutualFunds);
  let bd = Number(raw.bonds);
  let cs = Number(raw.cash);

  const stOk = Number.isFinite(st);
  const muKey = "mutualFunds" in raw;
  const muOk = Number.isFinite(mu);
  const bdOk = Number.isFinite(bd);
  const csOk = Number.isFinite(cs);

  if (!stOk && !muOk && !bdOk && !csOk) return { ...fallback };

  st = stOk ? Math.max(0, st) : 0;
  mu = muOk ? Math.max(0, mu) : 0;
  bd = bdOk ? Math.max(0, bd) : 0;
  cs = csOk ? Math.max(0, cs) : 0;

  if (!muKey && stOk) {
    const eq = st;
    mu = Math.round(eq * 0.38);
    st = Math.max(0, eq - mu);
  } else if (!muOk) {
    mu = 0;
  }

  const sum = st + mu + bd + cs;
  if (sum <= 0) return { ...fallback };

  const scale = 100 / sum;
  st = Math.round(st * scale);
  mu = Math.round(mu * scale);
  bd = Math.round(bd * scale);
  cs = Math.max(0, 100 - st - mu - bd);

  return { stocks: st, mutualFunds: mu, bonds: bd, cash: cs };
}

function buildInitialPortfolioForUser(currentUser) {
  const email = String(currentUser?.email ?? "").trim().toLowerCase();
  if (email === DEMO_ACCOUNT_EMAIL) return DEFAULT_PORTFOLIO;
  return ZERO_BASE_PORTFOLIO;
}

function inferLinkedBankSubtype(account) {
  const sub = String(account?.accountSubtype || "").toLowerCase();
  if (sub === "checking" || sub === "savings") return sub;
  const lbl = String(account?.accountLabel || "").toLowerCase();
  if (lbl.includes("checking")) return "checking";
  if (lbl.includes("savings")) return "savings";
  return "other";
}

function shortLinkedDisplayName(account) {
  const raw = String(
    account?.nickname || account?.accountLabel || account?.name || "Account",
  ).trim();
  return raw.split("·")[0]?.trim() || raw;
}

function mergePortfolioWithLinked(basePortfolio, linkedAccounts) {
  const list = (Array.isArray(linkedAccounts) ? linkedAccounts : []).filter(
    (a) => a.connectionActive !== false,
  );
  const linkedAssets = [];
  let idx = 0;

  for (const a of list) {
    const v = Number(a.totalBalance ?? a.balance) || 0;
    if (v <= 0) continue;
    idx += 1;
    const shortName = shortLinkedDisplayName(a);
    const acctKind = a.type || a.category;

    if (acctKind === "bank") {
      const sub = String(a.subType || inferLinkedBankSubtype(a) || "").toLowerCase();
      const bucket = sub === "checking" ? "checking" : sub === "savings" ? "savings" : "other";
      const kindLabel =
        bucket === "checking"
          ? "Checking"
          : bucket === "savings"
            ? "Savings"
            : "Bank";
      linkedAssets.push({
        name: `${shortName} (${kindLabel})`,
        ticker: `BNK${idx}`,
        value: v,
        gain: 0,
        risk: "Low",
        sector: "Linked",
        type: "cash",
        linkedBankBucket: bucket,
      });
    } else if (acctKind === "brokerage" || acctKind === "retirement") {
      const prefix =
        acctKind === "retirement" ? `${shortName} (Retirement)` : shortName;
      const bd = a.breakdown;
      const rs = Math.max(0, Number(bd?.stocks) || 0);
      const rm = Math.max(0, Number(bd?.mutualFunds) || 0);
      const rb = Math.max(0, Number(bd?.bonds) || 0);
      const rc = Math.max(0, Number(bd?.cash) || 0);
      const sum = rs + rm + rb + rc;
      if (sum > 0) {
        const scale = v / sum;
        const vSt = Math.round(rs * scale);
        const vMu = Math.round(rm * scale);
        const vBd = Math.round(rb * scale);
        let vCs = Math.max(0, v - vSt - vMu - vBd);
        if (vSt > 0) {
          linkedAssets.push({
            name: `${prefix} — stocks & ETFs`,
            ticker: `BRK${idx}S`,
            value: vSt,
            gain: 0.6,
            risk: "Medium",
            sector: "Linked",
            type: "stock",
            linkedBrokerageSlice: "stocks",
          });
        }
        if (vMu > 0) {
          linkedAssets.push({
            name: `${prefix} — mutual funds`,
            ticker: `BRK${idx}M`,
            value: vMu,
            gain: 0.5,
            risk: "Medium",
            sector: "Linked",
            type: "mutual",
            linkedBrokerageSlice: "mutual",
          });
        }
        if (vBd > 0) {
          linkedAssets.push({
            name: `${prefix} — bonds`,
            ticker: `BRK${idx}B`,
            value: vBd,
            gain: 0.3,
            risk: "Low",
            sector: "Linked",
            type: "bond",
            linkedBrokerageSlice: "bonds",
          });
        }
        if (vCs > 0) {
          linkedAssets.push({
            name: `${prefix} — cash & sweep`,
            ticker: `BRK${idx}C`,
            value: vCs,
            gain: 0,
            risk: "Low",
            sector: "Linked",
            type: "cash",
            linkedBrokerageSlice: "cash",
          });
        }
      } else {
        linkedAssets.push({
          name: `${prefix} — linked balance (add sleeve amounts when linking)`,
          ticker: `BRK${idx}A`,
          value: v,
          gain: 0,
          risk: "Medium",
          sector: "Linked",
          type: "other",
          linkedBrokerageSlice: "aggregate",
        });
      }
    } else {
      linkedAssets.push({
        name: a.accountLabel || `${a.name} (linked)`,
        ticker: `LNK${idx}`,
        value: v,
        gain: 0.6,
        risk: "Low",
        sector: "Linked",
        type: "cash",
        linkedBankBucket: "other",
      });
    }
  }

  const extra = linkedAssets.reduce((s, x) => s + x.value, 0);
  if (extra === 0 && linkedAssets.length === 0) return basePortfolio;
  return {
    ...basePortfolio,
    totalValue: basePortfolio.totalValue + extra,
    assets: [...basePortfolio.assets, ...linkedAssets],
  };
}

/**
 * Classify every asset dollar into internal buckets (single source of truth for
 * donut, breakdown, and any other wealth views).
 */
function accumulateWealthBuckets(assets) {
  const buckets = {
    bankChecking: 0,
    bankSavings: 0,
    bankOther: 0,
    brkStocks: 0,
    brkMutual: 0,
    brkBonds: 0,
    brkCash: 0,
    brkAggregate: 0,
    coreStocks: 0,
    coreMutual: 0,
    coreBonds: 0,
    coreCash: 0,
  };

  for (const a of assets) {
    const v = Number(a.value) || 0;
    if (v <= 0) continue;

    if (a.linkedBankBucket) {
      if (a.linkedBankBucket === "checking") buckets.bankChecking += v;
      else if (a.linkedBankBucket === "savings") buckets.bankSavings += v;
      else buckets.bankOther += v;
      continue;
    }

    if (a.linkedBrokerageSlice) {
      if (a.linkedBrokerageSlice === "aggregate") buckets.brkAggregate += v;
      else if (a.linkedBrokerageSlice === "stocks") buckets.brkStocks += v;
      else if (a.linkedBrokerageSlice === "mutual") buckets.brkMutual += v;
      else if (a.linkedBrokerageSlice === "bonds") buckets.brkBonds += v;
      else if (a.linkedBrokerageSlice === "cash") buckets.brkCash += v;
      continue;
    }

    if (
      a.sector === "Linked" &&
      !a.linkedBankBucket &&
      !a.linkedBrokerageSlice
    ) {
      if (a.type === "cash") {
        buckets.bankOther += v;
      } else {
        buckets.brkAggregate += v;
      }
      continue;
    }

    if (a.type === "stock") buckets.coreStocks += v;
    else if (a.type === "mutual") buckets.coreMutual += v;
    else if (a.type === "bond") buckets.coreBonds += v;
    else if (a.type === "cash") buckets.coreCash += v;
  }

  return buckets;
}

function wealthTotalsFromBuckets(buckets) {
  const checking = buckets.bankChecking;
  const savings =
    buckets.bankSavings +
    buckets.bankOther +
    buckets.brkCash +
    buckets.coreCash;
  const stocks = buckets.brkStocks + buckets.coreStocks;
  const mutualFunds = buckets.brkMutual + buckets.coreMutual;
  const bonds = buckets.brkBonds + buckets.coreBonds;
  const brokerageAggregate = buckets.brkAggregate || 0;
  return { checking, savings, stocks, mutualFunds, bonds, brokerageAggregate };
}

/**
 * Donut + net-worth lines from linked + core holdings (not a separate target model).
 */
function buildAggregateWealthSlices(assets) {
  const buckets = accumulateWealthBuckets(assets);
  const { checking, savings, stocks, mutualFunds, bonds, brokerageAggregate } =
    wealthTotalsFromBuckets(buckets);

  const five = [
    {
      key: "savings",
      label: "Savings account",
      value: savings,
      color: "#0EA5E9",
    },
    {
      key: "checking",
      label: "Checking account",
      value: checking,
      color: "#117ACA",
    },
    { key: "stocks", label: "Stocks", value: stocks, color: "#0A1628" },
    {
      key: "mutualFunds",
      label: "Mutual funds",
      value: mutualFunds,
      color: "#B8962E",
    },
    { key: "bonds", label: "Bonds", value: bonds, color: "#718096" },
  ];
  if (brokerageAggregate > 0) {
    five.push({
      key: "brokerageUnspecified",
      label: "Brokerage (unspecified)",
      value: brokerageAggregate,
      color: "#94a3b8",
    });
  }

  return five.filter((s) => s.value > 0);
}

/**
 * Stocks / mutual funds / bonds (+ unspecified brokerage) — % and dollars vs total wealth.
 */
function investmentSegregationRows(assets) {
  const buckets = accumulateWealthBuckets(assets);
  const t = wealthTotalsFromBuckets(buckets);
  const totalWealth =
    t.checking +
    t.savings +
    t.stocks +
    t.mutualFunds +
    t.bonds +
    t.brokerageAggregate;
  const tv = totalWealth > 0 ? totalWealth : 1;

  const rows = [
    {
      key: "stocks",
      label: "Stocks",
      pct: (t.stocks / tv) * 100,
      dollar: t.stocks,
      color: "#0A1628",
    },
    {
      key: "mutualFunds",
      label: "Mutual funds",
      pct: (t.mutualFunds / tv) * 100,
      dollar: t.mutualFunds,
      color: "#B8962E",
    },
    {
      key: "bonds",
      label: "Bonds",
      pct: (t.bonds / tv) * 100,
      dollar: t.bonds,
      color: "#718096",
    },
  ];
  if (t.brokerageAggregate > 0) {
    rows.push({
      key: "brokerageUnspecified",
      label: "Brokerage (unspecified)",
      pct: (t.brokerageAggregate / tv) * 100,
      dollar: t.brokerageAggregate,
      color: "#94a3b8",
    });
  }
  return rows;
}

/** % of total wealth from linked accounts + manual holdings (single source with donut). */
function deriveActualAllocation(linkedAccounts, manualHoldings) {
  return toDerivedRiskAllocation(
    calculateAllocationBreakdown(linkedAccounts, manualHoldings),
  );
}

/** User-logged holdings from Add Holdings — analysis only, not executed trades. */
function mergeManualHoldings(portfolio, manualHoldings) {
  const list = Array.isArray(manualHoldings) ? manualHoldings : [];
  if (list.length === 0) return portfolio;
  const manualAssets = list.map((h, i) => ({
    name: h.name || "Holding",
    ticker:
      (h.ticker && String(h.ticker).trim()) ||
      `TRK${i}`,
    value: Number(h.value) || 0,
    gain: Number(h.dayChangePct) || 0,
    risk: "Medium",
    sector: "Tracked",
    type:
      h.instrumentType === "bond"
        ? "bond"
        : h.instrumentType === "mutual"
          ? "mutual"
          : "stock",
  }));
  const extra = manualAssets.reduce((s, x) => s + x.value, 0);
  if (extra === 0 && manualAssets.length === 0) return portfolio;
  return {
    ...portfolio,
    totalValue: portfolio.totalValue + extra,
    assets: [...portfolio.assets, ...manualAssets],
  };
}

const LINK_PROVIDER_TILE_COLORS = {
  chase: "#117ACA",
  bofa: "#E31837",
  wells: "#D71E28",
  citi: "#003B8E",
  fidelity: "#008000",
  schwab: "#00A0DF",
  robinhood: "#00C805",
  td: "#003366",
  "401k": "#0A1628",
  ira: "#0A1628",
  pension: "#0A1628",
  "other-bank": "#64748b",
  "other-broker": "#64748b",
  "dashboard-add": "#64748b",
  unknown: "#117ACA",
};

function linkedAccountTileColor(account) {
  const id = account?.providerId;
  if (id && LINK_PROVIDER_TILE_COLORS[id]) return LINK_PROVIDER_TILE_COLORS[id];
  if (account?.category === "retirement") return "#0A1628";
  return "#117ACA";
}

function linkedAccountTileInitial(account) {
  const label = String(account?.accountLabel || account?.name || "?").trim();
  const ch = label.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

const GOAL_MODAL_YEAR_START = 2026;
const GOAL_MODAL_YEAR_END = 2060;

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
function blendedEquityPct(allocationLike) {
  if (
    allocationLike &&
    typeof allocationLike === "object" &&
    Number.isFinite(allocationLike.brokerageUnallocated)
  ) {
    return (
      allocationLike.stocks +
      allocationLike.mutualFunds +
      (allocationLike.brokerageUnallocated || 0) * 0.5
    );
  }
  const a = normalizeAllocation(allocationLike);
  return a.stocks + a.mutualFunds;
}

function calcRisk(allocationLike) {
  const equity = blendedEquityPct(allocationLike);
  if (equity > 65) return RISK_LEVELS.HIGH;
  if (equity > 40) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.LOW;
}

function calcHealthScore(allocationLike, riskProfile) {
  const equity = blendedEquityPct(allocationLike);
  const bondsPct =
    allocationLike &&
    typeof allocationLike === "object" &&
    Number.isFinite(allocationLike.bonds)
      ? allocationLike.bonds
      : normalizeAllocation(allocationLike).bonds;
  const cashPct =
    allocationLike &&
    typeof allocationLike === "object" &&
    Number.isFinite(allocationLike.cash)
      ? allocationLike.cash
      : normalizeAllocation(allocationLike).cash;
  const diversification = equity < 80 && bondsPct > 10 ? 30 : 15;
  const riskMatch =
    (riskProfile === "Conservative" && equity < 50) ||
    (riskProfile === "Balanced" && equity >= 40 && equity <= 70) ||
    (riskProfile === "Aggressive" && equity > 60)
      ? 40
      : 20;
  const cashBuffer = cashPct >= 5 && cashPct <= 20 ? 30 : 10;
  return Math.min(100, diversification + riskMatch + cashBuffer);
}

function getRebalanceRecommendation(profile) {
  const recs = {
    Conservative: { stocks: 22, mutualFunds: 13, bonds: 50, cash: 15 },
    Balanced: { stocks: 34, mutualFunds: 21, bonds: 35, cash: 10 },
    Aggressive: { stocks: 50, mutualFunds: 30, bonds: 15, cash: 5 },
  };
  return normalizeAllocation(recs[profile] || recs.Balanced);
}

/** Goal-specific target mix for Rebalancing (overrides risk-based defaults when set). */
const REBALANCE_TARGETS_BY_GOAL = {
  retire: { stocks: 37, mutualFunds: 23, bonds: 35, cash: 5 },
  home: { stocks: 25, mutualFunds: 15, bonds: 40, cash: 20 },
  education: { stocks: 31, mutualFunds: 19, bonds: 35, cash: 15 },
  grow: { stocks: 46, mutualFunds: 29, bonds: 20, cash: 5 },
  protect: { stocks: 19, mutualFunds: 11, bonds: 55, cash: 15 },
};

function getRebalanceTargets(riskProfile, selectedGoal) {
  const t = selectedGoal?.type;
  if (t && REBALANCE_TARGETS_BY_GOAL[t]) {
    return normalizeAllocation(REBALANCE_TARGETS_BY_GOAL[t]);
  }
  return getRebalanceRecommendation(riskProfile);
}

function alertOnTrackTitleForGoal(goal) {
  if (!goal?.label) return "You're on track for your goals";
  switch (goal.type) {
    case "home":
      return "You're on track for your home purchase goal.";
    case "education":
      return "You're on track for your education savings goal.";
    case "retire":
      return "You're on track for retirement.";
    case "grow":
      return "You're on track for your wealth growth goal.";
    case "protect":
      return "You're on track for your capital protection goal.";
    default:
      return `You're on track for ${goal.label}.`;
  }
}

function alertOnTrackDescForGoal(goal) {
  if (!goal?.label) {
    return "Great news! Your portfolio is making solid progress. Keep contributing.";
  }
  return `Great news! Your portfolio is 65% toward your ${goal.label} goal. Keep contributing.`;
}

/** Higher score → suggested trim earlier when reducing equities (education-only heuristic). */
function riskRankVal(risk) {
  if (risk === "High") return 3;
  if (risk === "Medium") return 2;
  return 1;
}

/** Dollar size of moving one sleeve toward another given total portfolio value. */
function allocationShiftDollars(totalValue, fromPct, toPct) {
  return (Math.abs(fromPct - toPct) / 100) * totalValue;
}

function splitBudgetAcrossAssets(assets, budget, weightFn) {
  if (!assets.length || budget < 40) return [];
  const rows = assets.map((asset) => ({
    asset,
    weight: Math.max(1, weightFn(asset)) * Math.max(asset.value, 1),
  }));
  const sumW = rows.reduce((s, r) => s + r.weight, 0) || 1;
  return rows
    .map(({ asset, weight }) => ({
      asset,
      approxAmount: Math.round(((budget * weight) / sumW) / 25) * 25,
    }))
    .filter((r) => r.approxAmount >= 50);
}

/**
 * Maps target-allocation deltas into illustrative trim/add ideas per holding (not orders).
 */
function getRebalanceTradeSuggestions(portfolio, currentRaw, recommendedRaw) {
  const current =
    currentRaw &&
    typeof currentRaw === "object" &&
    Number.isFinite(currentRaw.brokerageUnallocated)
      ? {
          stocks: currentRaw.stocks,
          mutualFunds: currentRaw.mutualFunds,
          bonds: currentRaw.bonds,
          cash: currentRaw.cash,
          brokerageUnallocated: currentRaw.brokerageUnallocated || 0,
        }
      : { ...normalizeAllocation(currentRaw), brokerageUnallocated: 0 };
  const rec = normalizeAllocation(recommendedRaw);
  const recommended = { ...rec, brokerageUnallocated: 0 };
  const total = portfolio.totalValue || 1;
  const threshold = 2;
  const sells = [];
  const buys = [];
  const deployCash = [];

  const equities = portfolio.assets
    .filter(
      (a) =>
        (a.type === "stock" || a.type === "mutual") &&
        a.linkedBrokerageSlice !== "aggregate",
    )
    .sort((a, b) => {
      const rd = riskRankVal(b.risk) - riskRankVal(a.risk);
      if (rd !== 0) return rd;
      if (a.type === b.type) return 0;
      return a.type === "stock" ? -1 : 1;
    });
  const stockHoldings = equities.filter((a) => a.type === "stock");
  const mutualHoldings = equities.filter((a) => a.type === "mutual");
  const bonds = portfolio.assets.filter((a) => a.type === "bond");
  const cashAssets = portfolio.assets.filter((a) => a.type === "cash");

  if (current.stocks - recommended.stocks > threshold) {
    const budget = allocationShiftDollars(total, current.stocks, recommended.stocks);
    splitBudgetAcrossAssets(stockHoldings, budget, (a) => riskRankVal(a.risk)).forEach(({ asset, approxAmount }) => {
      sells.push({
        side: "sell",
        ticker: asset.ticker,
        name: asset.name,
        approxAmount,
        reason: `${asset.risk}-risk ${asset.sector} (stock) — trims align stock exposure with your ${recommended.stocks}% target.`,
      });
    });
  }

  if (current.mutualFunds - recommended.mutualFunds > threshold) {
    const budget = allocationShiftDollars(total, current.mutualFunds, recommended.mutualFunds);
    splitBudgetAcrossAssets(mutualHoldings, budget, (a) => riskRankVal(a.risk)).forEach(({ asset, approxAmount }) => {
      sells.push({
        side: "sell",
        ticker: asset.ticker,
        name: asset.name,
        approxAmount,
        reason: `${asset.risk}-risk ${asset.sector} (mutual fund) — trims align mutual fund exposure with your ${recommended.mutualFunds}% target.`,
      });
    });
  }

  if (recommended.stocks - current.stocks > threshold) {
    const budget = allocationShiftDollars(total, current.stocks, recommended.stocks);
    const broadScore = (a) =>
      (/S&P|Index|\b500\b/i.test(a.name) ? 4 : 0) + Math.min(2, a.value / 25000);
    const ranked = [...stockHoldings].sort((a, b) => broadScore(b) - broadScore(a));
    const primary = ranked[0];
    const secondary = ranked.find((a) => a.ticker !== primary?.ticker);
    if (primary) {
      buys.push({
        side: "buy",
        ticker: primary.ticker,
        name: primary.name,
        approxAmount: Math.round((budget * 0.58) / 50) * 50,
        reason:
          "When adding stock exposure, Vérité favors broad sleeves (including core ETFs) before niche themes.",
      });
    }
    if (secondary && budget >= 750) {
      buys.push({
        side: "buy",
        ticker: secondary.ticker,
        name: secondary.name,
        approxAmount: Math.round((budget * 0.32) / 50) * 50,
        reason: "Layer a second stock position so adds stay diversified across sectors.",
      });
    }
  }

  if (recommended.mutualFunds - current.mutualFunds > threshold) {
    const budget = allocationShiftDollars(total, current.mutualFunds, recommended.mutualFunds);
    const fundScore = (a) =>
      (/Index|500|Total|Core/i.test(a.name) ? 4 : 0) + Math.min(2, a.value / 25000);
    const ranked = [...mutualHoldings].sort((a, b) => fundScore(b) - fundScore(a));
    const primary = ranked[0];
    const secondary = ranked.find((a) => a.ticker !== primary?.ticker);
    if (primary) {
      buys.push({
        side: "buy",
        ticker: primary.ticker,
        name: primary.name,
        approxAmount: Math.round((budget * 0.58) / 50) * 50,
        reason:
          "Adding mutual fund exposure first keeps diversification broad versus single-stock concentration.",
      });
    }
    if (secondary && budget >= 750) {
      buys.push({
        side: "buy",
        ticker: secondary.ticker,
        name: secondary.name,
        approxAmount: Math.round((budget * 0.32) / 50) * 50,
        reason: "Add a complementary fund so mutual fund sleeves stay balanced.",
      });
    }
  }

  if (current.bonds - recommended.bonds > threshold) {
    const budget = allocationShiftDollars(total, current.bonds, recommended.bonds);
    splitBudgetAcrossAssets(bonds, budget, () => 1).forEach(({ asset, approxAmount }) => {
      sells.push({
        side: "sell",
        ticker: asset.ticker,
        name: asset.name,
        approxAmount,
        reason: "Bond sleeve is above target — trimming keeps duration and credit mix in line with your profile.",
      });
    });
  }

  if (recommended.bonds - current.bonds > threshold) {
    const budget = allocationShiftDollars(total, current.bonds, recommended.bonds);
    const anchor = bonds[0];
    buys.push({
      side: "buy",
      ticker: anchor?.ticker ?? "Bonds",
      name: anchor?.name ?? "Core bond fund / Treasuries",
      approxAmount: Math.round(budget / 50) * 50,
      reason: anchor
        ? `Add alongside ${anchor.name} so fixed-income moves stay consistent with what you already hold.`
        : "Raise bond exposure using funds your brokerage lists as investment-grade core bonds.",
    });
  }

  if (current.cash - recommended.cash > threshold) {
    const budget = allocationShiftDollars(total, current.cash, recommended.cash);
    deployCash.push({
      approxAmount: Math.round(budget / 50) * 50,
      reason: `Cash is above your ${recommended.cash}% target — redeploy roughly ${fmt(Math.round(budget / 50) * 50)} toward stocks (${recommended.stocks}%), mutual funds (${recommended.mutualFunds}%), or bonds (${recommended.bonds}%).`,
    });
  }

  if (recommended.cash - current.cash > threshold) {
    const budget = allocationShiftDollars(total, current.cash, recommended.cash);
    const anchor = cashAssets[0];
    buys.push({
      side: "buy",
      ticker: anchor?.ticker ?? "Cash",
      name: anchor?.name ?? "Cash / government MMF",
      approxAmount: Math.round(budget / 50) * 50,
      reason:
        "Increase liquidity reserves so upcoming withdrawals or volatility don’t force rushed sells elsewhere.",
    });
  }

  return {
    sells,
    buys,
    deployCash,
    disclaimer:
      "Illustrative ideas only—they never execute trades. Dollar amounts are rounded from your allocation gaps and holdings; confirm taxes, lots, and fees with your custodian before acting.",
  };
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

export const globalStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F9F8F6;
    color: #0A1628;
    -webkit-font-smoothing: antialiased;
  }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input, select { font-family: inherit; }
  .fp-app {
    --fp-sidebar-w: 260px;
    min-height: 100vh;
    display: flex;
  }
  .fp-sidebar {
    width: var(--fp-sidebar-w);
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
  .fp-main {
    position: relative;
    z-index: 1;
    margin-left: var(--fp-sidebar-w);
    flex: 1;
    width: calc(100% - var(--fp-sidebar-w));
    padding: 40px clamp(28px, 4vw, 56px) 56px;
    max-width: min(1320px, calc(100vw - var(--fp-sidebar-w)));
  }
  .fp-main-topbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 20px;
    min-height: 44px;
    position: relative;
    z-index: 40;
  }
  .fp-account-trigger {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    background: rgba(255, 255, 255, 0.94);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #0a1628;
    font-family: inherit;
  }
  .fp-account-trigger:hover {
    border-color: rgba(184, 150, 46, 0.35);
    background: #fff;
  }
  .fp-account-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 200px;
    padding: 8px;
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 16px 48px rgba(15, 23, 42, 0.12);
  }
  .fp-account-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    border: none;
    background: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #0a1628;
    cursor: pointer;
    font-family: inherit;
  }
  .fp-account-menu-item:hover {
    background: #f8fafc;
  }
  .fp-account-menu-item--danger {
    color: #9b1c1c;
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
  .dashboard-metric-shell { margin-bottom: 28px; position: relative; }
  .dashboard-metric-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: -18px;
    padding: 0 6px;
    position: relative;
    z-index: 2;
  }
  .dashboard-metric-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 16px 16px 8px 8px;
    border: 2px solid transparent;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    color: #0f172a;
    transition:
      transform 0.22s cubic-bezier(0.34, 1.15, 0.48, 1),
      box-shadow 0.22s ease,
      filter 0.2s ease;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.1);
  }
  .dashboard-metric-tab:hover {
    transform: translateY(-3px);
    filter: brightness(1.04);
  }
  .dashboard-metric-tab:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(184, 150, 46, 0.35), 0 8px 22px rgba(15, 23, 42, 0.12);
  }
  .dashboard-metric-tab--active {
    transform: translateY(-6px) scale(1.03);
    box-shadow:
      0 16px 36px rgba(15, 23, 42, 0.16),
      0 6px 14px rgba(15, 23, 42, 0.08);
    z-index: 3;
  }
  .dashboard-metric-panel {
    position: relative;
    z-index: 1;
    border-radius: 22px;
    padding: 26px 24px 22px;
    background: linear-gradient(165deg, #ffffff 0%, #fafafa 48%, #f8fafc 100%);
    box-shadow:
      0 0 0 1px rgba(15, 23, 42, 0.07),
      0 28px 56px -16px rgba(15, 23, 42, 0.22),
      0 14px 28px -10px rgba(184, 150, 46, 0.14);
    min-height: 220px;
  }
  .dashboard-metric-panel-glow {
    position: absolute;
    inset: -2px;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(184, 150, 46, 0.15), transparent 42%, transparent);
    z-index: -1;
    pointer-events: none;
    opacity: 0.9;
  }
  @media (max-width: 720px) {
    .dashboard-health-risk-grid {
      grid-template-columns: 1fr !important;
    }
  }
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
    left: var(--fp-sidebar-w);
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
    left: var(--fp-sidebar-w);
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
  @keyframes goal-modal-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes goal-modal-panel-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .goal-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 450;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.5);
    animation: goal-modal-backdrop-in 150ms ease-out forwards;
  }
  .goal-modal-panel {
    width: 100%;
    max-width: 440px;
    max-height: min(90vh, 720px);
    overflow-y: auto;
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22);
    border: 1px solid rgba(226, 232, 240, 0.95);
    animation: goal-modal-panel-in 200ms ease-out forwards;
  }
  .goal-modal-change-btn {
    transition: background 0.15s ease;
  }
  .goal-modal-change-btn:hover {
    background: #F5EDD6 !important;
  }
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

// ─── ONBOARDING (split across `/` + `/goal` routes) ──────────────────────────
export function RiskProfilerQuiz({ onComplete }) {
  const [step, setStep] = useState(0);
  const [quizSelections, setQuizSelections] = useState(() =>
    Array(ONBOARDING_QUESTIONS.length).fill(null),
  );

  const q = ONBOARDING_QUESTIONS[step];
  const totalSteps = ONBOARDING_QUESTIONS.length;
  const progressPct = ((step + 1) / totalSteps) * 100;
  const selectedIdx = quizSelections[step];

  const selectOption = (optionIndex) => {
    setQuizSelections((prev) => {
      const next = [...prev];
      next[step] = optionIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (selectedIdx === null) return;
    if (step < ONBOARDING_QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    const indices = [...quizSelections];
    if (!indices.every((x) => x !== null)) return;
    onComplete(indices);
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card-wrap">
        <div className="onboard-card">
          <header className="onboard-brand">
            <div className="onboard-brand-mark">Vérité</div>
            <p className="onboard-brand-tag">Know what to do next.</p>
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
                  onClick={() => selectOption(idx)}
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

          <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
            <button
              type="button"
              className="btn-primary onboard-next-btn"
              disabled={selectedIdx === null}
              onClick={handleNext}
            >
              <span className="onboard-next-btn-inner">
                <span className="onboard-next-btn-label">
                  {step < ONBOARDING_QUESTIONS.length - 1 ? "Continue" : "Continue to goal"}
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
    </div>
  );
}

export function GoalTargetStep({ quizSelections, onComplete, onBack }) {
  const goalRefineYearOptions = useMemo(
    () =>
      Array.from(
        { length: GOAL_MODAL_YEAR_END - GOAL_MODAL_YEAR_START + 1 },
        (_, i) => GOAL_MODAL_YEAR_START + i,
      ),
    [],
  );

  const [goalRefineAmount, setGoalRefineAmount] = useState("");
  const [goalRefineYear, setGoalRefineYear] = useState(
    String(GOAL_MODAL_YEAR_START),
  );

  useEffect(() => {
    const draft = buildVeriteUserGoal(quizSelections);
    if (draft) {
      setGoalRefineAmount(String(draft.targetAmount));
      setGoalRefineYear(String(draft.targetYear));
    }
  }, [quizSelections]);

  const refineNextDisabled = (() => {
    const amt = Number(String(goalRefineAmount).replace(/,/g, ""));
    const yr = Number(goalRefineYear);
    if (!Number.isFinite(amt) || amt <= 0) return true;
    if (
      !Number.isFinite(yr) ||
      yr < GOAL_MODAL_YEAR_START ||
      yr > GOAL_MODAL_YEAR_END
    ) {
      return true;
    }
    return false;
  })();

  const handleNext = () => {
    const amt = Number(String(goalRefineAmount).replace(/,/g, ""));
    const yr = Number(goalRefineYear);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (
      !Number.isFinite(yr) ||
      yr < GOAL_MODAL_YEAR_START ||
      yr > GOAL_MODAL_YEAR_END
    ) {
      return;
    }
    const indices = [...quizSelections];
    const draft = buildVeriteUserGoal(indices);
    if (!draft) return;
    const refined =
      mergeGoalWithTargets(draft, amt, yr) ?? normalizeStoredUserGoal(draft);
    if (!refined) return;
    const score = signupQuizScore(indices);
    const profile = getRiskProfile(score);
    onComplete(profile, indices, refined);
  };

  return (
    <div className="onboard-container">
      <div className="onboard-card-wrap">
        <div className="onboard-card">
          <header className="onboard-brand">
            <div className="onboard-brand-mark">Vérité</div>
            <p className="onboard-brand-tag">Know what to do next.</p>
          </header>

          <div className="onboard-progress">
            <span className="sr-only">Goal target</span>
            <div className="onboard-progress-label" aria-hidden>
              <span className="onboard-progress-meta">Your goal</span>
              <span className="onboard-progress-count">Step 2 of 3</span>
            </div>
            <div
              className="onboard-progress-track"
              role="progressbar"
              aria-valuenow={100}
              aria-valuetext="Goal target"
            >
              <div
                className="onboard-progress-fill"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div className="onboard-step-body">
            <p className="onboard-step-badge">Your target</p>
            <h2 id="onboard-goal-refine" className="onboard-question">
              How much are you aiming for — and when?
            </h2>
            <p className="onboard-hint">
              Adjust the numbers to match your plan. You can always change this later on the dashboard.
            </p>
            <div
              className="onboard-options"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label
                  htmlFor="onboard-goal-amount"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#64748b",
                    marginBottom: 8,
                  }}
                >
                  Target amount ($)
                </label>
                <input
                  id="onboard-goal-amount"
                  type="number"
                  min={1}
                  step={1}
                  className="chat-input"
                  value={goalRefineAmount}
                  onChange={(e) => setGoalRefineAmount(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="onboard-goal-year"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#64748b",
                    marginBottom: 8,
                  }}
                >
                  Target year
                </label>
                <select
                  id="onboard-goal-year"
                  className="chat-input"
                  value={goalRefineYear}
                  onChange={(e) => setGoalRefineYear(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 12,
                    padding: "12px 14px",
                    cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  {goalRefineYearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexDirection: "row" }}>
            {typeof onBack === "function" ? (
              <button
                type="button"
                className="btn-outline onboard-next-btn"
                onClick={onBack}
                style={{
                  flex: 1,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                }}
              >
                <span className="onboard-next-btn-inner">
                  <span className="onboard-next-btn-label">Back</span>
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="btn-primary onboard-next-btn"
              disabled={refineNextDisabled}
              onClick={handleNext}
              style={typeof onBack === "function" ? { flex: 1.65 } : undefined}
            >
              <span className="onboard-next-btn-inner">
                <span className="onboard-next-btn-label">Continue to link accounts</span>
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
    </div>
  );
}

/** Aligns with `SIGNUP_QUIZ_QUESTIONS[0]` option order. */
const DASHBOARD_GOAL_TYPES = ["home", "education", "retire", "grow", "protect"];

function goalTypeToDashboardIndex(type) {
  const i = DASHBOARD_GOAL_TYPES.indexOf(type);
  return i >= 0 ? i : 2;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstNameFromDisplayName(name) {
  const t = String(name ?? "").trim();
  if (!t) return "";
  return t.split(/\s+/)[0];
}

function Dashboard({ portfolio, riskProfile, onPanic }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    selectedGoal,
    setSelectedGoal,
    linkedAccounts,
    manualHoldings,
    removeLinkedAccount,
  } = useAppContext();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalInst, setLinkModalInst] = useState(null);
  const [linkAbortMsg, setLinkAbortMsg] = useState("");
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [addFundsCancelMsg, setAddFundsCancelMsg] = useState("");
  const [dashInfoBannerDismissed, setDashInfoBannerDismissed] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const greetFirstName =
    firstNameFromDisplayName(currentUser?.name) || DEFAULT_DISPLAY_NAME;
  const [homePortfolioTab, setHomePortfolioTab] = useState("holdings");
  const [dashboardMetricTab, setDashboardMetricTab] = useState("wealth-persona");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [modalGoalIdx, setModalGoalIdx] = useState(0);
  const [modalTargetAmount, setModalTargetAmount] = useState("");
  const [modalTargetYear, setModalTargetYear] = useState(String(GOAL_MODAL_YEAR_START));
  const goalModalYearOptions = useMemo(
    () =>
      Array.from(
        { length: GOAL_MODAL_YEAR_END - GOAL_MODAL_YEAR_START + 1 },
        (_, i) => GOAL_MODAL_YEAR_START + i,
      ),
    [],
  );

  useEffect(() => {
    if (!goalModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setGoalModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goalModalOpen]);

  useEffect(() => {
    if (!disconnectTarget) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDisconnectTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disconnectTarget]);

  const baseVal = portfolio.assets
    .filter((a) => a.sector !== "Linked")
    .reduce((s, a) => s + (Number(a.value) || 0), 0);

  const linkedSum = useMemo(
    () =>
      (Array.isArray(linkedAccounts) ? linkedAccounts : []).reduce(
        (s, a) => s + (Number(a.totalBalance ?? a.balance) || 0),
        0,
      ),
    [linkedAccounts],
  );

  const allocationBreakdown = useMemo(
    () => calculateAllocationBreakdown(linkedAccounts, manualHoldings),
    [linkedAccounts, manualHoldings],
  );

  const typeIconNames = { stock: "chart-bar", mutual: "building-columns", bond: "scroll-text", cash: "banknote" };
  const typeColors = { stock: "#F5EDD6", mutual: "#F5EDD6", bond: "#e8f5f0", cash: "#f1f5f9" };
  const breakdownRows = useMemo(
    () => allocationBreakdownToLegendRows(allocationBreakdown),
    [allocationBreakdown],
  );

  const stockHoldings = useMemo(
    () =>
      (portfolio.assets || []).filter(
        (a) => !a.linkedBankBucket && a.type === "stock",
      ),
    [portfolio.assets],
  );
  const mutualHoldings = useMemo(
    () =>
      (portfolio.assets || []).filter(
        (a) => !a.linkedBankBucket && a.type === "mutual",
      ),
    [portfolio.assets],
  );
  const bondHoldings = useMemo(
    () =>
      (portfolio.assets || []).filter(
        (a) => !a.linkedBankBucket && a.type === "bond",
      ),
    [portfolio.assets],
  );

  const derivedAlloc = useMemo(
    () => deriveActualAllocation(linkedAccounts, manualHoldings),
    [linkedAccounts, manualHoldings],
  );
  const risk = calcRisk(derivedAlloc);
  const health = calcHealthScore(derivedAlloc, riskProfile);

  const wealthDisplayTotal =
    allocationBreakdown.total > 0
      ? allocationBreakdown.total
      : portfolio.totalValue || 0;

  const insights = [
    { color: "#fef3e2", icon: "alert-triangle", stroke: "#B45309", text: "You're slightly overweight in stocks vs your Balanced profile. Consider trimming by 10–15%.", type: "warn" },
    { color: "#e8f5f0", icon: "check-circle", stroke: "#1A7F5A", text: "Your bond allocation keeps you stable during downturns. Great buffer!", type: "ok" },
    { color: "#F5EDD6", icon: "lightbulb", stroke: "#B8962E", text: "Your portfolio grew 9.3% this year — ahead of the 7% market average.", type: "info" },
  ];

  const goalCfg = selectedGoal?.type
    ? getGoalConfig(selectedGoal.type, selectedGoal)
    : null;
  const goalProgressUsd = (n) =>
    Number(n).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  const goalCurrentVal = wealthDisplayTotal;
  const goalProgressPct =
    goalCfg && goalCfg.targetAmount > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((goalCurrentVal / goalCfg.targetAmount) * 100)),
        )
      : 0;
  const goalYearsLeft = goalCfg
    ? Math.max(0, goalCfg.targetYear - GOAL_PROGRESS_REFERENCE_YEAR)
    : 0;
  const GoalIconComponent = goalCfg?.Icon;

  const openGoalModal = () => {
    if (!selectedGoal?.type) return;
    const cfg = getGoalConfig(selectedGoal.type, selectedGoal);
    setModalGoalIdx(goalTypeToDashboardIndex(selectedGoal.type));
    setModalTargetAmount(
      String(
        selectedGoal.targetAmount ??
          cfg.targetAmount ??
          "",
      ),
    );
    setModalTargetYear(
      String(
        selectedGoal.targetYear ??
          cfg.targetYear ??
          GOAL_MODAL_YEAR_START,
      ),
    );
    setGoalModalOpen(true);
  };

  const closeGoalModal = () => {
    setGoalModalOpen(false);
  };

  const saveGoalModal = () => {
    const amt = Number(String(modalTargetAmount).replace(/,/g, ""));
    const yr = Number(modalTargetYear);
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (!Number.isFinite(yr) || yr < GOAL_MODAL_YEAR_START || yr > GOAL_MODAL_YEAR_END) {
      return;
    }
    const opt = ONBOARDING_QUESTIONS[0].options[modalGoalIdx];
    if (!opt) return;
    const type = DASHBOARD_GOAL_TYPES[modalGoalIdx];
    const raw = {
      type,
      label: opt.label,
      targetAmount: Math.round(amt),
      targetYear: yr,
      emoji: null,
    };
    const next = normalizeStoredUserGoal(raw);
    if (!next) return;
    setSelectedGoal(next);
    try {
      localStorage.setItem(USER_GOAL_STORAGE_KEY, JSON.stringify(next));
      if (currentUser?.email) {
        const k = profileStorageKey(currentUser.email);
        let merged = { goal: next };
        try {
          const prevRaw = localStorage.getItem(k);
          if (prevRaw) {
            const prev = JSON.parse(prevRaw);
            if (prev && typeof prev === "object") merged = { ...prev, goal: next };
          }
        } catch {
          /* ignore */
        }
        localStorage.setItem(k, JSON.stringify(merged));
      }
    } catch {
      /* ignore */
    }
    setGoalModalOpen(false);
  };

  return (
    <div>
      {!dashInfoBannerDismissed ? (
        <div
          style={{
            position: "relative",
            background: "#F5EDD6",
            borderRadius: 12,
            padding: "14px 44px 14px 16px",
            marginBottom: 20,
            border: "1px solid rgba(184, 150, 46, 0.35)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#0A1628",
              lineHeight: 1.55,
            }}
          >
            Vérité brings your accounts together in one place so you always
            know what to do next.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDashInfoBannerDismissed(true)}
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              width: 32,
              height: 32,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 22,
              lineHeight: 1,
              color: "#64748b",
              borderRadius: 8,
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <div
        className="fp-header"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          paddingRight: 8,
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 0, paddingRight: "min(300px, 18vw)" }}>
          <h2>
            {timeOfDayGreeting()}, {greetFirstName}
          </h2>
          <p>Here's how your financial health looks today</p>
          {linkAbortMsg ? (
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 1.5 }}>
              {linkAbortMsg}
            </p>
          ) : null}
          {addFundsCancelMsg ? (
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 1.5 }}>
              {addFundsCancelMsg}
            </p>
          ) : null}
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => setAddFundsOpen(true)}
            style={{
              background: "#B8962E",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Add Holdings
          </button>
          <button
            type="button"
            className="btn-outline"
            style={{
              flexShrink: 0,
              borderColor: "#B8962E",
              color: "#B8962E",
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 18px",
            }}
            onClick={() => {
              setLinkModalInst({
                name: "Your institution",
                category: "bank",
                providerId: "dashboard-add",
              });
              setLinkModalOpen(true);
            }}
          >
            Add Account
          </button>
        </div>
      </div>

      <LinkAccountModal
        open={linkModalOpen && !!linkModalInst}
        institution={linkModalInst}
        onClose={({ completed }) => {
          setLinkModalOpen(false);
          setLinkModalInst(null);
          if (!completed) {
            setLinkAbortMsg(
              "Connection cancelled — you can reconnect anytime from Settings.",
            );
            window.setTimeout(() => setLinkAbortMsg(""), 8000);
          }
        }}
      />

      <AddFundsModal
        open={addFundsOpen}
        linkedAccounts={linkedAccounts}
        onClose={({ added }) => {
          setAddFundsOpen(false);
          if (!added) {
            setAddFundsCancelMsg(
              "Closed without adding — your portfolio was not changed.",
            );
            window.setTimeout(() => setAddFundsCancelMsg(""), 8000);
          }
        }}
      />

      <div className="dashboard-metric-shell">
        <div className="dashboard-metric-tabs" role="tablist" aria-label="Snapshot details">
          {[
            {
              id: "wealth-persona",
              label: "Net worth & persona",
              icon: "wallet-out",
              stroke: "#0A1628",
              bg: "linear-gradient(145deg, #F9F8F6 0%, #F5EDD6 45%, #EDE4D4 100%)",
              border: "rgba(184, 150, 46, 0.55)",
            },
            {
              id: "health-risk",
              label: "Health & risk",
              icon: "shield",
              stroke: "#0A1628",
              bg: "linear-gradient(145deg, #E8F5F0 0%, #F5EDD6 50%, #E0E7FF 100%)",
              border: "rgba(10, 22, 40, 0.2)",
            },
          ].map((tab) => {
            const active = dashboardMetricTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`metric-tab-${tab.id}`}
                aria-controls={`metric-panel-${tab.id}`}
                className={`dashboard-metric-tab ${active ? "dashboard-metric-tab--active" : ""}`}
                style={{
                  background: tab.bg,
                  borderColor: active ? tab.border : "rgba(232, 228, 220, 0.9)",
                  color: "#0A1628",
                }}
                onClick={() => setDashboardMetricTab(tab.id)}
              >
                <MarcusStrokeIcon name={tab.icon} size={18} stroke={active ? "#B8962E" : tab.stroke} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="dashboard-metric-panel-wrap" style={{ position: "relative" }}>
          <div className="dashboard-metric-panel-glow" aria-hidden />
          <div
            className="dashboard-metric-panel"
            role="tabpanel"
            id={`metric-panel-${dashboardMetricTab}`}
            aria-labelledby={`metric-tab-${dashboardMetricTab}`}
            style={{
              borderTop: "none",
              paddingTop: 22,
            }}
          >
            <div
              style={{
                margin: "-26px -24px 0 -24px",
                height: 4,
                borderRadius: "22px 22px 0 0",
                background:
                  dashboardMetricTab === "wealth-persona"
                    ? "linear-gradient(90deg, #2563EB 0%, #B8962E 50%, #7C3AED 100%)"
                    : "linear-gradient(90deg, #1A7F5A 0%, #B8962E 100%)",
              }}
              aria-hidden
            />

            {dashboardMetricTab === "wealth-persona" ? (
              <>
                <div className="metric-label" style={{ color: "#475569", marginTop: 20 }}>
                  Total net worth
                </div>
                <div
                  className="metric-value"
                  style={{
                    fontSize: 32,
                    letterSpacing: "-0.02em",
                    color: "#0A1628",
                  }}
                >
                  {fmt(wealthDisplayTotal)}
                </div>
                {allocationBreakdown.total > 0 && breakdownRows.length > 0 ? (
                  <div
                    className="metric-sub"
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      marginTop: 12,
                      lineHeight: 1.55,
                      maxWidth: 520,
                    }}
                  >
                    {breakdownRows.map((row) => (
                      <div
                        key={row.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 6,
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: `${row.color}18`,
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: row.color,
                              flexShrink: 0,
                            }}
                            aria-hidden
                          />
                          {row.label}
                        </span>
                        <span style={{ fontWeight: 600, color: "#0A1628", whiteSpace: "nowrap" }}>
                          {fmt(row.value)}
                          <span style={{ fontWeight: 400, color: "#94a3b8" }}>
                            {" "}
                            ({Math.round(row.percentage)}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : linkedSum > 0 ? (
                  <div
                    className="metric-sub"
                    style={{ fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 1.4 }}
                  >
                    Vérité: {fmt(baseVal)} · Linked accounts: {fmt(linkedSum)}
                  </div>
                ) : null}
                <div
                  className="metric-sub"
                  style={{
                    color: "#1A7F5A",
                    fontWeight: 600,
                    marginTop: 12,
                  }}
                >
                  ↑ +9.3% this year
                </div>
                <button
                  type="button"
                  onClick={() => setAddFundsOpen(true)}
                  style={{
                    marginTop: 14,
                    border: "2px solid #B8962E",
                    color: "#B8962E",
                    background: "linear-gradient(180deg, #FFFBF5 0%, #FFF8ED 100%)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: 10,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(184, 150, 46, 0.2)",
                  }}
                >
                  + Add Holdings
                </button>

                <div
                  style={{
                    margin: "28px 0 20px",
                    height: 1,
                    background: "linear-gradient(90deg, transparent, #E8E4DC 15%, #B8962E 50%, #E8E4DC 85%, transparent)",
                  }}
                  aria-hidden
                />

                <div className="metric-label" style={{ color: "#475569" }}>
                  Your persona
                </div>
                <div
                  className="metric-value"
                  style={{
                    fontSize: 26,
                    lineHeight: 1.25,
                    color: "#0A1628",
                  }}
                >
                  <span
                    style={{
                      background: "linear-gradient(90deg, #0A1628, #B8962E)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {riskProfile === "Conservative"
                      ? "Cautious Planner"
                      : riskProfile === "Balanced"
                        ? "Steady Builder"
                        : "Bold Grower"}
                  </span>
                </div>
                <div
                  className="metric-sub"
                  style={{ fontSize: 15, color: "#475569", marginTop: 10, lineHeight: 1.55 }}
                >
                  Based on your quiz answers — we use this with your wealth picture to tune guidance and scenarios.
                </div>
              </>
            ) : null}

            {dashboardMetricTab === "health-risk" ? (
              <div
                className="dashboard-health-risk-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 24,
                  marginTop: 20,
                }}
              >
                <div
                  style={{
                    padding: "18px 16px",
                    borderRadius: 16,
                    background: "linear-gradient(165deg, rgba(26, 127, 90, 0.08) 0%, rgba(249, 248, 246, 0.95) 100%)",
                    border: "1px solid rgba(26, 127, 90, 0.18)",
                  }}
                >
                  <div className="metric-label" style={{ color: "#475569" }}>
                    Health score
                  </div>
                  <div
                    className="metric-value"
                    style={{
                      fontSize: 32,
                      letterSpacing: "-0.02em",
                      color: health > 70 ? "#1A7F5A" : health > 45 ? "#B8962E" : "#9B1C1C",
                    }}
                  >
                    {health}
                    <span style={{ fontSize: 20, color: "#94a3b8", fontWeight: 600 }}>/100</span>
                  </div>
                  <div
                    className="metric-sub"
                    style={{ fontSize: 14, color: "#475569", marginTop: 8, lineHeight: 1.5 }}
                  >
                    {health > 70
                      ? "You're in great shape!"
                      : health > 45
                        ? "Small adjustments could sharpen your plan."
                        : "A few focused moves may help you feel more in control."}
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      height: 8,
                      borderRadius: 999,
                      background: "#E8E4DC",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${health}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #34D399, #1A7F5A)",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: "18px 16px",
                    borderRadius: 16,
                    background: "linear-gradient(165deg, rgba(184, 150, 46, 0.12) 0%, rgba(249, 248, 246, 0.95) 100%)",
                    border: "1px solid rgba(184, 150, 46, 0.35)",
                  }}
                >
                  <div className="metric-label" style={{ color: "#475569" }}>
                    Risk level
                  </div>
                  <div
                    className="metric-value"
                    style={{
                      fontSize: 28,
                      letterSpacing: "-0.02em",
                      color: risk === "High" ? "#9B1C1C" : risk === "Medium" ? "#B8962E" : "#1A7F5A",
                    }}
                  >
                    {risk}
                  </div>
                  <div
                    className="metric-sub"
                    style={{ fontSize: 14, color: "#475569", marginTop: 8 }}
                  >
                    Your profile:{" "}
                    <strong style={{ color: "#0A1628" }}>{riskProfile}</strong>
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {["Low", "Medium", "High"].map((lvl) => (
                      <span
                        key={lvl}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background:
                            (risk === "High" && lvl === "High") ||
                            (risk === "Medium" && lvl === "Medium") ||
                            (risk === "Low" && lvl === "Low")
                              ? "linear-gradient(135deg, #F5EDD6, #E8E4DC)"
                              : "#f1f5f9",
                          color:
                            (risk === "High" && lvl === "High") ||
                            (risk === "Medium" && lvl === "Medium") ||
                            (risk === "Low" && lvl === "Low")
                              ? "#0A1628"
                              : "#64748b",
                          border:
                            (risk === "High" && lvl === "High") ||
                            (risk === "Medium" && lvl === "Medium") ||
                            (risk === "Low" && lvl === "Low")
                              ? "1px solid #B8962E"
                              : "1px solid #e2e8f0",
                        }}
                      >
                        {lvl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: 24, alignItems: "stretch" }}>
        <div className="card">
          <div className="section-title">Asset Allocation</div>
          <p style={{ fontSize: 13, color: "#718096", lineHeight: 1.5, marginBottom: 16 }}>
            A breakdown of everything you own across all your connected accounts. Update anytime by
            linking a new account or adding holdings manually.
          </p>
          <AllocationDonut
            breakdown={allocationBreakdown}
            formatMoney={fmt}
            onLinkAccounts={() => navigate("/link-accounts")}
          />
        </div>

        <div className="card">
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
              {stockHoldings.length + mutualHoldings.length + bondHoldings.length ===
              0 ? (
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.55, margin: 0 }}>
                  No stock, mutual fund, or bond positions yet. Link a brokerage or add
                  holdings to see them here. Cash in checking/savings appears in the
                  wealth donut above.
                </p>
              ) : (
                [
                  { title: "Stocks", items: stockHoldings },
                  { title: "Mutual funds", items: mutualHoldings },
                  { title: "Bonds", items: bondHoldings },
                ].map((block, bi) =>
                  block.items.length === 0 ? null : (
                    <div key={block.title}>
                      <div
                        className="section-title"
                        style={{ marginBottom: 12, marginTop: bi > 0 ? 20 : 0 }}
                      >
                        {block.title}
                      </div>
                      {block.items.map((asset) => (
                        <div key={asset.ticker} className="asset-row">
                          <div
                            className="asset-icon"
                            style={{ background: typeColors[asset.type] }}
                          >
                            <MarcusStrokeIcon
                              name={typeIconNames[asset.type]}
                              size={18}
                              stroke="#0A1628"
                            />
                          </div>
                          <div className="asset-info">
                            <div className="asset-name">{asset.name}</div>
                            <div className="asset-sub">
                              {asset.sector} ·{" "}
                              <span
                                className={`badge badge-${asset.risk === "High" ? "red" : asset.risk === "Medium" ? "yellow" : "green"}`}
                              >
                                {asset.risk} risk
                              </span>
                            </div>
                          </div>
                          <div className="asset-value">
                            <div className="asset-val">{fmt(asset.value)}</div>
                            <div
                              className="asset-gain"
                              style={{
                                color: asset.gain >= 0 ? "#1A7F5A" : "#9B1C1C",
                              }}
                            >
                              {asset.gain >= 0 ? "+" : ""}
                              {asset.gain}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                )
              )}
            </div>
          ) : (
            <div role="tabpanel">
              <div className="section-title" style={{ marginBottom: 8 }}>
                Stocks, mutual funds &amp; bonds
              </div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "0 0 16px" }}>
                Same segregation as the donut: each line is your total in that category
                as a share of <strong>all wealth</strong> (including checking &amp;
                savings). Dollar amounts match the categories above.
              </p>
              {breakdownRows.map((s) => (
                <div key={s.key} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{s.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {s.percentage.toFixed(1)}% · {fmt(s.value)}
                    </span>
                  </div>
                  <MiniBar value={Math.min(100, s.percentage)} color={s.color} />
                </div>
              ))}
              <div style={{ marginTop: 20, padding: "14px", background: "#f8fafc", borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Total net worth</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(wealthDisplayTotal)}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.45 }}>
                  Same total as the donut: linked account balances and manual holdings only.
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div className="section-title" style={{ marginBottom: 14, fontSize: 12 }}>
              CONNECTED ACCOUNTS
            </div>
            {linkedAccounts && linkedAccounts.length > 0 ? (
              <div>
                {linkedAccounts.map((account) => {
                  const tileBg = linkedAccountTileColor(account);
                  const initial = linkedAccountTileInitial(account);
                  const acctLive = account.connectionActive !== false;
                  return (
                    <div
                      key={account.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        marginBottom: 10,
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: tileBg,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        aria-hidden
                      >
                        {initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0A1628" }}>
                          {account.accountLabel || account.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: acctLive ? "#1A7F5A" : "#64748b",
                            marginTop: 2,
                          }}
                        >
                          {acctLive ? "Connected · Read-only" : "Disconnected"}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0A1628" }}>
                          {fmt(Number(account.balance) || 0)}
                        </span>
                        <span
                          title={acctLive ? "Live connection" : "Disconnected"}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: acctLive ? "#22c55e" : "#94a3b8",
                            flexShrink: 0,
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={`Disconnect ${account.name || "account"}`}
                        onClick={() => setDisconnectTarget(account)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#94a3b8",
                          fontSize: 20,
                          lineHeight: 1,
                          padding: "4px 6px",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "20px 18px",
                  borderRadius: 12,
                  border: "1px dashed rgba(184, 150, 46, 0.4)",
                  background: "rgba(245, 237, 214, 0.3)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 14, color: "#64748b" }}>No accounts linked yet</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>
                  Connect your bank or brokerage to see your complete financial picture
                </div>
                <button
                  type="button"
                  className="btn-outline"
                  style={{
                    marginTop: 14,
                    borderColor: "#B8962E",
                    color: "#B8962E",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "8px 16px",
                    borderRadius: 8,
                  }}
                  onClick={() => {
                    setLinkModalInst({
                      name: "Your institution",
                      category: "bank",
                      providerId: "dashboard-add",
                    });
                    setLinkModalOpen(true);
                  }}
                >
                  + Link an account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {disconnectTarget ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 10020,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setDisconnectTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-dialog-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 24px 64px rgba(15, 23, 42, 0.22)",
              border: "1px solid rgba(226, 232, 240, 0.95)",
            }}
          >
            <p
              id="disconnect-dialog-title"
              style={{ fontSize: 15, color: "#0A1628", lineHeight: 1.5, margin: 0 }}
            >
              Disconnect {disconnectTarget.name}? Your data will be removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: "10px 18px", borderRadius: 10 }}
                onClick={() => setDisconnectTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "10px 18px", borderRadius: 10 }}
                onClick={() => {
                  removeLinkedAccount(disconnectTarget.id);
                  setDisconnectTarget(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Smart Insights</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {insights.map((ins, i) => (
            <div key={i} className="insight-card" style={{ background: ins.color }}>
              <MarcusStrokeIcon name={ins.icon} size={22} stroke={ins.stroke} />
              <span style={{ fontSize: 14, lineHeight: 1.5, color: "#0A1628" }}>{ins.text}</span>
            </div>
          ))}
        </div>
        <button
          className="btn-outline"
          style={{
            width: "100%",
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
          type="button"
          onClick={onPanic}
        >
          <MarcusStrokeIcon name="octagon-alert" size={20} stroke="#B45309" />
          Market volatility? Open calm checklist
        </button>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <div className="section-title" style={{ marginBottom: 0 }}>Goal Progress</div>
          {selectedGoal?.type && goalCfg && GoalIconComponent ? (
            <button
              type="button"
              className="goal-modal-change-btn"
              onClick={openGoalModal}
              style={{
                border: "1px solid #B8962E",
                color: "#B8962E",
                background: "transparent",
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              Change Goal
            </button>
          ) : null}
        </div>
        {!selectedGoal?.type ? (
          <div
            style={{
              padding: "20px 16px",
              textAlign: "center",
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px dashed rgba(184, 150, 46, 0.45)",
            }}
          >
            <p style={{ fontSize: 15, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
              No goal set yet — set one to track your progress
            </p>
            <Link
              to="/goal"
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 22px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
                background: "#B8962E",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(184, 150, 46, 0.35)",
              }}
            >
              Set a goal
            </Link>
          </div>
        ) : goalCfg && GoalIconComponent ? (
          <div style={{ padding: "4px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <span style={{ display: "flex", paddingTop: 2 }} aria-hidden>
                <GoalIconComponent size={22} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0A1628" }}>{goalCfg.label}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 1.45 }}>
                  {goalCfg.description}
                </div>
              </div>
              <span style={{ fontSize: 13, color: "#1A7F5A", fontWeight: 600, flexShrink: 0 }}>
                {goalProgressPct}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: 10, marginBottom: 10 }}>
              <div
                className="progress-fill"
                style={{ width: `${goalProgressPct}%`, background: "#B8962E" }}
              />
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
              {goalProgressUsd(goalCurrentVal)} saved of {goalProgressUsd(goalCfg.targetAmount)} target
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              {goalYearsLeft} {goalCfg.milestoneLabel}
            </div>
            <p
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: "#94a3b8",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {goalCfg.tagline}
            </p>
          </div>
        ) : null}
      </div>

      {goalModalOpen ? (
        <div
          className="goal-modal-backdrop"
          role="presentation"
          onClick={closeGoalModal}
        >
          <div
            className="goal-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="goal-modal-title"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#0A1628",
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              Update your goal
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.55 }}>
              Your progress tracking will update to reflect your new goal.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
              {ONBOARDING_QUESTIONS[0].options.map((opt, idx) => {
                const selected = modalGoalIdx === idx;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setModalGoalIdx(idx)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      textAlign: "left",
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      borderLeft: selected ? "3px solid #B8962E" : "1px solid #e2e8f0",
                      background: selected ? "#F5EDD6" : "#fff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>{opt.emoji}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#0A1628" }}>
                        {opt.label}
                      </span>
                      <span style={{ display: "block", fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 1.45 }}>
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="goal-modal-amount"
                style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}
              >
                Target amount ($)
              </label>
              <input
                id="goal-modal-amount"
                type="number"
                min={1}
                step={1}
                className="chat-input"
                value={modalTargetAmount}
                onChange={(e) => setModalTargetAmount(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="goal-modal-year"
                style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}
              >
                Target year
              </label>
              <select
                id="goal-modal-year"
                className="chat-input"
                value={modalTargetYear}
                onChange={(e) => setModalTargetYear(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                {goalModalYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={saveGoalModal}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                background: "#B8962E",
                color: "#fff",
                border: "none",
                marginBottom: 12,
              }}
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={closeGoalModal}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                padding: "8px",
                fontSize: 14,
                color: "#64748b",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── SCENARIO SIMULATOR ───────────────────────────────────────────────────────
function buildScenarioInsight(scenLike, portfolio, riskProfile, linkedAccounts, manualHoldings) {
  const drop = scenLike.params?.drop ?? 0;
  const withdraw = scenLike.params?.withdraw ?? 0;
  const bd = calculateAllocationBreakdown(linkedAccounts || [], manualHoldings || []);
  const total = bd.total > 0 ? bd.total : portfolio.totalValue || 1;
  const withdrawPct = (withdraw / total) * 100;
  const stress = drop + withdrawPct * 0.9;

  const act = deriveActualAllocation(linkedAccounts || [], manualHoldings || []);
  const S = act.stocks;
  const M = act.mutualFunds;
  const B = act.bonds;
  const C = act.cash;
  const U = act.brokerageUnallocated || 0;
  const equityBefore = S + M;
  const steadierBefore = Math.round(M + B + C + U);

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
    profilePhrase = `Since your profile is conservative and about ${equityBefore}% of your current mix is in stocks and mutual funds, `;
  } else if (rp === "Balanced") {
    profilePhrase = `Since your profile is balanced and you have a meaningful share in equities (${equityBefore}% stocks + mutual funds), `;
  } else {
    profilePhrase = `Since your profile leans toward growth with a larger equity share (${equityBefore}% stocks + mutual funds), `;
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

  let deltaEquity = 0;
  if (stress < 9) deltaEquity = -2;
  else if (stress < 15) deltaEquity = -6;
  else if (stress < 24) deltaEquity = -10;
  else if (stress < 32) deltaEquity = -13;
  else deltaEquity = -15;

  if (riskProfile === "Aggressive") deltaEquity = Math.round(deltaEquity * 0.72);
  if (riskProfile === "Conservative") deltaEquity = Math.round(deltaEquity * 1.08);
  if (scenLike.id === "withdraw") deltaEquity = Math.min(deltaEquity, -5);

  const targetEquityRaw =
    equityBefore > 0
      ? Math.round(Math.max(28, Math.min(88, equityBefore + deltaEquity)) / 5) * 5
      : 0;
  const proposedShift = Math.abs(equityBefore - targetEquityRaw);

  const noChangesNeeded =
    stress <= 12 &&
    equityBefore <= 56 &&
    B >= 15 &&
    proposedShift <= 5;

  let targetStocks = S;
  let targetMutual = M;
  let targetBonds = B;
  let targetCash = C;

  if (!noChangesNeeded && equityBefore > 0) {
    const targetEquity = targetEquityRaw;
    targetStocks = Math.round(((targetEquity * S) / equityBefore) / 5) * 5;
    targetMutual = Math.max(0, targetEquity - targetStocks);
    const remaining = 100 - targetStocks - targetMutual;
    const bc = B + C;
    if (bc > 0) {
      targetBonds = Math.round(((remaining * B) / bc) / 5) * 5;
      targetCash = Math.max(0, remaining - targetBonds);
    } else {
      targetBonds = Math.round((remaining * 0.65) / 5) * 5;
      targetCash = Math.max(0, remaining - targetBonds);
    }
    if (targetCash < 5) {
      targetCash = 5;
      targetBonds = Math.max(0, 100 - targetStocks - targetMutual - targetCash);
    }
    if (targetBonds < 8) {
      targetBonds = 8;
      targetCash = Math.max(0, 100 - targetStocks - targetMutual - targetBonds);
    }
    const sum = targetStocks + targetMutual + targetBonds + targetCash;
    if (sum !== 100) {
      targetCash = Math.max(0, targetCash + (100 - sum));
    }
  }

  const steadierAfter = Math.round(targetMutual + targetBonds + targetCash);
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

  const newValue = Math.max(0, total * (1 - drop / 100) - withdraw);
  const changeFromToday = total - newValue;
  const changePctApprox = total > 0 ? (changeFromToday / total) * 100 : 0;

  let stressAllocStocks = Math.round(S * (1 - (drop / 100) * 0.75));
  stressAllocStocks = Math.min(100 - C, Math.max(0, stressAllocStocks));
  let stressAllocMutual = Math.round(M * (1 - (drop / 100) * 0.55));
  stressAllocMutual = Math.max(0, stressAllocMutual);
  let stressAllocBonds = Math.min(
    B + Math.round(drop / 6),
    100 - stressAllocStocks - stressAllocMutual - C,
  );
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
      mutualFunds: stressAllocMutual,
      bonds: stressAllocBonds,
      cash: C,
    },
  };
}

function Scenarios({ portfolio, riskProfile, onReviewChanges }) {
  const { linkedAccounts, manualHoldings } = useAppContext();
  const [selected, setSelected] = useState(null);
  const [customDrop, setCustomDrop] = useState(20);
  const [customWithdraw, setCustomWithdraw] = useState(0);
  const [result, setResult] = useState(null);
  const [whyExpanded, setWhyExpanded] = useState(false);

  const runScenario = (scen) => {
    setSelected(scen.id);
    setWhyExpanded(false);
    const insight = buildScenarioInsight(scen, portfolio, riskProfile, linkedAccounts, manualHoldings);
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
    const insight = buildScenarioInsight(scen, portfolio, riskProfile, linkedAccounts, manualHoldings);
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
                High-level mix for this story: <strong>stocks</strong> vs{" "}
                <strong>mutual funds, bonds &amp; cash</strong> combined (same segregation idea as
                your dashboard; cash is grouped with steadier sleeves here for the chart).
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
                    Stocks {result.newAlloc.stocks}% · Mutual funds {result.newAlloc.mutualFunds}% · Bonds{" "}
                    {result.newAlloc.bonds}% · Cash {result.newAlloc.cash}%
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
function Rebalance({ portfolio, riskProfile }) {
  const { selectedGoal, linkedAccounts, manualHoldings } = useAppContext();
  const [applied, setApplied] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [copyBtnLabel, setCopyBtnLabel] = useState("Copy instructions");
  const copyResetRef = useRef(null);
  const [consideredTradeIds, setConsideredTradeIds] = useState(() => new Set());
  const recommended = {
    ...getRebalanceTargets(riskProfile, selectedGoal),
    brokerageUnallocated: 0,
  };
  const current = deriveActualAllocation(linkedAccounts, manualHoldings);

  const tradeIdeas = useMemo(
    () => getRebalanceTradeSuggestions(portfolio, current, recommended),
    [
      portfolio,
      current.stocks,
      current.mutualFunds,
      current.bonds,
      current.cash,
      current.brokerageUnallocated,
      recommended.stocks,
      recommended.mutualFunds,
      recommended.bonds,
      recommended.cash,
    ],
  );

  const brokerageLabel = useMemo(() => {
    const list = Array.isArray(linkedAccounts) ? linkedAccounts : [];
    const b = list.find(
      (a) => a.category === "brokerage" && a.connectionActive !== false,
    );
    if (!b) return "your brokerage";
    const raw = String(b.name || b.accountLabel || "").trim();
    const short = raw.split("·")[0]?.trim();
    return short || b.name || "your brokerage";
  }, [linkedAccounts]);

  const planStepsPlain = useMemo(() => {
    const sellRow = tradeIdeas.sells[0];
    const buyRow = tradeIdeas.buys[0];
    const sellAmt = sellRow ? Math.round(sellRow.approxAmount) : 2000;
    const buyAmt = buyRow ? Math.round(buyRow.approxAmount) : 2000;
    const sellNm = sellRow?.name ?? "your overweight fund or stock";
    const buyNm = buyRow?.name ?? "your target fund or stock";
    return [
      `Step 1: Log in to ${brokerageLabel}`,
      `Step 2: Sell $${sellAmt.toLocaleString("en-US")} of ${sellNm}`,
      `Step 3: Buy $${buyAmt.toLocaleString("en-US")} of ${buyNm}`,
      `Step 4: Your new allocation will match your target risk profile`,
    ];
  }, [tradeIdeas, brokerageLabel]);

  useEffect(() => {
    if (!planModalOpen) return;
    setCopyBtnLabel("Copy instructions");
  }, [planModalOpen]);

  useEffect(
    () => () => {
      if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
    },
    [],
  );

  const handleCopyPlan = async () => {
    const text = planStepsPlain.join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyBtnLabel("Copied ✓");
      if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
      copyResetRef.current = window.setTimeout(() => {
        setCopyBtnLabel("Copy instructions");
        copyResetRef.current = null;
      }, 2000);
    } catch {
      setCopyBtnLabel("Copy failed");
      if (copyResetRef.current) window.clearTimeout(copyResetRef.current);
      copyResetRef.current = window.setTimeout(() => {
        setCopyBtnLabel("Copy instructions");
        copyResetRef.current = null;
      }, 2000);
    }
  };

  const handleMarkPlanCompleted = () => {
    setPlanModalOpen(false);
    setApplied(true);
  };

  const toggleConsiderTrade = (id) => {
    setConsideredTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changes = [
    { key: "stocks", label: "Stocks" },
    { key: "mutualFunds", label: "Mutual funds" },
    { key: "bonds", label: "Bonds" },
    { key: "cash", label: "Cash" },
  ].map(({ key, label }) => ({
    key,
    label,
    current: current[key],
    recommended: recommended[key],
    diff: recommended[key] - current[key],
  }));

  if ((current.brokerageUnallocated || 0) > 0.5) {
    const bu = current.brokerageUnallocated || 0;
    changes.push({
      key: "brokerageUnallocated",
      label: "Unspecified brokerage",
      current: Math.round(bu * 10) / 10,
      recommended: 0,
      diff: -bu,
    });
  }

  const actions = changes
    .filter((c) => c.key !== "brokerageUnallocated" && Math.abs(c.diff) > 2)
    .map((c) => ({
      label: c.diff > 0
        ? `Increase ${c.label} by ${Math.abs(c.diff)}%`
        : `Reduce ${c.label} by ${Math.abs(c.diff)}%`,
      icon: c.diff > 0 ? "arrow-up" : "arrow-down",
      color: c.diff > 0 ? "#1A7F5A" : "#B45309",
      why:
        c.key === "stocks" && c.diff < 0
          ? "You're overweight in stocks for your risk level — reducing adds safety."
          : c.key === "mutualFunds" && c.diff < 0
            ? "You're overweight in mutual funds — trimming can reduce overlap and fees."
            : c.key === "mutualFunds" && c.diff > 0
              ? "More mutual funds can broaden diversification when you're light on funds."
              : c.key === "bonds" && c.diff > 0
                ? "More bonds cushion against market drops while keeping returns steady."
                : "Keeping this level gives you a balance of safety and growth.",
    }));

  const hasTradeIdeas =
    tradeIdeas.sells.length > 0 ||
    tradeIdeas.buys.length > 0 ||
    tradeIdeas.deployCash.length > 0;

  return (
    <div>
      <div className="fp-header"><h2>Rebalancing Engine</h2><p>Simple steps to align your portfolio with your goals</p></div>
      <div className="grid2" style={{ marginBottom: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title">Current vs Recommended</div>
            {changes.map((c) => (
              <div key={c.key} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{c.label}</span>
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

          {hasTradeIdeas ? (
            <div className="card" style={{ borderColor: "rgba(184, 150, 46, 0.35)", background: "linear-gradient(180deg, rgba(255,251,235,0.65) 0%, #fff 38%)" }}>
              <div className="section-title" style={{ marginBottom: 6 }}>
                Holdings ideas from this plan
              </div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, marginBottom: 14 }}>
                Vérité translates each allocation gap into illustrative trims or adds on your actual holdings.
                Tick anything you&apos;re seriously considering—you stay in control and confirm trades elsewhere.
              </p>

              {tradeIdeas.sells.map((row, i) => {
                const id = `sell-${row.ticker}-${i}`;
                return (
                  <label
                    key={id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "14px 12px",
                      marginBottom: 10,
                      borderRadius: 12,
                      border: consideredTradeIds.has(id) ? "1px solid rgba(184, 150, 46, 0.55)" : "1px solid rgba(226, 232, 240, 0.95)",
                      background: consideredTradeIds.has(id) ? "rgba(254, 243, 226, 0.55)" : "#fafafa",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={consideredTradeIds.has(id)}
                      onChange={() => toggleConsiderTrade(id)}
                      style={{ marginTop: 3, accentColor: "#B8962E", flexShrink: 0 }}
                      aria-label={`Considering trim ${row.ticker}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <MarcusStrokeIcon name="arrow-down-circle" size={20} stroke="#B45309" />
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#B45309" }}>
                          CONSIDER TRIMMING
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0A1628" }}>{row.ticker}</span>
                        <span style={{ fontSize: 13, color: "#475569" }}>· ~{fmt(row.approxAmount)}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{row.name}</div>
                      <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>{row.reason}</div>
                    </div>
                  </label>
                );
              })}

              {tradeIdeas.buys.map((row, i) => {
                const id = `buy-${row.ticker}-${i}`;
                return (
                  <label
                    key={id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "14px 12px",
                      marginBottom: 10,
                      borderRadius: 12,
                      border: consideredTradeIds.has(id) ? "1px solid rgba(26, 127, 90, 0.35)" : "1px solid rgba(226, 232, 240, 0.95)",
                      background: consideredTradeIds.has(id) ? "rgba(232, 245, 240, 0.6)" : "#fafafa",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={consideredTradeIds.has(id)}
                      onChange={() => toggleConsiderTrade(id)}
                      style={{ marginTop: 3, accentColor: "#1A7F5A", flexShrink: 0 }}
                      aria-label={`Considering add ${row.ticker}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <MarcusStrokeIcon name="arrow-up" size={20} stroke="#1A7F5A" />
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#1A7F5A" }}>
                          CONSIDER ADDING TO
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0A1628" }}>{row.ticker}</span>
                        <span style={{ fontSize: 13, color: "#475569" }}>· ~{fmt(row.approxAmount)}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{row.name}</div>
                      <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>{row.reason}</div>
                    </div>
                  </label>
                );
              })}

              {tradeIdeas.deployCash.map((row, i) => {
                const id = `deploy-cash-${i}`;
                return (
                  <label
                    key={id}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "14px 12px",
                      marginBottom: 10,
                      borderRadius: 12,
                      border: consideredTradeIds.has(id) ? "1px solid rgba(11, 99, 182, 0.3)" : "1px solid rgba(226, 232, 240, 0.95)",
                      background: consideredTradeIds.has(id) ? "rgba(239, 246, 255, 0.75)" : "#fafafa",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={consideredTradeIds.has(id)}
                      onChange={() => toggleConsiderTrade(id)}
                      style={{ marginTop: 3, flexShrink: 0 }}
                      aria-label="Considering deploying extra cash"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <MarcusStrokeIcon name="wallet-out" size={20} stroke="#2563eb" />
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#1d4ed8" }}>
                          DEPLOY EXTRA CASH
                        </span>
                        <span style={{ fontSize: 13, color: "#475569" }}>~{fmt(row.approxAmount)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>{row.reason}</div>
                    </div>
                  </label>
                );
              })}

              <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginTop: 12, marginBottom: 0 }}>
                {tradeIdeas.disclaimer}
              </p>
            </div>
          ) : null}
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
            <div style={{ fontSize: 14, color: "#0f172a", marginBottom: 16 }}>
              Execution: <strong>In your brokerage</strong> — Vérité does not place trades.
            </div>
            {!applied ? (
              <button
                type="button"
                className="btn-primary"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
                onClick={() => setPlanModalOpen(true)}
              >
                <MarcusStrokeIcon name="clipboard" size={20} stroke="#ffffff" />
                Get Step-by-Step Instructions
              </button>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: "#e8f5f0",
                  borderRadius: 10,
                  padding: "12px 16px",
                  textAlign: "center",
                  fontWeight: 600,
                  color: "#1A7F5A",
                }}
              >
                <MarcusStrokeIcon name="check-circle" size={22} stroke="#1A7F5A" />
                Portfolio updated — great work!
              </div>
            )}
          </div>
        </div>
      </div>

      {planModalOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5500,
            background: "rgba(10, 22, 40, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setPlanModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rebalance-plan-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#fff",
              borderRadius: 16,
              padding: "28px 24px 24px",
              boxShadow: "0 24px 64px rgba(15, 23, 42, 0.25)",
              border: "1px solid #E8E4DC",
            }}
          >
            <h2
              id="rebalance-plan-title"
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#0A1628",
                margin: "0 0 8px",
              }}
            >
              Your personalized rebalancing plan
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#64748b",
                lineHeight: 1.55,
                margin: "0 0 20px",
              }}
            >
              We&apos;ve calculated exactly what to do. Execute these steps in your
              brokerage to rebalance.
            </p>
            <ol
              style={{
                margin: "0 0 22px",
                paddingLeft: 22,
                color: "#0f172a",
                fontSize: 14,
                lineHeight: 1.65,
              }}
            >
              {planStepsPlain.map((line, idx) => (
                <li key={`${idx}-${line.slice(0, 24)}`} style={{ marginBottom: 10 }}>
                  {line.replace(/^Step \d+: /, "")}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="btn-outline"
                style={{
                  width: "100%",
                  borderColor: "#B8962E",
                  color: "#B8962E",
                  fontWeight: 600,
                }}
                onClick={() => void handleCopyPlan()}
              >
                {copyBtnLabel}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ width: "100%" }}
                onClick={handleMarkPlanCompleted}
              >
                Mark as completed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function Assistant({ portfolio, riskProfile }) {
  const { selectedGoal, linkedAccounts, manualHoldings } = useAppContext();
  const [messages, setMessages] = useState([
    { role: "ai", text: `Hi, I'm your Vérité assistant. I can answer questions about your portfolio in plain English. Try asking "Is my portfolio safe?" or "Should I sell now?"` },
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

    const goalContextLine =
      selectedGoal?.label &&
      Number.isFinite(Number(selectedGoal.targetAmount)) &&
      Number.isFinite(Number(selectedGoal.targetYear))
        ? `The user's primary financial goal is: ${selectedGoal.label}. Their target amount is $${Number(selectedGoal.targetAmount).toLocaleString("en-US")} by ${selectedGoal.targetYear}.`
        : selectedGoal?.label
          ? `The user's primary financial goal is: ${selectedGoal.label}.`
          : "";

    const pa = deriveActualAllocation(linkedAccounts, manualHoldings);
    const wealthSnap = calculateAllocationBreakdown(linkedAccounts, manualHoldings).total;
    const totalForContext = wealthSnap > 0 ? wealthSnap : portfolio.totalValue;
    const context = `Vérité user portfolio snapshot:
- Total Net Worth: ${fmt(totalForContext)}
- Mix from linked accounts & holdings: Stocks ${pa.stocks.toFixed(1)}%, Mutual funds ${pa.mutualFunds.toFixed(1)}%, Bonds ${pa.bonds.toFixed(1)}%, Cash (bank) ${pa.cash.toFixed(1)}%${pa.brokerageUnallocated > 0.5 ? `, Unspecified brokerage ${pa.brokerageUnallocated.toFixed(1)}%` : ""}
- Risk profile: ${riskProfile}
- Health score: ${calcHealthScore(pa, riskProfile)}/100${goalContextLine ? `\n- ${goalContextLine}` : ""}`;

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
      console.error("[Vérité assistant]", err);
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

  const suggestions = ["Is my portfolio safe?", "Should I sell now?", "How do I reduce risk?", "Am I on track?"];

  return (
    <div className="assistant-page">
      <header className="assistant-page-header">
        <span className="assistant-page-eyebrow">Vérité</span>
        <h2 className="assistant-page-title">AI Assistant</h2>
        <p className="assistant-page-subtitle">
          Know what to do next — ask in plain language, get clear answers
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

const VERITE_ALERTS_SUBSCRIBE_KEY = "verite_alerts_subscribed_email";
const VERITE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── ALERTS ───────────────────────────────────────────────────────────────────
function Alerts() {
  const { currentUser } = useAuth();
  const { selectedGoal } = useAppContext();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  const alerts = useMemo(
    () => [
      {
        icon: "alert-triangle",
        stroke: "#B45309",
        title: "Portfolio drift detected",
        desc: "Your stocks allocation rose to 72% — 7% above your target. Consider trimming.",
        color: "#fef3e2",
        action: "Rebalance now",
      },
      {
        icon: "chart-down",
        stroke: "#9B1C1C",
        title: "Tech sector down 5%",
        desc: "Your Tech holding dropped. This is within normal range — no action needed yet.",
        color: "#fee2e2",
        action: "View details",
      },
      {
        icon: "check-circle",
        stroke: "#1A7F5A",
        title: alertOnTrackTitleForGoal(selectedGoal),
        desc: alertOnTrackDescForGoal(selectedGoal),
        color: "#e8f5f0",
        action: null,
      },
      {
        icon: "lightbulb",
        stroke: "#B8962E",
        title: "Rebalance opportunity",
        desc: "Bond yields have risen — a good time to increase your bond allocation for stability.",
        color: "#F5EDD6",
        action: "See recommendations",
      },
    ],
    [selectedGoal],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VERITE_ALERTS_SUBSCRIBE_KEY);
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
    if (!VERITE_EMAIL_RE.test(em)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      localStorage.setItem(VERITE_ALERTS_SUBSCRIBE_KEY, em);
    } catch {
      /* ignore */
    }
    const subject = encodeURIComponent("You're subscribed to Vérité updates");
    const body = encodeURIComponent(
      "Thanks for subscribing to Vérité market and portfolio updates.\n\nYou're on the list — we'll send important alerts and insights for your plan.\n\n— Vérité",
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
      localStorage.removeItem(VERITE_ALERTS_SUBSCRIBE_KEY);
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

      <div className="section-title" style={{ marginTop: 4, marginBottom: 12 }}>Subscribe to latest updates</div>
      <div className="card" style={{ maxWidth: 560, marginBottom: 28 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Get Vérité updates by email</div>
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
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

function VeriteTopBar() {
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const initials =
    currentUser?.avatar ||
    (currentUser?.name?.trim()
      ? currentUser.name
          .trim()
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "You");

  return (
    <div className="fp-main-topbar" ref={wrapRef}>
      <div style={{ flex: 1 }} />
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="fp-account-trigger"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#0A1628",
              color: "#B8962E",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {initials}
          </span>
          <MarcusStrokeIcon name="arrow-down" size={18} stroke="#64748b" />
        </button>
        {menuOpen ? (
          <div className="fp-account-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="fp-account-menu-item"
              onClick={() => {
                setMenuOpen(false);
                navigate("/settings");
              }}
            >
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className="fp-account-menu-item fp-account-menu-item--danger"
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function VeriteApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const {
    riskProfile: persistedRiskProfile,
    selectedGoal,
    linkedAccounts,
    manualHoldings,
  } = useAppContext();
  const [page, setPage] = useState("dashboard");
  const [riskProfile, setRiskProfile] = useState(
    () => persistedRiskProfile ?? "Balanced",
  );

  useEffect(() => {
    if (persistedRiskProfile) setRiskProfile(persistedRiskProfile);
  }, [persistedRiskProfile]);
  const portfolio = useMemo(
    () => buildInitialPortfolioForUser(currentUser),
    [currentUser?.email],
  );
  const [showPanic, setShowPanic] = useState(false);

  const displayPortfolio = useMemo(
    () =>
      mergeManualHoldings(
        mergePortfolioWithLinked(portfolio, linkedAccounts),
        manualHoldings,
      ),
    [portfolio, linkedAccounts, manualHoldings],
  );

  const isSettingsRoute = location.pathname === "/settings";

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "scenarios", label: "What-If Scenarios", icon: "orbit" },
    { id: "rebalance", label: "Rebalancing", icon: "scale" },
    { id: "assistant", label: "AI Assistant", icon: "message-circle" },
    { id: "alerts", label: "Alerts", icon: "bell" },
    { id: "settings", label: "Settings", icon: "gear", href: "/settings" },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            portfolio={displayPortfolio}
            riskProfile={riskProfile}
            onPanic={() => setShowPanic(true)}
          />
        );
      case "scenarios": return (
          <Scenarios
            portfolio={displayPortfolio}
            riskProfile={riskProfile}
            onReviewChanges={() => setPage("rebalance")}
          />
        );
      case "rebalance": return <Rebalance portfolio={displayPortfolio} riskProfile={riskProfile} />;
      case "assistant": return <Assistant portfolio={displayPortfolio} riskProfile={riskProfile} />;
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
            <h1>Vérité</h1>
            <span>Know what to do next.</span>
          </div>
          <nav className="fp-nav">
            {nav.map((n) => {
              const isActive = n.href
                ? location.pathname === n.href
                : location.pathname === "/dashboard" && page === n.id;
              return (
                <div
                  key={n.id}
                  className={`fp-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (n.href) {
                      navigate(n.href);
                      return;
                    }
                    navigate("/dashboard");
                    setPage(n.id);
                  }}
                >
                  <span className="fp-nav-icon">
                    <MarcusStrokeIcon name={n.icon} size={20} stroke="currentColor" />
                  </span>
                  {n.label}
                </div>
              );
            })}
          </nav>
          <div className="fp-sidebar-footer">
            <div className="fp-profile-card">
              <div className="fp-profile-risk-row">
                <div className="fp-profile-label">Risk profile</div>
                <div className="fp-profile-risk">{riskProfile}</div>
              </div>
              {selectedGoal?.label ? (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#B8962E",
                        flexShrink: 0,
                      }}
                      aria-hidden
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(249, 248, 246, 0.48)",
                      }}
                    >
                      YOUR GOAL
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#F9F8F6",
                      lineHeight: 1.45,
                      paddingLeft: 14,
                    }}
                  >
                    {selectedGoal.label}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className="fp-sidebar-link"
                onClick={() => {
                  try {
                    localStorage.removeItem(VERITE_ONBOARDING_KEY);
                    localStorage.removeItem(INAPP_QUIZ_INDICES_KEY);
                    localStorage.removeItem(INAPP_READY_FOR_LINK_KEY);
                    localStorage.removeItem(PENDING_LINK_ACCOUNTS_KEY);
                  } catch {
                    /* ignore */
                  }
                  navigate("/", { replace: true });
                }}
              >
                Update profile
              </button>
            </div>
          </div>
        </div>
        <main className="fp-main">
          <VeriteTopBar />
          {isSettingsRoute ? <SettingsPage /> : renderPage()}
        </main>
        {showPanic && <PanicMode onClose={() => { setShowPanic(false); setPage("scenarios"); }} />}
      </div>
    </>
  );
}
