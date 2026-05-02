/**
 * API base URL:
 * - Development: same-origin "/api/..." via Vite proxy → Flask (avoids CORS issues).
 * - Production: VITE_API_BASE_URL or fallback.
 */
function apiBaseUrl() {
  if (import.meta.env.DEV) {
    return "";
  }
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return (fromEnv || "http://localhost:5020").replace(/\/$/, "");
}

const BASE_URL = apiBaseUrl();

/**
 * GET /api/health — backend + Gemini + yfinance readiness.
 * @returns {Promise<object>}
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

/**
 * POST /api/ai/ask — FinPilot assistant (Gemini on the backend).
 * @param {string} question
 * @param {string} [context] — portfolio facts
 * @param {Array<{ role: string, content: string }>} [history] — prior turns (oldest → newest)
 * @returns {Promise<string>}
 */
export async function askAssistant(question, context = "", history = []) {
  const res = await fetch(`${BASE_URL}/api/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context, history }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg =
      data.message ||
      data.detail ||
      data.error ||
      `Assistant request failed (${res.status})`;
    throw new Error(msg);
  }
  if (typeof data.answer !== "string" || !data.answer.trim()) {
    throw new Error("Empty answer from assistant");
  }
  return data.answer.trim();
}

export { BASE_URL };
