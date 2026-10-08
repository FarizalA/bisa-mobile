import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import {
  Search,
  X,
  RotateCcw,
  Navigation,
  Banknote,
  Star,
  ChevronDown,
  MapPin,
  Crosshair,
  ChevronRight,
} from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import { generateRadarLeafletHtml } from "../../src/utils/radarLeafletHtml";
import { RadarFilterModals } from "../../src/components/radar/RadarFilterModals";
import BottomNav from "../../src/components/BottomNav";

// MapView hanya di native — web pakai Leaflet iframe 1:1 dengan web ProvidersMap
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let Callout: any = null;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  Callout = Maps.Callout;
}

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
];

export default function RadarPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua Jasa");
  const [maxAllowedRadius, setMaxAllowedRadius] = useState<number>(45);
  const [radius, setRadius] = useState<number>(1);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [filterRating, setFilterRating] = useState<number>(0);
  const [onlyTrusted, setOnlyTrusted] = useState<boolean>(false);
  const [activeDropdown, setActiveDropdown] = useState<"kategori" | "radius" | "harga" | "rating" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUser();
      if (stored) {
        setUser(stored);
        if (stored.latitude && stored.longitude) setLocation({ lat: Number(stored.latitude), lng: Number(stored.longitude) });
        if (stored.custom_radar_radius) {
          setMaxAllowedRadius(Number(stored.custom_radar_radius));
          setRadius((prev) => Math.min(prev, Number(stored.custom_radar_radius)));
        }
      }

      // Fetch global setting dari app_settings
      try {
        const { data: setRow } = await supabase.from("app_settings").select("value").eq("key", "max_radar_radius").maybeSingle();
        if (setRow?.value) {
          const globalMax = Number(setRow.value);
          if (!stored?.custom_radar_radius) {
            setMaxAllowedRadius(globalMax);
            setRadius((prev) => Math.min(prev, globalMax));
          }
        }
      } catch {}
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const nc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setLocation(nc);
          if (stored?.id) await supabase.from("users_bisa").update({ latitude: nc.lat, longitude: nc.lng }).eq("id", stored.id);
        } else if (!stored?.latitude) setLocation({ lat: -6.2088, lng: 106.8456 });
      } catch {
        if (!stored?.latitude) setLocation({ lat: -6.2088, lng: 106.8456 });
      }
    })();
  }, []);

  useEffect(() => {
    const fetchRadar = async () => {
      if (!location) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_nearby_providers", {
          client_lat: location.lat,
          client_lon: location.lng,
          search_radius_km: radius >= 100 ? 9999 : radius,
          search_query: debouncedSearch || "",
          filter_kategori: filterKategori,
          min_price: minPrice ? parseInt(minPrice) : null,
          max_price: maxPrice ? parseInt(maxPrice) : null,
          min_rating: filterRating,
          filter_trusted: onlyTrusted,
          sort_by: "terdekat",
          exclude_client_id: user?.id || 0,
        });
        if (error) console.warn("RPC radar:", error.message);
        if (data && Array.isArray(data)) {
          const ids = data.map((p: any) => p.id);
          let bm = new Map();
          if (ids.length) {
            const { data: br } = await supabase.from("users_bisa").select("id, radar_boost_level, radar_boost_until, subscription_plan, subscription_until, is_featured").in("id", ids);
            if (br) bm = new Map(br.map((b: any) => [b.id, b]));
          }
          const enriched = data
            .filter((p: any) => p.is_active !== false && p.status !== "Dibekukan" && p.latitude && p.longitude)
            .map((p: any) => {
              const b = bm.get(p.id);
              let lvl = b?.radar_boost_level || null;
              const sub = (b?.subscription_plan || p.subscription_plan || "").toLowerCase();
              if (sub.includes("super")) lvl = "super";
              else if (sub.includes("kecamatan") || sub.includes("wilayah")) lvl = lvl === "super" ? "super" : "menyala";
              return { ...p, radar_boost_level: lvl, is_trusted: Boolean(p.is_trusted), subscription_plan: b?.subscription_plan || p.subscription_plan };
            });
          setProviders(enriched);
        } else {
          let q = supabase.from("users_bisa").select("id, name, face_url, latitude, longitude, rating, total_orders, keahlian, base_price, is_trusted, subscription_plan").eq("kyc_status", "Terverifikasi").not("latitude", "is", null).not("longitude", "is", null);
          if (user?.id) q = q.neq("id", user.id);
          if (filterKategori !== "Semua Jasa") q = q.ilike("keahlian", `%${filterKategori}%`);
          const { data: dd } = await q;
          if (dd) setProviders(dd);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchRadar();
  }, [location, debouncedSearch, filterKategori, radius, minPrice, maxPrice, filterRating, onlyTrusted]);

  const handleRecenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      const el: any = document.getElementById("radar-iframe") as any;
      el?.contentWindow?.postMessage({ type: "RECENTER" }, "*");
    } else if (location && mapRef.current) {
      const delta = radius >= 100 ? 0.8 : radius >= 25 ? 0.4 : radius >= 10 ? 0.2 : radius >= 5 ? 0.1 : 0.05;
      mapRef.current.animateToRegion({ latitude: location.lat, longitude: location.lng, latitudeDelta: delta, longitudeDelta: delta }, 800);
    }
  };

  const handleResetFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery("");
    setFilterKategori("Semua Jasa");
    setRadius(1);
    setMinPrice("");
    setMaxPrice("");
    setFilterRating(0);
    setOnlyTrusted(false);
    setActiveDropdown(null);
  };

  const isFilterActive =
    filterKategori !== "Semua Jasa" ||
    radius !== 1 ||
    minPrice ||
    maxPrice ||
    filterRating > 0 ||
    onlyTrusted ||
    searchQuery;

  const leafletHTML = useMemo(() => {
    return generateRadarLeafletHtml(
      location?.lat || -6.2088,
      location?.lng || 106.8456,
      radius,
      providers
    );
  }, [location, radius, providers]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 relative">
        {location ? (
          Platform.OS === "web" ? (
            <iframe id="radar-iframe" srcDoc={leafletHTML} style={{ width: "100%", height: "100%", border: "none" }} title="Radar Map" />
          ) : (
            <MapView
              ref={mapRef}
              style={{ width: "100%", height: "100%" }}
              initialRegion={{ latitude: location.lat, longitude: location.lng, latitudeDelta: radius >= 100 ? 0.8 : radius >= 25 ? 0.4 : radius >= 10 ? 0.2 : radius >= 5 ? 0.1 : 0.05, longitudeDelta: radius >= 100 ? 0.8 : radius >= 25 ? 0.4 : radius >= 10 ? 0.2 : radius >= 5 ? 0.1 : 0.05 }}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {radius < 100 ? <Circle center={{ latitude: location.lat, longitude: location.lng }} radius={radius * 1000} strokeColor="#3b82f6" fillColor="rgba(59,130,246,0.08)" strokeWidth={1} /> : null}
              {providers.map((prov) => {
                const isSuper = prov.radar_boost_level === "super";
                const isMenyala = prov.radar_boost_level === "menyala";
                return (
                  <Marker key={prov.id} coordinate={{ latitude: Number(prov.latitude), longitude: Number(prov.longitude) }} tracksViewChanges={false}>
                    <View className="items-center justify-center">
                      <View className={`w-9 h-9 rounded-full items-center justify-center p-0.5 shadow-md ${isSuper ? "bg-amber-400 border-2 border-white" : isMenyala ? "bg-sky-400 border-2 border-white" : "bg-orange-500 border-2 border-white"}`}>
                        <Image source={prov.face_url ? { uri: prov.face_url } : require("../../assets/mascot.png")} style={{ width: "100%", height: "100%", borderRadius: 18 }} resizeMode="cover" />
                        {Boolean(prov.is_trusted) ? <View className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white items-center justify-center" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}><Text style={{ fontSize: 7, color: "#ea580c" }}>★</Text></View> : null}
                      </View>
                      <View className={`w-1.5 h-1.5 rotate-45 -mt-1 ${isSuper ? "bg-amber-400" : isMenyala ? "bg-sky-400" : "bg-orange-500"}`} />
                    </View>
                    <Callout tooltip onPress={() => router.push(`/profil/${prov.id}` as any)}>
                      <View className="bg-white rounded-2xl p-3 shadow-xl border border-gray-100 w-48 flex-col gap-2">
                        <View className="flex-row items-center gap-2">
                          <Image source={prov.face_url ? { uri: prov.face_url } : require("../../assets/mascot.png")} style={{ width: 40, height: 40, borderRadius: 20 }} className="bg-gray-100" />
                          <View className="flex-1 min-w-0">
                            <Text className="font-extrabold text-sm text-slate-900" numberOfLines={1}>{prov.name}</Text>
                            <Text className="text-[10px] text-gray-500" numberOfLines={1}>{(prov.keahlian || "Penyedia Jasa").replace(/^Lainnya:\s*/i, "")}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
                          <View className="flex-row items-center gap-0.5"><Star size={12} color="#f59e0b" fill="#f59e0b" /><Text className="text-xs font-bold text-gray-800">{prov.rating ? Number(prov.rating).toFixed(1) : "New"}</Text></View>
                          <Text className="text-xs font-black text-orange-600">{prov.base_price ? `Rp${Number(prov.base_price).toLocaleString("id-ID")}` : "Rp -"}</Text>
                        </View>
                        <View className="bg-orange-600 py-1.5 rounded-lg items-center flex-row justify-center gap-1 mt-1"><Text className="text-white text-xs font-bold">Lihat Profil</Text><ChevronRight size={12} color="white" /></View>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          )
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-100"><ActivityIndicator color="#ff6b00" size="large" /><Text className="text-xs font-bold text-gray-500 mt-2">Menunggu lokasi...</Text></View>
        )}

        <View className="absolute top-0 left-0 right-0 z-20 p-4 max-w-md mx-auto w-full pointer-events-none" style={{ width: "100%" }}>
          <View className="flex-col gap-2.5 pointer-events-auto">
            <View className="flex-row items-center bg-white/95 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 px-3.5 h-12">
              <Search size={20} color="#9ca3af" />
              <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Cari tukang, ac, cuci, atau nama mitra..." placeholderTextColor="#9ca3af" className="flex-1 text-xs font-semibold text-gray-900 ml-2 h-full" />
              {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1"><X size={18} color="#6b7280" /></TouchableOpacity> : null}
            </View>
            <View style={Platform.OS === "web" ? ({ display: "flex", flexDirection: "row", gap: 8, overflowX: "auto", paddingVertical: 4 } as any) : undefined}>
              {Platform.OS === "web" ? (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  {isFilterActive ? (<TouchableOpacity onPress={handleResetFilter} className="flex-row items-center gap-1 bg-red-500 px-3 py-1.5 rounded-full shadow-sm"><RotateCcw size={14} color="#fff" /><Text className="text-[11px] font-bold text-white">Reset</Text></TouchableOpacity>) : null}
                  <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "kategori" ? null : "kategori")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${filterKategori !== "Semua Jasa" ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Text className={`text-[11px] font-bold ${filterKategori !== "Semua Jasa" ? "text-white" : "text-gray-700"}`}>{filterKategori}</Text><ChevronDown size={13} color={filterKategori !== "Semua Jasa" ? "#fff" : "#374151"} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "radius" ? null : "radius")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${radius !== 1 ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Navigation size={13} color={radius !== 1 ? "#fff" : "#ff6b00"} /><Text className={`text-[11px] font-bold ${radius !== 1 ? "text-white" : "text-gray-700"}`}>{radius !== 1 ? (radius >= 100 ? "Jarak: Tanpa Batas" : `< ${radius} km`) : "< 1 km"}</Text><ChevronDown size={13} color={radius !== 1 ? "#fff" : "#374151"} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "harga" ? null : "harga")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${minPrice || maxPrice ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Banknote size={13} color={minPrice || maxPrice ? "#fff" : "#ff6b00"} /><Text className={`text-[11px] font-bold ${minPrice || maxPrice ? "text-white" : "text-gray-700"}`}>{minPrice || maxPrice ? `Rp${minPrice || "0"} - ${maxPrice || "∞"}` : "Harga"}</Text><ChevronDown size={13} color={minPrice || maxPrice ? "#fff" : "#374151"} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "rating" ? null : "rating")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${filterRating > 0 || onlyTrusted ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Star size={12} color={filterRating > 0 || onlyTrusted ? "#fff" : "#f59e0b"} fill={filterRating > 0 || onlyTrusted ? "#fff" : "#f59e0b"} /><Text className={`text-[11px] font-bold ${filterRating > 0 || onlyTrusted ? "text-white" : "text-gray-700"}`}>{onlyTrusted ? "Unggulan" : filterRating > 0 ? `Rating ${filterRating}+` : "Rating"}</Text><ChevronDown size={13} color={filterRating > 0 || onlyTrusted ? "#fff" : "#374151"} /></TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    {isFilterActive ? (<TouchableOpacity onPress={handleResetFilter} className="flex-row items-center gap-1 bg-red-500 px-3 py-1.5 rounded-full shadow-sm"><RotateCcw size={14} color="#fff" /><Text className="text-[11px] font-bold text-white">Reset</Text></TouchableOpacity>) : null}
                    <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "kategori" ? null : "kategori")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${filterKategori !== "Semua Jasa" ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Text className={`text-[11px] font-bold ${filterKategori !== "Semua Jasa" ? "text-white" : "text-gray-700"}`}>{filterKategori}</Text><ChevronDown size={13} color={filterKategori !== "Semua Jasa" ? "#fff" : "#374151"} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "radius" ? null : "radius")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${radius !== 1 ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Navigation size={13} color={radius !== 1 ? "#fff" : "#ff6b00"} /><Text className={`text-[11px] font-bold ${radius !== 1 ? "text-white" : "text-gray-700"}`}>{radius !== 1 ? (radius >= 100 ? "Jarak: Tanpa Batas" : `< ${radius} km`) : "< 1 km"}</Text><ChevronDown size={13} color={radius !== 1 ? "#fff" : "#374151"} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "harga" ? null : "harga")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${minPrice || maxPrice ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Banknote size={13} color={minPrice || maxPrice ? "#fff" : "#ff6b00"} /><Text className={`text-[11px] font-bold ${minPrice || maxPrice ? "text-white" : "text-gray-700"}`}>{minPrice || maxPrice ? `Rp${minPrice || "0"} - ${maxPrice || "∞"}` : "Harga"}</Text><ChevronDown size={13} color={minPrice || maxPrice ? "#fff" : "#374151"} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveDropdown(activeDropdown === "rating" ? null : "rating")} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${filterRating > 0 || onlyTrusted ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-white/95 border-gray-200"}`}><Star size={12} color={filterRating > 0 || onlyTrusted ? "#fff" : "#f59e0b"} fill={filterRating > 0 || onlyTrusted ? "#fff" : "#f59e0b"} /><Text className={`text-[11px] font-bold ${filterRating > 0 || onlyTrusted ? "text-white" : "text-gray-700"}`}>{onlyTrusted ? "Unggulan" : filterRating > 0 ? `Rating ${filterRating}+` : "Rating"}</Text><ChevronDown size={13} color={filterRating > 0 || onlyTrusted ? "#fff" : "#374151"} /></TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleRecenter} activeOpacity={0.88} className="absolute z-10 flex-row items-center gap-2 bg-white/95 px-3.5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.18)] border border-gray-100" style={{ bottom: 84, right: 16 }}>
          <Crosshair size={20} color="#2563eb" /><Text className="text-xs font-bold text-gray-800">Lokasi Saya</Text>
        </TouchableOpacity>

        {!loading && providers.length === 0 ? (
          <View className="absolute inset-0 z-10 bg-white/70 items-center justify-center p-6">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3"><MapPin size={30} color="#9ca3af" /></View>
            <Text className="text-base font-extrabold text-gray-900">Mitra Tidak Ditemukan</Text>
            <Text className="text-xs text-gray-500 text-center mt-1 max-w-[240px]">Coba perluas radius atau ubah filter pencarian.</Text>
            <TouchableOpacity onPress={handleResetFilter} className="mt-5 px-5 py-2.5 bg-[#ff6b00] rounded-2xl shadow-md"><Text className="text-xs font-bold text-white">Reset Filter</Text></TouchableOpacity>
          </View>
        ) : null}
      </View>

      <RadarFilterModals
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        radius={radius}
        setRadius={setRadius}
        maxAllowedRadius={maxAllowedRadius}
        filterKategori={filterKategori}
        setFilterKategori={setFilterKategori}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        filterRating={filterRating}
        setFilterRating={setFilterRating}
        onlyTrusted={onlyTrusted}
        setOnlyTrusted={setOnlyTrusted}
      />

      <BottomNav active="radar" />
    </SafeAreaView>
  );
}
