import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { getStoredUser, setStoredUser, removeStoredUser } from "../lib/user-storage";
import * as Location from "expo-location";

export function useProfilMobileLogic(role: "mitra" | "client") {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Modal States
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // Location Form State
  const [locCoord, setLocCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [locAlamatSingkat, setLocAlamatSingkat] = useState("");
  const [locAlamatLengkap, setLocAlamatLengkap] = useState("");
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Notification Toggles
  const [notifChat, setNotifChat] = useState(true);
  const [notifOrder, setNotifOrder] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);

  // Reverse Geocoding with OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (data && data.address) {
        const sub =
          data.address.suburb ||
          data.address.village ||
          data.address.town ||
          data.address.city_district ||
          data.address.county ||
          data.address.city;
        if (sub) setLocAlamatSingkat(sub);
        if (data.display_name && !locAlamatLengkap) {
          setLocAlamatLengkap(data.display_name);
        }
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const fetchUserData = useCallback(async () => {
    try {
      const stored = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      const { data: realUser } = await supabase
        .from("users_bisa")
        .select("*")
        .eq("id", stored.id)
        .maybeSingle();

      const u = realUser || stored;
      setUser(u);
      setIsActive(u.is_active !== false);
      setLocAlamatSingkat(u.alamat_singkat || "");
      setLocAlamatLengkap(u.address || u.alamat || "");
      if (u.latitude && u.longitude) {
        setLocCoord({ lat: Number(u.latitude), lng: Number(u.longitude) });
      }
      if (realUser) await setStoredUser(realUser);
    } catch {
      // fallback silent
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const openLocationModal = () => {
    if (user?.latitude && user?.longitude) {
      setLocCoord({ lat: Number(user.latitude), lng: Number(user.longitude) });
    }
    setLocAlamatSingkat(user?.alamat_singkat || "");
    setLocAlamatLengkap(user?.address || user?.alamat || "");
    setShowLocationModal(true);
  };

  const handleDetectGPS = async () => {
    setDetectingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin GPS Dibutuhkan", "Aktifkan lokasi untuk membaca GPS realtime.");
        setDetectingGPS(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newCoord = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocCoord(newCoord);
      await reverseGeocode(newCoord.lat, newCoord.lng);
    } catch (err: any) {
      Alert.alert("Gagal membaca GPS", err.message || "Pastikan GPS diaktifkan.");
    } finally {
      setDetectingGPS(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user || isToggling) return;
    setIsToggling(true);
    const newStatus = !isActive;
    try {
      const { error } = await supabase.from("users_bisa").update({ is_active: newStatus }).eq("id", user.id);
      if (!error) {
        setIsActive(newStatus);
        const updated = { ...user, is_active: newStatus };
        setUser(updated);
        await setStoredUser(updated);
      } else {
        Alert.alert("Gagal", "Gagal mengubah status aktif");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!user) return;
    setSavingLocation(true);
    try {
      let lat = locCoord?.lat;
      let lng = locCoord?.lng;

      if (!lat || !lng) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin GPS Dibutuhkan", "Aktifkan izin lokasi untuk menyimpan titik radar.");
          setSavingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const updatePayload: any = {
        latitude: lat,
        longitude: lng,
        address: locAlamatLengkap || user.address || "",
        alamat_singkat: locAlamatSingkat || user.alamat_singkat || "Lokasi Saya",
      };

      const { error } = await supabase.from("users_bisa").update(updatePayload).eq("id", user.id);
      if (!error) {
        const updated = { ...user, ...updatePayload };
        setUser(updated);
        await setStoredUser(updated);
        setShowLocationModal(false);
        Alert.alert(
          "Lokasi Tersimpan",
          role === "mitra"
            ? "Titik lokasi kerja Anda berhasil disimpan ke Radar!"
            : "Titik pengantaran berhasil diperbarui secara realtime!"
        );
      } else {
        Alert.alert("Gagal", error.message);
      }
    } catch (e: any) {
      Alert.alert("Gagal GPS", e.message || "Gagal mengambil lokasi GPS");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLogout = async () => {
    await removeStoredUser();
    router.replace("/(auth)/login" as any);
  };

  const isFeaturedActive = !!user?.is_featured && (!user?.featured_until || new Date(user.featured_until) > new Date());
  const daysLeft = isFeaturedActive && user?.featured_until
    ? Math.max(0, Math.ceil((new Date(user.featured_until).getTime() - Date.now()) / 86400000))
    : 0;

  const kycLabel =
    user?.kyc_status === "Terverifikasi" || user?.kyc_status === "approved"
      ? "Terverifikasi"
      : user?.kyc_status === "Dibekukan"
      ? "Dibekukan"
      : user?.kyc_status === "Ditolak"
      ? "Ditolak"
      : "Menunggu Verifikasi";

  return {
    user,
    loading,
    isActive,
    isToggling,
    showLogoutModal,
    setShowLogoutModal,
    showLocationModal,
    setShowLocationModal,
    showNotifSettings,
    setShowNotifSettings,
    locCoord,
    setLocCoord,
    locAlamatSingkat,
    setLocAlamatSingkat,
    locAlamatLengkap,
    setLocAlamatLengkap,
    detectingGPS,
    savingLocation,
    notifChat,
    setNotifChat,
    notifOrder,
    setNotifOrder,
    notifPromo,
    setNotifPromo,
    isFeaturedActive,
    daysLeft,
    kycLabel,
    openLocationModal,
    handleDetectGPS,
    handleToggleActive,
    handleSaveLocation,
    handleLogout,
    refetch: fetchUserData,
  };
}
