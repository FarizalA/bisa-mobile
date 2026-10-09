import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  MapPin,
  Bell,
  Star,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Briefcase,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useHomeLogic } from "../../src/hooks/useHomeLogic";
import { supabase } from "../../src/lib/supabase";
import BottomNav from "../../src/components/BottomNav";
import ProviderCard from "../../src/components/home/ProviderCard";
import HomeFilterModal from "../../src/components/home/HomeFilterModal";
import NotificationSheet from "../../src/components/home/NotificationSheet";
import { GRID_CATEGORIES, BoltIcon } from "../../src/components/home/HomeConstants";
import HomeMarketplaceView from "../../src/components/home/HomeMarketplaceView";

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
    searchQuery,
    setSearchQuery,
    activeSegment,
    setActiveSegment,
    selectedCategory,
    setSelectedCategory,
    locationName,
    showFilterModal,
    setShowFilterModal,
    minRating,
    setMinRating,
    sortBy,
    setSortBy,
    onlyTrusted,
    setOnlyTrusted,
    rekomendasiFilter,
    setRekomendasiFilter,
    handleStartChat,
    handleResetFilters,
    isSearchMode,
    setIsSearchMode,
  } = useHomeLogic();



  // Notifikasi bottom-sheet (mirip p/home tapi tema orange client)
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

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

  const isFilterActive = minRating > 0 || onlyTrusted || sortBy !== "terdekat";

  return (
    <SafeAreaView className="flex-1 bg-white">
      {isSearchMode ? (
        <>
          <HomeMarketplaceView
            router={router}
            filteredProviders={filteredProviders}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            locationName={locationName}
            notifBadge={notifBadge}
            setShowNotifications={setShowNotifications}
            setIsSearchMode={setIsSearchMode}
            handleStartChat={handleStartChat}
          />
          <BottomNav active="home" />
        </>
      ) : (
        <>
          {/* 1. Header Bar: Menggunakan Logo PNG Kiri Atas */}
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

          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ff6b00"]} />}
          >
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
                    {/* Badge Online presisi tanpa terpotong overflow */}
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

              {/* 3. Search Bar Input */}
              <View className="px-4 mt-2">
                <View className="h-12 bg-white border border-gray-200 rounded-full px-4 flex-row items-center justify-between shadow-sm">
                  <TouchableOpacity
                    onPress={() => setIsSearchMode(true)}
                    activeOpacity={0.9}
                    className="flex-row items-center gap-2 flex-1 pr-2 h-full"
                  >
                    <Search size={18} color="#9ca3af" />
                    <Text className="flex-1 text-[13px] text-gray-400 font-medium">
                      {searchQuery || "Mau perbaiki apa hari ini?"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowFilterModal(true);
                    }}
                    activeOpacity={0.7}
                    className="w-8 h-8 rounded-full items-center justify-center bg-gray-50 border border-gray-200 shrink-0 relative"
                  >
                    <SlidersHorizontal size={14} color={isFilterActive ? "#ff6b00" : "#4b5563"} />
                    {isFilterActive && (
                      <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#ff6b00] border border-white" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4. Segment Switcher Tabs — animasi halus slide pill */}
              <View className="px-4 mt-3">
                <View className="bg-gray-100 p-1 rounded-full flex-row items-center shadow-inner relative">
                  <TouchableOpacity
                    onPress={() => setActiveSegment("cari")}
                    activeOpacity={0.9}
                    className={`flex-1 py-2 rounded-full flex-row items-center justify-center gap-1.5 z-10 ${activeSegment === "cari" ? "bg-[#ff6b00] shadow-sm" : ""
                      }`}
                  >
                    <Search size={15} color={activeSegment === "cari" ? "#ffffff" : "#4b5563"} />
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

              {/* 5. 8-Grid Category Cards */}
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
                          className={`text-[10.5px] text-center leading-tight ${isSelected ? "font-black text-[#ff6b00]" : "font-bold text-gray-800"
                            }`}
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

              {/* 6. Solusi Cepat Banner Card - disesuaikan plek web */}
              <View className="px-4 mt-5">
                <View className="bg-gradient-to-r from-orange-50 via-orange-50 to-orange-100 border border-orange-100 rounded-3xl px-4 py-4 flex-row items-center justify-between relative overflow-hidden">
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

              {/* 7. Section: Tersedia Sekarang (Persis Web) */}
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
                  // Show a lightweight skeleton placeholder instead of a big spinner
                  <View className="flex-row gap-2 px-4 py-4">
                    {/* 3‑item carousel skeleton */}
                    {[1,2,3].map((i) => (
                      <View key={i} className="w-36 h-36 bg-gray-200 rounded-xl" />
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                  >
                    {(availableProviders ?? filteredProviders).map((item) => (
                      <ProviderCard
                        key={item.id}
                        item={item}
                        variant="carousel"
                        onPress={() => router.push(`/profil/${item.id}` as any)}
                        onChatPress={() => handleStartChat(item.id)}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* 8. Rekomendasi Terdekat 2-Column Grid */}
              <View className="px-4 mt-6">
                <Text className="text-[16px] font-black text-gray-900">Rekomendasi Terdekat</Text>
                <Text className="text-[11px] text-gray-400 mb-3">Paling banyak dipesan di sekitarmu</Text>

                {/* Rekomendasi Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginBottom: 14 }}
                >
                  <TouchableOpacity
                    onPress={() => setRekomendasiFilter("semua")}
                    className={`px-4 py-2 rounded-full border ${rekomendasiFilter === "semua"
                        ? "bg-[#0f172a] border-[#0f172a]"
                        : "bg-gray-100 border-gray-200"
                      }`}
                  >
                    <Text
                      className={`text-[12px] ${rekomendasiFilter === "semua" ? "text-white font-black" : "text-gray-700 font-bold"
                        }`}
                    >
                      Semua
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRekomendasiFilter("rating")}
                    className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 border ${rekomendasiFilter === "rating"
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
                      className={`text-[12px] ${rekomendasiFilter === "rating" ? "text-white font-black" : "text-[#c2410c] font-black"
                        }`}
                    >
                      Rating 4.8+
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRekomendasiFilter("terjangkau")}
                    className={`px-4 py-2 rounded-full border ${rekomendasiFilter === "terjangkau"
                        ? "bg-blue-600 border-blue-600"
                        : "bg-[#eff6ff] border-[#dbeafe]"
                      }`}
                  >
                    <Text
                      className={`text-[12px] ${rekomendasiFilter === "terjangkau" ? "text-white font-black" : "text-[#2563eb] font-black"
                        }`}
                    >
                      Harga Terjangkau
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRekomendasiFilter("terpercaya")}
                    className={`px-4 py-2 rounded-full border ${rekomendasiFilter === "terpercaya"
                        ? "bg-slate-700 border-slate-700"
                        : "bg-[#f1f5f9] border-[#e2e8f0]"
                      }`}
                  >
                    <Text
                      className={`text-[12px] ${rekomendasiFilter === "terpercaya" ? "text-white font-black" : "text-[#334155] font-black"
                        }`}
                    >
                      Mitra Unggulan
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* 2-Column Grid Cards */}
                <View className="flex-row flex-wrap justify-between">
                  {filteredProviders.map((item) => (
                    <ProviderCard
                      key={item.id}
                      item={item}
                      variant="grid"
                      onPress={() => router.push(`/profil/${item.id}` as any)}
                      onChatPress={() => handleStartChat(item.id)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          <BottomNav active="home" />
        </>
      )}

      {/* Shared Filter Modal */}
      <HomeFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        minRating={minRating}
        setMinRating={setMinRating}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onlyTrusted={onlyTrusted}
        setOnlyTrusted={setOnlyTrusted}
        onReset={handleResetFilters}
      />

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
