"use client";

import type { CSSProperties } from "react";
import { useTxToastContext } from "@/contexts/TxToastContext";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stellar Expert base URL — update to mainnet once live */
const STELLAR_EXPERT_BASE = "https://stellar.expert/explorer/testnet/tx";

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Global transaction toast.
 *
 * Renders a fixed overlay in the bottom-right corner that reflects the
 * Soroban transaction lifecycle:
 *
 *   idle → pending → success (auto-dismissed after 5 s) | error
 *
 * Accessibility:
 * - `role="status"` + `aria-live="polite"` for pending/success
 * - `role="alert"` + `aria-live="assertive"` for errors
 * - Dismiss button labelled with `aria-label`
 * - Respects `prefers-reduced-motion` (no CSS animations when reduced)
 *
 * Mount this once in the root layout, inside `<TxToastProvider>`.
 */
export function TxToast() {
  const { toast, dismiss } = useTxToastContext();

  if (toast.state === "idle") return null;

  const label = toast.label ?? "Transaction";

  if (toast.state === "pending") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ ...styles.toast, ...styles.info }}
        data-testid="tx-toast"
        data-state="pending"
      >
        <Spinner />
        <span style={styles.message}>
          <strong>{label}</strong> pending…
        </span>
      </div>
    );
  }

  if (toast.state === "success" && toast.hash) {
    const hash = toast.hash;
    const shortHash = `${hash.slice(0, 8)}…${hash.slice(-6)}`;

    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ ...styles.toast, ...styles.success }}
        data-testid="tx-toast"
        data-state="success"
      >
        <span style={styles.icon} aria-hidden="true">
          ✓
        </span>
        <span style={styles.message}>
          <strong>{label}</strong> confirmed&nbsp;
          <a
            href={`${STELLAR_EXPERT_BASE}/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.hashLink}
            aria-label={`View transaction ${shortHash} on Stellar Expert`}
          >
            {shortHash}&nbsp;↗
          </a>
        </span>
        <button
          onClick={dismiss}
          style={styles.closeBtn}
          aria-label="Dismiss transaction notification"
        >
          ✕
        </button>
      </div>
    );
  }

  if (toast.state === "error") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{ ...styles.toast, ...styles.error }}
        data-testid="tx-toast"
        data-state="error"
      >
        <span style={styles.icon} aria-hidden="true">
          ⚠
        </span>
        <span style={styles.message}>
          <strong>{label}</strong> failed
          {toast.errorMessage ? <span style={styles.sub}>{toast.errorMessage}</span> : null}
        </span>
        <button onClick={dismiss} style={styles.closeBtn} aria-label="Dismiss transaction error">
          ✕
        </button>
      </div>
    );
  }

  return null;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      style={{ animation: "txSpinnerSpin 1s linear infinite", flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M9 2a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <style>{`
        @keyframes txSpinnerSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          svg[aria-hidden="true"] { animation: none; }
        }
      `}</style>
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  toast: {
    position: "fixed",
    bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
    right: "1.5rem",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    border: "1px solid",
    boxShadow: "0 4px 16px -2px rgba(0,0,0,0.2)",
    fontSize: "0.875rem",
    maxWidth: "min(22rem, calc(100vw - 3rem))",
    animation: "txToastSlideIn 200ms ease",
  },
  info: {
    background: "var(--color-info-light, #dbeafe)",
    borderColor: "var(--color-info, #3b82f6)",
    color: "#1e40af",
  },
  success: {
    background: "var(--color-success-light, #d1fae5)",
    borderColor: "var(--color-success, #10b981)",
    color: "#065f46",
  },
  error: {
    background: "var(--color-error-light, #fee2e2)",
    borderColor: "var(--color-error, #ef4444)",
    color: "#991b1b",
  },
  icon: {
    fontSize: "1rem",
    flexShrink: 0,
    fontWeight: 700,
  },
  message: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.1rem",
  },
  sub: {
    fontWeight: 400,
    opacity: 0.85,
    fontSize: "0.8rem",
  },
  hashLink: {
    fontFamily: "var(--font-mono, monospace)",
    fontWeight: 600,
    color: "inherit",
    textDecoration: "underline",
    whiteSpace: "nowrap" as const,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    opacity: 0.6,
    padding: "0 0.25rem",
    color: "inherit",
    flexShrink: 0,
    minHeight: "auto",
    minWidth: "auto",
    lineHeight: 1,
  },
};
