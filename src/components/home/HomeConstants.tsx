import React from "react";
import Svg, { Path } from "react-native-svg";
import {
  RumahIcon,
  AntarKurirIcon,
  EdukasiIcon,
  KreatifIcon,
  DigitalITIcon,
  TukangIcon,
  KebersihanIcon,
  LainnyaIcon,
} from "../CategoryIcons";

// 8 Grid Categories persis Screenshot 1 — dipindah dari app/c/home.tsx tanpa perubahan
export const GRID_CATEGORIES: Array<{
  id: string;
  label: string;
  icon: string;
  bgColor: string;
  Icon?: (props: { size?: number; color?: string }) => React.JSX.Element;
}> = [
  { id: "Rumah", label: "Rumah", icon: "🏠", bgColor: "bg-orange-100", Icon: RumahIcon },
  { id: "Antar & Kurir", label: "Antar & Kurir", icon: "🚖", bgColor: "bg-blue-100", Icon: AntarKurirIcon },
  { id: "Edukasi", label: "Edukasi", icon: "📚", bgColor: "bg-amber-100", Icon: EdukasiIcon },
  { id: "Kreatif", label: "Kreatif", icon: "🎨", bgColor: "bg-[#f3e8ff]", Icon: KreatifIcon },
  { id: "Digital & IT", label: "Digital & IT", icon: "🖥️", bgColor: "bg-emerald-100", Icon: DigitalITIcon },
  { id: "Tukang", label: "Tukang", icon: "⚡", bgColor: "bg-pink-100", Icon: TukangIcon },
  { id: "Bersih-bersih", label: "Bersih-bersih", icon: "☑️", bgColor: "bg-cyan-100", Icon: KebersihanIcon },
  { id: "Lainnya", label: "Lainnya", icon: "🎛️", bgColor: "bg-gray-100", Icon: LainnyaIcon },
];

// Ikon bolt identik web (material symbols bolt, fill 1) — dipindah verbatim
export function BoltIcon({ size = 20, color = "#ea580c" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M14 3L7 12h5l-1 9 8-12h-5l0-6z" />
    </Svg>
  );
}
