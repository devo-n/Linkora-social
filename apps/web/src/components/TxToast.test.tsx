/**
 * TxToast unit tests
 *
 * Covers:
 * - Pending state: spinner, polite live region, correct text
 * - Success state: confirmation text, hash link, polite live region, dismiss button
 * - Error state: assertive live region, error message, dismiss button
 * - Auto-dismiss: success toast disappears after 5 s (fake timers)
 * - Manual dismiss: clicking ✕ removes the toast immediately
 * - Idle state: renders nothing
 * - Accessibility: jest-axe on every state, role/aria checks
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { TxToast } from "./TxToast";
import { TxToastProvider } from "@/contexts/TxToastContext";
import { useTxToast } from "@/hooks/useTxToast";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_HASH = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

/**
 * Renders the TxToast + TxToastProvider and exposes the useTxToast helpers
 * via a trigger component so tests can poke state from outside the tree.
 */
function renderWithProvider() {
  let triggerRef: ReturnType<typeof useTxToast> | null = null;

  function TriggerCapture() {
    const toast = useTxToast();
    triggerRef = toast;
    return null;
  }

  const result = render(
    <TxToastProvider>
      <TriggerCapture />
      <TxToast />
    </TxToastProvider>
  );

  // Throw if the ref wasn't captured — should never happen
  if (!triggerRef) throw new Error("TriggerCapture did not run");
  const toast = triggerRef as ReturnType<typeof useTxToast>;

  return { ...result, toast };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TxToast — idle state", () => {
  it("renders nothing when state is idle", () => {
    renderWithProvider();
    expect(screen.queryByTestId("tx-toast")).not.toBeInTheDocument();
  });
});

describe("TxToast — pending state", () => {
  it("shows pending message", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending("Tipping"));
    const el = screen.getByTestId("tx-toast");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent(/pending/i);
    expect(el).toHaveTextContent(/Tipping/);
  });

  it("uses role=status and aria-live=polite", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending());
    const el = screen.getByTestId("tx-toast");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("renders a spinner SVG", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending());
    // Spinner is an SVG with aria-hidden
    const spinner = document.querySelector('svg[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
  });

  it("uses data-state=pending attribute", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending());
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "pending");
  });

  it("passes axe accessibility check", async () => {
    const { toast, container } = renderWithProvider();
    act(() => toast.pending("Depositing"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("TxToast — success state", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows confirmed text with label", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH, "Tipping"));
    const el = screen.getByTestId("tx-toast");
    expect(el).toHaveTextContent(/confirmed/i);
    expect(el).toHaveTextContent(/Tipping/);
  });

  it("renders a hash link to Stellar Expert", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", expect.stringContaining(FAKE_HASH));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("displays a truncated hash in the link text", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    const link = screen.getByRole("link");
    expect(link.textContent).toContain(FAKE_HASH.slice(0, 8));
    expect(link.textContent).toContain(FAKE_HASH.slice(-6));
  });

  it("uses role=status and aria-live=polite", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    const el = screen.getByTestId("tx-toast");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("uses data-state=success attribute", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "success");
  });

  it("renders a dismiss button", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("auto-dismisses after 5 seconds", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    expect(screen.getByTestId("tx-toast")).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(5_000));

    expect(screen.queryByTestId("tx-toast")).not.toBeInTheDocument();
  });

  it("does not dismiss before 5 seconds", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    act(() => jest.advanceTimersByTime(4_999));
    expect(screen.getByTestId("tx-toast")).toBeInTheDocument();
  });
});

