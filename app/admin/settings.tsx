import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CreditCard,
  Heart,
  Radio,
  Check,
  X,
} from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import { safeBack } from "@/lib/navigation";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [codPaymentEnabled, setCodPaymentEnabled] = useState(true);
  const [codDonationEnabled, setCodDonationEnabled] = useState(true);
  const [maxRadarRadius, setMaxRadarRadius] = useState<number>(45);

  // fetch admin settings – hanya admin yang dapat mengakses screen ini
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["cod_payment_enabled", "cod_donation_enabled", "max_radar_radius"]);
      if (error) throw error;
      if (data) {
        const map = new Map(data.map((s: any) => [s.key, s.value]));
        setCodPaymentEnabled(Boolean(map.get("cod_payment_enabled")));
        setCodDonationEnabled(Boolean(map.get("cod_donation_enabled")));
        setMaxRadarRadius(Number(map.get("max_radar_radius")) || 45);
      }
    } catch (e) {
      console.error("Gagal ambil settings", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const toggleSetting = async (key: string, current: boolean, setter: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: !current, password: "BisaAdmin2026" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setter(!current);
      Alert.alert("Berhasil", `Fitur ${key.replace(/_/g, " ")} ${!current ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (e:any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateRadius = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "max_radar_radius", value: maxRadarRadius, password: "BisaAdmin2026" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      Alert.alert("Berhasil", `Radius radar diubah menjadi ${maxRadarRadius} km`);
    } catch (e:any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator size="large" color="#ff6b00" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#faf8ff]" edges={["top"]}>
      {/* Header */}
      <View className="h-16 px-4 flex-row items-center border-b border-gray-100 bg-white/95">
        <TouchableOpacity
          onPress={() => safeBack(router, "/")}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center mr-3"
        >
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#131b2e]">Pengaturan Sistem</Text>
      </View>

      <View className="flex-1 px-4 py-6 space-y-6">
        {/* COD Payment Toggle */}
        <View className="flex-row items-center justify-between p-4 bg-blue-50/30 border border-blue-100 rounded-xl">
          <View className="flex-1 mr-4">
            <Text className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={20} color="#2563EB" /> Fitur Pembayaran COD
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Aktifkan atau nonaktifkan pilihan pembayaran Tunai/COD untuk user.
            </Text>
          </View>
          <Switch
            value={codPaymentEnabled}
            disabled={saving}
            onValueChange={() => toggleSetting("cod_payment_enabled", codPaymentEnabled, setCodPaymentEnabled)}
            trackColor={{ false: "#d1d5db", true: "#2563EB" }}
            thumbColor={codPaymentEnabled ? "#fff" : "#fff"}
          />
        </View>

        {/* COD Donation Toggle */}
        <View className="flex-row items-center justify-between p-4 bg-orange-50/30 border border-orange-100 rounded-xl">
          <View className="flex-1 mr-4">
            <Text className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Heart size={20} color="#D97706" /> Fitur Donasi COD
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Aktifkan opsi donasi saat user memilih metode COD (minimal Rp 3.000).
            </Text>
          </View>
          <Switch
            value={codDonationEnabled}
            disabled={saving}
            onValueChange={() => toggleSetting("cod_donation_enabled", codDonationEnabled, setCodDonationEnabled)}
            trackColor={{ false: "#d1d5db", true: "#10B981" }}
            thumbColor={codDonationEnabled ? "#fff" : "#fff"}
          />
        </View>

        {/* Max Radar Radius Input */}
        <View className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl">
          <Text className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Radio size={20} color="#059669" /> Batas Maksimal Radius Radar (km)
          </Text>
          <Text className="text-xs text-gray-600 mb-3">
            Default <Text className="font-bold">45 km</Text>. Ubah bila diperlukan.
          </Text>
          <View className="flex-row items-center space-x-2">
            <TextInput
              keyboardType="number-pad"
              value={String(maxRadarRadius)}
              onChangeText={(t) => setMaxRadarRadius(Number(t) || 0)}
              className="flex-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm text-gray-900 bg-white"
            />
            <Text className="text-sm font-medium text-gray-700">km</Text>
            <TouchableOpacity
              onPress={updateRadius}
              disabled={saving}
              className="px-3 py-2 bg-emerald-600 rounded-lg"
            >
              <Text className="text-white font-bold text-sm">Simpan Radius</Text>
            </TouchableOpacity>
          </View>
        </View>

        {saving && (
          <View className="flex-row items-center justify-center mt-4">
            <ActivityIndicator size="small" color="#ff6b00" />
            <Text className="ml-2 text-gray-600">Menyimpan...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
