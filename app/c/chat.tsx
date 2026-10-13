import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, MessageSquare } from "lucide-react-native";
import { safeBack } from "../../src/lib/navigation";
import { fetchInboxChats, toggleArchiveConversation, ChatInboxItem } from "../../src/lib/chatInbox";
import InboxListView from "../../src/components/chat/InboxListView";
import InboxTabBar from "../../src/components/chat/InboxTabBar";

export default function ClientInboxPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "archive">("all");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    try {
      const data = await fetchInboxChats(false, activeTab === "archive");
      setChats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadChats();
  }, [loadChats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const handleArchiveToggle = useCallback(async (conversationId: string) => {
    setArchivingId(conversationId);
    const res = await toggleArchiveConversation(conversationId, false);
    setArchivingId(null);
    if (!res.success) {
      Alert.alert("Gagal", "Gagal mengubah status arsip. Coba lagi.");
      return;
    }
    // Hilangkan dari list saat ini (pindah tab)
    setChats((prev) => prev.filter((c) => String(c.conversation_id) !== conversationId));
  }, []);

  const handleTabChange = (tab: "all" | "archive") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* Header */}
      <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => safeBack(router, "/c/home")} className="w-9 h-9 rounded-full items-center justify-center">
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-extrabold text-gray-900 tracking-tight">Pesan Masuk</Text>
            <Text className="text-[11px] text-gray-500 font-medium">Obrolan pekerjaan Anda</Text>
          </View>
        </View>
        <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center">
          <MessageSquare size={20} color="#FF6B00" />
        </View>
      </View>

      <InboxTabBar activeTab={activeTab} onChange={handleTabChange} accent="#FF6B00" />

      <InboxListView
        role="client"
        chats={chats}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        activeTab={activeTab}
        onArchiveToggle={handleArchiveToggle}
        archivingId={archivingId}
      />
    </SafeAreaView>
  );
}
