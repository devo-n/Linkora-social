"use client";

import { useCallback } from "react";
import { useTxToastContext } from "@/contexts/TxToastContext";

export interface UseTxToastReturn {
  /** Show the "pending" state immediately — call this before awaiting the tx */
  pending: (label?: string) => void;
  /** Show the "confirmed" state with the tx hash */
  success: (hash: string, label?: string) => void;
  /** Show the "failed" state with a human-readable error */
  error: (message: string, label?: string) => void;
  /** Immediately hide the toast */
  dismiss: () => void;
  /**
   * Convenience wrapper: calls `pending`, awaits the supplied async function,
   * then calls `success` or `error` automatically.
   *
   * ```ts
   * const { withTxToast } = useTxToast();
   *
   * await withTxToast(
   *   () => submitTipTransaction(postId, amount),
   *   "Tipping"
   * );
   * ```
   *
   * @param fn      Async function that resolves with a `{ hash: string }`
   * @param label   Optional action label, e.g. "Tipping"
   */
  withTxToast: <T extends { hash: string }>(
    fn: () => Promise<T>,
    label?: string
  ) => Promise<T | undefined>;
}

/**
 * Public hook for triggering the global transaction toast.
 *
 * Must be used inside `<TxToastProvider>` (already included in the root layout).
 *
 * @example — manual control
 * ```ts
 * const { pending, success, error } = useTxToast();
 *
 * async function handleSubmit() {
 *   pending("Creating post");
 *   try {
 *     const result = await createPost(data);
 *     success(result.hash, "Creating post");
 *   } catch (err) {
 *     error(err instanceof Error ? err.message : "Failed", "Creating post");
 *   }
 * }
 * ```
 *
 * @example — automatic wrapper
 * ```ts
 * const { withTxToast } = useTxToast();
 *
 * const result = await withTxToast(() => submitTip(postId, amount), "Tipping");
 * ```
 */
export function useTxToast(): UseTxToastReturn {
  const { showPending, showSuccess, showError, dismiss } = useTxToastContext();

  const withTxToast = useCallback(
    async <T extends { hash: string }>(
      fn: () => Promise<T>,
      label?: string
    ): Promise<T | undefined> => {
      showPending(label);
      try {
        const result = await fn();
        showSuccess(result.hash, label);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transaction failed";
        showError(message, label);
        return undefined;
      }
    },
    [showPending, showSuccess, showError]
  );

  return {
    pending: showPending,
    success: showSuccess,
    error: showError,
    dismiss,
    withTxToast,
  };
}
