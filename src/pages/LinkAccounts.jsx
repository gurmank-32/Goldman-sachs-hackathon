import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LinkAccountModal from "../components/LinkAccountModal.jsx";
import { useAppContext, useAuth } from "../store/AppContext.jsx";
import { completeVeriteOnboardingUnlock } from "../utils/authRouting.js";

/**
 * Account linking UI. Linked accounts are saved by AppContext as JSON arrays under the
 * `nestegg_linked_accounts` namespace (per signed-in user key — see inappOnboarding.js).
 */

const GOLD = "#B8962E";
const NAVY = "#0A1628";
const CREAM = "#F9F8F6";
const BORDER = "#E8E4DC";
const MUTED = "#64748b";

const BANKS = [
  { providerId: "chase", name: "Chase", color: "#117ACA", letter: "C" },
  { providerId: "bofa", name: "Bank of America", color: "#E31837", letter: "B" },
  { providerId: "wells", name: "Wells Fargo", color: "#D71E28", letter: "W" },
  { providerId: "citi", name: "Citi", color: "#003B8E", letter: "C" },
];

const BROKERS = [
  { providerId: "fidelity", name: "Fidelity", color: "#008000", letter: "F" },
  { providerId: "schwab", name: "Charles Schwab", color: "#00A0DF", letter: "S" },
  { providerId: "robinhood", name: "Robinhood", color: "#00C805", letter: "R" },
  { providerId: "td", name: "TD Ameritrade", color: "#003366", letter: "T" },
];

const RETIRE = [
  { providerId: "401k", name: "401(k)", color: "#0A1628", letter: "4" },
  { providerId: "ira", name: "IRA / Roth IRA", color: "#0A1628", letter: "I" },
  { providerId: "pension", name: "Pension", color: "#0A1628", letter: "P" },
];

