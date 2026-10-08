import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  X,
  ExternalLink,
} from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser, setStoredUser } from "../../src/lib/user-storage";
import ProviderBottomNav from "../../src/components/ProviderBottomNav";
import { safeBack } from "@/lib/navigation";

export type PlanItem = {
  id: "wilayah" | "kecamatan" | "super";
  name: string;
  price: number;
  durationDays: number;
  radiusKm: number;
  badge?: string;
  tagline: string;
  features: string[];
  gradientBg: string;
  borderColor: string;
  accentColor: string;
};

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: "wilayah",
    name: "Paket Wilayah",
    price: 49000,
    durationDays: 30,
    radiusKm: 10,
    tagline: "Cocok untuk mitra lokal yang ingin fokus cari order dekat rumah.",
    features: [
      "Ranking #1 di radius 10 km dari lokasi Anda",
      "Lencana ⭐ Mitra Unggulan",
      "Prioritas di Beranda Klien sekitar",
      "Masa aktif 30 hari penuh",
    ],
    gradientBg: "bg-blue-50/50",
    borderColor: "border-blue-200",
    accentColor: "#2563EB",
  },
  {
    id: "kecamatan",
    name: "Paket Kecamatan",
    price: 99000,
    durationDays: 30,
    radiusKm: 5,
    badge: "🔥 Paling Laris",
    tagline: "Dominasi pesanan di area kecamatan terpadat Anda.",
    features: [
      "Top slot #1 di radius padat 5 km",
      "Lencana ⭐ Juara Wilayah",
      "Efek Glow menyala di Radar & Daftar Mitra",
      "Masa aktif 30 hari penuh",
    ],
    gradientBg: "bg-violet-50/60",
    borderColor: "border-violet-300",
    accentColor: "#7C3AED",
  },
  {
    id: "super",
    name: "Super Kerjasama",
    price: 199000,
    durationDays: 30,
    radiusKm: 15,
    badge: "👑 VVIP Partner",
    tagline: "Jangkauan maksimal untuk bengkel / vendor spesialis profesional.",
    features: [
      "Jangkauan ekstra luas: Radius 15 km",
      "Lencana 👑 Partner Resmi BISA",
      "Prioritas rekomendasi sistem ke semua klien sekitar",
      "Customer support admin khusus",
    ],
    gradientBg: "bg-amber-50/60",
    borderColor: "border-amber-300",
    accentColor: "#D97706",
  },
];

