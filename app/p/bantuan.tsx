import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Headphones,
  CheckCircle2,
  Clock,
} from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";

const FAQ_ITEMS = [
  {
    q: "Bagaimana cara menarik saldo di Dompet BISA?",
    a: "Masuk ke menu Dompet BISA, pastikan Anda telah menautkan rekening bank atau e-wallet (DANA/GoPay/BCA/dll), lalu klik tombol 'Tarik Dana'. Minimal penarikan adalah Rp 10.000.",
  },
  {
    q: "Berapa lama proses penarikan saldo diproses?",
    a: "Penarikan saldo diproses dalam 1x24 jam kerja setelah diverifikasi oleh admin. Anda dapat memantau statusnya di kartu 'Status Penarikan Pending'.",
  },
  {
    q: "Bagaimana cara menjadi Mitra Unggulan?",
    a: "Masuk ke menu 'Langganan & Kerjasama' di profil Anda, lalu pilih paket booster yang sesuai. Akun Anda akan otomatis diprioritaskan di hasil pencarian radar terdekat.",
  },
  {
    q: "Apa yang harus dilakukan jika ada kendala pekerjaan?",
    a: "Anda dapat berdiskusi melalui chat room dengan klien atau menggunakan tombol 'Batalkan Lamaran/Pekerjaan'. Jika butuh mediasi, silakan hubungi Customer Care melalui formulir chat di bawah.",
  },
];

