import { useMemo } from "react";
import { Cell, Label, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useAppContext } from "../store/AppContext.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";

const COLORS = {
  growth: "#7F77DD",
  stable: "#5DCAA5",
  cash: "#D3D1C7",
};

function isDebtFund(category) {
  const c = (category ?? "").toLowerCase();
  return c.includes("debt") || c.includes("bond");
}

function allocationFromPortfolio(portfolio) {
  const stocks = portfolio?.stocks ?? [];
  const funds = portfolio?.mutualFunds ?? [];

  let growth = stocks.reduce((s, x) => s + x.shares * x.currentPrice, 0);

  let stable = 0;
  for (const f of funds) {
    const v = f.currentValue;
    if (isDebtFund(f.category)) stable += v;
    else growth += v;
  }

  const investedExCash = growth + stable;
  const cash = investedExCash > 0 ? (0.05 * investedExCash) / 0.95 : 0;
  const total = growth + stable + cash;

  return { growth, stable, cash, total };
}

function pct(part, total) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function DonutCenterLabel(props) {
  const vb = props.viewBox;
  const cx = typeof vb?.cx === "number" ? vb.cx : 0;
  const cy = typeof vb?.cy === "number" ? vb.cy : 0;
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#525252"
      fontSize={12}
      fontWeight={500}
      style={{ pointerEvents: "none" }}
    >
      Mix
    </text>
  );
}

export default function AllocationChart() {
  const { portfolio } = useAppContext();

  const { growth, stable, cash, total } = useMemo(
    () => allocationFromPortfolio(portfolio),
    [portfolio],
  );

  const pieData = useMemo(
    () => [
      {
        id: "growth",
        name: "Stocks & growth funds",
        value: growth,
        fill: COLORS.growth,
      },
      {
        id: "stable",
        name: "Stable savings",
        value: stable,
        fill: COLORS.stable,
      },
      {
        id: "cash",
        name: "Cash & other",
        value: cash,
        fill: COLORS.cash,
      },
    ],
    [growth, stable, cash],
  );

  const growthPct = pct(growth, total);
  const stablePct = pct(stable, total);
  const cashPct = pct(cash, total);

  return (
    <section className={`${CARD_CLASS} min-w-0 overflow-hidden`}>
      <h2 className="text-[15px] font-medium leading-snug text-neutral-900">
        Where your money is
      </h2>

      <div className="relative mx-auto mt-4 min-h-[220px] w-full max-w-[280px] min-w-0 [&_.recharts-surface]:outline-none">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {pieData.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
              <Label content={<DonutCenterLabel />} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <LegendPill
          color={COLORS.growth}
          label="Stocks & growth funds"
          percent={growthPct}
        />
        <LegendPill
          color={COLORS.stable}
          label="Stable savings"
          percent={stablePct}
        />
        <LegendPill
          color={COLORS.cash}
          label="Cash & other"
          percent={cashPct}
        />
      </div>
    </section>
  );
}

function LegendPill({ color, label, percent }) {
  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-neutral-100 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-800 sm:text-sm">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 truncate sm:whitespace-normal">
        {label} {percent.toLocaleString("en-US")}%
      </span>
    </div>
  );
}
