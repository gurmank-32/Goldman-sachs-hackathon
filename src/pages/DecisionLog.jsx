import { Link } from "react-router-dom";

export default function DecisionLog() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-[#F8F7F4] px-4 py-10">
      <Link
        to="/dashboard"
        className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-6 text-xl font-semibold text-neutral-900">
        Decision log
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Placeholder — past decisions would appear here.
      </p>
    </main>
  );
}