export default function PusatBantuanPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [tab, setTab] = useState<"faq" | "chat">("faq");

  // Chat State
  const [isChatActive, setIsChatActive] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestData, setGuestData] = useState({ name: "", phone: "", email: "" });
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // Load profile otomatis
  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (stored) {
        setGuestData({
          name: stored.name || "",
          phone: stored.phone || "",
          email: stored.email || "",
        });
      }
    })();
  }, []);

  // Polling chat
  useEffect(() => {
    if (!isChatActive || !sessionId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("guest_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (data) setChatHistory(data);
    };

    fetchMessages();
    const timer = setInterval(fetchMessages, 3000);
    return () => clearInterval(timer);
  }, [isChatActive, sessionId]);

  const handleStartChat = async () => {
    if (!guestData.name.trim() || !guestData.phone.trim()) return;

    setLoading(true);
    const newSessionId = `GUEST_${Date.now()}`;
    setSessionId(newSessionId);

    try {
      await supabase.from("guest_messages").insert({
        session_id: newSessionId,
        guest_name: guestData.name,
        sender: "admin",
        text: `Halo ${guestData.name}! Selamat datang di Pusat Bantuan BISA. Ada yang bisa kami bantu seputar aplikasi?`,
      });
      setIsChatActive(true);
    } catch (e) {
      console.error("Gagal memulai chat:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !sessionId) return;
    const txt = message.trim();
    setMessage("");

    try {
      await supabase.from("guest_messages").insert({
        session_id: sessionId,
        guest_name: guestData.name,
        sender: "user",
        text: txt,
      });
    } catch (e) {
      console.error("Gagal kirim pesan:", e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="h-14 px-4 border-b border-gray-100 flex-row items-center justify-between bg-white">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-extrabold text-gray-900">Pusat Bantuan & FAQ</Text>
            <Text className="text-[10px] text-orange-600 font-bold">Layanan Bantuan 24/7</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-100 px-4 bg-gray-50/50">
        <TouchableOpacity
          onPress={() => setTab("faq")}
          className={`py-3 mr-6 border-b-2 flex-row items-center gap-1.5 ${
            tab === "faq" ? "border-orange-600" : "border-transparent"
          }`}
        >
          <HelpCircle size={16} color={tab === "faq" ? "#FF6B00" : "#6B7280"} />
          <Text className={`text-xs font-bold ${tab === "faq" ? "text-orange-700" : "text-gray-500"}`}>
            Pertanyaan Umum (FAQ)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab("chat")}
          className={`py-3 border-b-2 flex-row items-center gap-1.5 ${
            tab === "chat" ? "border-orange-600" : "border-transparent"
          }`}
        >
          <Headphones size={16} color={tab === "chat" ? "#FF6B00" : "#6B7280"} />
          <Text className={`text-xs font-bold ${tab === "chat" ? "text-orange-700" : "text-gray-500"}`}>
            Chat CS Online
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "faq" ? (
        <ScrollView
          className="flex-1 p-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 16) }}
        >
          <View className="bg-orange-50 rounded-2xl p-4 border border-orange-100 mb-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
              <Headphones size={20} color="#FF6B00" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-extrabold text-orange-950">Butuh respons cepat?</Text>
              <Text className="text-[11px] text-orange-700 mt-0.5">
                Cek jawaban instan di bawah atau hubungi agen CS langsung via tab Chat.
              </Text>
            </View>
          </View>

          <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
            Pertanyaan Populer
          </Text>

          <View className="gap-2.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <View
                  key={idx}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
                >
                  <TouchableOpacity
                    onPress={() => setActiveFaq(isOpen ? null : idx)}
                    className="p-4 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-bold text-gray-800 flex-1 pr-2">{item.q}</Text>
                    {isOpen ? (
                      <ChevronUp size={16} color="#FF6B00" />
                    ) : (
                      <ChevronDown size={16} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                  {isOpen && (
                    <View className="px-4 pb-4 pt-1 bg-gray-50/60 border-t border-gray-50">
                      <Text className="text-xs text-gray-600 leading-relaxed">{item.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => setTab("chat")}
            className="w-full mt-6 py-3.5 bg-orange-600 rounded-2xl items-center justify-center flex-row gap-2 shadow-sm"
          >
            <MessageSquare size={16} color="#FFFFFF" />
            <Text className="text-xs font-extrabold text-white">Hubungi CS Online Sekarang</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {!isChatActive ? (
            <ScrollView
              className="flex-1 p-4"
              contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 16) }}
            >
              <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm items-center text-center">
                <View className="w-14 h-14 rounded-full bg-orange-50 items-center justify-center mb-3">
                  <Headphones size={28} color="#FF6B00" />
                </View>
                <Text className="text-base font-extrabold text-gray-900">Mulai Percakapan CS</Text>
                <Text className="text-xs text-gray-500 text-center mt-1 leading-relaxed">
                  Layanan bantuan langsung terhubung dengan tim Customer Care BISA.
                </Text>
              </View>

              <View className="mt-5 gap-3">
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1">Nama Lengkap *</Text>
                  <TextInput
                    value={guestData.name}
                    onChangeText={(t) => setGuestData({ ...guestData, name: t })}
                    placeholder="Nama Anda"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp / HP *</Text>
                  <TextInput
                    value={guestData.phone}
                    onChangeText={(t) => setGuestData({ ...guestData, phone: t })}
                    placeholder="0812xxxxxxxx"
                    keyboardType="phone-pad"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1">Email (Opsional)</Text>
                  <TextInput
                    value={guestData.email}
                    onChangeText={(t) => setGuestData({ ...guestData, email: t })}
                    placeholder="email@contoh.com"
                    keyboardType="email-address"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleStartChat}
                  disabled={loading}
                  className="w-full mt-3 py-3.5 bg-orange-600 rounded-2xl items-center justify-center flex-row gap-2 shadow-sm"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MessageSquare size={16} color="#FFFFFF" />
                      <Text className="text-xs font-extrabold text-white">Mulai Chat CS Sekarang</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 flex-col">
              <ScrollView
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                className="flex-1 p-4"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {chatHistory.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <View
                      key={msg.id}
                      className={`mb-3 max-w-[80%] ${isUser ? "self-end" : "self-start"}`}
                    >
                      <View
                        className={`p-3 rounded-2xl ${
                          isUser ? "bg-orange-600 rounded-br-none" : "bg-gray-100 rounded-bl-none"
                        }`}
                      >
                        <Text className={`text-xs ${isUser ? "text-white" : "text-gray-900"}`}>
                          {msg.text}
                        </Text>
                      </View>
                      <Text
                        className={`text-[9px] text-gray-400 mt-1 ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Chat Input Footer with safe insets */}
              <View
                className="p-3 border-t border-gray-100 bg-white flex-row items-center gap-2"
                style={{ paddingBottom: Math.max(12, insets.bottom + 8) }}
              >
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ketik pesan keluhan Anda..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-gray-900"
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!message.trim()}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    message.trim() ? "bg-orange-600" : "bg-gray-200"
                  }`}
                >
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
