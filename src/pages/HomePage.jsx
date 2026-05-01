import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { mockPortfolioHistory } from "../data/mockData.js";
import { useAppContext } from "../store/AppContext.jsx";
import { formatUsd } from "../utils/formatUsd.js";

export default function HomePage() {
  const { userProfile } = useAppContext();

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden px-4 py-10">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Portfolio overview
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
          Welcome back
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-600">
          A simple snapshot of demo data.{" "}
          <Link
            to="/"
            className="font-medium text-neutral-900 underline underline-offset-2"
          >
            Take the risk profiler
          </Link>{" "}
          to save your profile, then continue to goals.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">
            Portfolio (mock)
          </h2>
          <p className="mt-1 text-xs text-neutral-500">Last six months</p>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={mockPortfolioHistory}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#171717" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e5e5"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#737373", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v) => `$${v / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#737373", fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [formatUsd(value), "Value"]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e5e5",
                    fontSize: "0.875rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#171717"
                  strokeWidth={2}
                  fill="url(#fillValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">
            Saved risk profile
          </h2>
          {userProfile.riskLabel ? (
            <div className="mt-4">
              <p className="text-lg font-medium text-neutral-900">
                {userProfile.riskLabel}
              </p>
              {userProfile.riskScore != null && (
                <p className="mt-1 text-xs text-neutral-500">
                  Score: {userProfile.riskScore} / 15
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              Complete the{" "}
              <Link
                to="/"
                className="font-medium text-neutral-900 underline underline-offset-2"
              >
                risk profiler
              </Link>{" "}
              to store your profile here.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
