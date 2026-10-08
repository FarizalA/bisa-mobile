import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

export default function DigitalITIcon({ size = 26, color = "#059669" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="12" rx="2" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
      <Path d="M8 20H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16V20" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
