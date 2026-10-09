import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { ShieldCheck, UserCheck, MessageSquare, Briefcase, Wallet, ArrowRight, X } from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { ActionContext } from "../hooks/useKycGate";

interface KycGateModalProps {
  visible: boolean;
  onClose: () => void;
  actionContext?: ActionContext;
  isLoggedIn?: boolean;
  kycStatus?: string;
}

export const KycGateModal: React.FC<KycGateModalProps> = ({
  visible,
  onClose,
  actionContext = "DEFAULT",
  isLoggedIn = true,
  kycStatus = "Belum Verifikasi",
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Dynamic Theme (Client = Orange #FF6B00, Provider = Green #059669)
  const isProviderRoute = pathname.startsWith("/p");
  const themeColor = isProviderRoute ? "#059669" : "#FF6B00";
  const themeBgLight = isProviderRoute ? "#ECFDF5" : "#FFF7ED";

  const getDetails = () => {
    if (!isLoggedIn) {
      return {
        icon: UserCheck,
        title: "Masuk Akun Diperlukan",
        message: "Silakan masuk atau daftar akun terlebih dahulu untuk melanjutkan aksi ini.",
        buttonText: "Masuk / Daftar",
      };
    }

    switch (actionContext) {
      case "POST_JOB":
        return {
          icon: Briefcase,
          title: "Verifikasi KYC Diperlukan",
          message:
            "Untuk dapat mempublikasikan pekerjaan & transaksi aman, akun Anda perlu diverifikasi terlebih dahulu (proses hanya 1 menit).",
          buttonText: "Verifikasi Identitas",
        };
      case "BID_JOB":
        return {
          icon: ShieldCheck,
          title: "Verifikasi Identitas Mitra",
          message:
            "Client mengutamakan Mitra terverifikasi. Lengkapi verifikasi KTP Anda untuk mulai menawar pekerjaan ini.",
          buttonText: "Verifikasi KTP Sekarang",
        };
      case "CHAT":
        return {
          icon: MessageSquare,
          title: "Akses Chat Terproteksi",
          message:
            "Lakukan verifikasi identitas singkat untuk memulai negosiasi dan percakapan langsung.",
          buttonText: "Verifikasi Sekarang",
        };
      case "WITHDRAW":
        return {
          icon: Wallet,
          title: "Penarikan Saldo Terkunci",
          message:
            "Demi keamanan dana Anda, penarikan saldo memerlukan verifikasi identitas resmi (KYC).",
          buttonText: "Verifikasi Akun",
        };
      default:
        return {
          icon: ShieldCheck,
          title: "Verifikasi Akun Diperlukan",
          message:
            "Tingkatkan status akun Anda menjadi Terverifikasi untuk menikmati seluruh fitur BISA App.",
          buttonText: "Verifikasi Sekarang",
        };
    }
  };

  const details = getDetails();
  const IconComponent = details.icon;

  const handlePrimaryPress = () => {
    onClose();
    if (!isLoggedIn) {
      router.push("/(auth)/login" as any);
      return;
    }
    // Navigate to profile edit / KYC page
    if (isProviderRoute) {
      router.push("/p/edit-profil" as any);
    } else {
      router.push("/c/edit-profil" as any);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-5">
        <View className="bg-white w-full max-w-sm rounded-3xl p-6 items-center shadow-xl">
          {/* Close button top-right */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100"
            activeOpacity={0.7}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          {/* Icon Badge */}
          <View
            style={{ backgroundColor: themeBgLight }}
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4 mt-2"
          >
            <IconComponent size={32} color={themeColor} />
          </View>

          {/* Title & Message */}
          <Text className="text-xl font-bold text-slate-900 text-center mb-2">
            {details.title}
          </Text>

          {/* Status Indicator */}
          {isLoggedIn && kycStatus && (
            <View className="bg-amber-50 px-3 py-1 rounded-full mb-3 border border-amber-200">
              <Text className="text-xs font-semibold text-amber-700">
                Status: {kycStatus}
              </Text>
            </View>
          )}

          <Text className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
            {details.message}
          </Text>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={handlePrimaryPress}
            style={{ backgroundColor: themeColor }}
            className="w-full py-3.5 rounded-2xl flex-row items-center justify-center mb-3 shadow-sm"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-base mr-2">{details.buttonText}</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Secondary Dismiss Button */}
          <TouchableOpacity
            onPress={onClose}
            className="w-full py-2.5 rounded-xl items-center justify-center bg-slate-100"
            activeOpacity={0.7}
          >
            <Text className="text-slate-600 font-semibold text-sm">Lanjut Jelajah Aplikasi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
