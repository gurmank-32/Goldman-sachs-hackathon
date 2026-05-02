/** Shared NestEgg wordmark — keep in sync with auth pages. */
export default function NestEggLogo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#B8962E]">
        <svg viewBox="0 0 48 48" aria-hidden className="h-9 w-9">
          <path
            d="M 9 30 Q 24 15 39 30"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 12 28 Q 24 18 36 28"
            fill="none"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="17" cy="27" r="3.2" fill="white" />
          <circle cx="24" cy="26" r="3.4" fill="white" />
          <circle cx="31" cy="27" r="3.2" fill="white" />
        </svg>
      </div>
      <span
        className="text-[24px] font-medium"
        style={{ color: "#0A1628" }}
      >
        NestEgg
      </span>
    </div>
  );
}
