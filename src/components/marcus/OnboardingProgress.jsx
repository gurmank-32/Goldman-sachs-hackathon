/** Thin Marcus-style progress bar (mobile-first onboarding). */
export default function OnboardingProgress({ step, totalSteps }) {
  const pct = Math.min(100, Math.round((step / totalSteps) * 100));
  return (
    <div className="w-full px-1 pt-2">
      <div className="mb-2 flex justify-between text-[11px] font-medium uppercase tracking-wider text-[#1A1A2E]/45">
        <span>
          Step {step} of {totalSteps}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8ECF2]">
        <div
          className="h-full rounded-full bg-[#6DB6FF] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
