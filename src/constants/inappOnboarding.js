/** Quiz selections between `/` and `/goal` (risk profiler only). */
export const INAPP_QUIZ_INDICES_KEY = "nestegg_inapp_quiz_indices";

/** After email signup: user still needs link-accounts + dashboard unlock. */
export const PENDING_LINK_ACCOUNTS_KEY = "nestegg_pending_link_accounts";

/** After in-app `/goal`: user must visit link-accounts before dashboard. */
export const INAPP_READY_FOR_LINK_KEY = "nestegg_inapp_ready_for_link";

/** Email/password signup finished (quiz + goal stored). */
export const ONBOARDING_COMPLETE_KEY = "nestegg_onboarding_complete";

/**
 * Session-only: new account just created; keep user on sign-up link step until they
 * continue (avoids post-auth redirect racing before `linkChoice` renders).
 */
export const SIGNUP_AWAITING_LINK_CHOICE_KEY = "nestegg_signup_awaiting_link_choice";

/** Legacy global key; new data uses {@link linkedAccountsStorageKey}. */
export const LINKED_ACCOUNTS_STORAGE_KEY = "nestegg_linked_accounts";

/** Per-user linked accounts in localStorage (avoids cross-user leakage). */
export function linkedAccountsStorageKey(email) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return LINKED_ACCOUNTS_STORAGE_KEY;
  return `${LINKED_ACCOUNTS_STORAGE_KEY}::${encodeURIComponent(e)}`;
}

/**
 * @param {string | undefined} email
 * @returns {unknown[]}
 */
export function readLinkedAccountsFromStorageForEmail(email) {
  if (!email) return [];
  const key = linkedAccountsStorageKey(email);
  try {
    let raw = localStorage.getItem(key);
    if (!raw) {
      const legacy = localStorage.getItem(LINKED_ACCOUNTS_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(key, legacy);
          localStorage.removeItem(LINKED_ACCOUNTS_STORAGE_KEY);
          raw = legacy;
        }
      }
    }
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * @param {string | undefined} email
 * @param {unknown[]} accounts
 */
export function writeLinkedAccountsToStorageForEmail(email, accounts) {
  if (!email || !Array.isArray(accounts)) return;
  try {
    localStorage.setItem(
      linkedAccountsStorageKey(email),
      JSON.stringify(accounts),
    );
  } catch {
    /* ignore quota */
  }
}

/** User-logged holdings (not trades); per-user key like linked accounts. */
export const MANUAL_HOLDINGS_STORAGE_KEY = "nestegg_manual_holdings";

export function manualHoldingsStorageKey(email) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return MANUAL_HOLDINGS_STORAGE_KEY;
  return `${MANUAL_HOLDINGS_STORAGE_KEY}::${encodeURIComponent(e)}`;
}

/**
 * @param {string | undefined} email
 * @returns {unknown[]}
 */
export function readManualHoldingsFromStorageForEmail(email) {
  if (!email) return [];
  try {
    const raw = localStorage.getItem(manualHoldingsStorageKey(email));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * @param {string | undefined} email
 * @param {unknown[]} holdings
 */
export function writeManualHoldingsToStorageForEmail(email, holdings) {
  if (!email || !Array.isArray(holdings)) return;
  try {
    localStorage.setItem(
      manualHoldingsStorageKey(email),
      JSON.stringify(holdings),
    );
  } catch {
    /* ignore quota */
  }
}
