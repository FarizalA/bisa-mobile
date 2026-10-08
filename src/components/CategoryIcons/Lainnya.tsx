import React from "react";
import Svg, { Rect, Circle } from "react-native-svg";

export default function LainnyaIcon({ size = 26, color = "#64748b" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="3" fill={color} fillOpacity={0.2} />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="15" cy="9" r="1.5" fill={color} />
      <Circle cx="9" cy="15" r="1.5" fill={color} />
      <Circle cx="15" cy="15" r="1.5" fill={color} />
    </Svg>
  );
}
