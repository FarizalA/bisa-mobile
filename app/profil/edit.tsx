import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  Lock,
  Info,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Plus,
  Check,
  Sparkles,
  Clock3,
  Zap,
  ShieldCheck,
  User,
  Briefcase,
  Activity as ActivityIcon,
  X,
  Loader2,
} from "lucide-react-native";
import { useEditProfilMobileLogic } from "../../src/hooks/useEditProfilMobileLogic";
import { CATEGORY_IDS } from "../../src/lib/categories";
import { safeBack } from "@/lib/navigation";

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows,
  keyboardType,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  keyboardType?: any;
  prefix?: string;
}) {
  return (
    <View className="mb-3">
      <Text className="text-[12px] font-bold text-gray-700 mb-1.5">{label}</Text>
      <View className="flex-row items-center">
        {prefix ? <Text className="text-gray-500 font-bold mr-2">{prefix}</Text> : null}
        {multiline ? (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            multiline
            numberOfLines={rows || 2}
            textAlignVertical="top"
            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900 min-h-[48px]"
            placeholderTextColor="#9CA3AF"
            style={{ minHeight: (rows || 2) * 20 + 16 }}
          />
        ) : (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            keyboardType={keyboardType || "default"}
            className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        )}
      </View>
    </View>
  );
}

