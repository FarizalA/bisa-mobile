import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  Switch,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Locate,
  Camera,
  X,
  Plus,
  Minus,
  Clock,
  Hourglass,
  Handshake,
  Receipt,
  Zap,
  ChevronDown,
  Check,
  Sparkles,
  Flame,
  Trash2,
  Upload,
  Snowflake,
  Wrench,
  Hammer,
  BrushCleaning,
  Truck,
  Monitor,
  Bike,
  LayoutGrid,
  Grid3X3,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react-native";
import { usePostingMobileLogic } from "../../src/hooks/usePostingMobileLogic";
import { safeBack } from "@/lib/navigation";

// MapView guard: hanya di native, agar web tidak error codegenNativeComponent
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch {}
}

function Pill({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className={`px-3 py-1.5 rounded-full border ${selected ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-[#f2f3ff] border-transparent"}`}
    >
      <Text className={`text-[11px] font-bold ${selected ? "text-white" : "text-[#5a4136]"}`}>{children}</Text>
    </TouchableOpacity>
  );
}

export default function PostingMobilePage() {
  const p = usePostingMobileLogic();
  const router = useRouter();

  if (!p.user) {
    return (
      <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <ActivityIndicator color="#FF6B00" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* Header */}
      <View className="h-14 px-4 flex-row items-center bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => safeBack(router, "/c/home")} className="w-10 h-10 rounded-full items-center justify-center" activeOpacity={0.7}>
          <ArrowLeft size={22} color="#131b2e" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-[#131b2e] ml-1">Posting Kebutuhan</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center px-4 pt-3 gap-4">
          {/* Banner */}
          <View className="bg-[#f2f3ff] rounded-2xl p-4 flex-row items-center justify-between overflow-hidden">
            <View className="flex-1 pr-2">
              <View className="self-start bg-[#ff6b00]/10 px-2 py-0.5 rounded-full flex-row items-center gap-1 mb-1">
                <Zap size={12} color="#a04100" />
                <Text className="text-[11px] font-bold text-[#a04100]">Cepat & Praktis</Text>
              </View>
              <Text className="text-[16px] font-bold text-[#131b2e]">Jelaskan Kebutuhanmu</Text>
              <Text className="text-[11px] text-[#5a4136] mt-1">Biarkan mitra andal BISA mengajukan penawaran terbaik dalam hitungan menit!</Text>
            </View>
            <Image source={require("../../assets/mascot.png")} style={{ width: 72, height: 72 }} resizeMode="contain" />
          </View>

          {/* Form Section — Judul & Kategori */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 gap-4">
            <View className="gap-1.5">
              <Text className="text-[13px] font-semibold text-[#131b2e]">
                Judul Singkat <Text className="text-[#ba1a1a]">*</Text>
              </Text>
              <TextInput
                value={p.judul}
                onChangeText={p.setJudul}
                placeholder="Misal: Perbaikan Pompa Air Mati"
                placeholderTextColor="#9CA3AF"
                className="w-full bg-[#f2f3ff] text-[#131b2e] text-sm rounded-xl px-4 py-3 border border-transparent"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[13px] font-semibold text-[#131b2e]">
                Kategori Layanan <Text className="text-[#ba1a1a]">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => p.setShowCatModal(true)}
                activeOpacity={0.85}
                className="bg-[#f2f3ff] rounded-xl p-2.5 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-9 h-9 rounded-lg bg-[#ffdbcc] items-center justify-center">
                    {(() => {
                      const n = p.kategori.name;
                      if (n === "Service AC & Elektronik") return <Snowflake size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Kelistrikan") return <Zap size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Tukang & Sanitasi Air") return <Wrench size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Pertukangan Bangunan") return <Hammer size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Kebersihan Rumah") return <BrushCleaning size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Antar & Kurir") return <Truck size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Layanan IT & Komputer") return <Monitor size={18} color="#a04100" strokeWidth={2} />;
                      if (n === "Otomotif & Bengkel") return <Bike size={18} color="#a04100" strokeWidth={2} />;
                      return <Grid3X3 size={18} color="#a04100" strokeWidth={2} />;
                    })()}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold text-[#131b2e]" numberOfLines={1}>
                      {p.kategori.name}
                    </Text>
                    <Text className="text-[11px] text-[#5a4136]" numberOfLines={1}>
                      {p.kategori.desc}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={18} color="#5a4136" />
              </TouchableOpacity>
            </View>

            {p.kategori.name === "Lainnya" && (
              <View className="gap-1.5">
                <Text className="text-[13px] font-semibold text-[#131b2e]">
                  Kategori Spesifik <Text className="text-[#ba1a1a]">*</Text>
                </Text>
                <TextInput
                  value={p.kategoriLainnya}
                  onChangeText={p.setKategoriLainnya}
                  placeholder="Tulis kategori kebutuhanmu..."
                  placeholderTextColor="#9CA3AF"
                  className="w-full bg-[#f2f3ff] text-[#131b2e] text-sm rounded-xl px-4 py-3"
                />
              </View>
            )}

            <View className="gap-1.5">
              <Text className="text-[13px] font-semibold text-[#131b2e]">
                Deskripsi Pekerjaan <Text className="text-[#ba1a1a]">*</Text>
              </Text>
              <View>
                <TextInput
                  value={p.deskripsi}
                  onChangeText={p.setDeskripsi}
                  placeholder="Jelaskan kendala, tipe peralatan, dan ekspektasi pengerjaan..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  className="w-full bg-[#f2f3ff] text-[#131b2e] text-sm rounded-xl p-4 border border-transparent min-h-[96px]"
                  style={{ minHeight: 96 }}
                />
                <Text className="text-[11px] font-semibold text-[#5a4136] text-right mt-1">{p.deskripsi.length} / 500 karakter</Text>
              </View>
            </View>

            <View className="gap-1.5 border-t border-gray-100 pt-3">
              <Text className="text-[13px] font-semibold text-[#131b2e]">Foto Kebutuhamnu (Opsional)</Text>
              <TouchableOpacity
                onPress={p.pickFoto}
                activeOpacity={0.85}
                className="bg-[#f2f3ff] border-2 border-dashed border-[#a04100]/30 rounded-xl p-4 items-center justify-center min-h-[96px] overflow-hidden"
              >
                {!p.fotoPreview ? (
                  <>
                    <View className="w-10 h-10 rounded-full bg-[#ffdbcc] items-center justify-center">
                      <Camera size={20} color="#a04100" />
                    </View>
                    <Text className="text-xs font-bold text-[#a04100] mt-1">Ambil atau Unggah Foto</Text>
                  </>
                ) : (
                  <View className="w-full h-28 rounded-xl overflow-hidden relative">
                    <Image source={{ uri: p.fotoPreview }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View className="absolute inset-0 bg-black/30 items-center justify-center">
                      <Text className="text-white text-xs font-bold bg-[#131b2e]/60 px-3 py-1.5 rounded-full">Ganti Foto</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              {p.fotoPreview && (
                <TouchableOpacity onPress={p.removeFoto} className="self-center mt-1 flex-row items-center gap-1">
                  <Trash2 size={14} color="#ba1a1a" />
                  <Text className="text-xs font-bold text-[#ba1a1a]">Hapus Foto</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Lokasi Section */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 gap-3">
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View>
                <Text className="text-[13px] font-semibold text-[#131b2e]">Pekerjaan Online?</Text>
                <Text className="text-[11px] text-gray-500">Tidak perlu kunjungan ke lokasi</Text>
              </View>
              <Switch value={p.isOnline} onValueChange={p.setIsOnline} trackColor={{ false: "#d1d5db", true: "#ff6b00" }} thumbColor="#fff" />
            </View>

            {!p.isOnline && (
              <View className="gap-3">
                <View className="flex-row items-center justify-between relative">
                  <Text className="text-[13px] font-semibold text-[#131b2e]">
                    Lokasi Pengerjaan <Text className="text-[#ba1a1a]">*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={p.handleDeteksiLokasi}
                    disabled={p.isLocating}
                    activeOpacity={0.85}
                    className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 border ${p.isGpsDetected ? "bg-[#6ffbbe]/20 border-transparent" : "bg-[#ffedd5] border-[#ff6b00]/40 shadow-sm"}`}
                  >
                    <Locate size={14} color={p.isGpsDetected ? "#006c49" : "#a04100"} />
                    <Text className={`text-[11px] font-bold ${p.isGpsDetected ? "text-[#006c49]" : "text-[#a04100]"}`}>{p.isLocating ? "Mendeteksi..." : p.isGpsDetected ? "✓ GPS Terkunci" : "Deteksi GPS"}</Text>
                    {p.isLocating && <ActivityIndicator size="small" color={p.isGpsDetected ? "#006c49" : "#a04100"} />}
                  </TouchableOpacity>
                </View>

                {/* Peta 1:1 web: h-32, gray-200, iframe OSM embed + ping + pin */}
                <View className="w-full h-32 rounded-xl bg-gray-200 overflow-hidden border border-gray-200 relative" style={{ height: 128 }}>
                  {Platform.OS === "web" ? (
                    <View className="w-full h-full relative pointer-events-none">
                      {/* @ts-ignore iframe di RN web */}
                      <iframe
                        title="map"
                        width="100%"
                        height="100%"
                        frameBorder={0}
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.bboxStr}&layer=mapnik&marker=${p.mapCoords.lat}%2C${p.mapCoords.lng}`}
                        style={{ opacity: 0.8, border: 0, width: "100%", height: "100%", filter: "grayscale(20%)" } as any}
                      />
                      <View className="absolute inset-0 items-center justify-center pointer-events-none">
                        <View className="w-8 h-8 bg-[#ff6b00]/25 rounded-full absolute" />
                        <MapPin size={30} color="#ff6b00" strokeWidth={2.5} style={{ marginTop: -10 } as any} />
                      </View>
                    </View>
                  ) : MapView ? (
                    <MapView
                      style={{ flex: 1 }}
                      region={{
                        latitude: p.mapCoords.lat,
                        longitude: p.mapCoords.lng,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    >
                      <Marker coordinate={{ latitude: p.mapCoords.lat, longitude: p.mapCoords.lng }} pinColor="#ff6b00" />
                    </MapView>
                  ) : (
                    <View className="flex-1 items-center justify-center pointer-events-none">
                      <MapPin size={24} color="#ff6b00" />
                      <Text className="text-xs text-gray-500 mt-1">Koordinat GPS Aktif</Text>
                    </View>
                  )}

                  {/* Popup / Bubble pesan kecil transparan di atas map - Hilang otomatis jika GPS sudah terdeteksi */}
                  {!p.isGpsDetected && (
                    <TouchableOpacity
                      onPress={p.handleDeteksiLokasi}
                      activeOpacity={0.9}
                      className="absolute top-2.5 right-2.5 left-2.5 bg-[#131b2e]/85 px-3 py-2 rounded-xl flex-row items-center justify-between border border-white/20 shadow-lg"
                    >
                      <View className="flex-row items-center gap-2 flex-1 mr-2">
                        <View className="w-6 h-6 rounded-full bg-[#ff6b00] items-center justify-center shrink-0">
                          <Locate size={13} color="#fff" />
                        </View>
                        <Text className="text-[11px] font-medium text-white/90 leading-tight flex-1">
                          Klik di sini / tombol <Text className="font-extrabold text-[#ff9838]">Deteksi GPS</Text> agar titik akurat
                        </Text>
                      </View>
                      <View className="bg-[#ff6b00] px-2.5 py-1 rounded-lg flex-row items-center gap-1 shrink-0">
                        <Text className="text-[10px] font-extrabold text-white">{p.isLocating ? "..." : "Klik GPS"}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Lokasi Map (Deteksi GPS) 1:1 Image 2 web */}
                {!!p.alamatMap && (
                  <View className="bg-[#f2f3ff] rounded-lg p-3 gap-1 mt-1">
                    <View className="flex-row items-center gap-1.5">
                      <View className="items-center">
                        <MapPin size={15} color="#ff6b00" strokeWidth={2.2} />
                        <View className="w-3 h-0.5 bg-[#ff6b00] mt-0.5 rounded-full" />
                      </View>
                      <Text className="text-xs font-bold text-[#5a4136]">Lokasi Map Terdeteksi</Text>
                    </View>
                    <Text className="text-sm font-semibold text-[#131b2e] leading-snug">{p.alamatMap}</Text>
                  </View>
                )}

                <View className="bg-[#f2f3ff] rounded-lg p-3 gap-2 mt-1">
                  <Text className="text-sm font-bold text-[#131b2e]">Tulis Alamat Lengkap</Text>
                  <View className="flex-row items-center gap-1.5 border-b border-[#a04100]/30 pb-1">
                    <Text className="text-[16px] text-[#5a4136]">✎</Text>
                    <TextInput
                      value={p.lokasi}
                      onChangeText={p.setLokasi}
                      placeholder="Tulis blok atau patokan rumah"
                      placeholderTextColor="rgba(90,65,54,0.6)"
                      className="flex-1 text-sm font-medium text-[#5a4136]"
                    />
                  </View>
                </View>
                <View className="bg-[#eaedff] rounded-lg p-2.5 flex-row items-center gap-2.5">
                  <View className="w-6 h-6 rounded-full bg-[#00ae78] items-center justify-center shrink-0">
                    <Text className="text-white text-[10px]">🔒</Text>
                  </View>
                  <Text className="flex-1 text-[10px] text-[#5a4136] leading-snug font-medium">Alamat detail hanya muncul ke mitra jika Anda menyetujui tawaran mereka.</Text>
                </View>
              </View>
            )}
          </View>

          {/* Details Section */}
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100 gap-2">
                <Text className="text-xs font-semibold text-[#5a4136]">Jumlah Provider</Text>
                <View className="flex-row items-center justify-between bg-[#f2f3ff] rounded-full p-1">
                  <TouchableOpacity onPress={() => p.setProviderCount(Math.max(1, p.providerCount - 1))} className="w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm">
                    <Minus size={16} color="#131b2e" />
                  </TouchableOpacity>
                  <Text className="text-sm font-semibold text-[#131b2e]">{p.providerCount} Org</Text>
                  <TouchableOpacity onPress={() => p.setProviderCount(Math.min(10, p.providerCount + 1))} className="w-8 h-8 rounded-full bg-[#ff6b00] items-center justify-center">
                    <Plus size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              <View className="flex-1 bg-white rounded-xl p-4 border border-gray-100 gap-2">
                <Text className="text-xs font-semibold text-[#5a4136]">Radius Pencarian</Text>
                <TouchableOpacity onPress={() => p.setShowRadiusModal(true)} className="flex-row items-center justify-between bg-[#f2f3ff] rounded-full px-3 h-10">
                  <View className="flex-row items-center gap-1.5">
                    <Locate size={16} color="#a04100" />
                    <Text className="text-xs font-bold text-[#131b2e]" numberOfLines={1}>
                      {p.radius}
                    </Text>
                  </View>
                  <ChevronDown size={16} color="#5a4136" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-4 border border-gray-100 gap-4">
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] font-semibold text-[#131b2e]">
                    Anggaran Dana <Text className="text-[#ba1a1a]">*</Text>
                  </Text>
                  <View className="flex-row bg-[#f2f3ff] rounded-full p-0.5">
                    <TouchableOpacity onPress={() => p.setBudgetType("total")} className={`px-2.5 py-1 rounded-full ${p.budgetType === "total" ? "bg-[#ff6b00]" : ""}`}>
                      <Text className={`text-[11px] font-bold ${p.budgetType === "total" ? "text-white" : "text-[#5a4136]"}`}>Total</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => p.setBudgetType("per_orang")} className={`px-2.5 py-1 rounded-full ${p.budgetType === "per_orang" ? "bg-[#ff6b00]" : ""}`}>
                      <Text className={`text-[11px] font-bold ${p.budgetType === "per_orang" ? "text-white" : "text-[#5a4136]"}`}>Per Orang</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-row items-center bg-[#f2f3ff] rounded-xl px-3 h-12">
                  <Text className="text-[16px] font-bold text-[#5a4136] mr-2">Rp</Text>
                  <TextInput
                    value={p.budget ? parseInt(p.budget || "0").toLocaleString("id-ID") : ""}
                    onChangeText={p.handleBudgetChange}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 text-[16px] font-bold text-[#131b2e]"
                  />
                </View>
              </View>

              <TouchableOpacity onPress={() => p.setShowDeadlineModal(true)} activeOpacity={0.85} className="border-t border-gray-100 pt-3 gap-1.5">
                <Text className="text-[13px] font-semibold text-[#131b2e]">
                  Batas Waktu Pengerjaan <Text className="text-[#ba1a1a]">*</Text>
                </Text>
                <View className="bg-[#f2f3ff] rounded-xl p-2.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="w-9 h-9 rounded-lg bg-[#dae2fd] items-center justify-center">
                      <Clock size={18} color="#a04100" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-[#131b2e]" numberOfLines={1}>
                        {p.deadline.name}
                      </Text>
                      <Text className="text-[11px] text-[#5a4136]" numberOfLines={1}>
                        {p.deadline.desc}
                      </Text>
                    </View>
                  </View>
                  {p.deadline.urgent && (
                    <View className="bg-[#feb700] px-2 py-1 rounded-full flex-row items-center gap-1 ml-2">
                      <Flame size={12} color="#6b4b00" />
                      <Text className="text-[10px] font-bold text-[#6b4b00]">Urgent</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => p.setShowMasaModal(true)} activeOpacity={0.85} className="border-t border-gray-100 pt-3 gap-1.5">
                <Text className="text-[13px] font-semibold text-[#131b2e]">
                  Masa Berlaku Postingan <Text className="text-[#ba1a1a]">*</Text>
                </Text>
                <Text className="text-[11px] text-[#5a4136] -mt-1">Postingan akan otomatis batal jika lewat dari waktu ini</Text>
                <View className="bg-[#f2f3ff] rounded-xl p-2.5 flex-row items-center gap-2">
                  <View className="w-9 h-9 rounded-lg bg-[#ffdbcc] items-center justify-center">
                    <Hourglass size={18} color="#a04100" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-[#131b2e]">{p.masaBerlaku.label}</Text>
                    <Text className="text-[11px] text-[#5a4136]">Terhitung sejak diposting</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Nego toggle */}
            <View className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center justify-between gap-4">
              <View className="flex-row gap-2 flex-1">
                <View className="w-9 h-9 rounded-full bg-[#6ffbbe] items-center justify-center">
                  <Handshake size={18} color="#006c49" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-[#131b2e]">Terima Penawaran Otomatis</Text>
                  <Text className="text-[11px] text-[#5a4136] mt-0.5">Buka kesempatan negosiasi harga langsung dari mitra terdekat</Text>
                </View>
              </View>
              <Switch value={p.isAutoNego} onValueChange={p.setIsAutoNego} trackColor={{ false: "#dae2fd", true: "#00ae78" }} thumbColor="#fff" />
            </View>
          </View>

          {/* Ringkasan */}
          <View className="bg-[#e2e7ff] rounded-2xl p-4 gap-2 mt-1">
            <View className="flex-row items-center justify-between border-b border-white/40 pb-2">
              <View className="flex-row items-center gap-1.5">
                <Receipt size={18} color="#ff6b00" />
                <Text className="text-sm font-bold text-gray-900">Ringkasan Permintaan</Text>
              </View>
              <View className="bg-white px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-[#00ae78]" />
                <Text className="text-[11px] font-bold text-[#00ae78]">Siap Tayang</Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2 mt-1">
              <View className="w-[48%] bg-white/80 rounded-xl p-2.5">
                <Text className="text-[10px] font-semibold text-gray-500">Kategori</Text>
                <Text className="text-xs font-bold text-[#131b2e]" numberOfLines={1}>
                  {p.kategori.name === "Lainnya" ? p.kategoriLainnya || "Lainnya" : p.kategori.name}
                </Text>
              </View>
              <View className="w-[48%] bg-white/80 rounded-xl p-2.5">
                <Text className="text-[10px] font-semibold text-gray-500">Estimasi Budget</Text>
                <Text className="text-xs font-extrabold text-[#ff6b00]" numberOfLines={1}>
                  Rp{parseInt(p.budget || "0").toLocaleString("id-ID")} ({p.providerCount}x)
                </Text>
              </View>
              <View className="w-[48%] bg-white/80 rounded-xl p-2.5">
                <Text className="text-[10px] font-semibold text-gray-500">Waktu Pengerjaan</Text>
                <Text className="text-xs font-semibold text-[#131b2e]" numberOfLines={1}>
                  {p.deadline.name}
                </Text>
              </View>
              <View className="w-[48%] bg-white/80 rounded-xl p-2.5">
                <Text className="text-[10px] font-semibold text-gray-500">Radius</Text>
                <Text className="text-xs font-bold text-[#006c49]">{p.radius}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-gray-100 px-4 py-3 items-center">
        <TouchableOpacity
          onPress={p.handleSubmit}
          disabled={p.loading}
          activeOpacity={0.92}
          className={`w-full max-w-md py-3.5 rounded-full items-center justify-center flex-row gap-2 ${p.loading ? "bg-orange-400" : "bg-[#FF6B00]"}`}
        >
          {p.loading ? <ActivityIndicator color="#fff" /> : null}
          <Text className="text-white font-bold text-sm">{p.loading ? "Mengunggah Data..." : "Posting Sekarang"}</Text>
          {!p.loading && <Text className="text-white text-[16px]">→</Text>}
        </TouchableOpacity>
        <View className="flex-row items-center gap-2 mt-1.5">
          <Text className="text-[11px] font-semibold text-[#5a4136]">✓ Gratis posting</Text>
          <Text className="text-[11px] text-[#5a4136]">•</Text>
          <Text className="text-[11px] font-semibold text-[#5a4136]">Mitra BISA bergaransi</Text>
        </View>
      </View>

      {/* Modals */}
      <Modal visible={p.showCatModal} transparent animationType="slide" onRequestClose={() => p.setShowCatModal(false)}>
        <Pressable onPress={() => p.setShowCatModal(false)} className="flex-1 bg-[#131b2e]/60 justify-end">
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-lg font-bold text-[#131b2e] mb-4">Pilih Kategori Layanan</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View className="gap-2 pb-2">
                {p.listKategori.map((cat: any, idx: number) => {
                  const IconComp: any = (() => {
                    const n = cat.name as string;
                    if (n === "Service AC & Elektronik") return Snowflake;
                    if (n === "Kelistrikan") return Zap;
                    if (n === "Tukang & Sanitasi Air") return Wrench;
                    if (n === "Pertukangan Bangunan") return Hammer;
                    if (n === "Kebersihan Rumah") return BrushCleaning;
                    if (n === "Antar & Kurir") return Truck;
                    if (n === "Layanan IT & Komputer") return Monitor;
                    if (n === "Otomotif & Bengkel") return Bike;
                    if (n === "Lainnya") return Grid3X3;
                    return LayoutGrid;
                  })();
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        p.setKategori(cat);
                        p.setShowCatModal(false);
                      }}
                      className={`p-3 rounded-xl flex-row items-center gap-3 border ${p.kategori.name === cat.name ? "border-[#ff6b00] bg-[#fff4ed]" : "border-gray-100"}`}
                    >
                      <View className={`w-10 h-10 rounded-lg items-center justify-center ${p.kategori.name === cat.name ? "bg-[#ffdbcc]" : "bg-gray-100"}`}>
                        <IconComp size={18} color={p.kategori.name === cat.name ? "#a04100" : "#6b7280"} strokeWidth={2} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900">{cat.name}</Text>
                        <Text className="text-xs text-gray-500">{cat.desc}</Text>
                      </View>
                      {p.kategori.name === cat.name && <Check size={18} color="#ff6b00" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={p.showRadiusModal} transparent animationType="slide" onRequestClose={() => p.setShowRadiusModal(false)}>
        <Pressable onPress={() => p.setShowRadiusModal(false)} className="flex-1 bg-[#131b2e]/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-lg font-bold text-[#131b2e] mb-4">Jangkauan Radius Pencarian</Text>
            <View className="gap-2">
              {p.listRadius.map((rad: string) => (
                <TouchableOpacity
                  key={rad}
                  onPress={() => {
                    p.setRadius(rad);
                    p.setShowRadiusModal(false);
                  }}
                  className={`p-3 rounded-xl border ${p.radius === rad ? "border-[#ff6b00] bg-[#fff4ed]" : "border-gray-100"}`}
                >
                  <Text className={`text-sm font-bold ${p.radius === rad ? "text-[#a04100]" : "text-gray-700"}`}>{rad}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={p.showDeadlineModal} transparent animationType="slide" onRequestClose={() => p.setShowDeadlineModal(false)}>
        <Pressable onPress={() => p.setShowDeadlineModal(false)} className="flex-1 bg-[#131b2e]/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-lg font-bold text-[#131b2e] mb-3">Batas Waktu Pengerjaan</Text>
            <View className="gap-2">
              {p.listDeadline.map((dl: any) => (
                <TouchableOpacity
                  key={dl.name}
                  onPress={() => {
                    p.setDeadline(dl);
                    p.setShowDeadlineModal(false);
                  }}
                  className={`p-3 rounded-xl flex-row items-center justify-between border ${p.deadline.name === dl.name ? "border-[#ff6b00] bg-[#fff4ed]" : "border-gray-100"}`}
                >
                  <View>
                    <Text className={`text-sm font-bold ${p.deadline.name === dl.name ? "text-[#a04100]" : "text-gray-900"}`}>{dl.name}</Text>
                    <Text className="text-xs text-gray-500">{dl.desc}</Text>
                  </View>
                  {dl.urgent && <Flame size={18} color="#feb700" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={p.showMasaModal} transparent animationType="slide" onRequestClose={() => p.setShowMasaModal(false)}>
        <Pressable onPress={() => p.setShowMasaModal(false)} className="flex-1 bg-[#131b2e]/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-lg font-bold text-[#131b2e]">Masa Berlaku Postingan</Text>
            <Text className="text-xs text-gray-500 mb-4">Postingan akan otomatis dibatalkan jika tidak ada mitra hingga masa berlaku habis.</Text>
            <View className="gap-2">
              {(p.listMasaBerlaku as any).map((mb: any) => (
                <TouchableOpacity
                  key={mb.value}
                  onPress={() => {
                    p.setMasaBerlaku(mb);
                    p.setShowMasaModal(false);
                  }}
                  className={`p-3 rounded-xl border ${p.masaBerlaku.value === mb.value ? "border-[#ff6b00] bg-[#fff4ed]" : "border-gray-100"}`}
                >
                  <Text className={`text-sm font-bold ${p.masaBerlaku.value === mb.value ? "text-[#a04100]" : "text-gray-700"}`}>{mb.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* GPS confirm — soft validation */}
      <Modal visible={p.showGpsConfirm} transparent animationType="fade" onRequestClose={() => p.confirmGpsSubmit(false)}>
        <View className="flex-1 bg-[#131b2e]/60 items-center justify-center p-4">
          <View className="bg-white rounded-3xl w-full max-w-sm p-5 border border-[#ff6b00]/20">
            <View className="w-10 h-10 rounded-full bg-[#fff7ed] items-center justify-center mb-3"><AlertTriangle size={18} color="#a04100" /></View>
            <Text className="text-[15px] font-extrabold text-[#131b2e]">Titik GPS belum terdeteksi</Text>
            <Text className="text-[12px] text-[#5a4136] mt-1 leading-4">Lokasi masih manual. Deteksi otomatis 1 ketuk biar mitra menemukanmu lebih akurat — atau lanjut dengan alamat manual?</Text>
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity onPress={() => p.confirmGpsSubmit(true)} className="flex-1 bg-[#ff6b00] py-3 rounded-full items-center flex-row justify-center gap-1.5">
                <Locate size={14} color="#fff" /><Text className="text-white font-extrabold text-xs">Deteksi Sekarang</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => p.confirmGpsSubmit(false)} className="flex-1 bg-[#f2f3ff] py-3 rounded-full items-center border border-gray-200">
                <Text className="text-[#5a4136] font-bold text-xs">Lanjut Manual</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[10px] text-gray-400 text-center mt-2">Kamu tetap bisa edit alamat setelah GPS terkunci.</Text>
          </View>
        </View>
      </Modal>

      {/* Popup Verifikasi */}
      <Modal visible={p.popup.show} transparent animationType="fade" onRequestClose={p.closePopup}>
        <View className="flex-1 bg-[#131b2e]/60 items-center justify-center p-4">
          <View className="bg-white rounded-3xl w-full max-w-sm p-6 items-center border-4 border-orange-100">
            <View className="w-20 h-20 items-center justify-center mb-3">
              <Image source={require("../../assets/mascot.png")} style={{ width: 80, height: 80 }} resizeMode="contain" />
            </View>
            <Text className={`text-lg font-extrabold text-center mb-2 ${p.popup.type === "error" ? "text-red-600" : "text-[#a04100]"}`}>{p.popup.title}</Text>
            <View className="bg-orange-50 rounded-xl p-3 mb-4 border border-orange-100 w-full">
              <Text className="text-sm text-gray-700 font-medium text-center leading-5">{p.popup.message}</Text>
            </View>
            <TouchableOpacity
              onPress={p.closePopup}
              className={`w-full py-3.5 rounded-full items-center ${p.popup.type === "error" ? "bg-red-50" : "bg-[#ff6b00]"}`}
            >
              <Text className={`font-bold ${p.popup.type === "error" ? "text-red-600" : "text-white"}`}>
                {p.popup.isSuccess ? "Mengerti" : "Kembali"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