export default function ProviderLanggananPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const stored = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      const { data } = await supabase
        .from("users_bisa")
        .select("*")
        .eq("id", stored.id)
        .maybeSingle();

      if (data) {
        setUser(data);
        await setStoredUser(data);
      } else {
        setUser(stored);
      }
    } catch (e) {
      console.error("Gagal fetch user langganan", e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "subscription_plans")
        .maybeSingle();
      const val = (data as any)?.value;
      const arr: any[] = Array.isArray(val) ? val : [];
      if (arr.length === 0) return;
      const mapped: PlanItem[] = arr.map((p: any, i: number) => {
        const fb = DEFAULT_PLANS[i] ?? DEFAULT_PLANS[0];
        return {
          id: String(p.id || fb.id).toLowerCase() as PlanItem["id"],
          name: String(p.name || fb.name),
          price: Number(p.price ?? p.amount ?? fb.price),
          durationDays: Number(p.durationDays ?? p.days ?? fb.durationDays),
          radiusKm: Number(p.radiusKm ?? p.radius ?? fb.radiusKm),
          badge: p.badge ?? fb.badge,
          tagline: String(p.tagline || fb.tagline),
          features: Array.isArray(p.features) ? p.features : fb.features,
          gradientBg: p.gradientBg || p.gradient || fb.gradientBg,
          borderColor: p.borderColor || p.border || fb.borderColor,
          accentColor: p.accentColor || fb.accentColor,
        };
      });
      if (mapped.length > 0) setPlans(mapped);
    } catch (e) {
      console.warn("Gagal fetch subscription_plans", e);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchPlans();
  }, [fetchUser, fetchPlans]);

  const handleChoosePlan = async (plan: PlanItem) => {
    if (!user) return;
    setPaying(true);
    setMsg("");

    try {
      // Expo Web: pakai relative biar CORS lokal aman. Native: pakai EXPO_PUBLIC_API_URL
      const isWeb = Platform.OS === "web";
      const backendUrl = !isWeb
        ? process.env.EXPO_PUBLIC_API_URL || "https://bisa-app.vercel.app"
        : "";
      const url = backendUrl ? `${backendUrl}/api/langganan/create` : `/api/langganan/create`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, plan: plan.id }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `Gagal hubungi server pembayaran (${res.status}). Pastikan dev server Next (bisa-app) jalan di port 3000.`
        );
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Gagal membuat tagihan (HTTP ${res.status})`);
      }

      if (data.paymentUrl) {
        if (isWeb) {
          window.location.href = data.paymentUrl;
        } else {
          setPaymentUrl(data.paymentUrl);
          setShowPaymentModal(true);
        }
      } else {
        throw new Error("Link pembayaran Midtrans tidak ditemukan.");
      }
    } catch (e: any) {
      const detail =
        e.message === "Failed to fetch"
          ? "Tidak bisa hubungi API /api/langganan/create. Pastikan Next dev (bisa-app) jalan di http://localhost:3000 dan sudah set MIDTRANS_SERVER_KEY. Jika test mobile web di Expo :8081, jalankan bisa-app dan tambah proxy atau set EXPO_PUBLIC_API_URL ke URL bisa-app."
          : e.message;
      setMsg(`⚠️ ${detail}`);
      Alert.alert("Gagal Pembayaran", detail);
    } finally {
      setPaying(false);
    }
  };

  const isCurrentActive =
    !!user?.is_featured &&
    (!user?.featured_until || new Date(user.featured_until) > new Date());

  const daysLeft =
    isCurrentActive && user?.featured_until
      ? Math.ceil(
          (new Date(user.featured_until).getTime() - Date.now()) / 86400000
        )
      : 0;

  if (loading || !user) {
    return (
      <View className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#faf8ff]" edges={["top"]}>
      {/* HEADER 1:1 Web */}
      <View className="bg-white/95 border-b border-gray-100 px-4 h-16 flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => safeBack(router, "/p/home")}
          className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center"
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1 min-w-0">
          <Text className="font-extrabold text-sm text-gray-900">
            Langganan & Kerjasama
          </Text>
          <Text className="text-[11px] text-gray-400" numberOfLines={1}>
            Naikkan profil ke #1 di area sekitar
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card Jika Aktif */}
        {isCurrentActive && (
          <View className="p-4 rounded-3xl bg-violet-600 mb-4 shadow-md">
            <View className="flex-row items-center justify-between">
              <View className="bg-white/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] uppercase font-extrabold tracking-wider text-white">
                  ⭐ Highlight Aktif
                </Text>
              </View>
              <Text className="text-xs font-bold text-white">
                {daysLeft} hari lagi
              </Text>
            </View>
            <Text className="text-lg font-black text-white mt-2">
              Paket{" "}
              {String(user?.subscription_plan || "Wilayah").toUpperCase()}
            </Text>
            <Text className="text-xs text-white/80 mt-0.5 leading-relaxed">
              Profil Anda sedang diutamakan di ranking #1 bagi klien dalam radius{" "}
              <Text className="font-bold">
                {user?.featured_radius_km ?? 10} km
              </Text>
              .
            </Text>
          </View>
        )}

        {msg ? (
          <View className="p-3 bg-white rounded-2xl border border-violet-200 mb-4 shadow-sm">
            <Text className="text-xs text-violet-800 font-medium">{msg}</Text>
          </View>
        ) : null}

        {/* Intro */}
        <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-4">
          <Text className="font-extrabold text-sm text-gray-900 mb-1">
            Kenapa Perlu Highlight?
          </Text>
          <Text className="text-xs text-gray-500 leading-relaxed">
            Klien cenderung memilih 3 mitra teratas yang muncul di beranda
            mereka. Dengan berlangganan, profil Anda otomatis diprioritaskan di
            wilayah tempat Anda bekerja.
          </Text>
        </View>

        {/* Katalog Paket live dari app_settings.subscription_plans */}
        <View className="gap-4">
          {plans.map((plan) => {
            const isMine =
              user?.subscription_plan === plan.id && isCurrentActive;
            return (
              <View
                key={plan.id}
                className={`relative rounded-3xl p-5 bg-white border ${plan.borderColor} ${plan.gradientBg} shadow-sm overflow-hidden`}
              >
                {plan.badge && (
                  <View className="absolute top-0 right-4 px-3 py-1 rounded-b-xl bg-violet-600">
                    <Text className="text-white text-[10px] font-extrabold">
                      {plan.badge}
                    </Text>
                  </View>
                )}

                <View className="mb-2">
                  <Text className="font-extrabold text-base text-gray-900">
                    {plan.name}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {plan.tagline}
                  </Text>
                </View>

                <View className="my-3 flex-row items-baseline gap-1">
                  <Text className="text-2xl font-black text-gray-900">
                    Rp {plan.price.toLocaleString("id-ID")}
                  </Text>
                  <Text className="text-xs text-gray-400 font-semibold">
                    / {plan.durationDays} hari
                  </Text>
                </View>

                <View className="space-y-2 py-3 border-t border-gray-100">
                  {plan.features.map((f, i) => (
                    <View
                      key={i}
                      className="flex-row items-start gap-2 mb-1.5"
                    >
                      <Check
                        size={14}
                        color="#059669"
                        className="mt-0.5 shrink-0"
                      />
                      <Text className="text-xs text-gray-700 flex-1 leading-snug">
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => handleChoosePlan(plan)}
                  disabled={paying || isMine}
                  activeOpacity={0.85}
                  className={`w-full mt-2 py-3.5 rounded-2xl items-center justify-center shadow-sm ${
                    isMine
                      ? "bg-emerald-100 border border-emerald-200"
                      : "bg-violet-600"
                  }`}
                >
                  <Text
                    className={`font-extrabold text-xs ${
                      isMine ? "text-emerald-800" : "text-white"
                    }`}
                  >
                    {isMine
                      ? "✅ Paket Sedang Aktif"
                      : paying
                      ? "Memproses..."
                      : `Langganan Sekarang — Rp ${plan.price.toLocaleString(
                          "id-ID"
                        )}`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Payment Gateway Modal / Browser Fallback */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPaymentModal(false);
          fetchUser();
        }}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] p-5">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <Text className="text-base font-extrabold text-gray-900">
                Pembayaran Midtrans
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  fetchUser();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="py-6 items-center">
              <View className="w-16 h-16 rounded-full bg-violet-50 items-center justify-center mb-3">
                <ExternalLink size={28} color="#7C3AED" />
              </View>
              <Text className="text-base font-bold text-gray-900 text-center">
                Selesaikan Pembayaran
              </Text>
              <Text className="text-xs text-gray-500 text-center px-4 mt-1 leading-relaxed">
                Anda akan dialihkan ke halaman pembayaran resmi Midtrans (QRIS,
                Transfer Bank, GoPay, E-Wallet).
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (paymentUrl) {
                    Linking.openURL(paymentUrl);
                  }
                }}
                className="w-full py-3.5 bg-violet-600 rounded-2xl items-center mt-6 shadow-md"
              >
                <Text className="text-white font-extrabold text-sm">
                  Buka Halaman Pembayaran ↗
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  fetchUser();
                }}
                className="w-full py-3 bg-gray-100 rounded-2xl items-center mt-2.5"
              >
                <Text className="text-gray-700 font-bold text-xs">
                  Sudah Bayar / Cek Status
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ProviderBottomNav active="profil" />
    </SafeAreaView>
  );
}
