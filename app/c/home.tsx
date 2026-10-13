import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MapPin,
  Bell,
  Star,
  ChevronRight,
  ChevronDown,
  Briefcase,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useHomeLogic } from "../../src/hooks/useHomeLogic";
import { supabase } from "../../src/lib/supabase";
import ProviderCard from "../../src/components/home/ProviderCard";
import NotificationSheet from "../../src/components/home/NotificationSheet";
import { GRID_CATEGORIES, BoltIcon } from "../../src/components/home/HomeConstants";
import { FlashList } from "@shopify/flash-list";

export default function ClientHomePage() {
  const {
    router,
    user,
    filteredProviders,
    availableProviders,
    loading,
    refreshing,
    onRefresh,
    unreadNotifCount,
    activeSegment,
    setActiveSegment,
    selectedCategory,
    locationName,
    rekomendasiFilter,
    setRekomendasiFilter,
    handleStartChat,
  } = useHomeLogic();

  // Notifikasi bottom-sheet
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rekomendasiVisible, setRekomendasiVisible] = useState(12);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("notifikasi_bisa")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    })();
  }, [user?.id]);

  const markAsRead = async (id: number) => {
    await supabase.from("notifikasi_bisa").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };
  const markAllAsRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifikasi_bisa").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };
  const notifBadge = notifications.filter((n: any) => !n.is_read).length || unreadNotifCount;

  // Title-case name helper
  const formattedFirstName = React.useMemo(() => {
    if (!user?.name) return "Kak";
    const first = user.name.trim().split(/\s+/)[0];
    if (!first) return "Kak";
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }, [user?.name]);

  // Masonry infinite scroll
  const visibleRekomendasi = React.useMemo(
    () => filteredProviders.slice(0, rekomendasiVisible),
    [filteredProviders, rekomendasiVisible]
  );

  const renderRekomendasiItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={{ paddingHorizontal: 6, paddingBottom: 12 }}>
        <ProviderCard
          item={item}
          variant="grid"
          onPress={() => router.push(`/profil/${item.id}` as any)}
          onChatPress={() => handleStartChat(item.id)}
        />
      </View>
    ),
    [router, handleStartChat]
  );

  const keyExtractorRekomendasi = useCallback((item: any) => `rek-${item.id}`, []);

  useEffect(() => {
    setRekomendasiVisible(12);
  }, [rekomendasiFilter, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* 1. Header Bar: Fixed di atas */}
      <View className="bg-white px-4 pt-2 pb-2 flex-row items-center justify-between border-b border-gray-100">
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 95, height: 32 }}
          contentFit="contain"
        />

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/p/home" as any);
            }}
            activeOpacity={0.88}
            className="px-3.5 py-1.5 bg-orange-100 border border-orange-200 rounded-full flex-row items-center gap-1"
          >
            <Text className="text-[11px] font-black text-[#ff6b00]">⇆ Jadi Mitra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNotifications(true);
            }}
            className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center relative"
          >
            <Bell size={18} color="#ff6b00" />
            {notifBadge > 0 && (
              <View className="absolute -top-0.5 -right-0.5 bg-red-600 min-w-[16px] h-[16px] px-1 rounded-full items-center justify-center border border-white">
                <Text className="text-white text-[9px] font-black">
                  {notifBadge > 9 ? "9+" : notifBadge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* MASONRY 2-kolom: Feed utama */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={visibleRekomendasi}
          keyExtractor={keyExtractorRekomendasi}
          numColumns={2}
          renderItem={renderRekomendasiItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ff6b00"]} />}
          ListHeaderComponent={
            <View className="max-w-[420px] w-full self-center">
              {/* 2. Greeting Bar */}
              <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="relative">
                    <TouchableOpacity
                      onPress={() => router.push("/c/profil" as any)}
                      activeOpacity={0.85}
                      className="w-12 h-12 rounded-full bg-orange-100 border-2 border-orange-500/30 shadow-sm overflow-hidden items-center justify-center"
                    >
                      {user?.face_url ? (
                        <Image source={{ uri: user.face_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                      ) : (
                        <Text className="text-[18px] font-black text-[#ff6b00]">
                          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </View>

                  <View className="flex-col">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[17px] font-black text-gray-900 leading-tight">
                        Halo, {formattedFirstName} 👋
                      </Text>
                    </View>

                    <TouchableOpacity activeOpacity={0.7} className="flex-row items-center gap-1 mt-1 bg-orange-50/80 px-2.5 py-0.5 rounded-full border border-orange-100/80 self-start">
                      <MapPin size={12} color="#ff6b00" />
                      <Text className="text-[11px] font-extrabold text-gray-800">{locationName}</Text>
                      <ChevronDown size={11} color="#ff6b00" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 3. Segment Switcher Tabs */}
              <View className="px-4 mt-2">
                <View className="bg-gray-100 p-1 rounded-full flex-row items-center shadow-inner relative">
                  <TouchableOpacity
                    onPress={() => setActiveSegment("cari")}
                    activeOpacity={0.9}
                    className={`flex-1 py-2 rounded-full flex-row items-center justify-center gap-1.5 z-10 ${activeSegment === "cari" ? "bg-[#ff6b00] shadow-sm" : ""}`}
                  >
                    <Text className={`text-sm font-semibold ${activeSegment === "cari" ? "text-white" : "text-gray-600"}`}>
                      Cari Jasa
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.replace("/p/home" as any);
                    }}
                    activeOpacity={0.9}
                    className="flex-1 py-2 rounded-full flex-row items-center justify-center gap-1.5 z-10"
                  >
                    <Briefcase size={15} color="#4b5563" />
                    <Text className="text-sm font-semibold text-gray-600">Tawarkan Jasa</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. 8-Grid Category Cards */}
              <View className="px-4 mt-4">
                <View className="flex-row flex-wrap justify-between gap-y-3.5">
                  {GRID_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push({
                            pathname: "/c/kategori",
                            params: { q: cat.label },
                          });
                        }}
                        activeOpacity={0.75}
                        className="w-[22%] items-center"
                      >
                        <View
                          className={`w-14 h-14 rounded-2xl items-center justify-center mb-1.5 border ${isSelected
                            ? "bg-[#ff6b00] border-[#ff6b00] shadow-md"
                            : `${cat.bgColor} border-black/5`
                            }`}
                        >
                          {cat.Icon ? <cat.Icon size={25} color={isSelected ? "white" : undefined} /> : <Text className="text-[22px]">{cat.icon}</Text>}
                        </View>
                        <Text
                          className={`text-[10.5px] text-center leading-tight ${isSelected ? "font-black text-[#ff6b00]" : "font-bold text-gray-800"}`}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Solusi Cepat Banner Card */}
              <View className="px-4 mt-5">
                <View className="rounded-3xl px-4 py-4 flex-row items-center justify-between relative overflow-hidden border" style={{ backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }}>
                  <View className="flex-1 pr-2 z-10">
                    <View className="bg-orange-600 px-2.5 py-1 rounded-full self-start mb-2 shadow-sm">
                      <Text className="text-white text-[10px] font-bold tracking-wide">Solusi Cepat</Text>
                    </View>

                    <Text className="text-[17px] font-bold text-gray-900 leading-tight">
                      Punya tugas mendesak?
                    </Text>

                    <Text className="text-[11px] text-gray-600 mt-1 mb-3.5 leading-4 font-medium">
                      Posting kebutuhanmu dalam 1 menit, biar mitra BISA langsung memberi penawaran terbaik!
                    </Text>

                    <TouchableOpacity
                      onPress={() => router.push("/c/posting" as any)}
                      activeOpacity={0.85}
                      className="bg-slate-900 px-4 py-2.5 rounded-full self-start flex-row items-center shadow-md"
                    >
                      <Text className="text-white text-[12px] font-bold">Posting Kebutuhan</Text>
                    </TouchableOpacity>
                  </View>

                  <Image
                    source={require("../../assets/mascot.png")}
                    style={{ width: 112, height: 112, transform: [{ scale: 1.1 }] }}
                    resizeMode="contain"
                    className="drop-shadow-md"
                  />
                </View>
              </View>

              {/* 6. Section: Tersedia Sekarang */}
              <View className="mt-6 pb-2">
                <View className="px-4 flex-row items-center justify-between mb-3">
                  <View>
                    <View className="flex-row items-center gap-1.5">
                      <BoltIcon size={18} color="#f97316" />
                      <Text className="text-[19px] font-bold text-slate-900 tracking-tight">Tersedia Sekarang</Text>
                    </View>
                    <Text className="text-xs font-medium text-gray-600 mt-0.5">
                      Mitra aktif dalam radius &lt; 5 km
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push("/c/radar" as any)}
                    activeOpacity={0.7}
                    className="flex-row items-center"
                  >
                    <Text className="text-sm font-bold text-orange-600">Lihat Semua</Text>
                    <ChevronRight size={18} color="#ea580c" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {loading && !refreshing ? (
                  <View className="flex-row gap-3 px-4 py-2">
                    {[1, 2, 3].map((i) => (
                      <View key={i} className="w-[170px] bg-white border border-gray-100 rounded-2xl p-3 gap-3 overflow-hidden opacity-70">
                        <View className="flex-row items-center gap-2">
                          <View className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                          <View className="gap-1.5 flex-1">
                            <View className="h-3 w-3/4 bg-gray-200 rounded-full animate-pulse" />
                            <View className="h-2.5 w-1/2 bg-gray-200 rounded-full animate-pulse" />
                          </View>
                        </View>
                        <View className="h-4 w-full bg-gray-200 rounded-full animate-pulse my-1" />
                        <View className="h-8 w-full bg-slate-100 rounded-xl animate-pulse" />
                      </View>
                    ))}
                  </View>
                ) : (availableProviders ?? filteredProviders).length === 0 ? (
                  <View className="mx-4 bg-gray-100 rounded-xl p-5 items-center justify-center border border-dashed border-gray-300">
                    <Text className="text-2xl opacity-50">🌍</Text>
                    <Text className="text-xs font-bold text-gray-700 mt-1.5 text-center">
                      Belum ada mitra di sekitar
                    </Text>
                    <Text className="text-[9px] text-gray-500 text-center mt-0.5">
                      Jadilah yang pertama menawarkan jasa!
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    horizontal
                    data={availableProviders ?? filteredProviders}
                    keyExtractor={(item) => `avail-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    initialNumToRender={5}
                    maxToRenderPerBatch={3}
                    windowSize={3}
                    removeClippedSubviews={true}
                    getItemLayout={(_, index) => ({
                      length: 182,
                      offset: 182 * index,
                      index,
                    })}
                    renderItem={({ item }) => (
                      <ProviderCard
                        item={item}
                        variant="carousel"
                        onPress={() => router.push(`/profil/${item.id}` as any)}
                        onChatPress={() => handleStartChat(item.id)}
                      />
                    )}
                  />
                )}
              </View>

              {/* 7. Header Rekomendasi Terdekat */}
              <View className="px-4 mt-2">
                <Text className="text-[16px] font-black text-gray-900">Rekomendasi Terdekat</Text>
                <Text className="text-[11px] text-gray-400 mb-3">Paling banyak dipesan di sekitarmu</Text>

                <View style={{ height: 42, marginBottom: 14 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, alignItems: "center" }}
                    style={{ flexGrow: 0 }}
                  >
                    <TouchableOpacity
                      onPress={() => setRekomendasiFilter("semua")}
                      className={`h-9 px-4 rounded-full border items-center justify-center shrink-0 ${rekomendasiFilter === "semua"
                        ? "bg-[#0f172a] border-[#0f172a]"
                        : "bg-gray-100 border-gray-200"
                        }`}
                    >
                      <Text
                        className={`text-[12px] ${rekomendasiFilter === "semua" ? "text-white font-black" : "text-gray-700 font-bold"}`}
                      >
                        Semua
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setRekomendasiFilter("rating")}
                      className={`h-9 px-4 rounded-full flex-row items-center gap-1.5 border shrink-0 ${rekomendasiFilter === "rating"
                        ? "bg-amber-500 border-amber-500"
                        : "bg-[#fff8f0] border-[#ffedd5]"
                        }`}
                    >
                      <Star
                        size={13}
                        color={rekomendasiFilter === "rating" ? "white" : "#f59e0b"}
                        fill={rekomendasiFilter === "rating" ? "white" : "#f59e0b"}
                      />
                      <Text
                        className={`text-[12px] ${rekomendasiFilter === "rating" ? "text-white font-black" : "text-[#c2410c] font-black"}`}
                      >
                        Rating 4.8+
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setRekomendasiFilter("terjangkau")}
                      className={`h-9 px-4 rounded-full border items-center justify-center shrink-0 ${rekomendasiFilter === "terjangkau"
                        ? "bg-blue-600 border-blue-600"
                        : "bg-[#eff6ff] border-[#dbeafe]"
                        }`}
                    >
                      <Text
                        className={`text-[12px] ${rekomendasiFilter === "terjangkau" ? "text-white font-black" : "text-[#2563eb] font-black"}`}
                      >
                        Harga Terjangkau
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setRekomendasiFilter("terpercaya")}
                      className={`h-9 px-4 rounded-full border items-center justify-center shrink-0 ${rekomendasiFilter === "terpercaya"
                        ? "bg-slate-700 border-slate-700"
                        : "bg-[#f1f5f9] border-[#e2e8f0]"
                        }`}
                    >
                      <Text
                        className={`text-[12px] ${rekomendasiFilter === "terpercaya" ? "text-white font-black" : "text-[#334155] font-black"}`}
                      >
                        Mitra Unggulan
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            !loading && visibleRekomendasi.length === 0 ? (
              <View className="mx-4 mt-2 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 items-center max-w-[420px] w-full self-center">
                <Text className="text-sm font-bold text-gray-600 text-center">Belum ada rekomendasi</Text>
                <Text className="text-[11px] text-gray-400 text-center mt-1">Coba ganti filter di atas</Text>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (visibleRekomendasi.length < filteredProviders.length) {
              setRekomendasiVisible((v) => Math.min(v + 12, filteredProviders.length));
            }
          }}
          onEndReachedThreshold={0.45}
          ListFooterComponent={
            visibleRekomendasi.length < filteredProviders.length ? (
              <View className="items-center py-4 max-w-[420px] w-full self-center">
                <ActivityIndicator size="small" color="#ff6b00" />
                <Text className="text-[11px] text-gray-400 mt-1.5">Memuat rekomendasi…</Text>
              </View>
            ) : (
              <View style={{ height: 28 }} />
            )
          }
        />
      </View>

      <NotificationSheet
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        badgeCount={notifBadge}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        variant="client"
        onOpenFullPage={() => { setShowNotifications(false); router.push("/c/notifikasi" as any); }}
      />
    </SafeAreaView>
  );
}
