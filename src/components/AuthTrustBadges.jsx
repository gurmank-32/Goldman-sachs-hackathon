function LockIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="shrink-0 text-slate-400"
    >
      <path
        d="M3 5.5V4a3 3 0 0 1 6 0v1.5M2.5 5.5h7A1 1 0 0 1 10.5 6.5v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="shrink-0 text-slate-400"
    >
      <path
        d="M6 1.2 10 3v4.2c0 2.4-1.7 4.6-4 5.2-2.3-.6-4-2.8-4-5.2V3l4-1.8Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="shrink-0 text-slate-400"
    >
      <path
        d="M2.5 6.2 5 8.7l4.5-5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AuthTrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
      <span className="inline-flex items-center gap-1">
        <LockIcon />
        Secure
      </span>
      <span aria-hidden className="text-slate-300">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldIcon />
        Private
      </span>
      <span aria-hidden className="text-slate-300">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        <CheckIcon />
        Free forever
      </span>
    </div>
  );
}
