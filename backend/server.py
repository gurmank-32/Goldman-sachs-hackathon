import os
import re
import warnings
from dotenv import load_dotenv

with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    import google.generativeai as genai

try:
    from google.generativeai.types import HarmBlockThreshold, HarmCategory

    _GEMINI_SAFETY = [
        {
            "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
            "threshold": HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            "threshold": HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            "threshold": HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            "threshold": HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
    ]
except Exception:
    _GEMINI_SAFETY = None

from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timezone
import time
from typing import Optional, Tuple

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, os.pardir))
# Load root .env then backend/.env so GEMINI_API_KEY can live in either place; backend wins on duplicates.
load_dotenv(os.path.join(_ROOT_DIR, ".env"))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"), override=True)

app = Flask(__name__)
# Allow any dev port (Vite uses 5173 by default but picks 5174/5175 if busy).
CORS(app, resources={r"/api/*": {
  "origins": "https://goldman-sachs-hackathon-1.onrender.com",
  "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allow_headers": ["Content-Type", "Authorization"]
}})

# Strip quotes/whitespace — common copy-paste mistakes from AI Studio
GEMINI_API_KEY = (
    os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
).strip().strip('"').strip("'")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✓ GEMINI_API_KEY loaded (length %d)" % len(GEMINI_API_KEY))
else:
    print("✗ WARNING: GEMINI_API_KEY not found in environment")
    print("  Add GEMINI_API_KEY to backend/.env or the project root .env and restart the server.")


def _gemini_model_ids():
    """Try explicit GEMINI_MODEL first, then IDs that work with the Gemini API for most keys."""
    explicit = (os.getenv("GEMINI_MODEL") or "").strip()
    order = []
    if explicit:
        order.append(explicit)
    for mid in ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash"):
        if mid not in order:
            order.append(mid)
    return order


def _extract_gemini_text(resp) -> Optional[str]:
    """Read text from a GenerateContent response (handles safety blocks where .text raises)."""
    try:
        t = getattr(resp, "text", None)
        if t and str(t).strip():
            return str(t).strip()
    except Exception:
        pass
    try:
        parts_out = []
        for cand in getattr(resp, "candidates", None) or []:
            content = getattr(cand, "content", None)
            if not content:
                continue
            for p in getattr(content, "parts", None) or []:
                txt = getattr(p, "text", None)
                if txt:
                    parts_out.append(txt)
        joined = "\n".join(parts_out).strip()
        return joined or None
    except Exception:
        return None


