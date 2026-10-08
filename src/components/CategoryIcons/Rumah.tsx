import React from "react";
import Svg, { Path } from "react-native-svg";

export default function RumahIcon({ size = 26, color = "#ea580c" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L12 3L21 11V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V11Z" fill={color} fillOpacity={0.2} />
      <Path d="M9 21V13H15V21" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M3 11L12 3L21 11" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
