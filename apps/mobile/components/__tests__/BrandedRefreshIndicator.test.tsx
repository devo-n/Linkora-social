/**
 * Tests for BrandedRefreshIndicator and LinkoraLogo.
 *
 * The react-native-reanimated mock in jest.setup.ts stubs the heavy animation
 * primitives.  We replace the whole module here (which takes precedence over
 * the setup-file mock) so we can:
 *   • make withRepeat / withSpring / withTiming jest.fn() spies
 *   • expose a controllable useReducedMotion per test
 *
 * Query strategy
 * ──────────────
 * react-native-svg is mocked to null-returning stubs so SVG elements don't
 * appear in the tree.  We wrap the logo in a View with a testID to verify
 * render.  Accessibility props on Views are queried via getByTestId +
 * prop inspection, since RNTL v13 maps accessibilityRole/accessibilityState
 * differently on non-native roles (progressbar is not in ARIA's role map).
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Controllable useReducedMotion — declared before jest.mock hoisting.
// ─────────────────────────────────────────────────────────────────────────────
const mockUseReducedMotion = jest.fn<boolean, []>(() => false);

jest.mock("react-native-reanimated", () => {
  const RN = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (c: unknown) => c,
    },
    // Expose as real RN.View so Animated.View renders testable children.
    View: RN.View,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: jest.fn((v: unknown) => v),
    withSpring: jest.fn((v: unknown) => v),
    withRepeat: jest.fn((v: unknown) => v),
    withSequence: (...args: unknown[]) => args[0],
    Easing: { linear: (t: unknown) => t, inOut: (fn: unknown) => fn, ease: 0 },
    cancelAnimation: jest.fn(),
    interpolate: (_v: unknown, _in: unknown, out: unknown[]) => out[0],
    Extrapolation: { CLAMP: "clamp" },
    runOnJS: (fn: unknown) => fn,
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import * as Reanimated from "react-native-reanimated";

// ─────────────────────────────────────────────────────────────────────────────
// Subjects under test
// ─────────────────────────────────────────────────────────────────────────────
import { LinkoraLogo } from "../LinkoraLogo";
import { BrandedRefreshIndicator } from "../BrandedRefreshIndicator";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function renderIndicator(
  props: Partial<React.ComponentProps<typeof BrandedRefreshIndicator>> = {}
) {
  return render(
    <BrandedRefreshIndicator refreshing={false} onRefresh={jest.fn()} testID="bri" {...props} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LinkoraLogo
// ─────────────────────────────────────────────────────────────────────────────
describe("LinkoraLogo", () => {
  it("renders without crashing", () => {
    // react-native-svg is mocked to null stubs so the SVG itself doesn't
    // appear in the RNTL tree.  We verify the component does not throw.
    expect(() => render(<LinkoraLogo />)).not.toThrow();
  });

  it("accepts a custom size prop without error", () => {
    expect(() => render(<LinkoraLogo size={64} />)).not.toThrow();
  });

  it("accepts a colour override without error", () => {
    expect(() => render(<LinkoraLogo color="#FF0000" />)).not.toThrow();
  });

  it("accepts a custom testID without error", () => {
    // testID is forwarded to the Svg element which is mocked; no throw = pass.
    expect(() => render(<LinkoraLogo testID="custom-logo" />)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BrandedRefreshIndicator — rendering
// ─────────────────────────────────────────────────────────────────────────────
describe("BrandedRefreshIndicator — rendering", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it("renders the wrapper view when not refreshing", () => {
    renderIndicator({ refreshing: false });
    expect(screen.getByTestId("bri")).toBeTruthy();
  });

  it("renders the wrapper view when refreshing", () => {
    renderIndicator({ refreshing: true });
    expect(screen.getByTestId("bri")).toBeTruthy();
  });

  it("renders an overlay view with accessibilityRole=progressbar", () => {
    renderIndicator();
    // The overlay View has accessibilityRole="progressbar".
    // Query via testID of the parent and check the tree contains the prop.
    const wrapper = screen.getByTestId("bri");
    // RNTL renders props as-is; check children contain the a11y role.
    expect(wrapper).toBeTruthy();
    // The progressbar overlay is a direct child of the wrapper.
    const { UNSAFE_getAllByProps } = screen;
    const progressbars = UNSAFE_getAllByProps({ accessibilityRole: "progressbar" });
    expect(progressbars.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BrandedRefreshIndicator — spin animation
// ─────────────────────────────────────────────────────────────────────────────
describe("BrandedRefreshIndicator — spin animation", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it("calls withRepeat when refreshing=true with normal motion", () => {
    renderIndicator({ refreshing: true });
    expect(Reanimated.withRepeat).toHaveBeenCalled();
  });

  it("does not call withRepeat when not refreshing", () => {
    renderIndicator({ refreshing: false });
    expect(Reanimated.withRepeat).not.toHaveBeenCalled();
  });

  it("calls cancelAnimation during cleanup (not refreshing)", () => {
    renderIndicator({ refreshing: false });
    expect(Reanimated.cancelAnimation).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BrandedRefreshIndicator — reduced motion
// ─────────────────────────────────────────────────────────────────────────────
describe("BrandedRefreshIndicator — reduced motion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does NOT call withRepeat when reduced motion is active (even while refreshing)", () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderIndicator({ refreshing: true });
    expect(Reanimated.withRepeat).not.toHaveBeenCalled();
  });

  it("calls withTiming (opacity fade) when reduced motion is active while refreshing", () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderIndicator({ refreshing: true });
    expect(Reanimated.withTiming).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BrandedRefreshIndicator — snap-back
// ─────────────────────────────────────────────────────────────────────────────
describe("BrandedRefreshIndicator — snap-back", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it("calls withSpring with target value 0 when snapBack=true", () => {
    renderIndicator({ snapBack: true, refreshing: false });
    const calls = (Reanimated.withSpring as jest.Mock).mock.calls as [unknown][];
    const snapToZero = calls.some(([target]) => target === 0);
    expect(snapToZero).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BrandedRefreshIndicator — accessibility props
// ─────────────────────────────────────────────────────────────────────────────
describe("BrandedRefreshIndicator — accessibility props", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it("sets accessibilityRole=progressbar on the overlay", () => {
    renderIndicator({ refreshing: false });
    const els = screen.UNSAFE_getAllByProps({ accessibilityRole: "progressbar" });
    expect(els.length).toBeGreaterThan(0);
  });

  it("sets accessibilityState.busy=true while refreshing", () => {
    renderIndicator({ refreshing: true });
    // Query by role first, then inspect the accessibilityState prop directly
    // (UNSAFE_getAllByProps uses deep equality which won't match object refs).
    const [el] = screen.UNSAFE_getAllByProps({ accessibilityRole: "progressbar" });
    expect(el.props.accessibilityState).toEqual({ busy: true });
  });

  it("sets accessibilityState.busy=false when idle", () => {
    renderIndicator({ refreshing: false });
    const [el] = screen.UNSAFE_getAllByProps({ accessibilityRole: "progressbar" });
    expect(el.props.accessibilityState).toEqual({ busy: false });
  });

  it("sets accessibilityLabel='Refreshing feed' while refreshing", () => {
    renderIndicator({ refreshing: true });
    const els = screen.UNSAFE_getAllByProps({ accessibilityLabel: "Refreshing feed" });
    expect(els.length).toBeGreaterThan(0);
  });

  it("does NOT set accessibilityLabel when idle", () => {
    renderIndicator({ refreshing: false });
    const els = screen.UNSAFE_queryAllByProps({ accessibilityLabel: "Refreshing feed" });
    expect(els.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BrandedRefreshIndicator — props passthrough
// ─────────────────────────────────────────────────────────────────────────────
describe("BrandedRefreshIndicator — props passthrough", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it("renders with a colour override without crashing", () => {
    expect(() => renderIndicator({ color: "#FF0000" })).not.toThrow();
  });

  it("renders with a custom logoSize without crashing", () => {
    expect(() => renderIndicator({ logoSize: 56 })).not.toThrow();
  });

  it("renders with a custom indicatorHeight without crashing", () => {
    expect(() => renderIndicator({ indicatorHeight: 80 })).not.toThrow();
  });

  it("renders with pullProgress=0.5 without crashing", () => {
    expect(() => renderIndicator({ pullProgress: 0.5 })).not.toThrow();
  });
});
