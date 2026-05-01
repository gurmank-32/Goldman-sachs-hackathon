/** Hardcoded mock portfolio — Alex Chen (USD) */
export const alexChenPortfolio = {
  user: {
    name: "Alex Chen",
    riskProfile: "Moderate",
  },
  stocks: [
    {
      symbol: "AAPL",
      name: "Apple Inc",
      shares: 10,
      averageBuyPrice: 165,
      currentPrice: 189,
      currency: "USD",
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      shares: 8,
      averageBuyPrice: 310,
      currentPrice: 378,
      currency: "USD",
    },
  ],
  mutualFunds: [
    {
      name: "Vanguard S&P 500 Index Fund (VFIAX)",
      investedAmount: 8_000,
      currentValue: 9_840,
      category: "US Large Cap Equity",
      currency: "USD",
    },
    {
      name: "Fidelity Total Bond Market Fund (FTBFX)",
      investedAmount: 5_000,
      currentValue: 5_180,
      category: "Investment Grade Bonds",
      currency: "USD",
    },
  ],
  goal: {
    title: "Retirement by 2050",
    targetAmount: 500_000,
    savedSoFar: 17_042,
    currency: "USD",
  },
};
