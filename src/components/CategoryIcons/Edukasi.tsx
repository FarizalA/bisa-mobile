import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

export default function EdukasiIcon({ size = 26, color = "#d97706" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="14" rx="2" fill={color} fillOpacity={0.2} />
      <Path d="M12 4V18" stroke={color} strokeWidth={1.5} />
      <Path d="M7 8C7 8 9 7.5 12 8C15 8.5 17 8 17 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7 12C7 12 9 11.5 12 12C15 12.5 17 12 17 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
