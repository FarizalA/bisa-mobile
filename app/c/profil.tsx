import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  Store,
  Edit3,
  Camera,
  BadgeCheck,
  Ban,
  Hourglass,
  Phone,
  MapPin,
  MapPinPlus,
  Clock3,
  Heart,
  Star,
  Wallet,
  Lock,
  Bell,
  Headset,
  Scale,
  LogOut,
  ChevronRight,
  X,
  Navigation,
  CheckCircle2,
  Info,
  MessageSquare,
  Package,
  Tag,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useProfilMobileLogic } from "../../src/hooks/useProfilMobileLogic";
import BottomNav from "../../src/components/BottomNav";

export default function ClientProfilPage() {
  const router = useRouter();
  const logic = useProfilMobileLogic("client");
  const {
    user,
    loading,
    showLogoutModal,
    setShowLogoutModal,
    showLocationModal,
    setShowLocationModal,
    showNotifSettings,
    setShowNotifSettings,
    locCoord,
    detectingGPS,
    savingLocation,
    locAlamatSingkat,
    setLocAlamatSingkat,
    locAlamatLengkap,
    setLocAlamatLengkap,
    notifChat,
    setNotifChat,
    notifOrder,
    setNotifOrder,
    notifPromo,
    setNotifPromo,
    kycLabel,
    openLocationModal,
    handleDetectGPS,
    handleSaveLocation,
    handleLogout,
  } = logic;

  if (loading || !user) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <ActivityIndicator color="#FF6B00" size="large" />
      </View>
    );
  }

  const kycIsVerified = kycLabel === "Terverifikasi";
  const kycIsFrozen = kycLabel === "Dibekukan";
  const kycBg = kycIsVerified
    ? "bg-emerald-50 border-emerald-200"
    : kycIsFrozen
    ? "bg-slate-100 border-slate-300"
    : "bg-amber-50 border-amber-200";
  const kycFg = kycIsVerified
    ? "text-emerald-700"
    : kycIsFrozen
    ? "text-slate-700"
    : "text-amber-700";

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAF8]" edges={["top"]}>
      {/* 1. Header 1:1 Web */}
      <View className="bg-white/90 px-4 h-16 flex-row items-center justify-between border-b border-gray-100 shrink-0">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.replace("/c/home" as any)}
            className="w-9 h-9 rounded-full items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 tracking-tight">Akun Klien</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Client Card with Orange Gradient Banner */}
        <View className="bg-white rounded-[28px] border border-gray-100 shadow-sm overflow-hidden mb-5">
          <View className="h-24 bg-[#FF6B00] relative">
            <TouchableOpacity
              onPress={() => router.push("/profil/edit" as any)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full items-center justify-center"
              activeOpacity={0.8}
            >
              <Edit3 size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="px-5 -mt-10 pb-5 items-center text-center">
            <View className="relative mb-3">
              <View className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md">
                <View className="w-full h-full rounded-xl overflow-hidden bg-orange-50 items-center justify-center border border-gray-100">
                  {user.face_url ? (
                    <Image source={{ uri: user.face_url }} style={{ width: 72, height: 72 }} resizeMode="cover" />
                  ) : (
                    <Image
                      source={require("../../assets/maskot/maskot mengacungkan jempol.png")}
                      style={{ width: 72, height: 72 }}
                      resizeMode="cover"
                    />
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/profil/edit" as any)}
                activeOpacity={0.85}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md items-center justify-center border border-gray-100"
              >
                <Camera size={16} color="#FF6B00" />
              </TouchableOpacity>
            </View>

            <Text className="text-xl font-extrabold text-gray-900 leading-tight text-center" numberOfLines={1}>
              {user.name || "Pengguna BISA"}
            </Text>
            <Text className="text-xs text-gray-500 font-medium mt-1 text-center" numberOfLines={1}>
              {user.email}
            </Text>

            {/* Badges */}
            <View className="flex-row justify-center flex-wrap gap-1.5 mt-3">
              <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full border ${kycBg}`}>
                {kycIsVerified ? (
                  <BadgeCheck size={12} color="#047857" />
                ) : kycIsFrozen ? (
                  <Ban size={12} color="#334155" />
                ) : (
                  <Hourglass size={12} color="#B45309" />
                )}
                <Text className={`text-[10px] font-extrabold ${kycFg}`}>{kycLabel}</Text>
              </View>

              {user.phone ? (
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100">
                  <Phone size={12} color="#4B5563" />
                  <Text className="text-[10px] font-bold text-gray-600">{user.phone}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={openLocationModal}
                className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full border ${
                  user.latitude && user.longitude
                    ? "bg-[#FFF4ED] border-orange-200"
                    : "bg-amber-50 border-amber-200"
                }`}
                activeOpacity={0.8}
              >
                {user.latitude && user.longitude ? (
                  <MapPin size={12} color="#FF6B00" />
                ) : (
                  <MapPinPlus size={12} color="#B45309" />
                )}
                <Text
                  className={`text-[10px] font-bold ${
                    user.latitude && user.longitude ? "text-[#FF6B00]" : "text-amber-700"
                  }`}
                  numberOfLines={1}
                >
                  {user.alamat_singkat || (user.latitude ? "Lokasi Aktif" : "Set Lokasi")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Mode Switcher (1:1 Web) */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace("/p/home" as any);
          }}
          activeOpacity={0.9}
          className="mb-6 w-full rounded-2xl p-4 bg-[#FF6B00] flex-row items-center justify-between shadow-md"
        >
          <View>
            <View className="flex-row items-center gap-1 mb-0.5">
              <ArrowLeftRight size={14} color="rgba(255,255,255,0.9)" />
              <Text className="text-white/90 text-xs font-bold uppercase tracking-wider">Beralih Mode</Text>
            </View>
            <Text className="text-white text-lg font-extrabold">Masuk Sebagai Mitra</Text>
          </View>
          <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Store size={22} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* 4. Menu: Aktivitas Klien */}
        <View className="mb-4">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Aktivitas Klien</Text>
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            <TouchableOpacity
              onPress={() => router.push("/c/aktivitas" as any)}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-[#FFF4ED] items-center justify-center shrink-0">
                <Clock3 size={18} color="#FF6B00" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Pesanan Saya</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Berjalan, Selesai & Dibatalkan</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/c/tersimpan" as any)}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center shrink-0">
                <Heart size={18} color="#DB2777" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Mitra Tersimpan</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Daftar mitra favorit Anda</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/c/ulasan" as any)}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center shrink-0">
                <Star size={18} color="#D97706" fill="#F59E0B" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Ulasan Saya</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Review yang Anda berikan</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Menu: Pengaturan Akun */}
        <View className="mb-4">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Pengaturan Akun</Text>
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            <TouchableOpacity
              onPress={openLocationModal}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-[#FFF4ED] items-center justify-center shrink-0">
                <MapPin size={18} color="#FF6B00" />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-gray-900">Titik Lokasi Saya</Text>
                  <View className="px-1.5 py-0.5 rounded bg-[#FFE7D2]">
                    <Text className="text-[8px] font-extrabold text-[#FF6B00] uppercase tracking-wider">
                      {user.latitude ? "Terdeteksi" : "Belum Diatur"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5 truncate" numberOfLines={1}>
                  {user.alamat_singkat || user.address || (user.latitude ? `${Number(user.latitude).toFixed(4)}, ${Number(user.longitude).toFixed(4)}` : "Atur lokasi GPS realtime")}
                </Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/c/dompet" as any)}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center shrink-0">
                <Wallet size={18} color="#059669" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Pembayaran & Dompet</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Saldo BISA & Rekening/E-Wallet</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert("Informasi", "Menu Keamanan belum aktif saat ini.")}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center shrink-0">
                <Lock size={18} color="#4B5563" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Keamanan & Sandi</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Ubah kata sandi dan PIN</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowNotifSettings(true)}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center shrink-0">
                <Bell size={18} color="#9333EA" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Notifikasi</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Atur pesan & pengingat</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Menu: Bantuan & Lainnya */}
        <View className="mb-4">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Bantuan & Lainnya</Text>
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            <TouchableOpacity
              onPress={() => router.push("/c/bantuan" as any)}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-sky-50 items-center justify-center shrink-0">
                <Headset size={18} color="#0284C7" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Pusat Bantuan / FAQ</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Hubungi tim support BISA</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert("Informasi", "Halaman Syarat & Ketentuan sedang dalam pembaruan.")}
              className="flex-row items-center gap-3.5 px-4 py-3.5"
            >
              <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center shrink-0">
                <Scale size={18} color="#4B5563" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-bold text-gray-900">Syarat & Ketentuan</Text>
                <Text className="text-[11px] text-gray-500 font-medium mt-0.5">Aturan penggunaan aplikasi</Text>
              </View>
              <ChevronRight size={18} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Logout Button */}
        <TouchableOpacity
          onPress={() => setShowLogoutModal(true)}
          className="w-full bg-white border border-red-100 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 mb-4 shadow-sm"
        >
          <LogOut size={18} color="#EF4444" />
          <Text className="font-bold text-[13px] text-red-500">Keluar dari Akun</Text>
        </TouchableOpacity>

        <View className="items-center py-4">
          <Text className="text-[10px] font-bold text-gray-400">Aplikasi BISA v1.0.0</Text>
          <Text className="text-[9px] text-gray-300 mt-0.5">© 2026 BISA — Semua Hak Dilindungi</Text>
        </View>
      </ScrollView>

      {/* 1. Logout Modal */}
      <Modal visible={!!showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 items-center">
            <Image
              source={require("../../assets/maskot/maskot sakit.png")}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
              className="mb-3"
            />
            <Text className="font-extrabold text-lg text-gray-900 mb-1 text-center">Yakin Mau Keluar?</Text>
            <Text className="text-xs text-gray-500 text-center leading-relaxed mb-4">
              Kamu harus login kembali untuk mengakses fitur BISA. Data pesananmu tetap aman kok! 😊
            </Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-gray-100 rounded-xl items-center"
              >
                <Text className="font-bold text-xs text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                className="flex-1 py-3 bg-red-500 rounded-xl items-center flex-row justify-center gap-1"
              >
                <LogOut size={16} color="#fff" />
                <Text className="font-bold text-xs text-white">Ya, Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Location Modal with Auto GPS & Lat/Lng */}
      <Modal visible={!!showLocationModal} transparent animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] p-5 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View>
                <Text className="font-extrabold text-base text-gray-900">Titik Lokasi Pengantaran</Text>
                <Text className="text-[11px] text-gray-500">Tentukan alamat akurat untuk penjemputan & servis</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="py-3">
              <TouchableOpacity
                onPress={handleDetectGPS}
                disabled={detectingGPS}
                className="w-full py-3 bg-orange-50 border border-orange-200 rounded-2xl flex-row items-center justify-center gap-2 mb-3"
              >
                {detectingGPS ? (
                  <ActivityIndicator size="small" color="#FF6B00" />
                ) : (
                  <Navigation size={16} color="#FF6B00" />
                )}
                <Text className="text-xs font-bold text-[#FF6B00]">
                  {detectingGPS ? "Membaca GPS Realtime..." : "Deteksi Lokasi GPS Saya"}
                </Text>
              </TouchableOpacity>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <Text className="text-[10px] text-gray-400 font-bold uppercase">Latitude</Text>
                  <Text className="font-mono font-bold text-xs text-gray-900 mt-0.5">
                    {locCoord?.lat ? locCoord.lat.toFixed(6) : "-"}
                  </Text>
                </View>
                <View className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <Text className="text-[10px] text-gray-400 font-bold uppercase">Longitude</Text>
                  <Text className="font-mono font-bold text-xs text-gray-900 mt-0.5">
                    {locCoord?.lng ? locCoord.lng.toFixed(6) : "-"}
                  </Text>
                </View>
              </View>

              <View className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex-row items-start gap-2 mb-3">
                <Info size={16} color="#FF6B00" className="shrink-0 mt-0.5" />
                <Text className="flex-1 text-[11px] text-orange-900 leading-relaxed font-medium">
                  Titik ini mempermudah mitra menemukan lokasi Anda serta menghitung estimasi jarak secara tepat.
                </Text>
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-1">Area / Kecamatan Singkat</Text>
              <TextInput
                value={locAlamatSingkat}
                onChangeText={setLocAlamatSingkat}
                placeholder="Contoh: Bojongsari, Depok"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 mb-3"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1">Alamat Lengkap Rumah / Lokasi</Text>
              <TextInput
                value={locAlamatLengkap}
                onChangeText={setLocAlamatLengkap}
                placeholder="Jl. Melati No. 12, RT 02/05..."
                multiline
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 mb-3 min-h-[64px]"
              />
            </ScrollView>

            <View className="pt-3 border-t border-gray-100 flex-row gap-2.5">
              <TouchableOpacity onPress={() => setShowLocationModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center">
                <Text className="font-bold text-xs text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveLocation}
                disabled={savingLocation}
                className="flex-[2] py-3 bg-[#FF6B00] rounded-xl items-center flex-row justify-center gap-1.5 shadow-md"
              >
                {savingLocation ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <CheckCircle2 size={16} color="#fff" />
                )}
                <Text className="text-white font-extrabold text-xs">
                  {savingLocation ? "Menyimpan..." : "Simpan Titik GPS"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Notification Settings Modal 1:1 screenshot */}
      <Modal visible={!!showNotifSettings} transparent animationType="slide" onRequestClose={() => setShowNotifSettings(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] p-5">
            <View className="flex-row items-center justify-between pb-3">
              <Text className="text-base font-extrabold text-gray-900">Pengaturan Notifikasi</Text>
              <TouchableOpacity onPress={() => setShowNotifSettings(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="py-4 gap-3">
              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                  <View className="w-9 h-9 rounded-xl bg-white border border-gray-100 items-center justify-center shadow-sm">
                    <MessageSquare size={16} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-gray-900">Notifikasi Chat</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">Pesan baru dari Mitra atau Klien</Text>
                  </View>
                </View>
                <Switch
                  value={notifChat}
                  onValueChange={setNotifChat}
                  trackColor={{ false: "#E5E7EB", true: "#FF6B00" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                  <View className="w-9 h-9 rounded-xl bg-white border border-gray-100 items-center justify-center shadow-sm">
                    <Package size={16} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-gray-900">Notifikasi Pesanan</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">Update status pesanan & pekerjaan</Text>
                  </View>
                </View>
                <Switch
                  value={notifOrder}
                  onValueChange={setNotifOrder}
                  trackColor={{ false: "#E5E7EB", true: "#FF6B00" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                  <View className="w-9 h-9 rounded-xl bg-white border border-gray-100 items-center justify-center shadow-sm">
                    <Tag size={16} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-bold text-gray-900">Promosi & Info</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5">Penawaran spesial dan berita BISA</Text>
                  </View>
                </View>
                <Switch
                  value={notifPromo}
                  onValueChange={setNotifPromo}
                  trackColor={{ false: "#E5E7EB", true: "#FF6B00" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowNotifSettings(false)}
              className="w-full py-3.5 bg-[#FF6B00] rounded-full items-center mt-2 shadow-sm"
              activeOpacity={0.9}
            >
              <Text className="text-white font-extrabold text-sm">Simpan Pengaturan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav active="profil" />
    </SafeAreaView>
  );
}
