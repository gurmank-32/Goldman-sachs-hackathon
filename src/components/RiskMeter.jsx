import { useMemo } from "react";
import { useAppContext } from "../store/AppContext.jsx";
import { CARD_CLASS } from "../utils/cardStyles.js";

const CX = 100;
const CY = 100;
const R = 80;
const NEEDLE_LEN = 72;

const ZONE = {
  safe: "#5DCAA5",
  steady: "#EF9F27",
  higher: "#D85A30",
};

/** Degrees from +x axis (right), CCW in math convention — SVG y flipped via needleTip(). */
const NEEDLE_BY_LABEL = {
  Conservative: 150,
  Moderate: 90,
  Aggressive: 30,
};

function normalizeRiskLabel(raw) {
  if (raw == null || typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  const map = {
    conservative: "Conservative",
    moderate: "Moderate",
    aggressive: "Aggressive",
  };
  return map[key] ?? null;
}

function polar(deg) {
  const φ = (deg * Math.PI) / 180;
  return {
    x: CX + R * Math.cos(φ),
    y: CY - R * Math.sin(φ),
  };
}

/** Needle angle in math degrees (0° = east, 90° = north/up on screen). */
function needleTip(deg, len = NEEDLE_LEN) {
  const φ = (deg * Math.PI) / 180;
  return {
    x: CX + len * Math.cos(φ),
    y: CY - len * Math.sin(φ),
  };
}

function arcPath(fromDeg, toDeg) {
  const a = polar(fromDeg);
  const b = polar(toDeg);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

const RISK_PLAIN = {
  Conservative: "Play it safe",
  Moderate: "Balanced",
  Aggressive: "Bold",
};

function idealRiskForGoal(goalType) {
  switch (goalType) {
    case "emergency":
      return "Conservative";
    case "home":
    case "education":
    case "retirement":
      return "Moderate";
    default:
      return "Moderate";
  }
}

function toPlain(label) {
  if (label == null || label === "Not set") return "Not set yet";
  return RISK_PLAIN[label] ?? label;
}

export default function RiskMeter() {
  const { userProfile, selectedGoal } = useAppContext();

  const normalizedRisk = normalizeRiskLabel(userProfile.riskLabel);
  const rawCurrent = normalizedRisk;
  const currentPlain = toPlain(rawCurrent ?? "Not set");
  const idealRaw = idealRiskForGoal(selectedGoal?.type);
  const idealPlain = toPlain(idealRaw);

  const needleDeg = useMemo(() => {
    if (rawCurrent && NEEDLE_BY_LABEL[rawCurrent] != null) {
      return NEEDLE_BY_LABEL[rawCurrent];
    }
    return 90;
  }, [rawCurrent]);

  const tip = needleTip(needleDeg);
  const matches =
    rawCurrent != null && rawCurrent === idealRaw;

  const labelPos = {
    safe: polar(150),
    steady: polar(90),
    higher: polar(30),
  };

  return (
    <section className={`${CARD_CLASS} min-w-0 overflow-hidden`}>
      <h2 className="text-[15px] font-medium text-neutral-900">
        How much risk you&apos;re taking
      </h2>

      <div className="mx-auto mt-2 w-full max-w-[280px] min-w-0">
        <svg
          viewBox="0 0 200 118"
          className="h-auto w-full max-w-full"
          role="img"
          aria-label="Comfort with ups and downs"
        >
          <path
            d={arcPath(180, 120)}
            fill="none"
            stroke={ZONE.safe}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={arcPath(120, 60)}
            fill="none"
            stroke={ZONE.steady}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path
            d={arcPath(60, 0)}
            fill="none"
            stroke={ZONE.higher}
            strokeWidth={14}
            strokeLinecap="round"
          />

          <text
            x={labelPos.safe.x}
            y={labelPos.safe.y - 10}
            textAnchor="middle"
            fill="#404040"
            style={{ fontSize: 10, fontWeight: 500 }}
          >
            Cautious
          </text>
          <text
            x={labelPos.steady.x}
            y={labelPos.steady.y - 14}
            textAnchor="middle"
            fill="#404040"
            style={{ fontSize: 10, fontWeight: 500 }}
          >
            Steady
          </text>
          <text
            x={labelPos.higher.x}
            y={labelPos.higher.y - 10}
            textAnchor="middle"
            fill="#404040"
            style={{ fontSize: 10, fontWeight: 500 }}
          >
            Bigger swings
          </text>

          <line
            x1={CX}
            y1={CY}
            x2={tip.x}
            y2={tip.y}
            stroke="#1a1a1a"
            strokeWidth={1.25}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={4} fill="#1a1a1a" />
        </svg>
      </div>

      <div className="mt-3 min-w-0 space-y-1 text-sm">
        <p className="break-words text-neutral-900">
          Where you are today:{" "}
          <span className="font-medium">{currentPlain}</span>
        </p>
        <p className="break-words text-neutral-500">
          A good fit for your goal:{" "}
          <span className="font-medium text-neutral-700">{idealPlain}</span>
        </p>
        <div className="flex items-center gap-2 pt-1">
          {matches ? (
            <span
              className="inline-flex text-emerald-600"
              aria-label="This matches what we suggest for your goal"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3.5 8.5 6.5 11.5 12.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : (
            <span className="text-sm font-medium text-amber-700">
              ⚠ A small change may help you stay on track
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
