import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import {
  Search,
  MapPin,
  Bell,
  Star,
  SlidersHorizontal,
  ShieldCheck,
  ChevronRight,
  X,
  ArrowLeft,
  ShoppingBag,
  List,
  Map as MapIcon,
  ChevronDown,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { MitraUnggulanBadgeIcon } from "./ProviderCard";

const KATEGORI_JASA = [
  "Semua Jasa",
  "Service AC & Elektronik",
  "Kelistrikan",
  "Tukang & Sanitasi Air",
  "Pertukangan Bangunan",
  "Kebersihan Rumah",
  "Antar & Kurir",
  "Layanan IT & Komputer",
  "Otomotif & Bengkel",
  "Lainnya",
] as const;

interface HomeMarketplaceViewProps {
  router: any;
  filteredProviders: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  locationName: string;
  notifBadge: number;
  setShowNotifications: (v: boolean) => void;
  setIsSearchMode: (v: boolean) => void;
  handleStartChat: (id: number) => void;
}

export default function HomeMarketplaceView({
  router,
  filteredProviders,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  locationName,
  notifBadge,
  setShowNotifications,
  setIsSearchMode,
  handleStartChat,
}: HomeMarketplaceViewProps) {
  const [marketRadius, setMarketRadius] = useState<number>(25);
  const [marketSort, setMarketSort] = useState<"terdekat" | "populer" | "termurah">("terdekat");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [activeDropdown, setActiveDropdown] = useState<"kategori" | "radius" | "harga" | "rating" | "sort" | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [marketRating, setMarketRating] = useState<number>(0);

  const marketplaceProviders = React.useMemo(() => {
    let list = [...filteredProviders];
    if (marketRadius !== 100) list = list.filter((p) => (p.distance_km ?? p.distance ?? 999) <= marketRadius);
    if (minPrice && !isNaN(Number(minPrice))) list = list.filter((p) => (p.price ?? p.base_price ?? 0) >= Number(minPrice));
    if (maxPrice && !isNaN(Number(maxPrice))) list = list.filter((p) => (p.price ?? p.base_price ?? 0) <= Number(maxPrice));
    if (marketRating === -1) list = list.filter((p) => !p.rating || Number(p.rating) === 0);
    else if (marketRating > 0) list = list.filter((p) => Number(p.rating ?? 0) >= marketRating);
    if (marketSort === "terdekat") list.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    else if (marketSort === "populer") list.sort((a, b) => (b.total_orders ?? 0) - (a.total_orders ?? 0));
    else if (marketSort === "termurah") list.sort((a, b) => (a.price ?? a.base_price ?? 999999) - (b.price ?? b.base_price ?? 999999));
    return list;
  }, [filteredProviders, marketRadius, minPrice, maxPrice, marketRating, marketSort]);

  const resetMarketFilters = () => {
    setSelectedCategory(null);
    setMarketRadius(25);
    setMinPrice("");
    setMaxPrice("");
    setMarketRating(0);
    setMarketSort("terdekat");
    setActiveDropdown(null);
  };

  return (
    <>
      {/* Header Search Mode */}
      <View className="bg-white border-b border-gray-100 shadow-sm">
        <View className="h-14 px-4 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 flex-1 min-w-0">
            <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center shrink-0">
              <ShoppingBag size={18} color="#ea580c" />
            </View>
            <Text className="font-bold text-sm text-gray-500" numberOfLines={1}>
              BISA Marketplace
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNotifications(true);
            }}
            className="w-10 h-10 rounded-full items-center justify-center relative"
          >
            <Bell size={22} color="#6b7280" />
            {notifBadge > 0 && (
              <View className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{notifBadge > 9 ? "9+" : notifBadge}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-3 flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => {
              setIsSearchMode(false);
              setSearchQuery("");
            }}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-gray-100 h-11 rounded-full px-3.5 gap-2">
            <Search size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 text-sm font-medium text-gray-900 h-full"
              placeholder="Cari jasa atau keahlian..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} className="w-6 h-6 rounded-full bg-gray-300 items-center justify-center">
                <X size={12} color="#4b5563" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* SearchFilterDropdowns */}
        <View className="px-4 py-2.5 bg-white">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            <TouchableOpacity
              onPress={() => setActiveDropdown(activeDropdown === "kategori" ? null : "kategori")}
              className={`shrink-0 flex-row items-center gap-1 px-3.5 py-1.5 rounded-full ${selectedCategory && selectedCategory !== "Semua Jasa" ? "bg-orange-600" : "bg-gray-100"}`}
            >
              <Text className={`text-xs font-semibold ${selectedCategory && selectedCategory !== "Semua Jasa" ? "text-white" : "text-gray-900"}`}>
                {selectedCategory || "Semua Jasa"}
              </Text>
              <ChevronDown size={14} color={selectedCategory && selectedCategory !== "Semua Jasa" ? "#fff" : "#111827"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveDropdown(activeDropdown === "radius" ? null : "radius")}
              className="shrink-0 flex-row items-center gap-1 px-3.5 py-1.5 rounded-full bg-gray-100"
            >
              <Text className="text-xs font-semibold text-gray-900">
                {marketRadius === 100 ? "> 25 km" : `< ${marketRadius} km`}
              </Text>
              <ChevronDown size={14} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveDropdown(activeDropdown === "harga" ? null : "harga")}
              className={`shrink-0 flex-row items-center gap-1 px-3.5 py-1.5 rounded-full ${minPrice || maxPrice ? "bg-orange-100" : "bg-gray-100"}`}
            >
              <Text className={`text-xs font-semibold ${minPrice || maxPrice ? "text-orange-700" : "text-gray-900"}`}>
                {minPrice || maxPrice ? "Harga Difilter" : "Semua Harga"}
              </Text>
              <ChevronDown size={14} color={minPrice || maxPrice ? "#c2410c" : "#111827"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveDropdown(activeDropdown === "rating" ? null : "rating")}
              className={`shrink-0 flex-row items-center gap-1 px-3.5 py-1.5 rounded-full ${marketRating !== 0 ? "bg-orange-100" : "bg-gray-100"}`}
            >
              <Star size={13} color={marketRating !== 0 ? "#ea580c" : "#eab308"} fill={marketRating !== 0 ? "#ea580c" : "#eab308"} />
              <Text className={`text-xs font-semibold ${marketRating !== 0 ? "text-orange-700" : "text-gray-900"}`}>
                {marketRating === -1 ? "Baru" : marketRating > 0 ? `${marketRating}+` : "Rating"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {activeDropdown === "kategori" && (
            <View className="mt-2 bg-white rounded-xl border border-gray-100 p-2 shadow-lg">
              {KATEGORI_JASA.map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => {
                    setSelectedCategory(k === "Semua Jasa" ? null : k);
                    setActiveDropdown(null);
                  }}
                  className={`px-3 py-2.5 rounded-lg ${(selectedCategory || "Semua Jasa") === k ? "bg-orange-50" : ""}`}
                >
                  <Text className={`text-sm font-medium ${(selectedCategory || "Semua Jasa") === k ? "text-orange-600" : "text-gray-700"}`}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {activeDropdown === "radius" && (
            <View className="mt-2 bg-white rounded-xl border border-gray-100 p-2 shadow-lg">
              {[1, 3, 5, 10, 25, 100].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    setMarketRadius(r);
                    setActiveDropdown(null);
                  }}
                  className={`px-3 py-2.5 rounded-lg ${marketRadius === r ? "bg-orange-50" : ""}`}
                >
                  <Text className={`text-sm font-medium ${marketRadius === r ? "text-orange-600" : "text-gray-700"}`}>
                    {r === 100 ? "> 25 km" : `< ${r} km`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {activeDropdown === "harga" && (
            <View className="mt-2 bg-white rounded-2xl border border-gray-200 p-3.5 shadow-xl gap-2.5 self-stretch">
              <Text className="text-xs font-bold text-gray-900">Rentang Harga (Rp)</Text>
              <View className="flex-row items-center gap-2 min-w-0">
                <TextInput
                  placeholder="Min"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900"
                />
                <Text className="text-gray-400 font-bold shrink-0">-</Text>
                <TextInput
                  placeholder="Max"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900"
                />
              </View>
              <View className="flex-row justify-between items-center pt-1 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => {
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                  activeOpacity={0.7}
                  className="px-2 py-1.5"
                >
                  <Text className="text-xs font-bold text-gray-500">Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveDropdown(null)}
                  activeOpacity={0.85}
                  className="bg-[#ff6b00] px-4 py-2 rounded-xl shadow-sm"
                >
                  <Text className="text-white text-xs font-black">Terapkan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {activeDropdown === "rating" && (
            <View className="mt-2 bg-white rounded-xl border border-gray-100 p-2 shadow-lg">
              {[
                { label: "Semua Rating", val: 0 },
                { label: "Rating 4.5+", val: 4.5 },
                { label: "Rating 4.0+", val: 4.0 },
                { label: "Pengguna Baru", val: -1 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.val}
                  onPress={() => {
                    setMarketRating(opt.val);
                    setActiveDropdown(null);
                  }}
                  className={`px-3 py-2.5 rounded-lg flex-row items-center gap-2 ${marketRating === opt.val ? "bg-orange-50" : ""}`}
                >
                  {opt.val > 0 ? <Star size={12} color="#eab308" fill="#eab308" /> : null}
                  <Text className={`text-sm font-medium flex-1 ${marketRating === opt.val ? "text-orange-600" : "text-gray-700"}`}>{opt.label}</Text>
                  {marketRating === opt.val ? <Text className="text-orange-600 text-sm">✓</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Results Header */}
        <View className="px-4 py-3 flex-row items-center justify-between gap-2 bg-white border-t border-gray-50">
          <View className="flex-row items-center gap-1.5">
            <Text className="font-bold text-lg text-gray-900">{marketplaceProviders.length} provider</Text>
            <Text className="text-xs text-gray-500">ditemukan</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center p-0.5 rounded-full bg-gray-100">
              <TouchableOpacity
                onPress={() => setViewMode("list")}
                className={`w-8 h-8 rounded-full items-center justify-center ${viewMode === "list" ? "bg-orange-600" : ""}`}
              >
                <List size={16} color={viewMode === "list" ? "#ffffff" : "#6b7280"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode("map")}
                className={`w-8 h-8 rounded-full items-center justify-center ${viewMode === "map" ? "bg-orange-600" : ""}`}
              >
                <MapIcon size={16} color={viewMode === "map" ? "#ffffff" : "#6b7280"} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100"
            >
              <Text className="text-xs font-semibold text-gray-900">
                {marketSort === "terdekat" ? "Terdekat" : marketSort === "populer" ? "Populer" : "Termurah"}
              </Text>
              <ChevronDown size={14} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {activeDropdown === "sort" && (
          <View className="mx-4 mb-2 bg-white rounded-xl border border-gray-100 p-1.5 shadow-lg">
            {[
              { val: "terdekat", label: "Terdekat" },
              { val: "populer", label: "Populer" },
              { val: "termurah", label: "Termurah" },
            ].map((opt: any) => (
              <TouchableOpacity
                key={opt.val}
                onPress={() => {
                  setMarketSort(opt.val);
                  setActiveDropdown(null);
                }}
                className={`px-3 py-2.5 rounded-lg flex-row items-center justify-between ${marketSort === opt.val ? "bg-orange-50" : ""}`}
              >
                <Text className={`text-sm font-medium ${marketSort === opt.val ? "text-orange-600" : "text-gray-700"}`}>{opt.label}</Text>
                {marketSort === opt.val ? <Text className="text-orange-600">✓</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results List */}
        {viewMode === "list" ? (
          <View className="px-4 pb-6 flex-col gap-4">
            {loading ? (
              <ActivityIndicator color="#ff6b00" className="py-8" />
            ) : marketplaceProviders.length === 0 ? (
              <Text className="text-center text-gray-500 py-8">Belum ada provider yang cocok. Coba ubah pencarian Anda.</Text>
            ) : (
              marketplaceProviders.map((prov: any) => {
                const dist = prov.distance ?? prov.distance_km;
                const skill = (prov.skill || prov.keahlian || "Penyedia Jasa").replace(/^Lainnya:\s*/i, "");
                const price = prov.price ?? prov.base_price;
                return (
                  <TouchableOpacity
                    key={prov.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      if (prov.is_available !== false) router.push(`/profil/${prov.id}` as any);
                    }}
                    activeOpacity={0.88}
                    disabled={prov.is_available === false}
                    className={`p-4 rounded-[18px] border border-gray-100 ${prov.is_available === false ? "bg-gray-50 opacity-70" : "bg-white"}`}
                    style={{ elevation: 2, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="w-14 h-14 relative shrink-0">
                        <Image
                          source={prov.face_url ? { uri: prov.face_url } : require("../../../assets/mascot.png")}
                          style={{ width: 56, height: 56, borderRadius: 28 }}
                          className="bg-gray-100"
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                        {prov.is_trusted ? (
                          <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white items-center justify-center shadow-sm">
                            <ShieldCheck size={12} color="#16a34a" />
                          </View>
                        ) : null}
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center justify-between gap-1">
                          <Text className="font-bold text-base text-gray-900 flex-1" numberOfLines={1}>
                            {prov.name}
                          </Text>
                          {dist != null ? (
                            <View className="px-2 py-0.5 rounded-full bg-green-100 flex-row items-center gap-1">
                              <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <Text className="text-[10px] font-bold text-green-700">Terdekat</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
                          {skill}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                          <View className="flex-row items-center gap-0.5">
                            <Star size={12} color="#eab308" fill="#eab308" />
                            <Text className="text-xs font-bold text-gray-900">
                              {prov.rating ? Number(prov.rating).toFixed(1) : "New"}
                            </Text>
                          </View>
                          {prov.total_orders ? <Text className="text-xs text-gray-500">({prov.total_orders})</Text> : null}
                          <Text className="text-xs text-gray-300">•</Text>
                          {dist != null ? (
                            <>
                              <View className="flex-row items-center gap-0.5">
                                <MapPin size={12} color="#ea580c" />
                                <Text className="text-xs font-semibold text-orange-600">{dist.toFixed(1)} km</Text>
                              </View>
                              <Text className="text-xs text-gray-300">-</Text>
                            </>
                          ) : null}
                          <Text className="text-xs text-gray-400" numberOfLines={1}>
                            {locationName}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {prov.is_trusted ? (
                      <View className="mt-3 flex-row">
                        <View className="px-2.5 py-1 rounded-full bg-[#ffedd5] border border-[#fed7aa] flex-row items-center gap-1.5">
                          <MitraUnggulanBadgeIcon size={14} />
                          <Text className="text-xs font-bold text-[#c2410c]">Mitra Unggulan</Text>
                        </View>
                      </View>
                    ) : null}

                    <View className="mt-4 -mx-4 -mb-4 p-4 rounded-b-[18px] bg-gray-50 flex-row items-center justify-between gap-3">
                      <View>
                        <Text className="text-xs text-gray-500">Biaya pengerjaan</Text>
                        <Text className="text-lg font-extrabold text-orange-600">{price ? `Rp${Number(price).toLocaleString("id-ID")}` : "Rp -"}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {prov.is_available !== false ? (
                          <TouchableOpacity
                            onPress={(e: any) => {
                              e?.stopPropagation?.();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                              handleStartChat(prov.id);
                            }}
                            activeOpacity={0.75}
                            className="w-9 h-9 rounded-full bg-orange-600 items-center justify-center active:scale-95"
                          >
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="white">
                              <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 11H7v-2h6v2zm3-4H7V7h9v2z" />
                            </Svg>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          disabled={prov.is_available === false}
                          activeOpacity={0.8}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            router.push(`/profil/${prov.id}` as any);
                          }}
                          className={`px-4 h-10 rounded-full flex-row items-center gap-1 active:scale-[0.98] ${prov.is_available === false ? "bg-gray-400" : "bg-orange-600"}`}
                        >
                          <Text className="text-white text-sm font-bold">Lihat Detail</Text>
                          <ChevronRight size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <View className="p-4 rounded-2xl bg-white border border-gray-100 flex-row items-center gap-3 shadow-sm">
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center shrink-0">
                <SlidersHorizontal size={16} color="#ea580c" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-bold text-sm text-gray-900">Belum menemukan yang cocok?</Text>
                <Text className="text-xs text-gray-500">Coba perluas jarak radius atau ganti kata kunci</Text>
              </View>
              <TouchableOpacity onPress={resetMarketFilters} className="px-3 py-1.5 rounded-full bg-gray-100">
                <Text className="text-xs font-bold text-gray-900">Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="px-4 pb-6">
            <View className="h-[420px] rounded-2xl bg-gray-100 border border-gray-200 items-center justify-center">
              <MapIcon size={28} color="#9ca3af" />
              <Text className="text-sm text-gray-500 mt-2 font-medium">Mode Peta • {marketplaceProviders.length} provider</Text>
              <Text className="text-xs text-gray-400">Peta dinamis segera tersedia</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}
