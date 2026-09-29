/**
 * BrandedRefreshIndicator
 *
 * A custom pull-to-refresh indicator that wraps React Native's RefreshControl
 * and overlays an animated Linkora logo in place of the default spinner.
 *
 * Behaviour
 * ──────────
 * • While `refreshing` is true  → logo spins continuously (360° / 900 ms).
 * • While the user is pulling but has not reached the threshold (`pullProgress`
 *   0 → 1) → logo scales from 0 → 1 and rotates 0 → 180°.
 * • When released before the threshold (`snapBack` prop) → logo snaps back to
 *   scale 0 with a spring animation.
 * • Reduced-motion  → `useReducedMotion()` from react-native-reanimated detects
 *   the OS "reduce motion" setting; all animations are replaced by an instant
 *   opacity fade (no spinning, no scaling).
 *
 * Usage
 * ──────
 * ```tsx
 * <BrandedRefreshIndicator
 *   refreshing={isRefreshing}
 *   onRefresh={handleRefresh}
 * />
 * ```
 * Pass as the `refreshControl` prop of a ScrollView / FlatList:
 * ```tsx
 * <FlatList
 *   refreshControl={
 *     <BrandedRefreshIndicator refreshing={isRefreshing} onRefresh={onRefresh} />
 *   }
 * />
 * ```
 *
 * The component still renders a standard <RefreshControl> underneath (with
 * `tintColor="transparent"` and `colors={["transparent"]}`) so the native
 * pull-to-refresh gesture and scroll offset machinery continue to work on both
 * iOS and Android.  The animated logo sits in an absolutely-positioned overlay
 * matched to the indicator's resting position.
 */

import React, { useEffect } from "react";
import { RefreshControl, View, StyleSheet, type RefreshControlProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { LinkoraLogo } from "./LinkoraLogo";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandedRefreshIndicatorProps extends Omit<
  RefreshControlProps,
  "tintColor" | "colors" | "progressBackgroundColor"
> {
  /**
   * 0–1 float representing how far the user has pulled relative to the
   * trigger threshold.  When > 1 the threshold is exceeded.
   * Default: derived from `refreshing` (1 when refreshing, 0 otherwise).
   */
  pullProgress?: number;
  /**
   * Set to true when the user releases before reaching the threshold so the
   * indicator snaps back.
   */
  snapBack?: boolean;
  /** Logo size in dp (default 40). */
  logoSize?: number;
  /** Primary stroke colour override (defaults to Linkora violet #7C3AED). */
  color?: string;
  /** Indicator container height in dp (default 60). */
  indicatorHeight?: number;
  /** testID forwarded to root view */
  testID?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SPIN_DURATION_MS = 900;
const SNAP_SPRING_CONFIG = { damping: 14, stiffness: 180 } as const;
const FADE_DURATION_MS = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BrandedRefreshIndicator({
  refreshing,
  onRefresh,
  pullProgress,
  snapBack = false,
  logoSize = 40,
  color,
  indicatorHeight = 60,
  testID = "branded-refresh-indicator",
  ...rest
}: BrandedRefreshIndicatorProps) {
  const reducedMotion = useReducedMotion();

  // Continuous spin angle (0 → 360) while refreshing.
  const spinAngle = useSharedValue(0);

  // Pull-drag scale (0 → 1) and partial-rotate (0 → 180) while dragging.
  const progress = useSharedValue(pullProgress ?? (refreshing ? 1 : 0));

  // Snap-back spring value (1 = visible, 0 = hidden).
  const snapScale = useSharedValue(refreshing ? 1 : 0);

  // Opacity for reduced-motion mode.
  const opacity = useSharedValue(refreshing ? 1 : 0);

  // ── Sync pull progress ────────────────────────────────────────────────────
  useEffect(() => {
    if (pullProgress !== undefined) {
      progress.value = pullProgress;
    }
  }, [pullProgress, progress]);

  // ── Spin while refreshing ─────────────────────────────────────────────────
  useEffect(() => {
    if (refreshing && !reducedMotion) {
      spinAngle.value = 0;
      spinAngle.value = withRepeat(
        withTiming(360, { duration: SPIN_DURATION_MS, easing: Easing.linear }),
        -1, // infinite
        false
      );
    } else {
      cancelAnimation(spinAngle);
      spinAngle.value = 0;
    }
  }, [refreshing, reducedMotion, spinAngle]);

  // ── Snap-back ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (snapBack && !reducedMotion) {
      snapScale.value = withSpring(0, SNAP_SPRING_CONFIG);
    } else if (!snapBack) {
      snapScale.value = refreshing ? 1 : 0;
    }
  }, [snapBack, refreshing, reducedMotion, snapScale]);

  // ── Show / hide when refreshing toggles ───────────────────────────────────
  useEffect(() => {
    if (reducedMotion) {
      opacity.value = withTiming(refreshing ? 1 : 0, { duration: FADE_DURATION_MS });
    } else {
      snapScale.value = withSpring(refreshing ? 1 : 0, SNAP_SPRING_CONFIG);
    }
  }, [refreshing, reducedMotion, opacity, snapScale]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: opacity.value };
    }

    // Clamp progress to [0, 1].
    const clampedProgress = Math.min(1, Math.max(0, progress.value));

    // During pull: scale 0 → 1, rotate 0 → 180°.
    const dragScale = interpolate(clampedProgress, [0, 1], [0, 1]);
    const dragRotate = interpolate(clampedProgress, [0, 1], [0, 180]);

    // While refreshing the spin angle drives rotation; during drag the partial
    // drag rotation applies.
    const rotation = refreshing ? spinAngle.value : dragRotate;

    // Scale: snap-back spring overrides drag scale once refreshing resolves.
    const scale = refreshing ? snapScale.value : dragScale * snapScale.value;

    return {
      transform: [{ scale }, { rotate: `${rotation}deg` }],
    };
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View testID={testID} style={[styles.wrapper, { height: indicatorHeight }]}>
      {/* Native gesture / scroll machinery — invisible */}
      <RefreshControl
        {...rest}
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="transparent"
        colors={["transparent"]}
        progressBackgroundColor="transparent"
        style={StyleSheet.absoluteFillObject}
      />

      {/* Branded overlay */}
      <View
        style={styles.overlay}
        pointerEvents="none"
        accessibilityLabel={refreshing ? "Refreshing feed" : undefined}
        accessibilityRole="progressbar"
        accessibilityState={{ busy: refreshing }}
        importantForAccessibility="yes"
      >
        <Animated.View style={animatedStyle}>
          <LinkoraLogo size={logoSize} color={color} testID="refresh-logo" />
        </Animated.View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    // Must not clip the native RefreshControl which manages its own position.
    overflow: "visible",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