def _yf_quote(symbol: str):
    """Fetch latest quote-ish data for one symbol via yfinance."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return None
    t = yf.Ticker(sym)
    hist = t.history(period="5d")
    close = None
    prev = None
    if hist is not None and len(hist) > 0:
        close = float(hist["Close"].iloc[-1])
    if hist is not None and len(hist) > 1:
        prev = float(hist["Close"].iloc[-2])
    elif close is not None:
        prev = close
    if close is None:
        try:
            fi = getattr(t, "fast_info", None)
            if fi is not None:
                last = getattr(fi, "last_price", None) or getattr(fi, "previous_close", None)
                if last is not None:
                    close = float(last)
                    prev = close
        except Exception:
            pass
    if close is None:
        return None
    day_change_pct = ((close - prev) / prev * 100) if prev else 0.0
    full = {}
    try:
        full = t.info or {}
    except Exception:
        pass
    name = full.get("shortName") or full.get("longName") or sym
    return {
        "symbol": sym,
        "name": name,
        "price": round(close, 4),
        "previousClose": round(prev, 4) if prev is not None else None,
        "dayChangePct": round(day_change_pct, 4),
        "currency": full.get("currency", "USD"),
        "marketState": full.get("marketState"),
        "asOf": datetime.utcnow().isoformat() + "Z",
    }


def _gemini_generate(prompt: str, max_retries: int = 2) -> Tuple[Optional[str], Optional[str]]:
    """Returns (text, error_code). error_code is None on success."""
    if not GEMINI_API_KEY:
        return None, "gemini_not_configured"
    last_err: Optional[str] = None
    for model_id in _gemini_model_ids():
        mdl = genai.GenerativeModel(model_id)
        for attempt in range(max_retries):
            try:
                gen_kw = {}
                if _GEMINI_SAFETY:
                    gen_kw["safety_settings"] = _GEMINI_SAFETY
                resp = mdl.generate_content(prompt, **gen_kw)
                text = _extract_gemini_text(resp)
                if text:
                    return text, None
                fb = getattr(resp, "prompt_feedback", None)
                last_err = (
                    f"empty_response (blocked_or_no_text); prompt_feedback={fb}"
                    if fb is not None
                    else "empty_response"
                )
            except Exception as e:
                last_err = str(e)
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))
        # Next model ID (e.g. 404 wrong model name for this API version)
    return None, last_err or "empty_response"


@app.route("/api/health", methods=["GET"])
def api_health():
    gemini_status = "connected" if GEMINI_API_KEY else "missing_key"
    yf_status = "error"
    try:
        t = yf.Ticker("AAPL")
        hist = t.history(period="5d")
        if hist is not None and len(hist) > 0:
            float(hist["Close"].iloc[-1])
            yf_status = "ok"
    except Exception:
        yf_status = "error"

    return jsonify(
        {
            "status": "ok",
            "gemini": gemini_status,
            "yfinance": yf_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


@app.route("/api/quote", methods=["GET", "POST"])
def api_quote():
    """Single ticker quote: GET ?symbol=AAPL or POST JSON {\"symbol\":\"AAPL\"}."""
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        symbol = data.get("symbol") or data.get("ticker")
    else:
        symbol = request.args.get("symbol") or request.args.get("ticker")
    q = _yf_quote(symbol or "")
    if not q or q.get("price") is None:
        return jsonify({"ok": False, "error": "symbol_not_found", "symbol": symbol}), 404
    return jsonify({"ok": True, "quote": q})


@app.route("/api/quotes", methods=["POST"])
def api_quotes():
    """Batch quotes: POST {\"symbols\":[\"AAPL\",\"MSFT\"]} or {\"tickers\":[...]}."""
    data = request.get_json(silent=True) or {}
    symbols = data.get("symbols") or data.get("tickers") or []
    if not isinstance(symbols, list):
        return jsonify({"ok": False, "error": "invalid_body"}), 400
    quotes = []
    errors = []
    for s in symbols:
        q = _yf_quote(str(s))
        if q and q.get("price") is not None:
            quotes.append(q)
        else:
            errors.append({"symbol": str(s), "error": "not_found"})
    return jsonify({"ok": True, "quotes": quotes, "errors": errors})


@app.route("/api/history", methods=["GET"])
def api_history():
    """
    OHLC history: GET ?symbol=AAPL&period=1y&interval=1d
    period: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max
    interval: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo
    """
    symbol = (request.args.get("symbol") or request.args.get("ticker") or "").strip().upper()
    period = request.args.get("period", "3mo")
    interval = request.args.get("interval", "1d")
    if not symbol:
        return jsonify({"ok": False, "error": "missing_symbol"}), 400
    try:
        t = yf.Ticker(symbol)
        hist = t.history(period=period, interval=interval)
        if hist is None or hist.empty:
            return jsonify({"ok": False, "error": "no_data", "symbol": symbol}), 404
        hist = hist.reset_index()
        # Normalize column names for JSON (Date -> date string)
        records = []
        for _, row in hist.iterrows():
            dt = row.iloc[0]
            if hasattr(dt, "isoformat"):
                ds = dt.isoformat()
            else:
                ds = str(dt)
            o = float(row["Open"]) if "Open" in row else None
            h = float(row["High"]) if "High" in row else None
            l = float(row["Low"]) if "Low" in row else None
            c = float(row["Close"]) if "Close" in row else None
            v = int(row["Volume"]) if "Volume" in row and row["Volume"] == row["Volume"] else None
            records.append({"date": ds, "open": o, "high": h, "low": l, "close": c, "volume": v})
        return jsonify(
            {
                "ok": True,
                "symbol": symbol,
                "period": period,
                "interval": interval,
                "bars": records,
            }
        )
    except Exception as e:
        return jsonify({"ok": False, "error": str(e), "symbol": symbol}), 500


@app.route("/api/portfolio/summary", methods=["POST"])
def api_portfolio_summary():
    """
    POST JSON example:
    {
      "holdings": [{"ticker":"AAPL","shares":10},{"ticker":"VTI","shares":5}],
      "cashUsd": 5000
    }
    Or value-based:
    {"positions":[{"symbol":"SPY","valueUsd":12000}]}
    """
    data = request.get_json(silent=True) or {}
    holdings = data.get("holdings") or []
    positions = data.get("positions") or []
    cash_usd = float(data.get("cashUsd") or data.get("cash") or 0)

    lines = []
    total_market = 0.0

    for h in holdings:
        if not isinstance(h, dict):
            continue
        sym = (h.get("ticker") or h.get("symbol") or "").strip().upper()
        shares = float(h.get("shares") or h.get("qty") or 0)
        if not sym or shares <= 0:
            continue
        q = _yf_quote(sym)
        px = q.get("price") if q else None
        if px is None:
            lines.append({"symbol": sym, "shares": shares, "price": None, "valueUsd": None, "error": "quote_failed"})
            continue
        val = shares * px
        total_market += val
        lines.append(
            {
                "symbol": sym,
                "shares": shares,
                "price": px,
                "valueUsd": round(val, 2),
                "dayChangePct": q.get("dayChangePct"),
            }
        )

    for p in positions:
        if not isinstance(p, dict):
            continue
        sym = (p.get("symbol") or p.get("ticker") or "").strip().upper()
        val_usd = p.get("valueUsd") or p.get("value") or 0
        try:
            val_usd = float(val_usd)
        except (TypeError, ValueError):
            continue
        if not sym or val_usd <= 0:
            continue
        q = _yf_quote(sym)
        px = q.get("price") if q else None
        shares = val_usd / px if px else None
        total_market += val_usd
        lines.append(
            {
                "symbol": sym,
                "shares": round(shares, 6) if shares else None,
                "price": px,
                "valueUsd": round(val_usd, 2),
                "dayChangePct": q.get("dayChangePct") if q else None,
            }
        )

    grand_total = total_market + cash_usd
    weights = []
    if grand_total > 0:
        for ln in lines:
            v = ln.get("valueUsd")
            if v is not None:
                weights.append({"symbol": ln["symbol"], "weightPct": round(100.0 * v / grand_total, 2)})
        if cash_usd > 0:
            weights.append({"symbol": "CASH", "weightPct": round(100.0 * cash_usd / grand_total, 2)})

    return jsonify(
        {
            "ok": True,
            "totalValueUsd": round(grand_total, 2),
            "marketValueUsd": round(total_market, 2),
            "cashUsd": round(cash_usd, 2),
            "positions": lines,
            "weights": weights,
            "asOf": datetime.utcnow().isoformat() + "Z",
        }
    )


@app.route("/api/market/status", methods=["GET"])
def api_market_status():
    """Major indices snapshot (^GSPC, ^DJI, ^IXIC, ^VIX)."""
    indices = [
        {"symbol": "^GSPC", "label": "S&P 500"},
        {"symbol": "^DJI", "label": "Dow Jones"},
        {"symbol": "^IXIC", "label": "Nasdaq"},
        {"symbol": "^VIX", "label": "VIX"},
    ]
    out = []
    for idx in indices:
        q = _yf_quote(idx["symbol"])
        if q:
            q["label"] = idx["label"]
            out.append(q)
        else:
            out.append({"symbol": idx["symbol"], "label": idx["label"], "error": "unavailable"})
    return jsonify({"ok": True, "indices": out, "asOf": datetime.utcnow().isoformat() + "Z"})


@app.route("/api/ai/explain-scenario", methods=["POST"])
def api_ai_explain_scenario():
    """Explain a what-if scenario in plain language."""
    data = request.get_json(silent=True) or {}
    scenario = data.get("scenario") or data.get("title") or ""
    details = data.get("details") or data.get("context") or ""
    portfolio_ctx = data.get("portfolioContext") or ""
    prompt = f"""You are Vérité, a friendly financial guide. Explain this market scenario in plain English for a beginner.
No jargon like alpha, beta, or Sharpe. 2-4 short paragraphs max. Use at most one emoji per paragraph.

Scenario: {scenario}
Details: {details}
Portfolio context (if any): {portfolio_ctx}
"""
    text, err = _gemini_generate(prompt)
    if err == "gemini_not_configured":
        return jsonify({"ok": False, "error": "gemini_not_configured", "message": "Set GEMINI_API_KEY in backend/.env"}), 503
    if text is None:
        return jsonify({"ok": False, "error": "generation_failed", "detail": err}), 500
    return jsonify({"ok": True, "explanation": text})


@app.route("/api/ai/explain-action", methods=["POST"])
def api_ai_explain_action():
    """Explain a proposed portfolio action (e.g. rebalance move)."""
    data = request.get_json(silent=True) or {}
    action = data.get("action") or data.get("description") or ""
    why = data.get("reason") or ""
    prompt = f"""You are Vérité. Briefly explain what this portfolio action means for a retail investor and one pros/cons thought. Under 120 words. Plain English.

Action: {action}
Reason given: {why}
"""
    text, err = _gemini_generate(prompt)
    if err == "gemini_not_configured":
        return jsonify({"ok": False, "error": "gemini_not_configured", "message": "Set GEMINI_API_KEY in backend/.env"}), 503
    if text is None:
        return jsonify({"ok": False, "error": "generation_failed", "detail": err}), 500
    return jsonify({"ok": True, "explanation": text})


@app.route("/api/ai/portfolio-health", methods=["POST"])
def api_ai_portfolio_health():
    """Narrative portfolio health summary from structured facts."""
    data = request.get_json(silent=True) or {}
    facts = data.get("facts") or data
    prompt = f"""You are Vérité. Given these portfolio facts as JSON or text, give a warm, honest health summary in plain English (no jargon). 3-5 sentences. Mention diversification and risk in simple terms.

Facts:
{facts}
"""
    text, err = _gemini_generate(prompt)
    if err == "gemini_not_configured":
        return jsonify({"ok": False, "error": "gemini_not_configured", "message": "Set GEMINI_API_KEY in backend/.env"}), 503
    if text is None:
        return jsonify({"ok": False, "error": "generation_failed", "detail": err}), 500
    return jsonify({"ok": True, "summary": text})


@app.route("/api/ai/ask", methods=["POST"])
def api_ai_ask():
    """General Q&A with optional portfolio context and chat history."""
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or data.get("q") or "").strip()
    context = data.get("context") or data.get("portfolio") or ""
    history = data.get("history") or []
    if not question:
        return jsonify({"ok": False, "error": "missing_question"}), 400

    history_lines = []
    if isinstance(history, list):
        for turn in history[-14:]:
            if not isinstance(turn, dict):
                continue
            role = turn.get("role") or ""
            content = (turn.get("content") or turn.get("text") or "").strip()
            if not content:
                continue
            if role == "user":
                history_lines.append(f"User: {content}")
            elif role in ("assistant", "ai"):
                history_lines.append(f"Assistant: {content}")

    history_block = (
        "\n".join(history_lines) if history_lines else "(no prior messages in this thread)"
    )

    prompt = f"""You are Vérité, a friendly financial coach for beginners using plain English.

Your TOP priority is to answer the user's CURRENT question below — stay on topic. Briefly acknowledge what they asked before you answer so it's obvious you're responding to them. Do not pivot to unrelated generic investing lectures.

Portfolio snapshot (facts — use when relevant; never invent amounts):
{context}

Earlier messages in this chat (oldest first):
{history_block}

CURRENT QUESTION — answer this directly:
{question}

Style: warm, concise (usually under 180 words), light emoji only if natural. Avoid jargon like Alpha, Beta, Sharpe ratio unless the user asks.
"""
    text, err = _gemini_generate(prompt)
    if err == "gemini_not_configured":
        return jsonify({"ok": False, "error": "gemini_not_configured", "message": "Set GEMINI_API_KEY in backend/.env"}), 503
    if text is None:
        return jsonify({"ok": False, "error": "generation_failed", "detail": err}), 500
    return jsonify({"ok": True, "answer": text})


@app.route("/api/ai/test", methods=["GET", "POST"])
def api_ai_test():
    """Connectivity check for Gemini."""
    if not GEMINI_API_KEY:
        return jsonify(
            {
                "ok": False,
                "gemini": False,
                "message": "GEMINI_API_KEY not set or model unavailable",
            }
        )
    text, err = _gemini_generate('Reply with exactly: "Vérité backend OK"')
    if text is None:
        return jsonify({"ok": False, "gemini": True, "error": err}), 500
    return jsonify({"ok": True, "gemini": True, "reply": text})


if __name__ == "__main__":
    # Default 5020: avoids macOS AirPlay on 5000 and common Flask collisions on 5001.
    _port = int(os.getenv("FLASK_PORT", "5020"))
    print(f"Vérité API: http://127.0.0.1:{_port}")
    app.run(debug=True, port=_port)
