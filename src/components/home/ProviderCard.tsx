import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

function getThumb(url?: string | null) {
  if (!url || !url.startsWith("http")) return null;
  if (url.includes("supabase.co") && !url.includes("?")) return `${url}?width=240&height=240&resize=cover&quality=75`;
  return url;
}

export function MitraUnggulanBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.2 13.5L6.5 21L12 18L17.5 21L15.8 13.5" fill="#c2410c" />
      <Circle cx="12" cy="9" r="7.5" fill="#ea580c" stroke="#ffffff" strokeWidth="1" />
      <Circle cx="12" cy="9" r="5.2" fill="#fff" />
      <Path d="M12 5.8L13.1 8L15.5 8.3L13.7 10L14.2 12.4L12 11.2L9.8 12.4L10.3 10L8.5 8.3L10.9 8L12 5.8Z" fill="#ea580c" />
    </Svg>
  );
}

export interface ProviderItem {
  id: number | string;
  name: string;
  skill?: string;
  keahlian?: string;
  kategori?: string | null;
  price?: number;
  base_price?: number;
  rating?: number;
  total_orders?: number;
  distance_km?: number;
  distance?: number;
  is_trusted?: boolean;
  is_featured?: boolean;
  is_featured_active?: boolean;
  subscription_plan?: string | null;
  subscription_until?: string | null;
  is_available?: boolean;
  status?: string;
  face_url?: string | null;
}

interface ProviderCardProps {
  item: ProviderItem;
  variant?: "carousel" | "grid";
  onPress: () => void;
  onChatPress: () => void;
}

function ProviderCardComponent({
  item,
  variant = "grid",
  onPress,
  onChatPress,
}: ProviderCardProps) {
  const isCarousel = variant === "carousel";
  const ratingValue = item.rating ? Number(item.rating) : 0;
  const ratingText = ratingValue > 0 ? ratingValue.toFixed(1) : "New";
  const isNew = ratingValue === 0;

  const rawPrice = item.price ?? item.base_price ?? 0;
  const priceText = rawPrice > 0 ? `Rp${rawPrice.toLocaleString("id-ID")}` : "Rp -";

  const skillText = (item.keahlian || item.skill || "Penyedia Jasa").replace(/^Lainnya:\s*/i, "");
  const distance = item.distance ?? item.distance_km;

  if (isCarousel) {
    const isOnline = item.is_available !== false && item.status !== "Tidak Aktif";
    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        activeOpacity={0.82}
        className="w-[170px] min-w-[170px] max-w-[170px] bg-white border border-gray-100 rounded-2xl overflow-hidden mr-3 flex flex-col flex-shrink-0"
        style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
      >
        {/* Header: Avatar + Name + Rating - plek web p-3 pb-2 gap-2 */}
        <View className="p-3 pb-2 flex-row items-center gap-2">
          <View className="relative flex-shrink-0 w-10 h-10">
            <Image
              source={item.face_url ? { uri: item.face_url } : require("../../../assets/mascot.png")}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              contentFit="cover"
              transition={100}
              cachePolicy="memory-disk"
              priority="low"
              recyclingKey={String(item.id)}
            />
            <View
              className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1">
              <Text className="text-[13px] font-bold text-slate-900 flex-1 leading-tight" numberOfLines={1}>
                {item.name}
              </Text>
              {item.is_featured_active ? <Text className="text-[10px] text-amber-500 font-extrabold">⭐</Text> : null}
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-yellow-400 text-[18px] leading-none">★</Text>
              {isNew ? (
                <Text className="text-[11px] font-bold text-orange-500">New</Text>
              ) : (
                <Text className="text-[11px] font-bold text-slate-800">{ratingText}</Text>
              )}
              {distance != null ? <Text className="text-[10px] text-gray-400">· {distance.toFixed(1)} km</Text> : null}
            </View>
          </View>
        </View>

        {/* Skill - plek web px-3 text-[11px] text-gray-600 mb-2 */}
        <Text className="px-3 text-[11px] text-gray-600 font-medium leading-snug mb-2" numberOfLines={2}>
          {skillText}
        </Text>

        {/* Footer - plek web bg-slate-50 px-3 py-2 + pb 6px */}
        <View className="bg-slate-50 px-3 pt-2 flex-row items-center justify-between mt-auto" style={{ paddingBottom: 14 }}>
          <View className="flex-1 min-w-0">
            <Text className="text-[9px] text-gray-400 font-medium leading-none">Mulai dari</Text>
            <Text className="text-[13px] font-bold text-orange-600 leading-tight" numberOfLines={1}>
              {priceText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onChatPress();
            }}
            activeOpacity={0.75}
            className="w-7 h-7 rounded-full bg-orange-600 items-center justify-center shadow-sm flex-shrink-0"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="white">
              <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 11H7v-2h6v2zm3-4H7V7h9v2z" />
            </Svg>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid - Masonry (tinggi dikunci agar semua card sama)
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      activeOpacity={0.85}
      className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col"
      style={{ height: 268, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 }}
    >
      <View className="relative h-32 bg-gray-200 w-full overflow-hidden">
        <Image
          source={getThumb(item.face_url) ? { uri: getThumb(item.face_url)! } : require("../../../assets/mascot.png")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          priority="low"
          recyclingKey={String(item.id)}
        />
      </View>

      <View className="p-3.5 flex-col" style={{ height: 140 }}>
        {/* Nama mitra: slot 18px, selalu tampil */}
        <View style={{ height: 18 }} className="flex-row items-center">
          <Text className="text-[13px] font-bold text-slate-800 truncate flex-1" numberOfLines={1}>
            {item.name || "Mitra BISA"}
          </Text>
        </View>

        {/* Layanan: slot 30px, max 2 baris */}
        <View style={{ height: 30 }} className="flex-row items-start">
          <Text className="text-[11px] font-medium text-gray-500 leading-[14px] flex-1" numberOfLines={2}>
            {skillText}
          </Text>
        </View>

        {/* Badge: slot 18px + margin */}
        <View style={{ height: 18, marginTop: 6 }} className="flex-row items-center">
          {item.is_trusted ? (
            <View className="bg-[#ffedd5] border border-[#fed7aa] px-2 py-0.5 rounded-full flex-row items-center gap-1">
              <MitraUnggulanBadgeIcon size={12} />
              <Text className="text-[#c2410c] text-[9px] font-bold">Mitra Unggulan</Text>
            </View>
          ) : null}
        </View>

        {/* Footer: rata bawah */}
        <View style={{ marginTop: "auto" }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-1">
              <Text className="text-yellow-400 text-[15px] leading-none">★</Text>
              <Text className="text-[13px] font-bold text-slate-800">{isNew ? "New" : ratingText}</Text>
            </View>
            <Text className="text-[11px] font-medium text-gray-400">
              {distance != null ? `${distance.toFixed(1)} km` : "- km"}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-orange-600 font-bold text-[14px] tracking-tight">{priceText}</Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onChatPress();
              }}
              activeOpacity={0.75}
              className="w-7 h-7 rounded-full bg-orange-600 items-center justify-center shadow-sm"
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="white">
                <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 11H7v-2h6v2zm3-4H7V7h9v2z" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ProviderCard = React.memo(ProviderCardComponent);
export default ProviderCard;

