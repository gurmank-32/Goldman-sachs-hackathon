import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../store/AppContext.jsx";

const GOLD = "#B8962E";
const NAVY = "#0A1628";
const BORDER = "#E8E4DC";
const MUTED = "#64748b";
const CHECKING_BLUE = "#2563EB";
const SAVINGS_GREEN = "#16A34A";

/**
 * @typedef {{ name: string, category: 'bank'|'brokerage'|'retirement', providerId?: string }} Institution
 */

const RETIREMENT_STYLES = [
  {
    id: "aggressive",
    title: "Mostly stocks (aggressive)",
    subtitle: "Higher growth focus",
  },
  {
    id: "moderate",
    title: "Mix of stocks and bonds (moderate)",
    subtitle: "Balanced approach",
  },
  {
    id: "conservative",
    title: "Mostly bonds (conservative)",
    subtitle: "Stability focus",
  },
  {
    id: "unsure",
    title: "I'm not sure",
    subtitle: "We'll use a middle estimate",
  },
];

function retirementSubType(providerId) {
  const p = String(providerId || "").toLowerCase();
  if (p === "401k") return "401k";
  if (p === "ira") return "ira";
  if (p === "pension") return "pension";
  return "ira";
}

function LockIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Z"
        stroke={MUTED}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{
 *   open: boolean,
 *   institution: Institution | null,
 *   onClose: (result: { completed: boolean }) => void,
 * }} props
 */
