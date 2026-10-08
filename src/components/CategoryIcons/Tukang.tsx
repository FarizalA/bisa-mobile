import React from "react";
import Svg, { Path } from "react-native-svg";

export default function TukangIcon({ size = 26, color = "#db2777" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" fill={color} fillOpacity={0.2} />
      <Path d="M13 2L7 14H12L11 22L17 10H12L13 2Z" fill={color} />
    </Svg>
  );
}
