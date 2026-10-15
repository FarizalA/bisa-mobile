import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, RefreshControl, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import { CATEGORIES, calculateDistance, PersonSearchIcon } from "../../src/components/kategori/KategoriConstants";
import KategoriHeader from "../../src/components/kategori/KategoriHeader";
import { CategoryPills, SortFilterBar } from "../../src/components/kategori/KategoriFilters";
import { KategoriPromoBanner } from "../../src/components/kategori/KategoriListState";
import KategoriProviderCard from "../../src/components/kategori/KategoriProviderCard";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";

export default function KategoriPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const initialCat = params.q || "Semua Jasa";

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"populer" | "rating" | "termurah" | "terdekat">("rating");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (params.q) {
      setSelectedCategory(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (e) {
        console.warn("Location error:", e);
      }
    })();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const storedUser: any = await getStoredUser();
      let query = supabase
        .from("users_bisa")
        .select("id, name, phone, email, address, alamat_singkat, face_url, latitude, longitude, kyc_status, rating, total_orders, is_available, status, kategori, keahlian, keahlian_detail, base_price, is_trusted, role, is_featured, subscription_plan, subscription_until")
        .eq("kyc_status", "Terverifikasi")
        .neq("kyc_status", "Dibekukan");

      if (storedUser?.id) {
        query = query.neq("id", storedUser.id);
      }

      const { data, error } = await query;
      if (error) console.error("Gagal mengambil data mitra:", error);
      if (data) setProviders(data);
    } catch (err) {
      console.error("Error fetching providers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviders();
  };

  const filteredProviders = useMemo(() => {
    let result = [...providers];

    if (
      selectedCategory &&
      selectedCategory !== "Semua" &&
      selectedCategory !== "Semua Kategori" &&
      selectedCategory !== "Semua Jasa"
    ) {
      const catObj = CATEGORIES.find(
        (c) =>
          c.id.toLowerCase() === selectedCategory.toLowerCase() ||
          c.label.toLowerCase() === selectedCategory.toLowerCase()
      );

      const isWord = (text: string, kw: string) => {
        const k = kw.toLowerCase().trim();
        if (k.length <= 3) return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
        return text.includes(k);
      };

      result = result.filter((prov) => {
        const sel = selectedCategory.toLowerCase().trim();
        const selLabel = (catObj?.label || "").toLowerCase().trim();
        const selId = (catObj?.id || "").toLowerCase().trim();
        const kat = (prov.kategori || "").toLowerCase().trim();
        const keahlian = (prov.keahlian || "").toLowerCase();
        const bio = (prov.keahlian_detail || prov.bio || "").toLowerCase();
        const nama = (prov.name || "").toLowerCase();

        if (kat && (kat === sel || kat === selLabel || kat === selId)) return true;

        // Cocokkan lewat kata kunci kategori (keahlian teks-bebas, nama, bio)
        if (catObj && catObj.keywords.length > 0) {
          return catObj.keywords.some((kw) => isWord(keahlian, kw) || isWord(bio, kw) || isWord(nama, kw));
        }
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((prov) => {
        const name = (prov.name || "").toLowerCase();
        const keahlian = (prov.keahlian || "").toLowerCase();
        const address = (prov.address || prov.alamat_singkat || "").toLowerCase();
        return name.includes(q) || keahlian.includes(q) || address.includes(q);
      });
    }

    if (onlyAvailable) {
      result = result.filter((prov) => prov.is_available !== false && prov.status !== "Tidak Aktif");
    }

    result = result.map((prov) => {
      let distance: number | null = null;
      if (userLocation && prov.latitude && prov.longitude) {
        distance = calculateDistance(userLocation.lat, userLocation.lng, Number(prov.latitude), Number(prov.longitude));
      }
      return { ...prov, distance };
    });

    if (sortBy === "rating") {
      result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "populer") {
      result.sort((a, b) => (Number(b.total_orders) || 0) - (Number(a.total_orders) || 0));
    } else if (sortBy === "termurah") {
      result.sort((a, b) => (Number(a.base_price) || 99999999) - (Number(b.base_price) || 99999999));
    } else if (sortBy === "terdekat") {
      result.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }

    return result;
  }, [providers, selectedCategory, searchQuery, onlyAvailable, sortBy, userLocation]);

  const activeCatObject = CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === selectedCategory.toLowerCase() ||
      c.label.toLowerCase() === selectedCategory.toLowerCase()
  );
  const displayTitle = activeCatObject?.label || selectedCategory || "Semua Jasa";

  const resetFilters = () => {
    setSelectedCategory("Semua Jasa");
    setSearchQuery("");
    setSortBy("rating");
    setOnlyAvailable(false);
  };

  // FlashList: renderItem + keyExtractor dimemo agar recycling tidak trigger re-render liar
  const renderItem = useCallback(({ item }: { item: any }) => (
    <View className="mb-3.5 max-w-[440px] w-full self-center">
      <KategoriProviderCard prov={item} />
    </View>
  ), []);

  const keyExtractor = useCallback((item: any) => `kat-${item.id}`, []);

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <KategoriHeader
        displayTitle={displayTitle}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <CategoryPills
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <SortFilterBar
        loading={loading}
        count={filteredProviders.length}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onlyAvailable={onlyAvailable}
        setOnlyAvailable={setOnlyAvailable}
        hasLocation={Boolean(userLocation)}
      />

      {/* Shopify FlashList v2: auto-measure layout */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={filteredProviders}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ff6b00"]} />}
          ListHeaderComponent={
            <View className="mb-3 max-w-[440px] w-full self-center">
              <KategoriPromoBanner />
              {loading && !refreshing && <ActivityIndicator color="#ff6b00" className="py-8" />}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View className="mt-4 bg-white rounded-3xl border border-slate-100 p-8 items-center justify-center shadow-sm max-w-[440px] w-full self-center">
                <View className="w-16 h-16 rounded-2xl bg-orange-50 items-center justify-center mb-3.5 border border-orange-100/50">
                  <PersonSearchIcon size={32} color="#ea580c" />
                </View>
                <Text className="text-base font-black text-slate-900 text-center">Tidak ada mitra ditemukan</Text>
                <Text className="text-xs text-slate-400 text-center mt-1.5 max-w-[260px] leading-relaxed">
                  {searchQuery ? `Tidak ada hasil untuk "${searchQuery}". Coba kata kunci lain.` : "Belum ada mitra terverifikasi untuk kategori ini di lokasimu."}
                </Text>
                <View className="flex-row items-center gap-3 mt-6">
                  {(searchQuery || selectedCategory !== "Semua Jasa") ? (
                    <TouchableOpacity onPress={resetFilters} activeOpacity={0.8} className="px-4 py-2.5 rounded-full bg-slate-100">
                      <Text className="text-xs font-bold text-slate-700">Reset Filter</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push("/c/posting" as any);
                    }}
                    activeOpacity={0.9}
                    className="px-5 py-2.5 rounded-full bg-[#ea580c] shadow-md shadow-orange-500/20"
                  >
                    <Text className="text-xs font-bold text-white">Posting Kebutuhan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
