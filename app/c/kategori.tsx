import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import BottomNav from "../../src/components/BottomNav";
import { CATEGORIES, calculateDistance } from "../../src/components/kategori/KategoriConstants";
import KategoriHeader from "../../src/components/kategori/KategoriHeader";
import { CategoryPills, SortFilterBar } from "../../src/components/kategori/KategoriFilters";
import { KategoriPromoBanner, KategoriListState } from "../../src/components/kategori/KategoriListState";

export default function KategoriPage() {
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
        .select("id, name, phone, email, address, alamat_singkat, face_url, latitude, longitude, kyc_status, rating, total_orders, is_available, status, keahlian, keahlian_detail, base_price, is_trusted, role, is_featured, subscription_plan, subscription_until")
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

      result = result.filter((prov) => {
        const keahlian = (prov.keahlian || "").toLowerCase();
        const bio = (prov.keahlian_detail || "").toLowerCase();
        const nama = (prov.name || "").toLowerCase();

        if (keahlian.includes(selectedCategory.toLowerCase())) return true;
        if (bio.includes(selectedCategory.toLowerCase())) return true;

        if (catObj && catObj.keywords.length > 0) {
          return catObj.keywords.some(
            (kw) =>
              keahlian.includes(kw.toLowerCase()) ||
              bio.includes(kw.toLowerCase()) ||
              nama.includes(kw.toLowerCase())
          );
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ff6b00"]} />}
      >
        <View className="px-4 pt-3 max-w-[440px] w-full self-center">
          <KategoriPromoBanner />

          <KategoriListState
            loading={loading}
            refreshing={refreshing}
            providers={filteredProviders}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            resetFilters={resetFilters}
          />
        </View>
      </ScrollView>

      <BottomNav active="home" />
    </SafeAreaView>
  );
}
