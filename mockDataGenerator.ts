/**
 * Generates 100 unique mock portfolios shaped like alexChenPortfolio (src/data/portfolio.js).
 */

export type RiskProfile =
  | "Very Conservative"
  | "Conservative"
  | "Moderate"
  | "Aggressive";

export interface StockHolding {
  symbol: string;
  name: string;
  shares: number;
  averageBuyPrice: number;
  currentPrice: number;
  currency: "USD";
}

export interface MutualFundHolding {
  name: string;
  investedAmount: number;
  currentValue: number;
  category: string;
  currency: "USD";
}

export interface PortfolioGoal {
  title: string;
  targetAmount: number;
  savedSoFar: number;
  currency: "USD";
}

export interface PortfolioUser {
  name: string;
  riskProfile: RiskProfile;
}

/** Mirrors alexChenPortfolio structure */
export interface MockPortfolio {
  user: PortfolioUser;
  stocks: StockHolding[];
  mutualFunds: MutualFundHolding[];
  goal: PortfolioGoal;
}

/** 30+ real-world equity symbols */
const STOCK_UNIVERSE: readonly { symbol: string; name: string; priceTier: number }[] =
  [
    { symbol: "NVDA", name: "NVIDIA Corporation", priceTier: 120 },
    { symbol: "TSLA", name: "Tesla Inc", priceTier: 240 },
    { symbol: "JNJ", name: "Johnson & Johnson", priceTier: 155 },
    { symbol: "PG", name: "Procter & Gamble Co", priceTier: 165 },
    { symbol: "V", name: "Visa Inc", priceTier: 280 },
    { symbol: "WMT", name: "Walmart Inc", priceTier: 175 },
    { symbol: "AAPL", name: "Apple Inc", priceTier: 190 },
    { symbol: "MSFT", name: "Microsoft Corporation", priceTier: 380 },
    { symbol: "GOOGL", name: "Alphabet Inc Class A", priceTier: 165 },
    { symbol: "META", name: "Meta Platforms Inc", priceTier: 520 },
    { symbol: "AMZN", name: "Amazon.com Inc", priceTier: 185 },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc Class B", priceTier: 430 },
    { symbol: "XOM", name: "Exxon Mobil Corporation", priceTier: 115 },
    { symbol: "JPM", name: "JPMorgan Chase & Co", priceTier: 205 },
    { symbol: "BAC", name: "Bank of America Corp", priceTier: 38 },
    { symbol: "UNH", name: "UnitedHealth Group Inc", priceTier: 520 },
    { symbol: "HD", name: "Home Depot Inc", priceTier: 385 },
    { symbol: "COST", name: "Costco Wholesale Corporation", priceTier: 870 },
    { symbol: "DIS", name: "Walt Disney Co", priceTier: 105 },
    { symbol: "NFLX", name: "Netflix Inc", priceTier: 690 },
    { symbol: "CRM", name: "Salesforce Inc", priceTier: 285 },
    { symbol: "AMD", name: "Advanced Micro Devices", priceTier: 155 },
    { symbol: "INTC", name: "Intel Corporation", priceTier: 35 },
    { symbol: "CSCO", name: "Cisco Systems Inc", priceTier: 52 },
    { symbol: "PEP", name: "PepsiCo Inc", priceTier: 168 },
    { symbol: "KO", name: "Coca-Cola Co", priceTier: 68 },
    { symbol: "MRK", name: "Merck & Co Inc", priceTier: 125 },
    { symbol: "ABBV", name: "AbbVie Inc", priceTier: 195 },
    { symbol: "TMO", name: "Thermo Fisher Scientific Inc", priceTier: 575 },
    { symbol: "CVX", name: "Chevron Corporation", priceTier: 155 },
    { symbol: "LLY", name: "Eli Lilly and Company", priceTier: 820 },
    { symbol: "MA", name: "Mastercard Inc", priceTier: 480 },
    { symbol: "ORCL", name: "Oracle Corporation", priceTier: 145 },
    { symbol: "IBM", name: "International Business Machines", priceTier: 185 },
    { symbol: "GE", name: "General Electric Co", priceTier: 175 },
    { symbol: "CAT", name: "Caterpillar Inc", priceTier: 385 },
    { symbol: "NKE", name: "Nike Inc", priceTier: 95 },
    { symbol: "SBUX", name: "Starbucks Corporation", priceTier: 98 },
    { symbol: "MCD", name: "McDonald's Corporation", priceTier: 305 },
    { symbol: "LOW", name: "Lowe's Companies Inc", priceTier: 245 },
    { symbol: "UPS", name: "United Parcel Service Inc", priceTier: 145 },
  ] as const;

