import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, HelpCircle, Plus, Wallet, QrCode, Receipt, PiggyBank, X, Landmark } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useDompetLogic } from "../../src/hooks/useDompetLogic";
import BottomNav from "../../src/components/BottomNav";
import { safeBack } from "@/lib/navigation";

function DompetHeader() {
  const router = useRouter();
  return (
    <View className="h-16 px-4 flex-row items-center justify-between bg-white/95 border-b border-gray-100">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => safeBack(router, "/c/home")} className="w-9 h-9 rounded-full items-center justify-center" activeOpacity={0.7}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 tracking-tight">Dompet BISA</Text>
      </View>
      <View className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center">
        <HelpCircle size={18} color="#FF6B00" />
      </View>
    </View>
  );
}

function SaldoCard({ logic }: { logic: ReturnType<typeof useDompetLogic> }) {
  return (
    <View className="rounded-[28px] p-6 overflow-hidden mb-6" style={{ backgroundColor: "#FF6B00" }}>
      {/* subtle dots overlay via border */}
      <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
      <View className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full border border-white/30">
          <Wallet size={16} color="#fff" />
          <Text className="text-xs font-bold text-white tracking-wide">Saldo Aktif</Text>
        </View>
        <Image source={require("../../assets/mascot.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
      </View>
      <Text className="text-4xl font-extrabold text-white tracking-tight mb-1">Rp {logic.saldo.toLocaleString("id-ID")}</Text>
      <Text className="text-xs text-white/80 font-medium">Cukup untuk membayar 3-5 layanan standar.</Text>
      <View className="flex-row gap-3 mt-6">
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); logic.setShowTopupModal(true); }}
          activeOpacity={0.88}
          className="flex-1 bg-white py-3 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={18} color="#FF6B00" />
          <Text className="font-extrabold text-[#FF6B00] text-sm">Isi Saldo</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} className="flex-1 bg-white/20 py-3 rounded-2xl border border-white/30 flex-row items-center justify-center gap-2">
          <Landmark size={18} color="#fff" />
          <Text className="font-extrabold text-white text-sm">Tarik Dana</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function QuickMenu() {
  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center justify-around mb-6">
      <View className="items-center gap-1.5">
        <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center"><QrCode size={22} color="#2563EB" /></View>
        <Text className="text-xs font-bold text-gray-700">Bayar QRIS</Text>
      </View>
      <View className="items-center gap-1.5">
        <View className="w-12 h-12 rounded-full bg-purple-50 items-center justify-center"><Receipt size={22} color="#9333EA" /></View>
        <Text className="text-xs font-bold text-gray-700">Tagihan</Text>
      </View>
      <View className="items-center gap-1.5">
        <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center"><PiggyBank size={22} color="#059669" /></View>
        <Text className="text-xs font-bold text-gray-700">Promo Cashback</Text>
      </View>
    </View>
  );
}

function TransactionList({ logic }: { logic: ReturnType<typeof useDompetLogic> }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-extrabold text-gray-900">Riwayat Terakhir</Text>
        {logic.riwayatTransaksi.length > 0 && <Text className="text-xs font-bold text-[#FF6B00]">Lihat Semua</Text>}
      </View>
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 gap-3">
        {logic.riwayatTransaksi.length === 0 ? (
          <View className="p-8 items-center">
            <Image source={require("../../assets/maskot/maskot sedang bermain ponsel.png")} style={{ width: 80, height: 80 }} resizeMode="contain" />
            <Text className="text-sm font-bold text-gray-500 mt-3">Belum Ada Transaksi</Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">Isi saldo sekarang untuk mulai memesan layanan.</Text>
          </View>
        ) : (
          logic.riwayatTransaksi.map((trx: any) => (
            <View key={trx.id} className="bg-white p-4 rounded-2xl flex-row items-center gap-4 border border-gray-100">
              <View className={`w-12 h-12 rounded-2xl items-center justify-center shrink-0 ${trx.type === "in" ? "bg-emerald-50" : "bg-orange-50"}`}>
                <Wallet size={20} color={trx.type === "in" ? "#059669" : "#FF6B00"} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{trx.title || "Transaksi BISA"}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{new Date(trx.created_at).toLocaleString("id-ID")}</Text>
              </View>
              <View className="items-end">
                <Text className={`text-sm font-extrabold ${trx.type === "in" ? "text-emerald-600" : "text-gray-900"}`}>{trx.type === "in" ? "+" : "-"} Rp {Math.abs(Number(trx.amount)).toLocaleString("id-ID")}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{trx.status || "Berhasil"}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function TopupModal({ logic }: { logic: ReturnType<typeof useDompetLogic> }) {
  return (
    <Modal visible={logic.showTopupModal} transparent animationType="slide" onRequestClose={() => logic.setShowTopupModal(false)}>
      <Pressable onPress={() => logic.setShowTopupModal(false)} className="flex-1 bg-black/60 justify-end">
        <Pressable onPress={(e) => (e as any).stopPropagation?.()} className="bg-white rounded-t-3xl overflow-hidden">
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Wallet size={20} color="#FF6B00" />
              <Text className="text-lg font-extrabold text-gray-900">Isi Saldo BISA</Text>
            </View>
            <TouchableOpacity onPress={() => logic.setShowTopupModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View className="p-6 items-center">
            <Image source={require("../../assets/mascot.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
            <Text className="text-xl font-extrabold text-gray-900 mt-3">Segera Hadir!</Text>
            <Text className="text-sm text-gray-500 text-center mt-2 leading-5">Fitur Top Up otomatis dan integrasi Payment Gateway{'\n'}(Midtrans/Xendit) sedang dalam tahap pengembangan.</Text>
            <TouchableOpacity onPress={() => logic.setShowTopupModal(false)} className="mt-6 w-full py-3.5 bg-[#FF6B00] rounded-xl items-center">
              <Text className="text-white font-bold">Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DompetClientPage() {
  const logic = useDompetLogic();
  if (logic.loading || !logic.user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text className="text-sm text-gray-500 mt-2">Memuat dompet...</Text>
      </View>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      <DompetHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center px-4 pt-20">
          <SaldoCard logic={logic} />
          <QuickMenu />
          <TransactionList logic={logic} />
        </View>
      </ScrollView>
      <BottomNav active="profil" />
      <TopupModal logic={logic} />
    </SafeAreaView>
  );
}
