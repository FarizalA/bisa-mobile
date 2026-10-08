import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { X, Package, CreditCard, Wallet, Star, Rocket, Settings2, MessageSquare } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
  notifications: any[];
  badgeCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  variant?: "client" | "provider";
  onOpenFullPage?: () => void;
};

function getNotifVisual(typeRaw: string, variant: string) {
  const t = String(typeRaw || "").toLowerCase();
  const isProvider = variant === "provider";
  if (t === "order") return { Icon: Package, bg: isProvider ? "bg-blue-50" : "bg-orange-50", color: isProvider ? "#2563eb" : "#ff6b00" };
  if (t === "payment") return { Icon: CreditCard, bg: isProvider ? "bg-emerald-50" : "bg-emerald-50", color: "#059669" };
  if (t === "wallet") return { Icon: Wallet, bg: "bg-amber-50", color: "#d97706" };
  if (t === "review") return { Icon: Star, bg: "bg-amber-50", color: "#f59e0b" };
  if (t === "delivery") return { Icon: Rocket, bg: isProvider ? "bg-violet-50" : "bg-sky-50", color: isProvider ? "#7c3aed" : "#0284c7" };
  if (t === "chat") return { Icon: MessageSquare, bg: "bg-gray-50", color: "#6b7280" };
  return { Icon: Settings2, bg: "bg-gray-50", color: "#6b7280" };
}

export default function NotificationSheet({
  visible,
  onClose,
  notifications,
  badgeCount,
  onMarkRead,
  onMarkAllRead,
  variant = "client",
  onOpenFullPage,
}: Props) {
  const accent = variant === "provider" ? "emerald" : "orange";
  const badgeBg = variant === "provider" ? "bg-emerald-100" : "bg-orange-100";
  const badgeText = variant === "provider" ? "text-emerald-700" : "text-[#ff6b00]";
  const unreadBorder = variant === "provider" ? "border-emerald-200 bg-emerald-50/60" : "border-orange-200 bg-orange-50/60";
  const dot = variant === "provider" ? "bg-emerald-500" : "bg-[#ff6b00]";
  const link = variant === "provider" ? "text-emerald-600" : "text-[#ff6b00]";
  const router = useRouter();

  const handlePress = async (n: any) => {
    try { Haptics.selectionAsync(); } catch {}
    onMarkRead(n.id);
    // update is_read optimistically, then deep-link
    const type = String(n.type || "").toLowerCase();
    const jobId = n.related_job_id;
    // close sheet first for smooth transition
    onClose();
    setTimeout(async () => {
      try {
        if (type === "wallet") {
          router.push("/p/dompet" as any);
          return;
        }
        if (type === "payment" && jobId) {
          router.push(`/invoice/${jobId}` as any);
          return;
        }
        if (type === "review") {
          router.push((variant === "provider" ? "/p/profil" : "/c/profil") as any);
          return;
        }
        if ((type === "order" || type === "delivery" || type === "chat") && jobId) {
          // try resolve conversation by job_id
          try {
            const { data: byJob } = await supabase.from("conversations").select("id").eq("job_id", jobId).maybeSingle();
            if (byJob?.id) {
              router.push(`/${variant === "provider" ? "p" : "c"}/direct-chat/${byJob.id}?jobId=${jobId}` as any);
              return;
            }
          } catch {}
          // fallback: try fetch pekerjaan to get pelanggan/mitra ids then lookup pair
          try {
            const { data: job } = await supabase.from("pekerjaan_bisa").select("pelanggan_id, mitra_id").eq("id", jobId).maybeSingle();
            if (job?.pelanggan_id && job?.mitra_id) {
              const { data: conv } = await supabase
                .from("conversations")
                .select("id")
                .eq("client_id", job.pelanggan_id)
                .eq("mitra_id", job.mitra_id)
                .eq("type", "direct")
                .order("last_message_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (conv?.id) {
                router.push(`/${variant === "provider" ? "p" : "c"}/direct-chat/${conv.id}?jobId=${jobId}` as any);
                return;
              }
            }
          } catch {}
          router.push(`/invoice/${jobId}` as any);
          return;
        }
        if (jobId) {
          router.push(`/invoice/${jobId}` as any);
          return;
        }
        // system without job
        router.push((variant === "provider" ? "/p/home" : "/c/home") as any);
      } catch (e) {
        console.log("notif deep-link err", e);
      }
    }, 220);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[80%] flex-col">
          <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-gray-900">Notifikasi</Text>
              {badgeCount > 0 && (
                <View className={`px-2 py-0.5 rounded-full ${badgeBg}`}>
                  <Text className={`text-[10px] font-bold ${badgeText}`}>{badgeCount} baru</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              {badgeCount > 0 && (
                <TouchableOpacity onPress={onMarkAllRead}>
                  <Text className={`text-xs font-bold ${link}`}>Tandai Dibaca</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={16} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 24 }}>
            {notifications.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Text className="text-3xl mb-2">🔕</Text>
                <Text className="text-sm font-bold text-gray-900">Tidak ada notifikasi baru</Text>
                <Text className="text-xs text-gray-400 text-center mt-1">Kabar pesanan & aktivitas akun akan muncul di sini.</Text>
              </View>
            ) : (
              <View className="flex-col gap-2.5">
                {notifications.map((n) => {
                  const v = getNotifVisual(n.type, variant);
                  const VIcon = v.Icon;
                  return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => handlePress(n)}
                    activeOpacity={0.82}
                    className={`p-3.5 rounded-xl border flex-row gap-3 ${!n.is_read ? unreadBorder : "border-gray-100 bg-white"}`}
                  >
                    <View className={`w-9 h-9 rounded-full ${v.bg} items-center justify-center shrink-0 mt-0.5`}>
                      <VIcon size={16} color={v.color as any} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text className="text-xs font-bold text-gray-900 flex-1">{n.title || n.judul || "Pemberitahuan"}</Text>
                        {!n.is_read && <View className={`w-2 h-2 rounded-full ${dot} mt-1 shrink-0`} />}
                      </View>
                      <Text className="text-xs text-gray-600 mt-1" numberOfLines={2}>{n.message || n.pesan}</Text>
                      <Text className="text-[10px] text-gray-400 mt-2">{n.created_at ? new Date(n.created_at).toLocaleString("id-ID") : ""}</Text>
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
          {onOpenFullPage ? (
            <TouchableOpacity onPress={onOpenFullPage} className="mx-4 mb-4 py-3 rounded-xl bg-gray-50 border border-gray-200 items-center">
              <Text className="text-xs font-bold text-gray-700">Buka Halaman Notifikasi</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