/** 20+ mutual fund names with categories */
const MUTUAL_FUND_UNIVERSE: readonly {
  name: string;
  category: string;
  sleeve: "bond" | "equity" | "balanced" | "money";
}[] = [
  { name: "Vanguard Total Bond Market Index Fund (VBTLX)", category: "Investment Grade Bonds", sleeve: "bond" },
  { name: "Fidelity US Bond Index Fund (FXNAX)", category: "Investment Grade Bonds", sleeve: "bond" },
  { name: "Vanguard Intermediate-Term Treasury Fund (VFITX)", category: "Government Bonds", sleeve: "bond" },
  { name: "T. Rowe Price Corporate Income Fund (PRPIX)", category: "Corporate Bonds", sleeve: "bond" },
  { name: "PIMCO Income Fund (PIMIX)", category: "Multi-Sector Bonds", sleeve: "bond" },
  { name: "Metropolitan West Total Return Bond Fund (MWTRX)", category: "Core Plus Bonds", sleeve: "bond" },
  { name: "iShares Core Aggregate Bond ETF-class Mutual (AGG MF)", category: "Total Bond Market", sleeve: "bond" },
  { name: "Vanguard GNMA Fund (VFIIX)", category: "Mortgage-Backed Securities", sleeve: "bond" },
  { name: "American Funds Bond Fund of America (ABNDX)", category: "Core Bonds", sleeve: "bond" },
  { name: "BlackRock Strategic Income Opportunities (BSIIX)", category: "Flexible Bonds", sleeve: "bond" },
  { name: "Vanguard Short-Term Investment-Grade Fund (VFSTX)", category: "Short-Term Bonds", sleeve: "bond" },
  { name: "DFA Intermediate Govt Fixed Income (DFIGX)", category: "Government Bonds", sleeve: "bond" },
  { name: "Vanguard Total Stock Market Index Fund (VTSAX)", category: "US Total Market Equity", sleeve: "equity" },
  { name: "Fidelity 500 Index Fund (FXAIX)", category: "US Large Cap Equity", sleeve: "equity" },
  { name: "Vanguard S&P 500 Index Fund admiral (VFIAX)", category: "US Large Cap Equity", sleeve: "equity" },
  { name: "Schwab S&P 500 Index Fund (SWPPX)", category: "US Large Cap Equity", sleeve: "equity" },
  { name: "T. Rowe Price Blue Chip Growth Fund (TRBCX)", category: "US Growth Equity", sleeve: "equity" },
  { name: "Vanguard FTSE All-World ex-US Index Fund (VFWAX)", category: "International Equity", sleeve: "equity" },
  { name: "DFA US Small Cap Portfolio (DFSTX)", category: "US Small Cap Equity", sleeve: "equity" },
  { name: "American Funds Growth Fund of America (AGTHX)", category: "US Large Cap Blend", sleeve: "equity" },
  { name: "Fidelity Contrafund (FCNTX)", category: "US Large Cap Equity", sleeve: "equity" },
  { name: "Vanguard STAR Fund (VGSTX)", category: "Balanced Allocation", sleeve: "balanced" },
  { name: "American Funds Capital Income Builder (CAIBX)", category: "Global Balanced", sleeve: "balanced" },
  { name: "Vanguard Wellington Fund (VWELX)", category: "Balanced (60/40 style)", sleeve: "balanced" },
  { name: "Fidelity Balanced Fund (FBALX)", category: "Balanced Allocation", sleeve: "balanced" },
  { name: "Vanguard Federal Money Market Fund (VMFXX)", category: "Money Market", sleeve: "money" },
  { name: "Fidelity Government Cash Reserves (FDRXX)", category: "Government Money Market", sleeve: "money" },
  { name: "Schwab Value Advantage Money Fund (SWVXX)", category: "Prime Money Market", sleeve: "money" },
  { name: "BlackRock Liquidity Treasury Trust Fund (TSTXX)", category: "Treasury Money Market", sleeve: "money" },
  { name: "JPMorgan US Government MM Capital (JGXXX)", category: "Government Money Market", sleeve: "money" },
  { name: "Vanguard Dividend Growth Fund (VDIGX)", category: "US Dividend Equity", sleeve: "equity" },
  { name: "Oakmark Fund Investor Class (OAKMX)", category: "US Value Equity", sleeve: "equity" },
  { name: "Vanguard Emerging Markets Stock Index (VEMAX)", category: "Emerging Markets Equity", sleeve: "equity" },
  { name: "T. Rowe Price Retirement 2035 Fund (TRRJX)", category: "Target Date Blend", sleeve: "balanced" },
  { name: "Vanguard Target Retirement 2045 Fund (VTTVX)", category: "Target Date Blend", sleeve: "balanced" },
] as const;

