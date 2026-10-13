import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { ProviderItem } from "../components/home/ProviderCard";
import { ensureConversationAndNavigate } from "../lib/chatInbox";

// Helper thumbnail Supabase (transformasi foto jadi kecil & enteng di RAM)
function getOptimizedThumbnail(url?: string | null) {
  if (!url || !url.startsWith("http")) return null;
  // Jika dari Supabase Storage, tambahkan parameter transformasi agar tidak makan RAM
  if (url.includes("supabase.co") && !url.includes("?")) {
    return `${url}?width=200&height=200&resize=cover&quality=70`;
  }
  return url;
}
let _cachedProviders: ProviderItem[] | null = null;
let _cachedAt = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 menit

export function useHomeLogic() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Search & Segment State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<"cari" | "tawarkan">("cari");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Location State
  const [locationName, setLocationName] = useState("Lokasi Anda");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filter Modal State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"terdekat" | "populer" | "harga">("terdekat");
  const [onlyTrusted, setOnlyTrusted] = useState(false);
  const [rekomendasiFilter, setRekomendasiFilter] = useState<"semua" | "rating" | "terjangkau" | "terpercaya">("semua");

  // Load Session & Location
  useEffect(() => {
    const initSession = async () => {
      try {
        const stored = await getStoredUser();
        if (stored && stored.id) {
          // 1. Set dari local storage dulu agar UI tidak nunggu lama (optimistic UI)
          setUser(stored);
          if (stored?.alamat_singkat) {
            setLocationName(stored.alamat_singkat);
          }

          // 2. Fetch fresh user data dari Supabase (non-blocking IIFE)
          (async () => {
            try {
              const { data: freshUser } = await supabase
                .from("users_bisa")
                .select("*")
                .eq("id", stored.id)
                .single();
              if (freshUser) {
                setUser(freshUser);
                if (freshUser.alamat_singkat) {
                  setLocationName(freshUser.alamat_singkat);
                }
              }
            } catch (e) { }
          })();

          // Fetch unread notifications count (non-blocking IIFE)
          (async () => {
            try {
              const { count: unreadCount } = await supabase
                .from("notifikasi_bisa")
                .select("*", { count: "exact", head: true })
                .eq("user_id", stored.id)
                .eq("is_read", false);
              if (unreadCount !== null) {
                setUnreadNotifCount(unreadCount);
              }
            } catch (e) { }
          })();
        }

        // GPS Geolocation (non-blocking IIFE dengan timeout agar tidak menghambat UI)
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });

              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                const resp = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.coords.latitude}&lon=${loc.coords.longitude}`,
                  { signal: controller.signal }
                );
                const data = await resp.json();
                clearTimeout(timeoutId);
                const sub =
                  data?.address?.suburb ||
                  data?.address?.village ||
                  data?.address?.town ||
                  data?.address?.city_district ||
                  data?.address?.city;
                if (sub) setLocationName(sub);
              } catch (e) { }
            }
          } catch (e) { }
        })();
      } catch (err) {
        console.error("Session init error:", err);
      }
    };

    initSession();
  }, []);

  // Fetch Providers from Supabase (cache 2 menit — hemat loading & kuota)
  const fetchProviders = useCallback(async (opts?: { silent?: boolean }) => {
    const isCacheValid = _cachedProviders && Date.now() - _cachedAt < CACHE_TTL;
    // Kalau ada cache valid & bukan silent, tampilkan cache dulu tanpa loading spinner
    if (isCacheValid && !opts?.silent) {
      setProviders(_cachedProviders!);
      setLoading(false);
      // Tetap fetch silent di background untuk update diam-diam
      // fetchProviders({ silent: true }); // Removed to avoid circular dependency / access before declaration
      (async () => {
        try {
          const lat = userCoords?.lat || -7.311;
          const lng = userCoords?.lng || 108.764;
          const { data: rpcData } = await supabase.rpc("get_nearby_providers", {
            client_lat: lat, client_lon: lng, search_radius_km: 25,
            search_query: searchQuery || "", filter_kategori: selectedCategory || "Semua Jasa",
            min_rating: minRating, filter_trusted: onlyTrusted, sort_by: sortBy,
            exclude_client_id: user?.id || 0,
          });
          if (rpcData) setProviders(rpcData.map((p: any) => ({ ...p, id: p.id })));
        } catch {}
      })();
      return;
    }
    if (!opts?.silent) setLoading(true);

    // Timeout pengaman agar skeleton tidak gantung terus jika jaringan lambat
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 6000);

    try {
      const lat = userCoords?.lat || -7.311;
      const lng = userCoords?.lng || 108.764;

      // 1. Try RPC get_nearby_providers
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_nearby_providers", {
        client_lat: lat,
        client_lon: lng,
        search_radius_km: 25,
        search_query: searchQuery || "",
        filter_kategori: selectedCategory || "Semua Jasa",
        min_price: null,
        max_price: null,
        min_rating: minRating,
        filter_trusted: onlyTrusted,
        sort_by: sortBy,
        exclude_client_id: user?.id || 0,
      });

      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const enriched: ProviderItem[] = rpcData.map((p: any) => ({
          id: p.id,
          name: p.name || "Mitra BISA",
          skill: p.keahlian || p.keahlian_detail || "Jasa Umum",
          price: typeof p.base_price === "number" ? p.base_price : 0,
          rating: typeof p.rating === "number" ? p.rating : 0,
          total_orders: p.total_order ?? p.total_orders ?? 0,
          distance_km: typeof p.distance_km === "number" ? Number(p.distance_km.toFixed(1)) : 0.4,
          is_trusted: Boolean(p.is_trusted),
          is_featured: Boolean(p.is_featured),
          subscription_plan: p.subscription_plan || null,
          subscription_until: p.subscription_until || null,
          is_available: p.is_available,
          status: p.status,
          face_url: getOptimizedThumbnail(p.face_url),
        }));
        _cachedProviders = enriched;
        _cachedAt = Date.now();
        setProviders(enriched);
        return;
      }

      // 2. Fallback direct query on users_bisa (dibatasi 10 item awal agar ringan & hemat RAM/kuota)
      let query = supabase
        .from("users_bisa")
        .select(
          "id, name, phone, email, address, alamat_singkat, face_url, latitude, longitude, kyc_status, rating, total_orders, is_available, status, kategori, keahlian, keahlian_detail, base_price, is_trusted, role, is_featured, subscription_plan, subscription_until"
        )
        .or("kyc_status.eq.Terverifikasi,kyc_status.eq.approved");

      if (user?.id) {
        query = query.neq("id", user.id);
      }

      const { data: dbProviders, error } = await query.limit(10);

      if (error) {
        console.error("Fetch providers error:", error);
      }

      if (dbProviders) {
        const enriched: ProviderItem[] = dbProviders.map((p: any) => {
          let dist = 0.4;
          if (userCoords && p.latitude && p.longitude) {
            const R = 6371;
            const dLat = ((p.latitude - userCoords.lat) * Math.PI) / 180;
            const dLon = ((p.longitude - userCoords.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((userCoords.lat * Math.PI) / 180) *
              Math.cos((p.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            dist = Number((R * c).toFixed(1));
          }
          return {
            id: p.id,
            name: p.name || "Mitra BISA",
            skill: p.keahlian || p.keahlian_detail || "Jasa Umum",
            kategori: (p as any).kategori || null,
            price: typeof p.base_price === "number" ? p.base_price : 0,
            rating: typeof p.rating === "number" ? p.rating : 0,
            total_orders: p.total_orders || 0,
            distance_km: dist,
            is_trusted: Boolean(p.is_trusted),
            is_featured: Boolean(p.is_featured),
            subscription_plan: p.subscription_plan || null,
            subscription_until: p.subscription_until || null,
            is_available: p.is_available,
            status: p.status,
            face_url: getOptimizedThumbnail(p.face_url),
          };
        });

        _cachedProviders = enriched;
        _cachedAt = Date.now();
        setProviders(enriched);
      }
    } catch (err) {
      console.error("fetchProviders catch:", err);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, userCoords, searchQuery, selectedCategory, minRating, onlyTrusted, sortBy]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const onRefresh = () => {
    _cachedProviders = null;
    _cachedAt = 0;
    setRefreshing(true);
    fetchProviders();
  };

  // 1. Mitra Carousel "Tersedia Sekarang" (Smart Priority Radius < 5 km + Fallback)
  const nearbyOnline = providers.filter((p) => {
    const dist = p.distance_km ?? (p as any).distance ?? 999;
    const isOnline = p.is_available !== false && p.status !== "Tidak Aktif";
    return dist <= 5.0 && isOnline;
  });

  const hasPremiumOrTrusted = nearbyOnline.some(
    (p) => Boolean(p.is_trusted || p.is_featured || p.subscription_plan)
  );

  let availableProviders: ProviderItem[] = [];
  if (hasPremiumOrTrusted) {
    // Smart Priority: Mitra Premium (Featured/Langganan) & Terpercaya tampil paling depan
    availableProviders = [...nearbyOnline].sort((a, b) => {
      const aScore = (a.is_featured || a.subscription_plan ? 2 : 0) + (a.is_trusted ? 1 : 0);
      const bScore = (b.is_featured || b.subscription_plan ? 2 : 0) + (b.is_trusted ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore; // Skor tertinggi paling kiri
      return (a.distance_km || 0) - (b.distance_km || 0); // Jika skor sama, jarak terdekat
    });
  } else {
    // FALLBACK (Pilihan 1): Jika belum ada yang premium/terpercaya di < 5 km,
    // tampilkan semua mitra online terdekat agar halaman tidak kosong
    availableProviders = [...nearbyOnline].sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }

  // 2. Filtered providers untuk "Rekomendasi Terdekat" (Radius hingga 15-25 km)
  let filtered = providers.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skill?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory ||
      (p.kategori ? p.kategori.toLowerCase() === selectedCategory.toLowerCase() : (p.skill && p.skill.toLowerCase().includes(selectedCategory.toLowerCase())));

    const matchesRating = !minRating || (p.rating ?? 0) >= minRating;
    const matchesTrusted = !onlyTrusted || p.is_trusted;

    const matchesRekomendasi =
      rekomendasiFilter === "semua" ||
      (rekomendasiFilter === "rating" && (p.rating ?? 0) >= 4.8) ||
      (rekomendasiFilter === "terjangkau" && (p.price ?? 0) > 0 && (p.price ?? 0) <= 75000) ||
      (rekomendasiFilter === "terpercaya" && p.is_trusted);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesRating &&
      matchesTrusted &&
      matchesRekomendasi
    );
  });

  // Sorting
  if (sortBy === "terdekat") {
    filtered.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  } else if (sortBy === "populer") {
    filtered.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0));
  } else if (sortBy === "harga") {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  // Direct Chat Handler — fix: pakai ensureConversationAndNavigate agar langsung buka room /c/direct-chat/[id]
  const handleStartChat = async (mitraId: number | string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) return;
    try {
      const conversationId = await ensureConversationAndNavigate(String(mitraId));
      if (conversationId) {
        router.push(`/c/direct-chat/${conversationId}` as any);
        return;
      }
      router.push("/c/chat" as any);
    } catch {
      router.push("/c/chat" as any);
    }
  };

  const handleResetFilters = () => {
    setMinRating(0);
    setSortBy("terdekat");
    setOnlyTrusted(false);
  };

  return {
    router,
    user,
    providers,
    availableProviders,
    filteredProviders: filtered,
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
  };
}
