import React from "react";
import Svg, { Circle } from "react-native-svg";

export default function KreatifIcon({ size = 26, color = "#9333ea" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" fill={color} fillOpacity={0.15} />
      <Circle cx="12" cy="8" r="2" fill={color} />
      <Circle cx="15.5" cy="10.2" r="1.4" fill={color} fillOpacity={0.7} />
      <Circle cx="15" cy="14.2" r="1.2" fill={color} fillOpacity={0.5} />
      <Circle cx="9.5" cy="14.2" r="1.2" fill={color} fillOpacity={0.5} />
      <Circle cx="8.2" cy="10.5" r="1" fill={color} fillOpacity={0.7} />
    </Svg>
  );
}