export default function EditProfilMobilePage() {
  const router = useRouter();
  const l = useEditProfilMobileLogic();

  const tabs = [
    { id: "info", label: "Info Dasar", Icon: User },
    { id: "karya", label: "Karya", Icon: Briefcase },
    { id: "status", label: "Status", Icon: ActivityIcon },
  ] as const;

  const showAvatarOptions = () => {
    Alert.alert("Ubah Foto Profil", "Pilih sumber foto", [
      { text: "Kamera", onPress: () => l.handleAvatarCamera() },
      { text: "Galeri", onPress: () => l.pickAvatar(false) },
      { text: "Batal", style: "cancel" },
    ]);
  };

  if (l.loading) {
    return (
      <View className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text className="text-xs text-gray-500 mt-2">Memuat profil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#faf8ff]" edges={["top"]}>
      {/* HEADER */}
      <View className="h-16 px-4 flex-row items-center gap-3 bg-[#faf8ff]/95 border-b border-gray-100/60">
        <TouchableOpacity onPress={() => router.replace("/c/profil" as any)} className="w-10 h-10 rounded-full bg-white items-center justify-center border border-gray-100" activeOpacity={0.7}>
          <ArrowLeft size={20} color="#131b2e" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-[#131b2e]">Edit Profil</Text>
      </View>

      {/* TAB PILLS */}
      <View className="bg-white border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
          {tabs.map((t) => {
            const active = l.activeTab === t.id;
            const Icon = t.Icon;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => l.setActiveTab(t.id as any)}
                className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 ${active ? "bg-[#FF6B00]" : "bg-gray-100"}`}
                activeOpacity={0.85}
              >
                <Icon size={14} color={active ? "#fff" : "#6B7280"} />
                <Text className={`text-[12px] font-semibold ${active ? "text-white" : "text-gray-600"}`}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* ===== TAB: INFO DASAR ===== */}
        {l.activeTab === "info" && (
          <View className="gap-0">
            {/* Avatar */}
            <View className="items-center mb-5">
              <TouchableOpacity onPress={showAvatarOptions} activeOpacity={0.9} className="w-24 h-24 rounded-full border-4 border-dashed border-[#FF6B00] bg-orange-50 items-center justify-center overflow-hidden relative">
                {l.previewImage ? (
                  <Image source={{ uri: l.previewImage }} style={{ width: 96, height: 96 }} resizeMode="cover" />
                ) : (
                  <Camera size={36} color="#FF6B00" />
                )}
                {l.uploadingImage ? (
                  <View className="absolute inset-0 bg-black/50 items-center justify-center">
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </TouchableOpacity>
              <Text className="text-[12px] text-gray-500 font-medium mt-2">Tap untuk ubah foto (max 5 MB)</Text>
              <View className="flex-row gap-2 mt-2">
                <TouchableOpacity onPress={() => l.handleAvatarCamera()} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 flex-row items-center gap-1">
                  <Camera size={14} color="#6B7280" />
                  <Text className="text-[11px] font-bold text-gray-700">Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => l.pickAvatar(false)} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 flex-row items-center gap-1">
                  <ImageIcon size={14} color="#6B7280" />
                  <Text className="text-[11px] font-bold text-gray-700">Galeri</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nama Lengkap — TERKUNCI */}
            <View className="mb-3">
              <View className="flex-row items-center gap-1.5 mb-1.5 flex-wrap">
                <Text className="text-[12px] font-bold text-gray-700">Nama Lengkap</Text>
                <View className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 flex-row items-center gap-1">
                  <Lock size={10} color="#B45309" />
                  <Text className="text-[10px] font-extrabold text-amber-700">Terkunci — Sesuai KTP</Text>
                </View>
              </View>
              <View className="relative">
                <TextInput
                  value={l.name}
                  editable={false}
                  className="w-full px-3 py-2.5 pr-9 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 font-semibold text-[14px]"
                  placeholder="Nama sesuai KTP"
                  placeholderTextColor="#9CA3AF"
                />
                <View className="absolute right-3 top-3">
                  <Lock size={16} color="#9CA3AF" />
                </View>
              </View>
              <View className="mt-1.5 flex-row gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                <Info size={14} color="#D97706" />
                <Text className="flex-1 text-[11px] text-gray-600 leading-[16px]">
                  Nama tidak bisa diubah sendiri. Admin mencocokkan dengan foto KTP saat verifikasi KYC. Jika ada kesalahan ketik, hubungi Admin/CS untuk perbaikan.
                </Text>
              </View>
            </View>

            <Field label="Email" value={l.email} onChange={l.setEmail} placeholder="email@example.com" keyboardType="email-address" />
            <Field label="Nomor Telepon" value={l.phone} onChange={l.setPhone} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" />
            <View className="mb-3">
              <Text className="text-[12px] font-bold text-gray-700 mb-1.5">Kategori Utama Jasa <Text className="text-orange-600 font-extrabold">*</Text></Text>
              <View className="flex-row flex-wrap gap-1.5">
                {CATEGORY_IDS.map((cat) => {
                  const active = (l.kategori || "Layanan IT & Komputer") === cat;
                  return (
                    <TouchableOpacity key={cat} onPress={() => l.setKategori(cat)} className={`px-3 py-1.5 rounded-full border ${active ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-white border-gray-200"}`} activeOpacity={0.85}>
                      <Text className={`text-[11px] font-bold ${active ? "text-white" : "text-gray-700"}`}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text className="text-[11px] text-gray-400 mt-1">Pilih satu kategori utama — menentukan katalog tempat profilmu muncul.</Text>
            </View>
            <Field label="Keahlian Spesifik (pisahkan koma)" value={l.keahlian} onChange={l.setKeahlian} placeholder="Misal: Service Laptop, Install OS, Web Design" multiline rows={2} />
            <Field label="Profil Singkat" value={l.mitraDescription} onChange={l.setMitraDescription} placeholder="Jelaskan tentang jasa Anda..." multiline rows={3} />
            <Field label="Tarif Layanan Dasar (Rp)" value={l.basePrice} onChange={l.setBasePrice} placeholder="0" keyboardType="number-pad" prefix="Rp" />
          </View>
        )}

        {/* ===== TAB: KARYA (Galeri + Layanan + Portofolio) ===== */}
        {l.activeTab === "karya" && (
          <View className="gap-5">
            {/* Galeri */}
            <View>
              <Text className="text-[13px] font-extrabold text-gray-900 mb-1">Galeri Foto</Text>
              <Text className="text-[11px] text-gray-500 mb-2">Maksimal 5 foto — tampil di profil publik</Text>
              <TouchableOpacity
                onPress={l.pickGallery}
                disabled={l.uploadingGallery}
                className="border-2 border-dashed border-[#FF6B00] rounded-xl p-4 items-center bg-white"
                activeOpacity={0.8}
              >
                {l.uploadingGallery ? <ActivityIndicator color="#FF6B00" /> : <UploadCloud size={36} color="#FF6B00" />}
                <Text className="text-[13px] font-bold text-gray-700 mt-1">Tap untuk tambah foto galeri</Text>
                <Text className="text-[11px] text-gray-500">Max 5 MB per foto, PNG/JPG</Text>
              </TouchableOpacity>
              <View className="flex-row flex-wrap gap-2 mt-3">
                {l.gallery.map((g: any, idx: number) => (
                  <View key={g.id || idx} className="relative w-[30%] aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image source={{ uri: g.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Hapus Foto", "Yakin hapus foto ini?", [
                          { text: "Batal", style: "cancel" },
                          { text: "Hapus", style: "destructive", onPress: () => g.id && l.deleteGalleryItem(g.id) },
                        ])
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                    >
                      <X size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {l.gallery.length === 0 ? <Text className="text-[11px] text-gray-400 mt-2 text-center">Belum ada foto galeri</Text> : null}
            </View>

            {/* Layanan */}
            <View>
              <Text className="text-[13px] font-extrabold text-gray-900 mb-1">Layanan (max 5)</Text>
              <View className="bg-[#f2f3ff] rounded-xl p-4 gap-3">
                <TextInput value={l.newService.title} onChangeText={(v) => l.setNewService({ ...l.newService, title: v })} placeholder="Judul Layanan" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900" placeholderTextColor="#9CA3AF" />
                <TextInput
                  value={l.newService.description}
                  onChangeText={(v) => l.setNewService({ ...l.newService, description: v })}
                  placeholder="Deskripsi layanan..."
                  multiline
                  numberOfLines={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
                <View>
                  <Text className="text-[12px] font-bold text-gray-600 mb-1.5">Harga Layanan (Rp)</Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-lg px-3">
                      <Text className="text-gray-500 font-bold mr-2">Rp</Text>
                      <TextInput value={String(l.newService.price || "")} onChangeText={(v) => l.setNewService({ ...l.newService, price: Number(v) || 0 })} placeholder="0" keyboardType="number-pad" className="flex-1 py-2.5 text-[14px] text-gray-900" placeholderTextColor="#9CA3AF" />
                    </View>
                    <View className="bg-white border border-gray-200 rounded-lg px-2 justify-center">
                      <TextInput value={l.newService.unit} onChangeText={(v) => l.setNewService({ ...l.newService, unit: v })} placeholder="unit" className="text-[13px] text-gray-900 min-w-[52px]" />
                    </View>
                  </View>
                  <Text className="text-[10px] text-gray-400 mt-1">unit / jam / flat</Text>
                </View>
                <TouchableOpacity
                  onPress={() => l.setNewService({ ...l.newService, is_popular: !l.newService.is_popular })}
                  className="flex-row items-center gap-2"
                  activeOpacity={0.7}
                >
                  <View className={`w-5 h-5 rounded border-2 items-center justify-center ${l.newService.is_popular ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-white border-gray-300"}`}>
                    {l.newService.is_popular ? <Check size={12} color="#fff" /> : null}
                  </View>
                  <Text className="text-[13px] font-semibold text-gray-700">Tandai sebagai Populer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={l.addService} className="w-full py-2.5 rounded-lg bg-[#FF6B00] items-center" activeOpacity={0.9}>
                  <Text className="text-white font-bold text-[14px]">+ Tambah Layanan</Text>
                </TouchableOpacity>
              </View>
              <View className="gap-2 mt-3">
                {l.services.map((svc: any, idx: number) => (
                  <View key={svc.id || idx} className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="font-bold text-[14px] text-gray-900">{svc.title}</Text>
                      {svc.description ? <Text className="text-[12px] text-gray-600 mt-0.5">{svc.description}</Text> : null}
                      <Text className="text-[13px] font-bold text-[#FF6B00] mt-1">Rp{Number(svc.price).toLocaleString("id-ID")} / {svc.unit}</Text>
                      {svc.is_popular ? <Text className="text-[10px] font-bold text-amber-600 mt-0.5">★ Populer</Text> : null}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Hapus Layanan", `Hapus "${svc.title}"?`, [
                          { text: "Batal", style: "cancel" },
                          { text: "Hapus", style: "destructive", onPress: () => svc.id && l.deleteService(svc.id) },
                        ])
                      }
                      className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {l.services.length === 0 ? <Text className="text-[11px] text-gray-400 text-center">Belum ada layanan</Text> : null}
              </View>
            </View>

            {/* Portofolio */}
            <View>
              <Text className="text-[13px] font-extrabold text-gray-900 mb-1">Portofolio (max 6 project)</Text>
              <Text className="text-[11px] text-gray-500 mb-2">{l.portfolio.length}/6 project tersimpan — hapus untuk tambah baru</Text>
              <View className="bg-[#f2f3ff] rounded-xl p-4 gap-3">
                <TextInput value={l.newPortfolio.project_title} onChangeText={(v) => l.setNewPortfolio({ ...l.newPortfolio, project_title: v })} placeholder="Judul Project" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900" placeholderTextColor="#9CA3AF" />
                <TextInput
                  value={l.newPortfolio.project_description}
                  onChangeText={(v) => l.setNewPortfolio({ ...l.newPortfolio, project_description: v })}
                  placeholder="Deskripsi project (opsional)"
                  multiline
                  numberOfLines={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={l.pickPortfolioImages}
                  disabled={l.portfolio.length >= 6}
                  className={`border-2 border-dashed rounded-lg p-3 items-center bg-white ${l.portfolio.length >= 6 ? "border-gray-300 opacity-50" : "border-[#FF6B00]"}`}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={28} color={l.portfolio.length >= 6 ? "#9CA3AF" : "#FF6B00"} />
                  <Text className="text-[12px] font-bold text-gray-700 mt-1">Pilih 1-5 foto</Text>
                  <Text className="text-[11px] text-gray-500">Max 5 MB per foto</Text>
                </TouchableOpacity>
                {l.previewUrls.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {l.previewUrls.map((url, i) => (
                      <View key={i} className="w-[31%] h-20 rounded-lg overflow-hidden bg-gray-100">
                        <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      </View>
                    ))}
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={l.addPortfolio}
                  disabled={l.uploadingPortfolio || l.portfolio.length >= 6}
                  className={`w-full py-2.5 rounded-lg items-center ${l.portfolio.length >= 6 ? "bg-gray-300" : "bg-[#FF6B00]"} disabled:opacity-50`}
                  activeOpacity={0.9}
                >
                  {l.uploadingPortfolio ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className={`font-bold text-[14px] ${l.portfolio.length >= 6 ? "text-gray-500" : "text-white"}`}>
                      {l.portfolio.length >= 6 ? "Limit 6 project tercapai — hapus dahulu" : "+ Tambah Project"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              <View className="gap-2 mt-3">
                {l.portfolio.map((p: any, idx: number) => (
                  <View key={p.id || idx} className="bg-white border border-gray-200 rounded-xl p-3">
                    <Text className="font-bold text-[14px] text-gray-900">{p.project_title}</Text>
                    {p.project_description ? <Text className="text-[12px] text-gray-600 mt-1">{p.project_description}</Text> : null}
                    <View className="flex-row gap-1.5 mt-2">
                      {(p.image_urls || []).slice(0, 3).map((url: string, i: number) => (
                        <Image key={i} source={{ uri: url }} style={{ width: 72, height: 64, borderRadius: 8 }} resizeMode="cover" />
                      ))}
                      {(p.image_urls || []).length > 3 ? (
                        <View className="w-[72px] h-[64px] bg-gray-100 rounded-lg items-center justify-center">
                          <Text className="text-[12px] font-bold text-gray-600">+{(p.image_urls || []).length - 3}</Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert("Hapus Project", `Hapus "${p.project_title}"?`, [
                          { text: "Batal", style: "cancel" },
                          { text: "Hapus", style: "destructive", onPress: () => p.id && l.deletePortfolioItem(p.id) },
                        ])
                      }
                      className="mt-2 flex-row items-center gap-1 self-start"
                    >
                      <Trash2 size={14} color="#EF4444" />
                      <Text className="text-[12px] font-bold text-red-500">Hapus</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {l.portfolio.length === 0 ? <Text className="text-[11px] text-gray-400 text-center">Belum ada portofolio</Text> : null}
              </View>
            </View>
          </View>
        )}

        {/* ===== TAB: STATUS (Ketersediaan + Karakteristik) ===== */}
        {l.activeTab === "status" && (
          <View className="gap-5">
            <View>
              <Text className="text-[13px] font-extrabold text-gray-900 mb-2">Pilih Status Ketersediaan</Text>
              <View className="gap-2">
                {l.AVAILABILITY_PRESETS.map((preset: string) => {
                  const active = l.availabilityStatus === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => {
                        l.setAvailabilityStatus(preset);
                        l.setAvailabilityCustom("");
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg border ${active ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-white border-gray-200"}`}
                      activeOpacity={0.8}
                    >
                      <Text className={`text-[14px] font-semibold ${active ? "text-white" : "text-gray-700"}`}>{preset}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View className="mt-3">
                <Text className="text-[12px] font-bold text-gray-700 mb-1.5">Atau Ketik Status Custom</Text>
                <TextInput
                  value={l.availabilityCustom}
                  onChangeText={(v) => {
                    l.setAvailabilityCustom(v);
                    l.setAvailabilityStatus(v ? v : "Tersedia Sekarang");
                  }}
                  placeholder="Contoh: Tersedia setiap hari jam 9-17"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-[14px] text-gray-900 min-h-[72px]"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Karakteristik — Read-only Auto */}
            <View>
              <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex-row gap-2 mb-3">
                <Sparkles size={18} color="#059669" />
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-emerald-800">Dihitung otomatis</Text>
                  <Text className="text-[11px] text-emerald-700 leading-[15px] mt-0.5">Tepat Waktu & Respon dihitung dari ulasan & order. Garansi aktif jika KYC terverifikasi. Admin bisa override — hubungi admin.</Text>
                </View>
              </View>
              <View className="gap-3">
                <View className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-lg bg-emerald-100 items-center justify-center">
                      <Clock3 size={16} color="#059669" />
                    </View>
                    <View>
                      <Text className="text-[11px] font-semibold text-gray-500">Tepat Waktu</Text>
                      <Text className="text-[13px] font-bold text-gray-900">{l.charOnTime ? `${l.charOnTime}%` : "— (dari ulasan)"}</Text>
                    </View>
                  </View>
                  <View className="px-2 py-1 rounded-full bg-gray-100">
                    <Text className="text-[10px] font-bold text-gray-600">Auto</Text>
                  </View>
                </View>
                <View className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
                      <Zap size={16} color="#2563EB" />
                    </View>
                    <View>
                      <Text className="text-[11px] font-semibold text-gray-500">Respon Cepat</Text>
                      <Text className="text-[13px] font-bold text-gray-900">{l.charResponse || "— (dari aktivitas)"}</Text>
                    </View>
                  </View>
                  <View className="px-2 py-1 rounded-full bg-gray-100">
                    <Text className="text-[10px] font-bold text-gray-600">Auto</Text>
                  </View>
                </View>
                <View className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
                      <ShieldCheck size={16} color="#D97706" />
                    </View>
                    <View>
                      <Text className="text-[11px] font-semibold text-gray-500">Garansi Aman</Text>
                      <Text className="text-[13px] font-bold text-gray-900">{l.charWarranty || "—"}</Text>
                    </View>
                  </View>
                  <View className="px-2 py-1 rounded-full bg-gray-100">
                    <Text className="text-[10px] font-bold text-gray-600">Auto</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM BAR: Batal / Simpan */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex-row gap-3">
        <TouchableOpacity onPress={() => router.replace("/c/profil" as any)} className="flex-1 py-3 rounded-full bg-gray-100 items-center" activeOpacity={0.8}>
          <Text className="font-bold text-gray-700">Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={l.handleSave}
          disabled={l.saving}
          className="flex-1 py-3 rounded-full bg-[#FF6B00] items-center flex-row justify-center gap-2 disabled:opacity-60"
          activeOpacity={0.9}
        >
          {l.saving ? <ActivityIndicator color="#fff" size="small" /> : <Check size={16} color="#fff" />}
          <Text className="font-bold text-white">{l.saving ? "Menyimpan..." : "Simpan"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