const GOAL_TITLES = [
  "Home Renovation",
  "World Travel",
  "Emergency Buffer",
  "Kids' Education",
  "Retirement",
  "Retirement by 2050",
  "Dream Cottage Down Payment",
  "College Fund — First Child",
  "Financial Independence",
  "Career Sabbatical Fund",
  "Wedding Celebration",
  "Parent Support Nest Egg",
  "Electric Vehicle Upgrade",
  "Small Business Startup Buffer",
  "Annual Giving & Charity Fund",
  "Lake House Goal",
  "Graduate School Tuition",
  "Healthcare Safety Net",
  "Mortgage Paydown Accelerator",
  "Legacy Giving Trust Seed",
  "Early Retirement Bridge",
  "Adoption Planning Fund",
  "Career Pivot Cushion",
  "Major Medical Reserve",
  "Home Purchase — Upgrade",
  "Quarterly Adventure Travel",
  "Rental Property Down Payment",
  "Community Workshop Launch",
  "Elder Care Reserve",
  "Second Career Training Fund",
] as const;

const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Riley", "Casey", "Morgan", "Quinn", "Avery",
  "Jamie", "Skyler", "Reese", "Cameron", "Drew", "Sam", "Robin", "Jess",
  "Priya", "Diego", "Kenji", "Amara", "Zara", "Luca", "Noah", "Emma",
  "Wei", "Olivia", "Marcus", "Sofia", "James", "Ananya",
];

const LAST_NAMES = [
  "Chen", "Patel", "Garcia", "Kim", "Nguyen", "Okafor", "Silva", "Murphy",
  "Tanaka", "Rossi", "Singh", "Thompson", "Martinez", "Olsen", "Park",
  "Ibrahim", "Lopez", "Schmidt", "Nakamura", "Brown", "Lee", "Rivera",
];

function clampRatioAroundOne(): number {
  return 0.8 + Math.random() * 0.4;
}

/** Ensures averageBuyPrice and currentPrice stay within ±20% of each other */
function pairedPrices(baseAnchor: number): { averageBuyPrice: number; currentPrice: number } {
  const averageBuyPrice = Math.round(baseAnchor * (0.85 + Math.random() * 0.35) * 100) / 100;
  let currentPrice = Math.round(averageBuyPrice * clampRatioAroundOne() * 100) / 100;
  const low = averageBuyPrice * 0.8;
  const high = averageBuyPrice * 1.2;
  currentPrice = Math.min(high, Math.max(low, currentPrice));
  return { averageBuyPrice, currentPrice };
}

