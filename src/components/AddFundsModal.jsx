import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../store/AppContext.jsx";
import { fetchYFinanceQuote } from "../services/marketApi.js";

const GOLD = "#B8962E";
const NAVY = "#0A1628";
const MUTED = "#64748b";
const BORDER = "#E8E4DC";

const OTHER_ACCOUNT_VALUE = "__other_personal__";

/**
 * Manual holding log — not a trade. Appears in portfolio as tracked holdings.
 *
 * @param {{
 *   open: boolean,
 *   linkedAccounts: Array<{ id: string, accountLabel?: string, name?: string, category?: string }>,
 *   onClose: (result: { added: boolean }) => void,
 * }} props
 */
export default function AddFundsModal({ open, linkedAccounts, onClose }) {
  const { addManualHolding } = useAppContext();
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [entryMode, setEntryMode] = useState("dollars");
  const [sharesRaw, setSharesRaw] = useState("");
  const [dollarsRaw, setDollarsRaw] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [accountChoice, setAccountChoice] = useState(OTHER_ACCOUNT_VALUE);
  const [instrumentType, setInstrumentType] = useState("stock");
  const [quotePrice, setQuotePrice] = useState(null);
  const [quoteDayChangePct, setQuoteDayChangePct] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const accountOptions = useMemo(() => {
    const list = Array.isArray(linkedAccounts) ? linkedAccounts : [];
    return list.filter((a) => a.connectionActive !== false);
  }, [linkedAccounts]);

  const reset = useCallback(() => {
    setName("");
    setTicker("");
    setEntryMode("dollars");
    setSharesRaw("");
    setDollarsRaw("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setAccountChoice(OTHER_ACCOUNT_VALUE);
    setInstrumentType("stock");
    setQuotePrice(null);
    setQuoteDayChangePct(null);
    setQuoteLoading(false);
    setQuoteError("");
    setSubmitError("");
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  const dismiss = useCallback(() => {
    onClose({ added: false });
  }, [onClose]);

  const parsedDollars = useMemo(() => {
    const n = Number(String(dollarsRaw).replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [dollarsRaw]);

  const parsedShares = useMemo(() => {
    const n = Number(String(sharesRaw).replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [sharesRaw]);

  const fetchPrice = useCallback(async () => {
    const sym = ticker.trim();
    if (!sym) {
      setQuoteError("Add a ticker to fetch a live price, or use dollar value.");
      setQuotePrice(null);
      return;
    }
    setQuoteError("");
    setQuoteLoading(true);
    try {
      const q = await fetchYFinanceQuote(sym);
      setQuotePrice(Number(q.price));
      setQuoteDayChangePct(
        typeof q.dayChangePct === "number" ? q.dayChangePct : null,
      );
    } catch (e) {
      setQuotePrice(null);
      setQuoteDayChangePct(null);
      setQuoteError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setQuoteLoading(false);
    }
  }, [ticker]);

  const resolvedAccountLabel = useMemo(() => {
    if (accountChoice === OTHER_ACCOUNT_VALUE) return "Other / Personal account";
    const acc = accountOptions.find((a) => a.id === accountChoice);
    if (!acc) return "Other / Personal account";
    return acc.accountLabel || acc.name || "Linked account";
  }, [accountChoice, accountOptions]);

  const computedValue = useMemo(() => {
    if (entryMode === "dollars") return parsedDollars;
    if (parsedShares > 0 && quotePrice != null && quotePrice > 0) {
      return Math.round(parsedShares * quotePrice * 100) / 100;
    }
    return 0;
  }, [entryMode, parsedDollars, parsedShares, quotePrice]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    const n = String(name).trim();
    if (!n) {
      setSubmitError("Enter a stock or fund name.");
      return;
    }
    if (entryMode === "shares") {
      if (parsedShares <= 0) {
        setSubmitError("Enter a positive number of shares.");
        return;
      }
      if (quotePrice == null || quotePrice <= 0) {
        setSubmitError("Fetch a live price using your ticker, or switch to dollar value.");
        return;
      }
    } else if (parsedDollars <= 0) {
      setSubmitError("Enter a dollar value greater than zero.");
      return;
    }

    const value = computedValue;
    if (value <= 0) {
      setSubmitError("Could not determine holding value.");
      return;
    }

    setSubmitting(true);
    try {
      const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      addManualHolding({
        id,
        name: n,
        ticker: String(ticker).trim().toUpperCase() || "",
        value,
        shares: entryMode === "shares" ? parsedShares : null,
        entryMode,
        purchaseDate,
        accountRef: accountChoice,
        accountLabel: resolvedAccountLabel,
        dayChangePct: quoteDayChangePct,
        instrumentType:
          instrumentType === "bond"
            ? "bond"
            : instrumentType === "mutual"
              ? "mutual"
              : "stock",
        quotePriceAtAdd: quotePrice,
      });
      onClose({ added: true });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const goldBtn = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    border: "none",
    background: GOLD,
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    cursor: submitting ? "wait" : "pointer",
    opacity: submitting ? 0.85 : 1,
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: MUTED,
    marginBottom: 6,
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${BORDER}`,
    fontSize: 14,
    marginBottom: 14,
  };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5600,
        background: "rgba(10, 22, 40, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-holding-modal-title"
        onClick={(ev) => ev.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 16,
          padding: "24px 24px 28px",
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.25)",
          border: `1px solid ${BORDER}`,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 22,
            lineHeight: 1,
            color: MUTED,
            borderRadius: 8,
          }}
        >
          ×
        </button>

        <h2
          id="add-holding-modal-title"
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: NAVY,
            margin: "8px 0 8px",
            paddingRight: 28,
          }}
        >
          Add a holding to track
        </h2>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Stock or fund name</label>
          <input
            type="text"
            placeholder="e.g. Apple Inc, Vanguard S&P 500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            autoComplete="off"
          />

          <label style={labelStyle}>
            Ticker symbol{" "}
            <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optional)</span>
          </label>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="e.g. AAPL, VFIAX"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value);
    setQuotePrice(null);
    setQuoteDayChangePct(null);
    setQuoteError("");
              }}
              style={{ ...inputStyle, flex: "1 1 160px", marginBottom: 0 }}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void fetchPrice()}
              disabled={quoteLoading || !ticker.trim()}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${GOLD}`,
                background: "#fff",
                color: GOLD,
                fontWeight: 600,
                fontSize: 14,
                cursor:
                  quoteLoading || !ticker.trim() ? "not-allowed" : "pointer",
                opacity: quoteLoading || !ticker.trim() ? 0.5 : 1,
                alignSelf: "flex-start",
              }}
            >
              {quoteLoading ? "…" : "Fetch price"}
            </button>
          </div>
          {quotePrice != null ? (
            <p style={{ fontSize: 13, color: "#1A7F5A", margin: "-8px 0 14px" }}>
              Live price: ${quotePrice.toFixed(2)}
            </p>
          ) : null}
          {quoteError ? (
            <p style={{ fontSize: 12, color: "#B45309", margin: "-8px 0 14px" }}>
              {quoteError}
            </p>
          ) : null}

          <label style={labelStyle}>Instrument type</label>
          <select
            value={instrumentType}
            onChange={(e) => setInstrumentType(e.target.value)}
            style={inputStyle}
          >
            <option value="stock">Stock / ETF</option>
            <option value="mutual">Mutual fund</option>
            <option value="bond">Bond / fixed income</option>
          </select>

          <div style={{ marginBottom: 12 }}>
            <span style={labelStyle}>Number of shares or dollar value</span>
            <div
              role="group"
              aria-label="Entry mode"
              style={{ display: "flex", gap: 8, marginBottom: 10 }}
            >
              <button
                type="button"
                onClick={() => setEntryMode("dollars")}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border:
                    entryMode === "dollars"
                      ? `2px solid ${GOLD}`
                      : `1px solid ${BORDER}`,
                  background:
                    entryMode === "dollars"
                      ? "rgba(245, 237, 214, 0.45)"
                      : "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: NAVY,
                }}
              >
                Dollar value
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("shares")}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border:
                    entryMode === "shares"
                      ? `2px solid ${GOLD}`
                      : `1px solid ${BORDER}`,
                  background:
                    entryMode === "shares"
                      ? "rgba(245, 237, 214, 0.45)"
                      : "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: NAVY,
                }}
              >
                Shares
              </button>
            </div>
            {entryMode === "dollars" ? (
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount in USD"
                value={dollarsRaw}
                onChange={(e) =>
                  setDollarsRaw(e.target.value.replace(/[^\d.]/g, ""))
                }
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            ) : (
              <input
                type="text"
                inputMode="decimal"
                placeholder="Number of shares"
                value={sharesRaw}
                onChange={(e) =>
                  setSharesRaw(e.target.value.replace(/[^\d.]/g, ""))
                }
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            )}
          </div>

          <label style={labelStyle}>Purchase date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Which account?</label>
          <select
            value={accountChoice}
            onChange={(e) => setAccountChoice(e.target.value)}
            style={inputStyle}
          >
            <option value={OTHER_ACCOUNT_VALUE}>Other / Personal account</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountLabel || a.name || a.id}
              </option>
            ))}
          </select>

          {submitError ? (
            <p
              style={{
                fontSize: 13,
                color: "#B45309",
                margin: "0 0 12px",
              }}
            >
              {submitError}
            </p>
          ) : null}

          <button type="submit" style={goldBtn} disabled={submitting}>
            Add to portfolio
          </button>
        </form>

        <p
          style={{
            fontSize: 11,
            color: "#94a3b8",
            lineHeight: 1.5,
            margin: "14px 0 0",
            textAlign: "center",
          }}
        >
          This logs the holding for tracking. To purchase, use your brokerage
          account directly.
        </p>
      </div>
    </div>
  );
}
