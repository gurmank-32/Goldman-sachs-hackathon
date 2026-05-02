import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ALLOCATION_COLORS,
  allocationBreakdownToLegendRows,
} from "../utils/allocationUtils.js";

function formatUsd(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n) {
  const num = Number(n) || 0;
  const roundedUp = num >= 0 ? Math.ceil(num * 100) / 100 : Math.floor(num * 100) / 100;
  return `${roundedUp.toFixed(2)}%`;
}

const EMPTY_SLICE_COUNT = 5;
const EMPTY_COLOR = "#E8E4DC";

function DonutTooltip({ active, payload, formatMoney }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "2px solid #B8962E",
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "0 8px 28px rgba(15, 23, 42, 0.12)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0A1628", marginBottom: 4 }}>
        {row.name}
      </div>
      <div style={{ fontSize: 13, color: "#0f172a" }}>{formatMoney(row.value)}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
        {formatPct(row.percentage)}
      </div>
    </div>
  );
}

function MiniLegendBar({ pct, color }) {
  return (
    <div className="progress-bar" style={{ flex: 1 }}>
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

/**
 * @param {{
 *   breakdown: import("../utils/allocationUtils.js").calculateAllocationBreakdown extends (...args: any) => infer R ? R : never,
 *   formatMoney?: (n: number) => string,
 *   onLinkAccounts: () => void,
 * }} props
 */
export default function AllocationDonut({
  breakdown,
  formatMoney = formatUsd,
  onLinkAccounts,
}) {
  const [hoverKey, setHoverKey] = useState(null);
  const hasData = breakdown.total > 0;

  const pieData = useMemo(() => {
    if (!hasData) {
      const v = 1;
      return Array.from({ length: EMPTY_SLICE_COUNT }, (_, i) => ({
        key: `empty-${i}`,
        name: "",
        value: v,
        color: EMPTY_COLOR,
        percentage: 100 / EMPTY_SLICE_COUNT,
      }));
    }
    const order = ["checking", "savings", "stocks", "mutualFunds", "bonds"];
    return order
      .map((k) => {
        const s = breakdown[k];
        if (!s || s.value <= 0) return null;
        return {
          key: k,
          name: s.label,
          value: s.value,
          color: s.color,
          percentage: s.percentage,
        };
      })
      .filter(Boolean);
  }, [breakdown, hasData]);

  const legendRows = useMemo(
    () => (hasData ? allocationBreakdownToLegendRows(breakdown) : []),
    [breakdown, hasData],
  );

  const tooltipFmt = (v) => formatMoney(v);

  return (
    <div>
      <div style={{ width: "100%", height: 260, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={hasData ? 1 : 0}
              startAngle={90}
              endAngle={-270}
              animationBegin={0}
              animationDuration={600}
              isAnimationActive
              stroke={hasData ? "#fff" : "none"}
              strokeWidth={hasData ? 2 : 0}
              onMouseEnter={(_, i) => {
                if (hasData && pieData[i]) setHoverKey(pieData[i].key);
              }}
              onMouseLeave={() => setHoverKey(null)}
            >
              {pieData.map((entry, i) => (
                <Cell
                  key={entry.key}
                  fill={
                    hasData && hoverKey && entry.key !== hoverKey
                      ? `${entry.color}99`
                      : entry.color
                  }
                />
              ))}
            </Pie>
            {hasData ? (
              <Tooltip
                content={<DonutTooltip formatMoney={tooltipFmt} />}
                wrapperStyle={{ outline: "none" }}
              />
            ) : null}
          </PieChart>
        </ResponsiveContainer>
        <div
          className="donut-center"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
            maxWidth: 120,
          }}
        >
          {hasData ? (
            <>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#0A1628",
                  lineHeight: 1.2,
                }}
              >
                {formatMoney(breakdown.total)}
              </div>
              <div style={{ fontSize: 11, color: "#718096", marginTop: 4 }}>
                Total wealth
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: "#718096",
                lineHeight: 1.35,
                maxWidth: 100,
                margin: "0 auto",
              }}
            >
              Link accounts to see your allocation
            </div>
          )}
        </div>
      </div>

      {hasData ? (
        <div style={{ marginTop: 8 }}>
          {legendRows.map((row) => (
            <div key={row.key} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: row.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", flex: 1 }}>
                  {row.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0A1628" }}>
                  {formatPct(row.percentage)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 22 }}>
                <MiniLegendBar pct={row.percentage} color={row.color} />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#718096",
                  paddingLeft: 22,
                  marginTop: 4,
                }}
              >
                {formatMoney(row.value)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onLinkAccounts}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "2px solid #B8962E",
              background: "#fff",
              color: "#B8962E",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Link your accounts
          </button>
        </div>
      )}
    </div>
  );
}

export { ALLOCATION_COLORS, EMPTY_COLOR };
