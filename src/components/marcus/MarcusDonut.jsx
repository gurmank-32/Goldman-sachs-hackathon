/**
 * Simple donut chart — conic gradient + radial mask (no chart library).
 */
export default function MarcusDonut({ segments, size = 216 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-[#1C2B47]/80 text-sm text-white/40"
        style={{ width: size, height: size }}
      >
        —
      </div>
    );
  }

  let angle = 0;
  const gradientStops = segments
    .map((seg) => {
      const sweep = (seg.value / total) * 360;
      const start = angle;
      angle += sweep;
      return `${seg.color} ${start}deg ${angle}deg`;
    })
    .join(", ");

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className="marcus-donut-ring rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(from -90deg, ${gradientStops})`,
        }}
      />
    </div>
  );
}