function PlusIcon({ color = GOLD }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function InstitutionCard({ item, category, onConnect, compact = false }) {
  const tile = compact ? 36 : 40;
  const pad = compact ? 12 : 16;
  return (
    <button
      type="button"
      onClick={() => onConnect({ ...item, category })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: pad,
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: tile,
          height: tile,
          borderRadius: 8,
          background: item.color,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: compact ? 14 : 16,
          flexShrink: 0,
        }}
      >
        {item.letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: compact ? 13 : 14,
            fontWeight: 500,
            color: NAVY,
          }}
        >
          {item.name}
        </div>
      </div>
      <span style={{ fontSize: 12, color: GOLD, fontWeight: 600, flexShrink: 0 }}>
        Connect →
      </span>
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: MUTED,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

export default function LinkAccounts() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { linkedAccounts } = useAppContext();
  const [modalInst, setModalInst] = useState(null);
  const [finishOverlay, setFinishOverlay] = useState(false);
  const [linkCancelMsg, setLinkCancelMsg] = useState("");

  const goDashboard = () => {
    completeVeriteOnboardingUnlock();
    navigate("/dashboard", { replace: true });
  };

  const handleConnectAndContinue = () => {
    setFinishOverlay(true);
    window.setTimeout(() => {
      completeVeriteOnboardingUnlock();
      navigate("/dashboard", { replace: true });
    }, 900);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* LEFT — 40% */}
      <aside
        style={{
          flex: "0 0 40%",
          width: "40%",
          maxWidth: "40%",
          background: NAVY,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "40px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#fff",
          }}
        >
          Vérité
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(249, 248, 246, 0.65)",
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          Know what to do next.
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 0,
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.2,
              margin: "0 0 16px",
              color: "#fff",
            }}
          >
            Connect your accounts
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
              margin: "0 0 32px",
              maxWidth: 420,
            }}
          >
            See your complete financial picture in one place. We use read-only access — we can never move your money.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 400 }}>
            {[
              "Bank-level 256-bit encryption",
              "Read-only access — we never touch your money",
              "Disconnect anytime in settings",
            ].map((line) => (
              <div
                key={line}
                style={{
                  borderLeft: `3px solid ${GOLD}`,
                  paddingLeft: 14,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.8)",
                  lineHeight: 1.5,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* RIGHT — 60% */}
      <div
        style={{
          flex: "0 0 60%",
          width: "60%",
          maxWidth: "60%",
          background: CREAM,
          padding: 48,
          boxSizing: "border-box",
          position: "relative",
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => signOut()}
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            fontSize: 13,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            background: "#fff",
            color: NAVY,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign out
        </button>

        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: GOLD,
            margin: "0 0 8px",
          }}
        >
          Step 3 of 3 — optional
        </p>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: NAVY,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Link your financial accounts
        </h2>
        <p
          style={{
            fontSize: 14,
            color: MUTED,
            lineHeight: 1.6,
            margin: "0 0 12px",
            maxWidth: 560,
          }}
        >
          This is optional — you can always add accounts later from your dashboard.
        </p>
        {linkCancelMsg ? (
          <p
            style={{
              fontSize: 13,
              color: MUTED,
              marginBottom: 20,
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            {linkCancelMsg}
          </p>
        ) : null}
        {linkedAccounts.length > 0 ? (
          <p style={{ fontSize: 13, color: "#1A7F5A", marginBottom: 20, fontWeight: 600 }}>
            {linkedAccounts.length} account{linkedAccounts.length === 1 ? "" : "s"} connected this session
          </p>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
          <section>
            <SectionLabel>Bank accounts</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {BANKS.map((b) => (
                <InstitutionCard key={b.providerId} item={b} category="bank" onConnect={setModalInst} />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setModalInst({
                  category: "bank",
                  providerId: "other-bank",
                  name: "Another bank",
                  color: "#64748b",
                  letter: "+",
                })
              }
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: GOLD,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              <PlusIcon />
              Add another bank
            </button>
          </section>

          <section>
            <SectionLabel>Brokerage accounts</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {BROKERS.map((b) => (
                <InstitutionCard key={b.providerId} item={b} category="brokerage" onConnect={setModalInst} />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setModalInst({
                  category: "brokerage",
                  providerId: "other-broker",
                  name: "Another brokerage",
                  color: "#64748b",
                  letter: "+",
                })
              }
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                color: GOLD,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              <PlusIcon />
              Other brokerage
            </button>
          </section>

          <section>
            <SectionLabel>Retirement accounts</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {RETIRE.map((r) => (
                <InstitutionCard
                  key={r.providerId}
                  item={{ ...r, letter: r.letter }}
                  category="retirement"
                  onConnect={setModalInst}
                  compact
                />
              ))}
            </div>
          </section>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
            maxWidth: 720,
          }}
        >
          <button
            type="button"
            onClick={handleConnectAndContinue}
            style={{
              flex: 1,
              padding: "14px 20px",
              borderRadius: 10,
              border: "none",
              background: GOLD,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Connect & continue
          </button>
          <button
            type="button"
            onClick={goDashboard}
            style={{
              flex: 1,
              padding: "14px 20px",
              borderRadius: 10,
              border: `2px solid ${GOLD}`,
              background: "transparent",
              color: GOLD,
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Skip for now, I&apos;ll add later
          </button>
        </div>
      </div>

      <LinkAccountModal
        open={!!modalInst}
        institution={modalInst}
        onClose={({ completed }) => {
          setModalInst(null);
          if (!completed) {
            setLinkCancelMsg(
              "Connection cancelled — you can reconnect anytime from Settings.",
            );
          }
        }}
      />

      {finishOverlay ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            background: "rgba(10, 22, 40, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "36px 48px",
              textAlign: "center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
              animation: "link-finish-pop 0.45s ease-out",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${GOLD}, #d4a84a)`,
                color: "#fff",
                fontSize: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: NAVY }}>You&apos;re all set</div>
            <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>Opening your dashboard…</div>
          </div>
          <style>{`
            @keyframes link-finish-pop {
              from { opacity: 0; transform: scale(0.92); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}