export default function LinkAccountModal({ open, institution, onClose }) {
  const { addLinkedAccount } = useAppContext();
  const [nickname, setNickname] = useState("");
  const [bankSubType, setBankSubType] = useState(/** @type {"checking"|"savings"|null} */ (null));
  const [balanceRaw, setBalanceRaw] = useState("");
  const [brkStocksRaw, setBrkStocksRaw] = useState("");
  const [brkMutualRaw, setBrkMutualRaw] = useState("");
  const [brkBondsRaw, setBrkBondsRaw] = useState("");
  const [brkCashRaw, setBrkCashRaw] = useState("");
  const [retirementStyle, setRetirementStyle] = useState(/** @type {string | null} */ (null));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const flow = institution?.category || "brokerage";

  useEffect(() => {
    if (!open) return;
    setNickname("");
    setBankSubType(flow === "bank" ? null : null);
    setBalanceRaw("");
    setBrkStocksRaw("");
    setBrkMutualRaw("");
    setBrkBondsRaw("");
    setBrkCashRaw("");
    setRetirementStyle(flow === "retirement" ? null : null);
    setFormError("");
    setSaving(false);
  }, [open, institution, flow]);

  const handleClose = useCallback(
    (completed) => {
      onClose({ completed });
    },
    [onClose],
  );

  const balanceNum = useMemo(
    () => Number(String(balanceRaw).replace(/,/g, "")),
    [balanceRaw],
  );
  const balanceOk = Number.isFinite(balanceNum) && balanceNum >= 0;

  const handleSave = useCallback(() => {
    if (!institution) return;
    const bal = balanceNum;
    if (!Number.isFinite(bal) || bal < 0) return;
    const nick = String(nickname).trim() || institution.name;
    const instName = institution.name;
    const providerId =
      institution.providerId ?? "manual";

    setFormError("");

    if (flow === "bank") {
      if (!bankSubType) {
        setFormError("Select whether this is a checking or savings account.");
        return;
      }
      setSaving(true);
      const id = `linked-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      addLinkedAccount({
        id,
        type: "bank",
        category: "bank",
        subType: bankSubType,
        institution: instName,
        institutionId: providerId,
        balance: bal,
        totalBalance: bal,
        nickname: nick,
        accountLabel: `${nick} · ${bankSubType === "checking" ? "Checking" : "Savings"}`,
        accountSubtype: bankSubType,
        name: instName,
        providerId,
        connectedAt: new Date().toISOString(),
        connectionActive: true,
        manualEntry: true,
      });
      setSaving(false);
      handleClose(true);
      return;
    }

    if (flow === "brokerage") {
      const s = Number(String(brkStocksRaw).replace(/,/g, "")) || 0;
      const m = Number(String(brkMutualRaw).replace(/,/g, "")) || 0;
      const b = Number(String(brkBondsRaw).replace(/,/g, "")) || 0;
      const c = Number(String(brkCashRaw).replace(/,/g, "")) || 0;
      let sum = s + m + b + c;
      let breakdown = { stocks: s, mutualFunds: m, bonds: b, cash: c };
      if (bal > 0 && sum <= 0) {
        breakdown = { stocks: 0, mutualFunds: 0, bonds: 0, cash: bal };
        sum = bal;
      } else if (bal > 0 && sum > 0 && Math.abs(sum - bal) > 0.02) {
        const k = bal / sum;
        breakdown = {
          stocks: s * k,
          mutualFunds: m * k,
          bonds: b * k,
          cash: c * k,
        };
      }
      setSaving(true);
      const id = `linked-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      addLinkedAccount({
        id,
        type: "brokerage",
        category: "brokerage",
        institution: instName,
        institutionId: providerId,
        totalBalance: bal,
        balance: bal,
        breakdown,
        nickname: nick,
        accountLabel: `${nick} · Brokerage`,
        name: instName,
        providerId,
        connectedAt: new Date().toISOString(),
        connectionActive: true,
        manualEntry: true,
      });
      setSaving(false);
      handleClose(true);
      return;
    }

    if (flow === "retirement") {
      if (!retirementStyle) {
        setFormError("Choose how this account is mostly invested.");
        return;
      }
      const weights = {
        aggressive: { stocks: 0.85, bonds: 0.1, cash: 0.05 },
        moderate: { stocks: 0.6, bonds: 0.35, cash: 0.05 },
        conservative: { stocks: 0.25, bonds: 0.65, cash: 0.1 },
        unsure: { stocks: 0.5, bonds: 0.4, cash: 0.1 },
      };
      const w = weights[retirementStyle] || weights.unsure;
      const breakdown = {
        stocks: bal * w.stocks,
        bonds: bal * w.bonds,
        cash: bal * w.cash,
      };
      const subType = retirementSubType(institution.providerId);
      setSaving(true);
      const id = `linked-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      addLinkedAccount({
        id,
        type: "retirement",
        category: "retirement",
        subType,
        institution: instName,
        institutionId: providerId,
        totalBalance: bal,
        balance: bal,
        investmentStyle: retirementStyle,
        breakdown,
        nickname: nick,
        accountLabel: `${nick} · ${subType === "401k" ? "401(k)" : subType === "pension" ? "Pension" : "IRA"}`,
        name: instName,
        providerId: institution.providerId,
        connectedAt: new Date().toISOString(),
        connectionActive: true,
        manualEntry: true,
      });
      setSaving(false);
      handleClose(true);
    }
  }, [
    institution,
    flow,
    nickname,
    balanceNum,
    bankSubType,
    brkStocksRaw,
    brkMutualRaw,
    brkBondsRaw,
    brkCashRaw,
    retirementStyle,
    addLinkedAccount,
    handleClose,
  ]);

  if (!open || !institution) return null;

  const displayTitle = institution.name;

  const chipBase = {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 10,
    border: `2px solid ${BORDER}`,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    textAlign: "center",
    fontFamily: "inherit",
    background: "#fff",
  };

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(10, 22, 40, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-acct-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 16,
          padding: "28px 28px 24px",
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.25)",
          border: `1px solid ${BORDER}`,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => handleClose(false)}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>

        <h2
          id="link-acct-modal-title"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: NAVY,
            marginBottom: 8,
            paddingRight: 32,
          }}
        >
          {displayTitle}
        </h2>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, marginBottom: 20 }}>
          Connect your account to see your complete wealth picture in one place.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div
            aria-disabled="true"
            style={{
              borderRadius: 12,
              padding: 16,
              border: `1px solid ${BORDER}`,
              background: "#f1f5f9",
              opacity: 0.72,
              cursor: "not-allowed",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <LockIcon />
              <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>
                Automatic sync (coming soon)
              </span>
            </div>
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>
              Securely connect via your bank&apos;s official API. Available in the full release.
            </p>
          </div>

          <div
            style={{
              borderRadius: 12,
              padding: 16,
              border: `2px solid ${GOLD}`,
              background: "rgba(245, 237, 214, 0.35)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
              Manual entry (available now)
            </div>
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>
              Enter your account details yourself. Takes about a minute.
            </p>
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: MUTED,
              marginBottom: 6,
            }}
          >
            Account nickname
          </label>
          <input
            type="text"
            placeholder='e.g. "My primary account"'
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              marginBottom: 16,
              fontSize: 14,
            }}
          />

          {flow === "bank" ? (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MUTED,
                  marginBottom: 8,
                }}
              >
                Account type
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setBankSubType("checking")}
                  style={{
                    ...chipBase,
                    borderColor: bankSubType === "checking" ? CHECKING_BLUE : BORDER,
                    color: bankSubType === "checking" ? CHECKING_BLUE : NAVY,
                    boxShadow:
                      bankSubType === "checking"
                        ? `inset 0 0 0 2px ${CHECKING_BLUE}`
                        : "none",
                  }}
                >
                  Checking
                </button>
                <button
                  type="button"
                  onClick={() => setBankSubType("savings")}
                  style={{
                    ...chipBase,
                    borderColor: bankSubType === "savings" ? SAVINGS_GREEN : BORDER,
                    color: bankSubType === "savings" ? SAVINGS_GREEN : NAVY,
                    boxShadow:
                      bankSubType === "savings"
                        ? `inset 0 0 0 2px ${SAVINGS_GREEN}`
                        : "none",
                  }}
                >
                  Savings
                </button>
              </div>
            </>
          ) : null}

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: MUTED,
              marginBottom: 6,
            }}
          >
            {flow === "brokerage" || flow === "retirement"
              ? "What is the current balance?"
              : "What is the current balance?"}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={balanceRaw}
            onChange={(e) => setBalanceRaw(e.target.value.replace(/[^\d.]/g, ""))}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              marginBottom: 16,
              fontSize: 14,
            }}
          />

          {flow === "brokerage" ? (
            <>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY,
                  marginBottom: 6,
                }}
              >
                Tell us roughly what&apos;s in this account
              </div>
              {[
                {
                  label: "Stocks / ETFs ($)",
                  ph: "e.g. 12000",
                  val: brkStocksRaw,
                  set: setBrkStocksRaw,
                },
                {
                  label: "Mutual Funds ($)",
                  ph: "e.g. 8000",
                  val: brkMutualRaw,
                  set: setBrkMutualRaw,
                },
                {
                  label: "Bonds / Fixed Income ($)",
                  ph: "e.g. 5000",
                  val: brkBondsRaw,
                  set: setBrkBondsRaw,
                },
                {
                  label: "Cash in account ($)",
                  ph: "e.g. 2000",
                  val: brkCashRaw,
                  set: setBrkCashRaw,
                },
              ].map((row) => (
                <div key={row.label}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: MUTED,
                      marginBottom: 6,
                    }}
                  >
                    {row.label}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={row.ph}
                    value={row.val}
                    onChange={(e) => row.set(e.target.value.replace(/[^\d.]/g, ""))}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${BORDER}`,
                      marginBottom: 12,
                      fontSize: 14,
                    }}
                  />
                </div>
              ))}
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>
                Approximate values are fine — you can update these anytime.
              </p>
            </>
          ) : null}

          {flow === "retirement" ? (
            <>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY,
                  marginBottom: 10,
                }}
              >
                What is this account mostly invested in?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {RETIREMENT_STYLES.map((opt) => {
                  const selected = retirementStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRetirementStyle(opt.id)}
                      style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: selected ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
                        background: selected ? "rgba(245, 237, 214, 0.45)" : "#fff",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{opt.title}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{opt.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {formError ? (
            <p style={{ fontSize: 12, color: "#B45309", marginBottom: 14, lineHeight: 1.45 }}>
              {formError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={saving || !balanceOk}
            onClick={handleSave}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 10,
              border: "none",
              background: GOLD,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: saving || !balanceOk ? "not-allowed" : "pointer",
              opacity: saving || !balanceOk ? 0.55 : 1,
            }}
          >
            Save account
          </button>
        </div>
      </div>
    </div>
  );
}
