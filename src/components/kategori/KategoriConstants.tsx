import {
  LayoutGrid,
  Bike,
  Snowflake,
  Zap,
  Sparkles,
  Laptop,
  GraduationCap,
  Palette,
  Hammer,
  Car,
  CarFront,
  ShieldCheck,
  Baby,
  Gamepad2,
  MoreHorizontal,
} from "lucide-react-native";
import Svg, { Path, Circle } from "react-native-svg";
import React from "react";

export const CATEGORIES = [
  { id: "Semua", label: "Semua Jasa", icon: LayoutGrid, keywords: [] as string[] },
  { id: "Service Elektronik", label: "Service Elektronik", icon: Snowflake, keywords: ["service", "servis", "elektronik", "ac", "kulkas", "mesin cuci", "tv", "freon"] },
  { id: "Tukang", label: "Tukang", icon: Hammer, keywords: ["tukang", "bangunan", "renovasi", "kayu", "las", "cat", "keramik", "batu", "atap", "plafon", "pipa", "sanitasi", "ledeng", "rumah"] },
  { id: "Kelistrikan", label: "Kelistrikan", icon: Zap, keywords: ["listrik", "kabel", "lampu", "konslet", "panel", "saklar", "instalasi"] },
  { id: "Kebersihan Rumah", label: "Kebersihan Rumah", icon: Sparkles, keywords: ["kebersihan", "bersih", "cuci", "pel", "sapu", "setrika", "cleaning", "laundry", "taman", "kebun"] },
  { id: "Antar & Kurir", label: "Antar & Kurir", icon: Bike, keywords: ["antar", "kurir", "kirim", "pindahan", "ojek", "logistik", "angkut"] },
  { id: "Layanan IT & Komputer", label: "Layanan IT & Komputer", icon: Laptop, keywords: ["it", "laptop", "komputer", "hp", "web", "koding", "software", "cctv", "jaringan", "wifi", "digital"] },
  { id: "Otomotif & Bengkel", label: "Otomotif & Bengkel", icon: Car, keywords: ["otomotif", "bengkel", "motor", "mobil", "ban", "oli", "montir", "cuci mobil", "cuci motor"] },
  { id: "Keamanan", label: "Keamanan", icon: ShieldCheck, keywords: ["keamanan", "satpam", "security", "jaga", "ronda"] },
  { id: "Sopir", label: "Sopir", icon: CarFront, keywords: ["sopir", "driver", "mengemudi", "antar jemput"] },
  { id: "Baby Sitter", label: "Baby Sitter", icon: Baby, keywords: ["baby sitter", "babysitter", "asuh", "anak", "pengasuh", "neni"] },
  { id: "Joki", label: "Joki", icon: Gamepad2, keywords: ["joki", "game", "tugas", "titip"] },
  { id: "Edukasi", label: "Edukasi", icon: GraduationCap, keywords: ["edukasi", "les", "tutor", "mengajar", "kursus", "guru", "privat", "belajar"] },
  { id: "Kreatif", label: "Kreatif", icon: Palette, keywords: ["kreatif", "foto", "video", "desain", "seni", "editor", "konten", "musik"] },
  { id: "Lainnya", label: "Lainnya", icon: MoreHorizontal, keywords: ["lainnya", "lain"] },
] as const;

export function RadarIcon({ size = 16, color = "#ea580c" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19.07 4.93a10 10 0 0 0-14.14 0" />
      <Path d="M16.24 7.76a6 6 0 0 0-8.48 0" />
      <Path d="M13.41 10.59a2 2 0 0 0-2.82 0" />
      <Circle cx="12" cy="12" r="1" fill={color} />
      <Path d="M12 12l5 5" />
    </Svg>
  );
}

export function PersonSearchIcon({ size = 30, color = "#ea580c" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="10" cy="8" r="4.5" />
      <Path d="M2.5 20a7.5 7.5 0 0 1 12.5-5.5" />
      <Circle cx="17.5" cy="16.5" r="3" />
      <Path d="m19.7 18.7 2.3 2.3" />
    </Svg>
  );
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
