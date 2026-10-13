import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Star, MapPin, ChevronRight, MessageSquare } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ensureConversationAndNavigate } from "../../lib/chatInbox";
import { MitraUnggulanBadgeIcon } from "../home/ProviderCard";

function getThumb(url?: string | null) {
  if (!url || !url.startsWith("http")) return null;
  if (url.includes("supabase.co") && !url.includes("?")) return `${url}?width=120&height=120&resize=cover&quality=70`;
  return url;
}

function KategoriProviderCardComponent({ prov }: { prov: any }) {
  const router = useRouter();
  const isOnline = prov.is_available !== false && prov.status !== "Tidak Aktif";
  const skills = (prov.keahlian || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const ratingNum = prov.rating ? Number(prov.rating).toFixed(1) : null;
  const price = prov.base_price;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/profil/${prov.id}` as any)}
      activeOpacity={0.92}
      className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex-col gap-3"
    >
      <View className="flex-row items-start gap-3.5">
        <View className="relative shrink-0">
          <Image
            source={getThumb(prov.face_url) ? { uri: getThumb(prov.face_url)! } : require("../../../assets/mascot.png")}
            style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: "#f1f5f9" }}
            contentFit="cover"
            transition={100}
            cachePolicy="memory-disk"
            priority="low"
            recyclingKey={String(prov.id)}
          />
          <View className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between gap-1">
            <Text className="text-[15px] font-extrabold text-slate-900 flex-1" numberOfLines={1}>{prov.name}</Text>
            <View className="flex-row items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shrink-0">
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-xs font-black text-amber-900">{ratingNum || "Baru"}</Text>
              {prov.total_orders ? <Text className="text-[10px] font-semibold text-amber-700">({prov.total_orders})</Text> : null}
            </View>
          </View>
          <View className="flex-row items-center gap-1 mt-1">
            <MapPin size={12} color="#94a3b8" />
            <Text className="text-[11px] font-medium text-slate-500 flex-1" numberOfLines={1}>
              {prov.alamat_singkat || prov.address || "Lokasi Mitra Terverifikasi"}
            </Text>
            {prov.distance != null ? (
              <Text className="text-[11px] font-bold text-orange-600 shrink-0">• {prov.distance.toFixed(1)} km</Text>
            ) : null}
          </View>
          <View className="flex-row flex-wrap gap-1 mt-2">
            {skills.length > 0 ? (
              skills.slice(0, 3).map((skill: string, idx: number) => (
                <View key={idx} className="px-2 py-0.5 rounded-md bg-slate-100">
                  <Text className="text-[10px] font-bold text-slate-700">{skill.replace(/^Lainnya:\s*/i, "")}</Text>
                </View>
              ))
            ) : (
              <View className="px-2 py-0.5 rounded-md bg-slate-100">
                <Text className="text-[10px] font-bold text-slate-600">Penyedia Jasa</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {prov.is_trusted ? (
        <View className="flex-row">
          <View className="bg-[#ffedd5] border border-[#fed7aa] px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
            <MitraUnggulanBadgeIcon size={12} />
            <Text className="text-[#c2410c] text-[10px] font-bold">Mitra Unggulan</Text>
          </View>
        </View>
      ) : null}
      <View className="pt-2.5 border-t border-slate-100 flex-row items-center justify-between gap-3">
        <View>
          <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Perkiraan Biaya</Text>
          <Text className="text-sm font-black text-orange-600">{price ? `Rp${Number(price).toLocaleString("id-ID")}` : "Menyesuaikan"}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              try {
                const convId = await ensureConversationAndNavigate(String(prov.id));
                if (convId) {
                  router.push(`/c/direct-chat/${convId}` as any);
                  return;
                }
              } catch {}
              router.push("/c/chat" as any);
            }}
            className="px-3.5 h-8 rounded-xl border border-slate-300 flex-row items-center gap-1"
          >
            <MessageSquare size={14} color="#334155" />
            <Text className="text-slate-700 font-bold text-xs">Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/profil/${prov.id}` as any)} className="px-4 h-8 rounded-xl bg-orange-600 flex-row items-center gap-1 shadow-sm">
            <Text className="text-white font-bold text-xs">Order</Text>
            <ChevronRight size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const KategoriProviderCard = React.memo(KategoriProviderCardComponent);
export default KategoriProviderCard;
