import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

export default function KebersihanIcon({ size = 26, color = "#0891b2" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" fill={color} fillOpacity={0.2} />
      <Path d="M8 12L11 15L16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
