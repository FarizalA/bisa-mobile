import React, { useState, useEffect, useCallback } from "react";
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
import {
  ArrowLeft,
  HelpCircle,
  Wallet,
  FolderOpen,
  ChevronRight,
  CheckCircle2,
  Banknote,
  Lock,
  X,
  CreditCard,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import ProviderBottomNav from "../../src/components/ProviderBottomNav";
import { safeBack } from "@/lib/navigation";

export default function DompetProviderPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [saldo, setSaldo] = useState(0);
  const [detailPendapatan, setDetailPendapatan] = useState<{ escrow: number; cod: number }>({
    escrow: 0,
    cod: 0,
  });
  const [riwayatTransaksi, setRiwayatTransaksi] = useState<any[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchWalletData = useCallback(async (userId: number) => {
    try {
      // 1) Saldo yang BISA ditarik = saldo dari users_bisa
      const { data: mitraRow } = await supabase
        .from("users_bisa")
        .select("saldo, balance")
        .eq("id", userId)
        .maybeSingle();

      const saldoTarik = Number(mitraRow?.saldo ?? mitraRow?.balance ?? 0);

      // 2) Daftar pekerjaan selesai untuk histori & rincian sumber
      const { data: jobs, error } = await supabase
        .from("pekerjaan_bisa")
        .select("*")
        .eq("mitra_id", userId)
        .eq("status", "selesai")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let escrowTotal = 0;
      let codTotal = 0;
      const history = (jobs || []).map((job: any) => {
        const isCOD = job.payment_method === "COD" || job.metode_pembayaran === "cod";
        const gross =
          Number(job.agreed_price) ||
          Number(job.harga_deal) ||
          Number(job.harga) ||
          (parseInt(String(job.budget || "").replace(/[^0-9]/g, "")) || 0);

        const amount = isCOD ? gross : Number(job.mitra_earnings) || gross;
        const fee = isCOD ? 0 : Number(job.platform_fee || 0);

        if (isCOD) codTotal += amount;
        else escrowTotal += amount;

        return {
          id: job.id,
          type: "in",
          title: job.judul || job.deskripsi || "Pekerjaan Selesai",
          amount,
          fee,
          gross,
          isCOD,
          methodLabel: isCOD
            ? "COD"
            : job.payment_status === "released"
            ? "Rekber BISA"
            : "Rekber",
          payment_status: job.payment_status,
          date: new Date(job.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          status: isCOD ? "Tunai" : "Masuk Saldo",
        };
      });

      // Jika saldo DB belum kekejar (job lama yang selesai via direct update tanpa /api/orders/complete),
      // fallback ke total escrow agar angka atas tidak tertinggal — job baru otomatis sinkron via API
      const displaySaldo = saldoTarik > 0 ? Math.max(saldoTarik, escrowTotal) : escrowTotal;
      setSaldo(displaySaldo);
      setDetailPendapatan({ escrow: escrowTotal, cod: codTotal });
      setRiwayatTransaksi(history);
      setCompletedJobsCount((jobs || []).length);
    } catch (e) {
      console.error("Gagal menarik data dompet", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      setUser(stored);
      fetchWalletData(stored.id);
    })();
  }, [router, fetchWalletData]);

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-sm text-gray-500 mt-2">Memuat dompet...</Text>
      </View>
    );
  }

  const codCount = riwayatTransaksi.filter((t) => t.isCOD).length;
  const rekberCount = riwayatTransaksi.filter((t) => !t.isCOD).length;

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* HEADER 1:1 WEB */}
      <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => safeBack(router, "/p/home")} className="w-9 h-9 rounded-full items-center justify-center" activeOpacity={0.7}>
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 tracking-tight">Dompet Penghasilan</Text>
        </View>
        <TouchableOpacity onPress={() => setShowDetailModal(true)} className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center">
          <HelpCircle size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center">
          {/* KARTU SALDO (PREMIUM - EMERALD) */}
          <View className="rounded-[28px] p-6 overflow-hidden mb-6" style={{ backgroundColor: "#059669" }}>
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <View className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full border border-white/30">
                <Wallet size={16} color="#fff" />
                <Text className="text-xs font-bold text-white tracking-wide">Total Pendapatan</Text>
              </View>
              <Image source={require("../../assets/mascot.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
            </View>

            <Text className="text-4xl font-extrabold text-white tracking-tight mb-1">
              Rp {saldo.toLocaleString("id-ID")}
            </Text>

            {detailPendapatan.cod > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDetailModal(true);
                }}
                activeOpacity={0.8}
                className="mt-2 self-start flex-row items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full border border-white/30"
              >
                <FolderOpen size={14} color="#fff" />
                <Text className="text-[11px] font-extrabold text-white">Rincian Sumber Dana</Text>
              </TouchableOpacity>
            )}

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowWithdrawModal(true);
                }}
                activeOpacity={0.9}
                className="flex-1 bg-white py-3 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
              >
                <Banknote size={18} color="#047857" />
                <Text className="font-extrabold text-[#047857] text-sm">Tarik Dana</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowWithdrawModal(true);
                }}
                activeOpacity={0.85}
                className="flex-1 bg-emerald-800/40 py-3 rounded-2xl border border-white/20 flex-row items-center justify-center gap-2"
              >
                <CreditCard size={18} color="#fff" />
                <Text className="font-extrabold text-white text-sm">Rekening</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* STATISTIK CEPAT */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDetailModal(true);
              }}
              activeOpacity={0.85}
              className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mb-1">
                <FolderOpen size={18} color="#059669" />
              </View>
              <View className="flex-row items-center gap-0.5">
                <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rincian Sumber</Text>
                <ChevronRight size={12} color="#6B7280" />
              </View>
              <Text className="text-[11px] font-bold text-gray-700 mt-1">
                Rekber: <Text className="text-emerald-600 font-extrabold">Rp {detailPendapatan.escrow.toLocaleString("id-ID")}</Text>
              </Text>
              <Text className="text-[11px] font-bold text-gray-700">
                COD: <Text className="text-gray-900 font-extrabold">Rp {detailPendapatan.cod.toLocaleString("id-ID")}</Text>{" "}
                <Text className="text-[9px] text-gray-400 font-normal">(tunai)</Text>
              </Text>
            </TouchableOpacity>

            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mb-1">
                <CheckCircle2 size={18} color="#059669" />
              </View>
              <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tugas Selesai</Text>
              <Text className="text-sm font-extrabold text-gray-900 mt-0.5">{completedJobsCount} Pekerjaan</Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">
                {rekberCount} via Rekber • {codCount} COD
              </Text>
            </View>
          </View>

          {/* RIWAYAT TRANSAKSI */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-gray-900">Riwayat Terakhir</Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-1">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-[10px] text-gray-500">Rekber</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-2 h-2 rounded-full bg-amber-400" />
                  <Text className="text-[10px] text-gray-500">COD</Text>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {riwayatTransaksi.length === 0 ? (
                <View className="p-8 items-center">
                  <Image source={require("../../assets/maskot/maskot sedang bermain ponsel.png")} style={{ width: 80, height: 80 }} resizeMode="contain" />
                  <Text className="text-sm font-bold text-gray-500 mt-3">Belum ada riwayat pendapatan.</Text>
                </View>
              ) : (
                riwayatTransaksi.map((trx, idx) => (
                  <View
                    key={trx.id || idx}
                    className={`p-4 flex-row items-center gap-4 border-b border-gray-50 ${
                      trx.isCOD ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <View
                      className={`w-12 h-12 rounded-xl items-center justify-center shrink-0 ${
                        trx.isCOD ? "bg-amber-100" : "bg-emerald-50"
                      }`}
                    >
                      {trx.isCOD ? (
                        <Banknote size={22} color="#B45309" />
                      ) : (
                        <Lock size={22} color="#059669" />
                      )}
                    </View>

                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-gray-900 flex-1" numberOfLines={1}>
                          {trx.title}
                        </Text>
                        <View
                          className={`px-1.5 py-0.5 rounded-full border ${
                            trx.isCOD
                              ? "bg-amber-100 border-amber-200"
                              : "bg-emerald-100 border-emerald-200"
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-extrabold ${
                              trx.isCOD ? "text-amber-800" : "text-emerald-800"
                            }`}
                          >
                            {trx.methodLabel}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                        {trx.date}{" "}
                        {trx.isCOD
                          ? "• Tunai — tidak masuk saldo"
                          : trx.fee
                          ? `• Bersih (potongan Rp ${trx.fee.toLocaleString("id-ID")})`
                          : ""}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text
                        className={`text-sm font-extrabold ${
                          trx.isCOD ? "text-gray-700" : "text-emerald-600"
                        }`}
                      >
                        + Rp {Math.abs(Number(trx.amount || 0)).toLocaleString("id-ID")}
                      </Text>
                      <Text
                        className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${
                          trx.isCOD ? "text-amber-600" : "text-gray-400"
                        }`}
                      >
                        {trx.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* MODAL RINCIAN SUMBER DANA 1:1 WEB */}
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <Pressable onPress={() => setShowDetailModal(false)} className="flex-1 bg-black/60 justify-end">
          <Pressable onPress={(e) => (e as any).stopPropagation?.()} className="bg-white rounded-t-3xl overflow-hidden p-5">
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <FolderOpen size={20} color="#059669" />
                <Text className="text-base font-extrabold text-gray-900">Rincian Sumber Pendapatan</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="py-4 gap-3">
              {/* Via Rekber BISA */}
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Lock size={15} color="#059669" />
                    <Text className="text-xs font-extrabold text-emerald-900">Via Rekber BISA</Text>
                  </View>
                  <Text className="text-[11px] text-emerald-800/80 mt-1 leading-4">
                    Cair ke <Text className="font-bold">Saldo</Text> saat Klien Terima Hasil. Bisa ditarik.
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-emerald-700">
                  Rp {detailPendapatan.escrow.toLocaleString("id-ID")}
                </Text>
              </View>

              {/* Via COD */}
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Banknote size={15} color="#D97706" />
                    <Text className="text-xs font-extrabold text-amber-900">Via COD (Tunai)</Text>
                  </View>
                  <Text className="text-[11px] text-amber-800/80 mt-1 leading-4">
                    Dibayar tunai di tempat. Tercatat sebagai riwayat saja.
                  </Text>
                </View>
                <Text className="text-base font-extrabold text-amber-700">
                  Rp {detailPendapatan.cod.toLocaleString("id-ID")}
                </Text>
              </View>

              {/* Total */}
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex-row justify-between items-center">
                <Text className="text-xs font-bold text-gray-500">Total pendapatan tercatat</Text>
                <Text className="text-xs font-extrabold text-gray-900">
                  Rp {(detailPendapatan.escrow + detailPendapatan.cod).toLocaleString("id-ID")}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                className="mt-2 w-full py-3.5 bg-[#059669] rounded-xl items-center"
              >
                <Text className="text-white font-extrabold">Tutup</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL PENARIKAN (SEGERA HADIR) 1:1 WEB */}
      <Modal visible={showWithdrawModal} transparent animationType="slide" onRequestClose={() => setShowWithdrawModal(false)}>
        <Pressable onPress={() => setShowWithdrawModal(false)} className="flex-1 bg-black/60 justify-end">
          <Pressable onPress={(e) => (e as any).stopPropagation?.()} className="bg-white rounded-t-3xl overflow-hidden p-6 items-center">
            <View className="w-full flex-row items-center justify-between pb-4 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <Banknote size={20} color="#059669" />
                <Text className="text-lg font-extrabold text-gray-900">Tarik Dana</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Image source={require("../../assets/mascot.png")} style={{ width: 96, height: 96 }} resizeMode="contain" className="mt-4 mb-2" />
            <Text className="text-xl font-extrabold text-gray-900">Segera Hadir!</Text>
            <Text className="text-sm text-gray-500 text-center mt-2 leading-5 max-w-[280px]">
              Fitur Penarikan Dana ke rekening bank dan e-wallet sedang disiapkan. Kami sedang memastikan keamanannya!
            </Text>

            <TouchableOpacity
              onPress={() => setShowWithdrawModal(false)}
              className="mt-6 w-full py-3.5 bg-[#059669] rounded-xl items-center shadow-md"
            >
              <Text className="text-white font-bold">Mengerti</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ProviderBottomNav active="profil" />
    </SafeAreaView>
  );
}
