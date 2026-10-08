import React from "react";
import Svg, { Rect, Circle } from "react-native-svg";

export default function AntarKurirIcon({ size = 26, color = "#2563eb" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="7" width="15" height="10" rx="1" fill={color} fillOpacity={0.2} />
      <Rect x="3" y="7" width="15" height="10" rx="1" stroke={color} strokeWidth={1.5} />
      <Circle cx="7" cy="17" r="2" fill={color} />
      <Circle cx="16" cy="17" r="2" fill={color} />
    </Svg>
  );
}
