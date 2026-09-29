/**
 * LinkoraLogo
 *
 * SVG icon component derived from the official Linkora brand identity
 * (docs/design/logo/linkora-icon.svg).  Two overlapping chain-link rectangles
 * — primary violet + secondary cyan — rendered via react-native-svg.
 *
 * Props
 *   size    – rendered width & height (default 40)
 *   color   – overrides both stroke colours with a single value (optional)
 *   testID  – forwarded to the root Svg element
 */

import React from "react";
import Svg, { Rect } from "react-native-svg";

export interface LinkoraLogoProps {
  size?: number;
  /** Optional single-colour override (e.g. for monochrome/loading states). */
  color?: string;
  testID?: string;
}

export function LinkoraLogo({ size = 40, color, testID }: LinkoraLogoProps) {
  const primary = color ?? "#7C3AED";
  const secondary = color ?? "#06B6D4";

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="Linkora logo"
      testID={testID ?? "linkora-logo"}
    >
      {/* Back link — violet */}
      <Rect
        x={4}
        y={8}
        width={24}
        height={24}
        rx={6}
        stroke={primary}
        strokeWidth={4}
        fill="none"
      />
      {/* Front link — cyan */}
      <Rect
        x={20}
        y={16}
        width={24}
        height={24}
        rx={6}
        stroke={secondary}
        strokeWidth={4}
        fill="none"
      />
    </Svg>
  );
}
