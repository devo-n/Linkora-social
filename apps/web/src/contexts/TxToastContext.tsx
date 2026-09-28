"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TxToastState = "pending" | "success" | "error" | "idle";

export interface TxToastData {
  state: TxToastState;
  /** Short human-readable label, e.g. "Tipping", "Depositing" */
  label?: string;
  /** Transaction hash — shown as a truncated link on success */
  hash?: string;
  /** Human-readable error message */
  errorMessage?: string;
}

export interface TxToastContextValue {
  toast: TxToastData;
  showPending: (label?: string) => void;
  showSuccess: (hash: string, label?: string) => void;
  showError: (message: string, label?: string) => void;
  dismiss: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const IDLE: TxToastData = { state: "idle" };

/** Auto-dismiss delay after a successful transaction (ms) */
const SUCCESS_DISMISS_MS = 5_000;

export const TxToastContext = createContext<TxToastContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function TxToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<TxToastData>(IDLE);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(IDLE);
  }, [clearTimer]);

  const showPending = useCallback(
    (label?: string) => {
      clearTimer();
      setToast({ state: "pending", label });
    },
    [clearTimer]
  );

  const showSuccess = useCallback(
    (hash: string, label?: string) => {
      clearTimer();
      setToast({ state: "success", hash, label });
      dismissTimerRef.current = setTimeout(() => {
        setToast(IDLE);
        dismissTimerRef.current = null;
      }, SUCCESS_DISMISS_MS);
    },
    [clearTimer]
  );

  const showError = useCallback(
    (message: string, label?: string) => {
      clearTimer();
      setToast({ state: "error", errorMessage: message, label });
    },
    [clearTimer]
  );

  return (
    <TxToastContext.Provider value={{ toast, showPending, showSuccess, showError, dismiss }}>
      {children}
    </TxToastContext.Provider>
  );
}

// ── Internal hook (consumed by TxToast component) ─────────────────────────────

/** @internal — use `useTxToast` from `@/hooks` at callsites */
export function useTxToastContext(): TxToastContextValue {
  const ctx = useContext(TxToastContext);
  if (!ctx) {
    throw new Error("useTxToastContext must be used inside <TxToastProvider>");
  }
  return ctx;
}
