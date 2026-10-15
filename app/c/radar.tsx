import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
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
import { WebView } from "react-native-webview";
import { generateRadarLeafletHtml } from "../../src/utils/radarLeafletHtml";
import { RadarFilterModals } from "../../src/components/radar/RadarFilterModals";
import { kategoriKeywords } from "../../src/lib/categories";

// MapView hanya di native — web pakai Leaflet iframe 1:1 dengan web ProvidersMap
// Di-wrap try/catch agar HP tanpa Google Play Services TIDAK force close, fallback ke WebView Leaflet
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let Callout: any = null;
let mapsLoadError: string | null = null;
if (Platform.OS !== "web") {
  // try {
  //   const Maps = require("react-native-maps");
  //   MapView = Maps.default;
  //   Marker = Maps.Marker;
  //   Circle = Maps.Circle;
  //   Callout = Maps.Callout;
  // } catch (e: any) {
  //   mapsLoadError = e?.message || "maps unavailable";
  //   MapView = null;
  // }
  MapView = null; // Memaksa fallback ke WebView (Leaflet) untuk mencegah Force Close (FC)
}

class MapErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(p: any) { super(p); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: any) { console.warn("MapView crash caught:", e?.message); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

export default function RadarPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const webviewRef = useRef<any>(null);

  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Optimasi RAM 4GB: WebView Leaflet hanya hidup saat tab Radar aktif, langsung dibuang saat pindah tab
  const [isRadarFocused, setIsRadarFocused] = useState(true);
  useFocusEffect(
    React.useCallback(() => {
      setIsRadarFocused(true);
      return () => setIsRadarFocused(false);
    }, [])
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
  // Cluster list (spiderfy >8) — disimpan terpisah dari sheet profil tunggal.
  const [clusterSheet, setClusterSheet] = useState<{ count: number; lat: number; lng: number; providers: any[] } | null>(null);
  const [sheetMitra, setSheetMitra] = useState<any | null>(null);

  // Reset ready flag tiap kali peta di-mount ulang (tab fokus kembali).
  useEffect(() => {
    if (!isRadarFocused) {
      mapReadyRef.current = false;
      RADAR_PENDING_QUEUE.current.length = 0;
    }
  }, [isRadarFocused]);

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
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.type === "OPEN_PROFILE" && data.id) {
          router.push(`/profil/${data.id}` as any);
        }
        if (data && data.type === "OPEN_PROFILE_SHEET" && data.id) {
          setSheetMitra(data);
          setClusterSheet(null);
        }
        if (data && data.type === "OPEN_CLUSTER_LIST" && Array.isArray(data.providers)) {
          setClusterSheet({ count: data.count || data.providers.length, lat: data.lat, lng: data.lng, providers: data.providers });
          setSheetMitra(null);
        }
        if (data && data.type === "MAP_MOVED") {
          setSheetMitra(null);
          setClusterSheet(null);
        }
      } catch (e) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

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
          let q = supabase.from("users_bisa").select("id, name, face_url, latitude, longitude, rating, total_orders, keahlian, base_price, is_trusted, subscription_plan").eq("kyc_status", "Terverifikasi").not("kategori", "is", null).neq("kategori", "").not("latitude", "is", null).not("longitude", "is", null);
          if (user?.id) q = q.neq("id", user.id);
          if (filterKategori !== "Semua Jasa") {
            // Cocokkan kategori lewat daftar kata kunci (keahlian teks-bebas).
            const kws = kategoriKeywords(filterKategori);
            const orClause = [
              `kategori.eq."${filterKategori}"`,
              ...kws.map((k) => `keahlian.ilike."%${k}%"`),
            ].join(",");
            q = q.or(orClause);
          }
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
      const el: any = (globalThis as any).document?.getElementById("radar-iframe") as any;
      el?.contentWindow?.postMessage({ type: "RECENTER" }, "*");
    } else if (webviewRef.current && !MapView) {
      try {
        // RN WebView -> Leaflet: injectJavaScript paling handal (postMessage tidak tembus ke window.addEventListener di Android)
        webviewRef.current.injectJavaScript(`(function(){try{if(window.recenterMap){window.recenterMap();} else {var d={type:'RECENTER'};try{window.postMessage(JSON.stringify(d),'*');}catch(e){}try{window.dispatchEvent(new MessageEvent('message',{data:d}));}catch(e){}}}catch(e){}})();true;`);
      } catch {}
    } else if (location && mapRef.current?.animateToRegion) {
      try {
        const delta = radius >= 100 ? 0.8 : radius >= 25 ? 0.4 : radius >= 10 ? 0.2 : radius >= 5 ? 0.1 : 0.05;
        mapRef.current.animateToRegion({ latitude: location.lat, longitude: location.lng, latitudeDelta: delta, longitudeDelta: delta }, 800);
      } catch (e) { console.warn("recenter failed:", e); }
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

  // ==== PERFORMA HP (RAM 4GB): render HTML sekali, update via injectJavaScript ====
  //_radanya: source={{html}} reload WebView penuh tiap radius/data berubah -> 100s marker
  // dibangun ulang -> puncak RAM 2x -> lag/crash. Sekarang: peta hidup, cuma update isinya.
  const initialLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapReadyRef = useRef(false);
  const lastRadiusRef = useRef<number>(radius);
  const lastProvidersRef = useRef<any[] | null>(null);

  const leafletHTML = useMemo(() => {
    // Sengaja HANYA bergantung pada lokasi awal: string HTML tak boleh berubah
    // sau provider/radius berubah (itu yang memicu reload).
    const lat = location?.lat ?? initialLocRef.current?.lat ?? -6.2088;
    const lng = location?.lng ?? initialLocRef.current?.lng ?? 106.8456;
    return generateRadarLeafletHtml(lat, lng, radius, providers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  // Kirim update ke peta yang sudah hidup (tanpa reload).
  const pushToMap = useCallback((payload: string) => {
    const wv: any = webviewRef.current;
    if (!wv || !mapReadyRef.current) return;
    try {
      wv.injectJavaScript(`try{${payload}}catch(e){};true;`);
    } catch {}
  }, []);

  const syncRadius = useCallback(
    (km: number) => {
      const code = `if(window.updateRadius){window.updateRadius(${Number(km) || 0});}`;
      if (mapReadyRef.current) pushToMap(code);
      else RADAR_PENDING_QUEUE.current.push(code);
      lastRadiusRef.current = km;
    },
    [pushToMap]
  );

  const syncProviders = useCallback(
    (list: any[]) => {
      const code = `if(window.updateProviders){window.updateProviders(${JSON.stringify(list)});}`;
      if (mapReadyRef.current) pushToMap(code);
      else RADAR_PENDING_QUEUE.current.push(code);
      lastProvidersRef.current = list;
    },
    [pushToMap]
  );

  const syncUserLoc = useCallback(
    (lat: number, lng: number) => {
      const code = `if(window.updateUserLoc){window.updateUserLoc(${Number(lat)},${Number(lng)});}`;
      if (mapReadyRef.current) pushToMap(code);
      else RADAR_PENDING_QUEUE.current.push(code);
      // Simpan supaya inisial string HTML tak render ulang (memo dependent hanya lat/lng).
      initialLocRef.current = { lat, lng };
    },
    [pushToMap]
  );

  // Kirim tiap radius / daftar mitra berubah ke peta hidup (tanpa reload).
  // Native: injectJavaScript. Web: postMessage ke iframe (HTML mendengar message events).
  // ProviderList dikirim sebagai JSON string; radius sebagai number.
  useEffect(() => { syncRadius(radius); }, [radius, syncRadius]);
  useEffect(() => { syncProviders(providers); }, [providers, syncProviders]);
  useEffect(() => { if (location) syncUserLoc(location.lat, location.lng); }, [location?.lat, location?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (Platform.OS === "web" && isRadarFocused) {
      const el: any = (globalThis as any).document?.getElementById("radar-iframe") as any;
      try {
        el?.contentWindow?.postMessage(
          { type: "RADAR_UPDATE", radius, providers },
          "*"
        );
      } catch {}
    }
  }, [radius, providers, isRadarFocused]);

  // MAP_READY dari HTML: peta sudah siap menerima updateRadius/updateProviders.
  // Antrikan flush supaya payload tak hilang akibat race (radius duluan, ready belakangan).
  const RADAR_PENDING_QUEUE: React.MutableRefObject<string[]> = useRef<string[]>([]);
  const flushQueues = useCallback(() => {
    const wv: any = webviewRef.current;
    if (!wv || RADAR_PENDING_QUEUE.current.length === 0) return;
    try {
      RADAR_PENDING_QUEUE.current.forEach((code) => {
        wv.injectJavaScript(`try{${code}}catch(e){};true;`);
      });
    } finally {
      RADAR_PENDING_QUEUE.current.length = 0;
    }
  }, []);

  const onWebViewMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "MAP_READY") {
          mapReadyRef.current = true;
          // Flush sementara kosong; sync dari effects akan inject langsung karena ready sudah true.
          flushQueues();
          // Segera sync state terkini supaya peta tak delay satu frame.
          if (location) {
            pushToMap(`if(window.updateUserLoc){window.updateUserLoc(${Number(location.lat)},${Number(location.lng)});}`);
          }
          pushToMap(`if(window.updateRadius){window.updateRadius(${Number(radius)});}`);
          if (providers.length) {
            pushToMap(`if(window.updateProviders){window.updateProviders(${JSON.stringify(providers)});}`);
          }
          lastRadiusRef.current = radius;
          lastProvidersRef.current = providers;
          return;
        }
        if (data.type === "OPEN_PROFILE" && data.id) {
          router.push(`/profil/${data.id}` as any);
        }
        if (data.type === "OPEN_PROFILE_SHEET" && data.id) {
          setSheetMitra(data);
          setClusterSheet(null);
        }
        if (data.type === "OPEN_CLUSTER_LIST" && Array.isArray(data.providers)) {
          setClusterSheet({ count: data.count || data.providers.length, lat: data.lat, lng: data.lng, providers: data.providers });
          setSheetMitra(null);
        }
        if (data.type === "MAP_MOVED") {
          setSheetMitra(null);
          setClusterSheet(null);
        }
      } catch {}
    },
    [router, flushQueues, pushToMap, location, radius, providers]
  );

  const enqueuePushedCode = useCallback(
    (code: string) => {
      if (mapReadyRef.current) {
        pushToMap(code);
      } else {
        RADAR_PENDING_QUEUE.current.push(code);
      }
    },
    [pushToMap]
  );

  const fallbackWebView = (
    <WebView
      ref={webviewRef}
      originWhitelist={["*"]}
      source={{ html: leafletHTML }}
      style={{ width: "100%", height: "100%" }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={onWebViewMessage}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1 relative" style={{ flex: 1 }}>
        {/* Peta di layer bawah (zIndex 1) — biar filter & Lokasi Saya di atasnya tetap bisa diklik di HP */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, elevation: 1 }}>
          {location ? (
          !isRadarFocused ? (
            <View className="flex-1 items-center justify-center bg-gray-100"><ActivityIndicator color="#ff6b00" /><Text className="text-xs font-bold text-gray-400 mt-2">Memuat peta...</Text></View>
          ) : Platform.OS === "web" ? (
            <iframe id="radar-iframe" srcDoc={leafletHTML} style={{ width: "100%", height: "100%", border: "none" }} title="Radar Map" />
          ) : MapView ? (
            <MapErrorBoundary fallback={fallbackWebView}>
              <MapView
                ref={mapRef}
                style={{ width: "100%", height: "100%" }}
                initialRegion={{
                  latitude: location.lat,
                  longitude: location.lng,
                  latitudeDelta: radius >= 100 ? 0.8 : radius >= 25 ? 0.4 : radius >= 10 ? 0.2 : radius >= 5 ? 0.1 : 0.05,
                  longitudeDelta: radius >= 100 ? 0.8 : radius >= 25 ? 0.4 : radius >= 10 ? 0.2 : radius >= 5 ? 0.1 : 0.05,
                }}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {radius < 100 ? (
                  <Circle
                    center={{ latitude: location.lat, longitude: location.lng }}
                    radius={radius * 1000}
                    strokeColor="#3b82f6"
                    fillColor="rgba(59,130,246,0.08)"
                    strokeWidth={1}
                  />
                ) : null}
                {providers.map((prov) => {
                  const isSuper = prov.radar_boost_level === "super";
                  const isMenyala = prov.radar_boost_level === "menyala";
                  return (
                    <Marker
                      key={prov.id}
                      coordinate={{ latitude: Number(prov.latitude), longitude: Number(prov.longitude) }}
                      tracksViewChanges={false}
                    >
                      <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", padding: 2, backgroundColor: isSuper ? "#fbbf24" : isMenyala ? "#38bdf8" : "#f97316" }}>
                          <Image
                            source={prov.face_url ? { uri: prov.face_url } : require("../../assets/mascot.png")}
                            style={{ width: "100%", height: "100%", borderRadius: 18 }}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                      {Callout ? (
                        <Callout tooltip onPress={() => router.push(`/profil/${prov.id}` as any)}>
                          <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 12, width: 192 }}>
                            <Text style={{ fontWeight: "bold", fontSize: 13, color: "#0f172a" }}>{prov.name}</Text>
                            <Text style={{ fontSize: 10, color: "#64748b" }}>{(prov.keahlian || "Penyedia Jasa").replace(/^Lainnya:\s*/i, "")}</Text>
                          </View>
                        </Callout>
                      ) : null}
                    </Marker>
                  );
                })}
              </MapView>
            </MapErrorBoundary>
          ) : (
            fallbackWebView
          )
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-100"><ActivityIndicator color="#ff6b00" size="large" /><Text className="text-xs font-bold text-gray-500 mt-2">Menunggu lokasi...</Text></View>
        )}
        </View>

        <View pointerEvents="box-none" className="absolute top-0 left-0 right-0 p-4 max-w-md mx-auto w-full" style={{ width: "100%", zIndex: 40, elevation: 10 }}>
          <View pointerEvents="auto" className="flex-col gap-2.5">
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
                <ScrollView pointerEvents="auto" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
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

        {!loading && providers.length === 0 ? (
          <View pointerEvents="auto" className="absolute inset-0 bg-white/70 items-center justify-center p-6" style={{ zIndex: 15, elevation: 5 }}>
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3"><MapPin size={30} color="#9ca3af" /></View>
            <Text className="text-base font-extrabold text-gray-900">Mitra Tidak Ditemukan</Text>
            <Text className="text-xs text-gray-500 text-center mt-1 max-w-[240px]">Coba perluas radius atau ubah filter pencarian.</Text>
            <TouchableOpacity onPress={handleResetFilter} className="mt-5 px-5 py-2.5 bg-[#ff6b00] rounded-2xl shadow-md"><Text className="text-xs font-bold text-white">Reset Filter</Text></TouchableOpacity>
          </View>
        ) : null}

        {/* Lokasi Saya harus di layer paling atas (zIndex tertinggi) dan di-render SETELAH overlay kosong biar tidak ketutup */}
        <View pointerEvents="box-none" style={{ position: "absolute", bottom: 84, right: 16, zIndex: 50, elevation: 12 }}>
          <TouchableOpacity onPress={handleRecenter} activeOpacity={0.88} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} className="flex-row items-center gap-2 bg-white px-3.5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.18)] border border-gray-100">
            <Crosshair size={20} color="#2563eb" /><Text className="text-xs font-bold text-gray-800">Lokasi Saya</Text>
          </TouchableOpacity>
        </View>
        {/* Bottom Sheet profil mitra (dari spiderfy pin bertumpuk) */}
        {sheetMitra ? (
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 60, elevation: 15 }}>
            <TouchableOpacity activeOpacity={1} onPress={() => setSheetMitra(null)} className="flex-1" style={{ height: 60 }} />
            <View className="bg-white rounded-t-3xl border-t border-gray-100 shadow-[0_-6px_24px_rgba(0,0,0,0.15)] px-4 pt-3 pb-5">
              <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-3" />
              <View className="flex-row items-center gap-3">
                <Image
                  source={sheetMitra.face_url ? { uri: sheetMitra.face_url } : require("../../assets/mascot.png")}
                  style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "#f1f5f9" }}
                  resizeMode="cover"
                />
                <View className="flex-1 min-w-0">
                  <Text className="text-[15px] font-extrabold text-gray-900" numberOfLines={1}>{sheetMitra.name || "Mitra"}</Text>
                  <Text className="text-[12px] text-gray-500 font-medium" numberOfLines={1}>{sheetMitra.keahlian || sheetMitra.kategori || "Penyedia Jasa"}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <View className="flex-row items-center gap-1"><Star size={11} color="#f59e0b" fill="#f59e0b" /><Text className="text-[11px] font-bold text-amber-800">{sheetMitra.rating ? Number(sheetMitra.rating).toFixed(1) : "Baru"}</Text></View>
                    {sheetMitra.distance_km != null && sheetMitra.distance_km < 999999 ? <Text className="text-[11px] font-bold text-orange-600">• {Number(sheetMitra.distance_km).toFixed(1)} km</Text> : null}
                    {sheetMitra.base_price ? <Text className="text-[11px] font-bold text-gray-700">• Rp{Number(sheetMitra.base_price).toLocaleString("id-ID")}</Text> : null}
                  </View>
                </View>
              </View>
              <View className="flex-row items-center gap-2 mt-4">
                <TouchableOpacity
                  onPress={() => { setSheetMitra(null); router.push(`/profil/${sheetMitra.id}` as any); }}
                  className="flex-1 h-10 rounded-xl bg-[#ff6b00] items-center justify-center flex-row gap-1.5"
                >
                  <Text className="text-white font-bold text-xs">Lihat Profil</Text>
                  <ChevronRight size={15} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSheetMitra(null)}
                  className="h-10 px-4 rounded-xl border border-gray-300 items-center justify-center"
                >
                  <Text className="text-gray-700 font-bold text-xs">Tutup</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {/* Bottom Sheet daftar mitra (ketika pin bertumpuk > 8) */}
        {clusterSheet ? (
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, zIndex: 65, elevation: 16 }}>
            <TouchableOpacity activeOpacity={1} onPress={() => setClusterSheet(null)} className="flex-1 bg-black/30" />
            <View className="bg-white rounded-t-3xl border-t border-gray-100 shadow-[0_-6px_24px_rgba(0,0,0,0.15)] px-4 pt-3 pb-6 max-h-[70%]">
              <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-3" />
              <View className="flex-row items-center justify-between mb-3 px-1">
                <View>
                  <Text className="text-base font-extrabold text-gray-900">{clusterSheet.count} Mitra di Titik Ini</Text>
                  <Text className="text-xs text-gray-500 font-medium">Pilih mitra untuk melihat profil</Text>
                </View>
                <TouchableOpacity onPress={() => setClusterSheet(null)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <X size={16} color="#4b5563" />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-[360px]" showsVerticalScrollIndicator={true}>
                {clusterSheet.providers.map((p: any, idx: number) => {
                  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || "Mitra")}&background=ea580c&color=ffffff&bold=true`;
                  const faceUrl = p.face_url && String(p.face_url).startsWith("http") ? p.face_url : fallbackAvatar;
                  return (
                    <TouchableOpacity
                      key={p.id || idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        setClusterSheet(null);
                        router.push(`/profil/${p.id}` as any);
                      }}
                      className="flex-row items-center gap-3 py-3 border-b border-gray-100"
                    >
                      <Image
                        source={{ uri: faceUrl }}
                        style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#f1f5f9" }}
                        resizeMode="cover"
                      />
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{p.name || "Mitra"}</Text>
                        <Text className="text-xs text-gray-500 font-medium" numberOfLines={1}>{p.keahlian || p.kategori || "Penyedia Jasa"}</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <View className="flex-row items-center gap-1">
                            <Star size={10} color="#f59e0b" fill="#f59e0b" />
                            <Text className="text-[10px] font-bold text-amber-800">{p.rating ? Number(p.rating).toFixed(1) : "Baru"}</Text>
                          </View>
                          {p.distance_km != null && p.distance_km < 999999 ? (
                            <Text className="text-[10px] font-bold text-orange-600">• {Number(p.distance_km).toFixed(1)} km</Text>
                          ) : null}
                          {p.base_price ? (
                            <Text className="text-[10px] font-bold text-gray-700">• Rp{Number(p.base_price).toLocaleString("id-ID")}</Text>
                          ) : null}
                        </View>
                      </View>
                      <ChevronRight size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
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
    </SafeAreaView>
  );
}
