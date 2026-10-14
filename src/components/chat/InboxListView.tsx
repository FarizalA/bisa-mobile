import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl, ActivityIndicator, Modal } from "react-native";
import { MessageSquare, Clock, Archive, ArchiveRestore, X } from "lucide-react-native";
import { useRouter } from "expo-router";

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status, isMitra }: { status: string; isMitra: boolean }) {
  const map: Record<string, { text: string; bg: string; fg: string }> = {
    menunggu_pembayaran: { text: "Menunggu Pembayaran", bg: "#FFF7ED", fg: "#9A3412" },
    sedang_dikerjakan: { text: "Sedang Dikerjakan", bg: "#EFF6FF", fg: "#1D4ED8" },
    dikerjakan: { text: "Sedang Dikerjakan", bg: "#EFF6FF", fg: "#1D4ED8" },
    selesai: { text: "Selesai", bg: "#ECFDF5", fg: "#047857" },
    dibatalkan: { text: "Dibatalkan", bg: "#FEF2F2", fg: "#B91C1C" },
    ditolak: { text: "Dibatalkan", bg: "#FEF2F2", fg: "#B91C1C" },
    dalam_sengketa: { text: "Dalam Sengketa", bg: "#FEF3C7", fg: "#92400E" },
  };
  const badge = map[status] || { text: "Direct Chat", bg: isMitra ? "#ECFDF5" : "#EEF2FF", fg: isMitra ? "#047857" : "#4338CA" };
  return (
    <View className="px-2 py-0.5 rounded-full border" style={{ backgroundColor: badge.bg, borderColor: badge.fg + "30" } as any}>
      <Text className="text-[10px] font-bold" style={{ color: badge.fg } as any}>{badge.text}</Text>
    </View>
  );
}

interface InboxListViewProps {
  role: "client" | "mitra";
  chats: any[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  activeTab: "all" | "archive";
  onArchiveToggle?: (conversationId: string) => void;
  archivingId?: string | null;
}

export default function InboxListView({ role, chats, loading, refreshing, onRefresh, activeTab, onArchiveToggle, archivingId }: InboxListViewProps) {
  const router = useRouter();
  const isMitra = role === "mitra";
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAFAFA] py-16 gap-3">
        <ActivityIndicator color={isMitra ? "#059669" : "#FF6B00"} />
        <Text className="text-xs font-semibold text-gray-400">Memuat pesan...</Text>
      </View>
    );
  }

  if (chats.length === 0) {
    const isArchiveTab = activeTab === "archive";
    return (
      <View className="flex-1 items-center justify-center px-6 py-16 bg-[#FAFAFA]">
        <View className="bg-white rounded-[24px] border border-gray-100 shadow-sm px-6 py-10 items-center">
          <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-3">
            {isArchiveTab ? <Archive size={28} color="#9CA3AF" /> : <MessageSquare size={32} color="#9CA3AF" />}
          </View>
          <Text className="font-extrabold text-gray-900 text-[15px] mb-1">{isArchiveTab ? "Arsip kosong" : "Belum ada pesan"}</Text>
          <Text className="text-sm text-gray-500 text-center leading-5 max-w-[260px]">
            {isArchiveTab
              ? "Chat yang kamu arsipkan akan muncul di sini. Arsip tidak menghapus histori — bukti transaksi tetap tersimpan."
              : isMitra
                ? "Obrolan akan muncul setelah ada percakapan langsung dari klien."
                : "Belum ada percakapan — yuk mulai pesan jasa dan ngobrol langsung dengan mitra terbaik!"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#FAFAFA]"
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      refreshControl={refreshing !== undefined ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[isMitra ? "#059669" : "#FF6B00"]} /> : undefined}
    >
      <View className="gap-3">
        {chats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            onPress={() => {
              if (chat.conversation_id) {
                const base = isMitra ? "/p/direct-chat" : "/c/direct-chat";
                router.push(`${base}/${chat.conversation_id}` as any);
              }
            }}
            onLongPress={() => {
              if (!onArchiveToggle || !chat.conversation_id) return;
              setConfirmId(chat.conversation_id!);
            }}
            activeOpacity={0.85}
            className="bg-white p-4 rounded-2xl border border-gray-100 flex-row gap-3 shadow-sm"
          >
            <View className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden items-center justify-center">
              {chat.face_url ? (
                <Image source={{ uri: chat.face_url }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="font-bold text-gray-400 text-lg">{(chat.name || "?").charAt(0)}</Text>
              )}
            </View>
            <View className="flex-1 min-w-0 justify-center">
              <View className="flex-row justify-between items-start mb-1">
                <Text className="font-bold text-gray-900 flex-1 pr-2" numberOfLines={1}>{chat.name}</Text>
                <View className="flex-row items-center gap-1">
                  {chat.last_message_time ? <Clock size={10} color="#9CA3AF" /> : null}
                  <Text className="text-[11px] text-gray-400 font-medium">{formatTime(chat.last_message_time)}</Text>
                </View>
              </View>
              <Text className="text-sm text-gray-500" numberOfLines={1}>{chat.last_message}</Text>
              <View className="mt-2 flex-row items-center justify-between">
                <StatusBadge status={chat.status} isMitra={isMitra} />
                {onArchiveToggle && chat.conversation_id ? (
                  <TouchableOpacity
                    onPress={() => onArchiveToggle(chat.conversation_id!)}
                    disabled={archivingId === chat.conversation_id}
                    className="ml-2 w-8 h-8 rounded-full bg-gray-50 border border-gray-200 items-center justify-center"
                    hitSlop={8}
                  >
                    {archivingId === chat.conversation_id ? (
                      <ActivityIndicator size="small" color="#6B7280" />
                    ) : activeTab === "archive" ? (
                      <ArchiveRestore size={14} color="#059669" />
                    ) : (
                      <Archive size={14} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-[10px] text-gray-400 text-center mt-4">Tekan lama pada chat untuk arsipkan / keluarkan dari arsip.</Text>

      <Modal visible={!!confirmId} transparent animationType="fade" onRequestClose={() => setConfirmId(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3.5">
            <View className="flex-row items-center gap-2">
              <View className={`w-9 h-9 rounded-full items-center justify-center ${activeTab === "archive" ? "bg-emerald-100" : "bg-orange-100"}`}>
                {activeTab === "archive" ? <ArchiveRestore size={18} color="#059669" /> : <Archive size={18} color="#EA580C" />}
              </View>
              <Text className="font-black text-gray-900 text-sm flex-1">{activeTab === "archive" ? "Keluarkan dari Arsip" : "Arsipkan Chat"}</Text>
              <TouchableOpacity onPress={() => setConfirmId(null)} className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
                <X size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-600 leading-relaxed">
              {activeTab === "archive" ? "Chat akan kembali ke daftar Semua." : "Chat akan dipindahkan ke Arsip. Histori tetap tersimpan sebagai bukti."}
            </Text>
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity onPress={() => setConfirmId(null)} className="flex-1 py-3 rounded-full border border-gray-200 items-center justify-center">
                <Text className="text-xs font-bold text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (onArchiveToggle && confirmId) onArchiveToggle(confirmId);
                  setConfirmId(null);
                }}
                className="flex-1 py-3 rounded-full bg-gray-900 items-center justify-center"
              >
                <Text className="text-xs font-black text-white">{activeTab === "archive" ? "Keluarkan" : "Arsipkan"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
