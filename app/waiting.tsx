import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Clock, ShieldCheck, Zap, XCircle } from "lucide-react-native";
import { safeBack } from "../src/lib/navigation";
import { supabase } from "../src/lib/supabase";
import { getStoredUser, setStoredUser } from "../src/lib/user-storage";

export default function WaitingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Menunggu");
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [kycMessage, setKycMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: any;
    const checkUserStatus = async () => {
      try {
        const user: any = await getStoredUser();
        if (!user || !user.id) {
          router.replace("/(auth)/login" as any);
          return;
        }

        const { data, error } = await supabase
          .from("users_bisa")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.warn("Status fetch error:", error);
          setLoading(false);
          return;
        }

        if (data) {
          if (data.face_url) setFaceUrl(data.face_url);
          if (data.kyc_status) {
            setStatus(data.kyc_status);
            setKycMessage(data.kyc_message ?? null);

            if (data.kyc_status === "Terverifikasi" || data.kyc_status === "approved") {
              const safe: any = { ...data };
              delete safe.password;
              await setStoredUser(safe);
            }
          }
        }
      } catch (err) {
        console.error("Polling status catch:", err);
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
    timer = setInterval(checkUserStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  const isVerified = status === "Terverifikasi" || status === "approved";
  const isRejected = status === "Ditolak";

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">
      {/* Header persis Web */}
      <View className="bg-white border-b border-gray-100 pb-2">
        <View className="h-14 px-4 flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => safeBack(router, "/(auth)/login")}
            className="w-9 h-9 rounded-full items-center justify-center active:bg-gray-100"
          >
            <ArrowLeft size={20} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-[16px] font-black text-gray-900">
            Selfie Liveness Success
          </Text>
        </View>

        {/* Step Progress Bar 3/3 */}
        <View className="px-4 pt-1">
          <View className="flex-row justify-between text-[10px] font-bold mb-1">
            <Text className="text-[10px] font-bold text-[#ff6b00]">LANGKAH 3 DARI 3</Text>
            <Text className="text-[10px] font-bold text-[#ff6b00]">Selesai 100%</Text>
          </View>
          <View className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <View className="bg-[#ff6b00] h-full rounded-full w-full" />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} className="px-4 py-4">
        <View className="max-w-[420px] w-full self-center gap-3">
          {/* Top Status Card */}
          <View className="bg-white rounded-2xl p-3.5 border border-gray-100 flex-row items-center gap-3 shadow-sm">
            <View className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 items-center justify-center relative">
              {faceUrl ? (
                <Image source={{ uri: faceUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <Text className="text-[20px]">👤</Text>
              )}
              {isVerified && (
                <View className="absolute right-0 bottom-0 bg-green-500 rounded-full w-4 h-4 items-center justify-center border-2 border-white">
                  <Text className="text-white text-[9px] font-bold">✓</Text>
                </View>
              )}
            </View>

            <View className="flex-1">
              {isVerified ? (
                <>
                  <Text className="text-[12px] font-bold text-gray-900">
                    <Text className="text-green-600">Pemeriksaan Biometrik</Text> • Berhasil
                  </Text>
                  <Text className="text-[10px] text-gray-500 mt-0.5">
                    Wajah cocok dengan KTP resmi terdaftar
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-[12px] font-bold text-red-600">
                    Sedang Pemeriksaan Biometrik •
                  </Text>
                  <Text className="text-[10px] text-gray-500 mt-0.5">
                    Mencocokkan data & dokumen resmi Anda
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Main Content Card */}
          <View className="bg-white rounded-3xl p-6 border border-gray-100 items-center text-center shadow-sm">
            <View className="mb-3">
              {isVerified ? (
                <View className="flex-row items-center gap-1.5 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                  <CheckCircle size={14} color="#16a34a" />
                  <Text className="text-[11px] font-bold text-green-800">
                    Identitas Terverifikasi
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-200">
                  <Clock size={14} color="#d97706" />
                  <Text className="text-[11px] font-bold text-amber-800">
                    Memverifikasi Identitas...
                  </Text>
                </View>
              )}
            </View>

            {/* Maskot Image */}
            <View className="w-44 h-44 my-2">
              <Image
                source={
                  isVerified
                    ? require("../assets/maskot_happy.png")
                    : require("../assets/maskot_sad.png")
                }
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>

            <Text className="text-[20px] font-black text-gray-900 text-center mb-1">
              {isVerified
                ? "Akun kamu sudah terverifikasi!"
                : "Akun kamu sedang diverifikasi!"}
            </Text>

            <Text className="text-[12px] text-gray-500 text-center leading-relaxed mb-5 px-2">
              {isVerified
                ? "Selamat datang di BISA! Kamu sekarang dapat memesan layanan perbaikan instan atau mulai menawarkan keahlianmu."
                : "Admin BISA sedang memeriksa data kamu. Halaman akan otomatis berlanjut saat disetujui."}
            </Text>

            {/* Feature Pills */}
            <View className="flex-row gap-2 w-full mb-2">
              <View className="flex-1 bg-gray-50 rounded-xl p-2.5 flex-row items-center gap-2 border border-gray-100">
                <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center">
                  <Zap size={12} color="#ff6b00" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-900">Order Cepat</Text>
                  <Text className="text-[9px] text-gray-400">&lt; 15 menit</Text>
                </View>
              </View>

              <View className="flex-1 bg-gray-50 rounded-xl p-2.5 flex-row items-center gap-2 border border-gray-100">
                <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                  <ShieldCheck size={12} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-900">Garansi Aman</Text>
                  <Text className="text-[9px] text-gray-400">Proteksi 100%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-2.5 mt-1">
            {isVerified ? (
              <>
                <TouchableOpacity
                  onPress={() => router.replace("/c/home" as any)}
                  activeOpacity={0.9}
                  className="w-full h-14 bg-[#ff6b00] rounded-full items-center justify-center shadow-md"
                >
                  <Text className="text-white text-[15px] font-black">
                    Mulai Cari Bantuan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.replace("/p/home" as any)}
                  activeOpacity={0.9}
                  className="w-full h-14 bg-slate-900 rounded-full items-center justify-center shadow-md"
                >
                  <Text className="text-white text-[15px] font-black">
                    Mulai Tawarkan Jasa
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login" as any)}
                activeOpacity={0.88}
                className="w-full h-12 bg-white border border-gray-200 rounded-full items-center justify-center"
              >
                <Text className="text-gray-700 text-[13px] font-bold">
                  Kembali ke Masuk
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Security footnote */}
          <View className="flex-row items-center justify-center gap-1.5 mt-3">
            <Text className="text-[12px]">🔒</Text>
            <Text className="text-[10px] text-gray-400 font-medium">
              Data biometrik dienkripsi aman berstandar ISO 27001
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* MODAL JIKA DITOLAK */}
      <Modal visible={isRejected} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-[340px] items-center text-center shadow-2xl border border-red-100">
            <View className="w-16 h-16 bg-red-100 rounded-2xl items-center justify-center mb-3">
              <XCircle size={32} color="#dc2626" />
            </View>

            <Text className="text-[18px] font-black text-gray-900 mb-1">
              Verifikasi Ditolak
            </Text>
            <Text className="text-[12px] text-gray-600 text-center mb-4">
              Mohon maaf, dokumen KYC Anda ditolak oleh tim kami dengan alasan:
            </Text>

            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 w-full mb-5">
              <Text className="text-[12px] font-bold text-red-700 text-center italic">
                "{kycMessage || "Dokumen buram atau tidak sesuai."}"
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/daftar" as any)}
              className="w-full h-12 bg-[#ff6b00] rounded-full items-center justify-center shadow-md"
            >
              <Text className="text-white text-[14px] font-black">
                Unggah Ulang Dokumen
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
