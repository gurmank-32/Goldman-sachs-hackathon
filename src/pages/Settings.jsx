import { useCallback, useEffect, useMemo, useState } from "react";
import LinkAccountModal from "../components/LinkAccountModal.jsx";
import { MarcusStrokeIcon } from "../components/MarcusStrokeIcon.jsx";
import { useAppContext } from "../store/AppContext.jsx";

const GOLD = "#B8962E";
const NAVY = "#0A1628";
const MUTED = "#64748b";

const LINK_TILE_COLORS = {
  chase: "#117ACA",
  bofa: "#E31837",
  wells: "#D71E28",
  citi: "#003B8E",
  fidelity: "#008000",
  schwab: "#00A0DF",
  robinhood: "#00C805",
  td: "#003366",
  "401k": "#0A1628",
  ira: "#0A1628",
  pension: "#0A1628",
  "other-bank": "#64748b",
  "other-broker": "#64748b",
  "dashboard-add": "#64748b",
  unknown: "#117ACA",
};

function tileColor(account) {
  const id = account?.providerId;
  if (id && LINK_TILE_COLORS[id]) return LINK_TILE_COLORS[id];
  if (account?.category === "retirement") return "#0A1628";
  return "#117ACA";
}

function tileInitial(account) {
  const label = String(account?.accountLabel || account?.name || "?").trim();
  const ch = label.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function formatUsdWhole(n) {
  const x = Number(n) || 0;
  return x.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatSyncedLabel(ms) {
  if (ms == null) return "Synced recently";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Synced just now";
  if (mins === 1) return "Synced 1 minute ago";
  return `Synced ${mins} minutes ago`;
}

export default function Settings() {
  const {
    linkedAccounts,
    removeLinkedAccount,
    updateLinkedAccount,
  } = useAppContext();

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalInst, setLinkModalInst] = useState(null);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);

  const [syncTimes, setSyncTimes] = useState(() => ({}));

  useEffect(() => {
    setSyncTimes((prev) => {
      const next = { ...prev };
      for (const a of linkedAccounts) {
        if (next[a.id] == null) {
          const base = a.connectedAt ? new Date(a.connectedAt).getTime() : Date.now();
          next[a.id] = base - 2 * 60 * 1000;
        }
      }
      return next;
    });
  }, [linkedAccounts]);

  const runRefresh = useCallback(
    (account) => {
      if (!account?.id) return;
      setRefreshingId(account.id);
      window.setTimeout(() => {
        setRefreshingId(null);
        const base = Number(account.balance) || 0;
        const wiggle = 0.985 + Math.random() * 0.03;
        const nextBal = Math.max(0, Math.round(base * wiggle));
        updateLinkedAccount(account.id, {
          connectionActive: true,
          balance: nextBal,
        });
        setSyncTimes((s) => ({ ...s, [account.id]: Date.now() }));
      }, 1100);
    },
    [updateLinkedAccount],
  );

  const accounts = useMemo(
    () => (Array.isArray(linkedAccounts) ? linkedAccounts : []),
    [linkedAccounts],
  );

  return (
    <div>
      <div className="fp-header">
        <h2>Settings</h2>
        <p>Manage linked accounts and security preferences</p>
      </div>

      <section className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: MUTED,
            marginBottom: 12,
          }}
        >
          LINKED ACCOUNTS
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: NAVY, margin: "0 0 8px" }}>
          Your connected accounts
        </h2>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: "0 0 22px" }}>
          All accounts are read-only. We can view balances but never move money without your confirmation.
        </p>

        {accounts.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 16 }}>
            No accounts linked yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {accounts.map((account) => {
              const isActive = account.connectionActive !== false;
              const syncing = refreshingId === account.id;
              return (
                <div
                  key={account.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: tileColor(account),
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 17,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {tileInitial(account)}
                  </div>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>
                      {account.accountLabel || account.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: isActive ? "#22c55e" : "#94a3b8",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
                        {isActive ? "Active" : "Disconnected"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
                      {syncing ? "Syncing…" : formatSyncedLabel(syncTimes[account.id])}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>
                      {formatUsdWhole(account.balance)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={syncing}
                        style={{
                          fontSize: 12,
                          padding: "6px 12px",
                          borderRadius: 8,
                          opacity: syncing ? 0.6 : 1,
                        }}
                        onClick={() => runRefresh(account)}
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "6px 10px",
                          background: "none",
                          border: "none",
                          color: "#9B1C1C",
                          cursor: "pointer",
                        }}
                        onClick={() => setDisconnectTarget(account)}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="btn-outline"
          style={{
            marginTop: 20,
            borderColor: GOLD,
            color: GOLD,
            fontWeight: 600,
            fontSize: 14,
            padding: "10px 18px",
            borderRadius: 10,
          }}
          onClick={() => {
            setLinkModalInst({
              name: "Your institution",
              category: "bank",
              providerId: "dashboard-add",
            });
            setLinkModalOpen(true);
          }}
        >
          + Link another account
        </button>
      </section>

      <section className="card">
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: MUTED,
            marginBottom: 12,
          }}
        >
          SECURITY & PRIVACY
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <MarcusStrokeIcon name="lock" size={22} stroke={NAVY} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Data encryption: 256-bit AES</div>
              <span
                className="badge badge-green"
                style={{ display: "inline-block", marginTop: 8, fontSize: 12, padding: "4px 10px" }}
              >
                Active
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <MarcusStrokeIcon name="shield" size={22} stroke={NAVY} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Read-only access: Enabled</div>
              <span
                className="badge badge-green"
                style={{ display: "inline-block", marginTop: 8, fontSize: 12, padding: "4px 10px" }}
              >
                Active
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <MarcusStrokeIcon name="sliders" size={22} stroke={NAVY} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>
                Auto-disconnect inactive accounts: After 90 days
              </div>
            </div>
          </div>
        </div>
      </section>

      <LinkAccountModal
        open={linkModalOpen && !!linkModalInst}
        institution={linkModalInst}
        onClose={() => {
          setLinkModalOpen(false);
          setLinkModalInst(null);
        }}
      />

      {disconnectTarget ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 10020,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setDisconnectTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-disconnect-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 24px 64px rgba(15, 23, 42, 0.22)",
              border: "1px solid rgba(226, 232, 240, 0.95)",
            }}
          >
            <p
              id="settings-disconnect-title"
              style={{ fontSize: 15, color: NAVY, lineHeight: 1.5, margin: 0 }}
            >
              Disconnect {disconnectTarget.name}? Your data will be removed.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: "10px 18px", borderRadius: 10 }}
                onClick={() => setDisconnectTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "10px 18px", borderRadius: 10 }}
                onClick={() => {
                  removeLinkedAccount(disconnectTarget.id);
                  setDisconnectTarget(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