function shufflePick<T>(arr: readonly T[], count: number, rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function fundsForPersona(profile: RiskProfile): (typeof MUTUAL_FUND_UNIVERSE)[number][] {
  const bond = MUTUAL_FUND_UNIVERSE.filter((f) => f.sleeve === "bond");
  const equity = MUTUAL_FUND_UNIVERSE.filter((f) => f.sleeve === "equity");
  const balanced = MUTUAL_FUND_UNIVERSE.filter((f) => f.sleeve === "balanced");
  const money = MUTUAL_FUND_UNIVERSE.filter((f) => f.sleeve === "money");

  switch (profile) {
    case "Very Conservative":
      return [...bond, ...money, ...balanced.slice(0, 4)];
    case "Conservative":
      return [...bond, ...balanced, ...money.slice(0, 4)];
    case "Moderate":
      return [...balanced, ...equity.slice(0, 14), ...bond.slice(0, 12)];
    case "Aggressive":
      return [...equity, ...balanced.slice(0, 6), ...bond.slice(0, 8)];
    default:
      return [...MUTUAL_FUND_UNIVERSE];
  }
}

function generateMutualFunds(profile: RiskProfile, rng: () => number): MutualFundHolding[] {
  const pool = fundsForPersona(profile);
  const count =
    profile === "Very Conservative"
      ? 4 + Math.floor(rng() * 3)
      : profile === "Conservative"
        ? 3 + Math.floor(rng() * 3)
        : profile === "Moderate"
          ? 2 + Math.floor(rng() * 3)
          : 1 + Math.floor(rng() * 3);

  const picks = shufflePick(pool, count, rng);
  return picks.map((meta) => {
    const investedAmount = Math.round(1500 + rng() * 22000);
    const drift = clampRatioAroundOne();
    let currentValue = Math.round(investedAmount * drift);
    const low = Math.round(investedAmount * 0.8);
    const high = Math.round(investedAmount * 1.2);
    currentValue = Math.min(high, Math.max(low, currentValue));
    return {
      name: meta.name,
      investedAmount,
      currentValue,
      category: meta.category,
      currency: "USD",
    };
  });
}

function generateStocks(profile: RiskProfile, rng: () => number): StockHolding[] {
  const count =
    profile === "Aggressive"
      ? 5 + Math.floor(rng() * 5)
      : profile === "Moderate"
        ? 3 + Math.floor(rng() * 4)
        : profile === "Conservative"
          ? 2 + Math.floor(rng() * 3)
          : 1 + Math.floor(rng() * 2);

  const picks = shufflePick(STOCK_UNIVERSE, count, rng);
  return picks.map((row) => {
    const shares = 1 + Math.floor(rng() * (profile === "Aggressive" ? 45 : 28));
    const { averageBuyPrice, currentPrice } = pairedPrices(row.priceTier * (0.65 + rng() * 0.9));
    return {
      symbol: row.symbol,
      name: row.name,
      shares,
      averageBuyPrice,
      currentPrice,
      currency: "USD",
    };
  });
}

/** Saved = Σ(currentPrice × shares) + Σ(mutual fund currentValue); rounded to cents */
function computeSavedSoFar(stocks: StockHolding[], mutualFunds: MutualFundHolding[]): number {
  const equityCents = stocks.reduce(
    (sum, s) => sum + Math.round(s.currentPrice * s.shares * 100),
    0,
  );
  const fundCents = mutualFunds.reduce((sum, m) => sum + Math.round(m.currentValue * 100), 0);
  return Math.round(equityCents + fundCents) / 100;
}

function portfolioFingerprint(p: MockPortfolio): string {
  const stockPart = p.stocks
    .map((s) => `${s.symbol}:${s.shares}:${s.averageBuyPrice}:${s.currentPrice}`)
    .join("|");
  const fundPart = p.mutualFunds
    .map((m) => `${m.name}:${m.investedAmount}:${m.currentValue}`)
    .join("|");
  return `${p.user.name}|${p.user.riskProfile}|${stockPart}|${fundPart}|${p.goal.savedSoFar}|${p.goal.targetAmount}|${p.goal.title}`;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateOnePortfolio(seed: number): MockPortfolio {
  const rng = mulberry32(seed);
  const profiles: RiskProfile[] = [
    "Very Conservative",
    "Conservative",
    "Moderate",
    "Aggressive",
  ];
  const riskProfile = profiles[Math.floor(rng() * profiles.length)];

  const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];

  const stocks = generateStocks(riskProfile, rng);
  const mutualFunds = generateMutualFunds(riskProfile, rng);
  const savedSoFar = computeSavedSoFar(stocks, mutualFunds);
  const targetMultiplier = 1.2 + rng() * 1.75 + seed / 999_983;
  let targetAmount = Math.round(savedSoFar * targetMultiplier * 100) / 100;

  const goalTitle = GOAL_TITLES[Math.floor(rng() * GOAL_TITLES.length)];

  if (targetAmount <= savedSoFar) {
    targetAmount = Math.round((savedSoFar + 5000 + rng() * 80_000) * 100) / 100;
  }

  return {
    user: {
      name: `${fn} ${ln}`,
      riskProfile,
    },
    stocks,
    mutualFunds,
    goal: {
      title: goalTitle,
      targetAmount,
      savedSoFar,
      currency: "USD",
    },
  };
}

function buildAllPortfolios(): MockPortfolio[] {
  const seen = new Set<string>();
  const out: MockPortfolio[] = [];
  let seed = 20260202;
  let attempts = 0;
  const maxAttempts = 50_000;
  while (out.length < 100 && attempts < maxAttempts) {
    attempts++;
    const p = generateOnePortfolio(seed++);
    const key = portfolioFingerprint(p);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  if (out.length !== 100) {
    throw new Error(`mockDataGenerator: expected 100 unique portfolios, got ${out.length}`);
  }
  return out;
}

export const allPortfolios: MockPortfolio[] = buildAllPortfolios();