describe("TxToast — success state a11y", () => {
  it("passes axe accessibility check", async () => {
    const { toast, container } = renderWithProvider();
    act(() => toast.success(FAKE_HASH, "Depositing"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 15_000);
});

describe("TxToast — error state", () => {
  it("shows failed text with label and error message", () => {
    const { toast } = renderWithProvider();
    act(() => toast.error("Insufficient balance", "Tipping"));
    const el = screen.getByTestId("tx-toast");
    expect(el).toHaveTextContent(/failed/i);
    expect(el).toHaveTextContent(/Tipping/);
    expect(el).toHaveTextContent(/Insufficient balance/);
  });

  it("uses role=alert and aria-live=assertive", () => {
    const { toast } = renderWithProvider();
    act(() => toast.error("Network error"));
    const el = screen.getByTestId("tx-toast");
    expect(el).toHaveAttribute("role", "alert");
    expect(el).toHaveAttribute("aria-live", "assertive");
  });

  it("uses data-state=error attribute", () => {
    const { toast } = renderWithProvider();
    act(() => toast.error("Oops"));
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "error");
  });

  it("renders a dismiss button", () => {
    const { toast } = renderWithProvider();
    act(() => toast.error("Failed"));
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("does NOT auto-dismiss (error stays until manually dismissed)", () => {
    jest.useFakeTimers();
    const { toast } = renderWithProvider();
    act(() => toast.error("Transaction rejected by wallet"));
    act(() => jest.advanceTimersByTime(10_000));
    expect(screen.getByTestId("tx-toast")).toBeInTheDocument();
    jest.useRealTimers();
  });
});

describe("TxToast — error state a11y", () => {
  it("passes axe accessibility check", async () => {
    const { toast, container } = renderWithProvider();
    act(() => toast.error("Insufficient balance", "Withdrawing"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 15_000);
});

describe("TxToast — manual dismiss", () => {
  it("hides success toast when dismiss button is clicked", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByTestId("tx-toast")).not.toBeInTheDocument();
  });

  it("hides error toast when dismiss button is clicked", () => {
    const { toast } = renderWithProvider();
    act(() => toast.error("Something went wrong"));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByTestId("tx-toast")).not.toBeInTheDocument();
  });

  it("dismiss() helper from useTxToast removes the toast", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending("Creating post"));
    act(() => toast.dismiss());
    expect(screen.queryByTestId("tx-toast")).not.toBeInTheDocument();
  });
});

describe("TxToast — state transitions", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("transitions pending → success", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending("Tipping"));
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "pending");
    act(() => toast.success(FAKE_HASH, "Tipping"));
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "success");
  });

  it("transitions pending → error", () => {
    const { toast } = renderWithProvider();
    act(() => toast.pending("Depositing"));
    act(() => toast.error("Network timeout", "Depositing"));
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "error");
  });

  it("cancels auto-dismiss timer if a new showPending is called before 5s", () => {
    const { toast } = renderWithProvider();
    act(() => toast.success(FAKE_HASH));
    // Trigger another pending before the 5s timer fires
    act(() => {
      jest.advanceTimersByTime(3_000);
      toast.pending("Second tx");
    });
    act(() => jest.advanceTimersByTime(5_000));
    // Should still be showing the pending state (timer was reset)
    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "pending");
  });
});

describe("TxToast — withTxToast wrapper", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows pending then success on resolved promise", async () => {
    const { toast } = renderWithProvider();

    let resolve!: (v: { hash: string }) => void;
    const deferred = new Promise<{ hash: string }>((r) => {
      resolve = r;
    });

    // Start the wrapper (don't await yet)
    let resultPromise: Promise<{ hash: string } | undefined>;
    act(() => {
      resultPromise = toast.withTxToast(() => deferred, "Tipping");
    });

    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "pending");

    // Resolve the deferred
    await act(async () => {
      resolve({ hash: FAKE_HASH });
      await resultPromise!;
    });

    expect(screen.getByTestId("tx-toast")).toHaveAttribute("data-state", "success");
  });

  it("shows pending then error on rejected promise", async () => {
    const { toast } = renderWithProvider();

    let resultPromise: Promise<{ hash: string } | undefined>;
    act(() => {
      resultPromise = toast.withTxToast(
        () => Promise.reject(new Error("User rejected")),
        "Tipping"
      );
    });

    await act(async () => {
      await resultPromise!;
    });

    const el = screen.getByTestId("tx-toast");
    expect(el).toHaveAttribute("data-state", "error");
    expect(el).toHaveTextContent(/User rejected/);
  });

  it("returns undefined when the transaction fails", async () => {
    const { toast } = renderWithProvider();
    let result: { hash: string } | undefined = { hash: "should-be-cleared" };

    await act(async () => {
      result = await toast.withTxToast(() => Promise.reject(new Error("Oops")), "Test");
    });

    expect(result).toBeUndefined();
  });
});
