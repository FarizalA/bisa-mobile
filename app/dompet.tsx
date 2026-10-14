import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  BackHandler,
  TextInput,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, usePathname } from "expo-router";
import {
  ArrowLeft,
  HelpCircle,
  Wallet,
  X,
  Landmark,
  Banknote,
  CreditCard,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Gift,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useDompetUnifiedLogic } from "../src/hooks/useDompetUnifiedLogic";

// ---------- helpers ----------
const fmtWIB = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " WIB";
  } catch {
    return iso;
  }
};
const kategoriLabel: Record<string, string> = {
  hasil_kerja: "Hasil Kerja",
  refund: "Refund",
  penarikan: "Penarikan",
  bonus_admin: "Bonus Admin",
  topup: "Top Up",
  lainnya: "Transaksi",
};

// ---------- Header: identik untuk semua ----------
function DompetHeader({ router, logic }: { router: any; logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  const pathname = usePathname();
  const isP = pathname.startsWith("/p/");
  return (
    <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-100">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => router.replace(isP ? "/p/profil" : "/c/profil")}
          className="w-9 h-9 rounded-full items-center justify-center"
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 tracking-tight">Dompet BISA</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          logic.setShowDetailModal(true);
        }}
        className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center"
      >
        <HelpCircle size={20} color="#FF6B00" />
      </TouchableOpacity>
    </View>
  );
}

// ---------- Saldo Card: ORANGE untuk semua, 2 tombol tetap ----------
function SaldoCard({ logic }: { logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  const handleTarik = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!logic.rekening?.bank_name || !logic.rekening?.bank_number) {
      Alert.alert("Hubungkan Rekening", "Hubungkan rekening dulu sebelum tarik dana.", [
        { text: "Nanti", style: "cancel" },
        { text: "Hubungkan", onPress: () => logic.setShowRekeningModal(true) },
      ]);
      return;
    }
    logic.setShowWithdrawModal(true);
  };
  return (
    <View className="rounded-[28px] p-6 overflow-hidden mb-6" style={{ backgroundColor: "#FF6B00" }}>
      <View pointerEvents="none" className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
      <View pointerEvents="none" className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
      <View pointerEvents="none" className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full border border-white/30">
          <Wallet size={16} color="#fff" />
          <Text className="text-xs font-bold text-white tracking-wide">Saldo Tersedia</Text>
        </View>
        <Image source={require("../assets/mascot.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
      </View>
      <Text className="text-4xl font-extrabold text-white tracking-tight mb-1">Rp {logic.saldo.toLocaleString("id-ID")}</Text>
      <Text className="text-xs text-white/80 font-medium">Aman di Dompet BISA, tarik kapan saja ke rekening kamu.</Text>
      <View className="flex-row gap-3 mt-6" style={{ zIndex: 10 }}>
        <TouchableOpacity
          onPress={handleTarik}
          activeOpacity={0.85}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={{ zIndex: 20, elevation: 3 }}
          className="flex-1 bg-white py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
        >
          <Banknote size={18} color="#FF6B00" />
          <Text className="font-extrabold text-[#FF6B00] text-sm">Tarik Dana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            logic.setShowRekeningModal(true);
          }}
          activeOpacity={0.85}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          className="flex-1 py-3.5 rounded-2xl border flex-row items-center justify-center gap-2"
          style={{ backgroundColor: "rgba(0,0,0,0.16)", borderColor: "rgba(255,255,255,0.45)", zIndex: 20, elevation: 3 }}
        >
          <Landmark size={18} color="#fff" />
          <Text className="font-extrabold text-white text-sm">Rekening</Text>
        </TouchableOpacity>
      </View>
      {logic.rekening?.bank_name ? (
        <View className="mt-3 flex-row items-center gap-1.5">
          <ShieldCheck size={12} color="#fff" />
          <Text className="text-[11px] text-white/90 font-semibold" numberOfLines={1}>
            {logic.rekening.bank_name} • {logic.rekening.bank_number} • {logic.rekening.bank_holder}
          </Text>
        </View>
      ) : (
        <Text className="text-[11px] text-white/80 mt-3">Belum ada rekening terhubung</Text>
      )}
    </View>
  );
}

// ---------- Grid Rincian Sumber + Total Pendapatan: SAMA untuk semua ----------
function StatistikGrid({ logic }: { logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  return (
    <View className="flex-row gap-3 mb-6 px-4">
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          logic.setShowDetailModal(true);
        }}
        activeOpacity={0.85}
        className="flex-1 bg-white rounded-2xl p-4 border border-gray-100"
      >
        <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mb-1.5">
          <FolderOpen size={16} color="#FF6B00" />
        </View>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rincian Sumber</Text>
          <ChevronRight size={12} color="#9CA3AF" />
        </View>
        <Text className="text-[11px] font-bold text-gray-700 mt-1">
          Online: <Text className="text-[#FF6B00] font-extrabold">Rp {logic.detailPendapatan.escrow.toLocaleString("id-ID")}</Text>
        </Text>
        <Text className="text-[11px] font-bold text-gray-700">
          COD: <Text className="text-gray-900 font-extrabold">Rp {logic.detailPendapatan.cod.toLocaleString("id-ID")}</Text>{" "}
          <Text className="text-[9px] text-gray-400 font-normal">(tunai)</Text>
        </Text>
      </TouchableOpacity>

      {(() => {
        const pendings = (logic.withdrawalRequests || []).filter((w: any) => String(w.status) === "pending");
        const pendingCount = pendings.length;
        const pendingAmount = pendings.reduce((a: number, w: any) => a + Number(w.amount || 0), 0);
        const hasPending = pendingCount > 0;
        const lastWd = (logic.withdrawalRequests || [])[0] as any;
        const lastStatus = String(lastWd?.status || "").toLowerCase();
        return (
          <TouchableOpacity
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              if (hasPending) {
                const p = pendings[0] as any;
                logic.setSelectedTrx({
                  id: `wd-${p.id}`, rawId: p.id, type: "out", category: "penarikan",
                  title: `Penarikan • Menunggu ACC`,
                  amount: -Number(p.amount || 0), fee: Number(p.fee_amount || 0), gross: Number(p.amount || 0),
                  net: Number(p.net_amount || 0), status: "Menunggu ACC",
                  methodLabel: `${p.bank_name || ""} ${p.bank_number || ""}`.trim() || "Transfer Bank",
                  created_at: p.created_at || p.requested_at,
                  note: `Tujuan: ${p.bank_name} • ${p.bank_number} • a.n ${p.bank_holder || "-"}\nDiproses maks 1x24 jam`,
                  _wd: p, isCOD: false,
                } as any);
                logic.setShowTrxDetailModal(true);
              } else if (lastWd) {
                const st = lastStatus;
                const label = st === "approved" ? "Berhasil" : st === "rejected" ? "Ditolak" : st;
                logic.setSelectedTrx({
                  id: `wd-${lastWd.id}`, rawId: lastWd.id, type: "out", category: "penarikan",
                  title: st === "approved" ? "Penarikan • Cair" : st === "rejected" ? "Penarikan • Ditolak" : `Penarikan • ${label}`,
                  amount: -Number(lastWd.amount || 0), fee: Number(lastWd.fee_amount || 0), gross: Number(lastWd.amount || 0),
                  net: Number(lastWd.net_amount || 0), status: label,
                  methodLabel: `${lastWd.bank_name || ""} ${lastWd.bank_number || ""}`.trim() || "Transfer Bank",
                  created_at: lastWd.created_at || lastWd.requested_at,
                  note: (lastWd.admin_note ? `Catatan admin: ${lastWd.admin_note}\n` : "") + `Tujuan: ${lastWd.bank_name} • ${lastWd.bank_number}`,
                  _wd: lastWd, isCOD: false,
                } as any);
                logic.setShowTrxDetailModal(true);
              } else {
                Alert.alert("Status Lancar", "Tidak ada penarikan pending. Semua lancar ✅\n\nRiwayat penarikan ada di daftar bawah.");
              }
            }}
            activeOpacity={0.85}
            className={`flex-1 rounded-2xl p-4 border ${hasPending ? "bg-amber-50 border-amber-200" : lastStatus === "rejected" ? "bg-red-50 border-red-200" : lastStatus === "approved" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100"}`}
          >
            <View className={`w-8 h-8 rounded-full items-center justify-center mb-1.5 ${hasPending ? "bg-amber-100" : lastStatus === "rejected" ? "bg-red-100" : lastStatus === "approved" ? "bg-emerald-100" : "bg-emerald-50"}`}>
              {hasPending ? <Clock3 size={16} color="#D97706" /> : lastStatus === "rejected" ? <X size={16} color="#DC2626" /> : <CheckCircle2 size={16} color="#059669" />}
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status Penarikan</Text>
              {hasPending ? <View className="w-1.5 h-1.5 rounded-full bg-amber-500" /> : (lastStatus ? <ChevronRight size={10} color="#9CA3AF" /> : null)}
            </View>
            {hasPending ? (
              <>
                <Text className="text-sm font-extrabold text-amber-700 mt-0.5">Rp {pendingAmount.toLocaleString("id-ID")}</Text>
                <Text className="text-[10px] font-bold text-amber-600 mt-0.5" numberOfLines={1}>{pendingCount} menunggu ACC • 1x24 jam</Text>
              </>
            ) : lastWd ? (
              <>
                <Text className={`text-sm font-extrabold mt-0.5 ${lastStatus === "rejected" ? "text-red-700" : "text-emerald-700"}`} numberOfLines={1}>Rp {Number(lastWd.amount).toLocaleString("id-ID")} • {lastStatus === "approved" ? "Cair" : lastStatus === "rejected" ? "Ditolak" : lastStatus}</Text>
                <Text className="text-[10px] text-gray-500 mt-0.5" numberOfLines={1}>{lastStatus === "approved" ? "Tap lihat detail" : lastStatus === "rejected" ? (lastWd.admin_note || "Tap lihat alasan") : "Tap lihat status"} • {fmtWIB(lastWd.created_at || lastWd.requested_at)}</Text>
              </>
            ) : (
              <>
                <Text className="text-sm font-extrabold text-emerald-700 mt-0.5">Rp 0 • Lancar</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5" numberOfLines={1}>Tidak ada pending • Tap</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })()}
    </View>
  );
}

// ---------- Riwayat: 1:1 PERSIS WEB (Icon, Warna, Status Pill, Net/Fee) ----------
function trxIcon(category: string, isIn: boolean, status?: string) {
  const s = String(status || "").toUpperCase();
  if (category === "penarikan") {
    if (s.includes("MENUNGGU") || s === "PENDING") return <Clock3 size={20} color="#D97706" />;
    if (s.includes("DITOLAK") || s === "REJECTED") return <X size={20} color="#DC2626" />;
    if (s.includes("CAIR") || s === "APPROVED" || s.includes("BERHASIL")) return <CheckCircle2 size={20} color="#059669" />;
    return <CreditCard size={20} color="#4B5563" />;
  }
  if (category === "bonus_admin") return <Gift size={20} color="#059669" />;
  if (category === "refund") return <Receipt size={20} color="#059669" />;
  if (category === "hasil_kerja") return <Banknote size={20} color={isIn ? "#059669" : "#FF6B00"} />;
  if (isIn) return <ArrowDownLeft size={20} color="#059669" />;
  return <CreditCard size={20} color="#4B5563" />;
}

function TransactionList({ logic }: { logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  const fmtWIBLocal = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB";
    } catch { return iso; }
  };
  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-gray-900">Riwayat Terakhir</Text>
        <Text className="text-[11px] font-medium text-gray-400">{logic.riwayatTransaksi.length} transaksi</Text>
      </View>
      <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-10 shadow-sm">
        {logic.riwayatTransaksi.length === 0 ? (
          <View className="p-8 items-center">
            <Image source={require("../assets/maskot/maskot sedang bermain ponsel.png")} style={{ width: 80, height: 80 }} resizeMode="contain" />
            <Text className="text-sm font-bold text-gray-500 mt-3">Belum Ada Transaksi</Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">Hasil kerja, refund, penarikan & bonus admin akan muncul di sini.</Text>
          </View>
        ) : (
          logic.riwayatTransaksi.map((trx: any, idx: number) => {
            const isIn = trx.type === "in";
            const cat = trx.category || "lainnya";
            const isPenarikan = cat === "penarikan";
            const statusStr = String(trx.status || "").toUpperCase();
            const isPending = statusStr.includes("MENUNGGU") || statusStr === "PENDING";
            const isRejected = statusStr.includes("DITOLAK") || statusStr === "REJECTED";
            const isApproved = statusStr.includes("CAIR") || statusStr === "APPROVED";
            
            const isCOD = trx.isCOD === true;
            // Icon wrapper bulat persis Web
            const iconBg = isPenarikan 
              ? (isPending ? "bg-amber-100/80" : isRejected ? "bg-red-100/80" : isApproved ? "bg-emerald-100/80" : "bg-gray-100") 
              : isCOD ? "bg-amber-50" : cat === "bonus_admin" ? "bg-emerald-50" : isIn ? "bg-emerald-50" : "bg-gray-100";
            
            // Badge status persis Web
            const showBadge = isPenarikan && (isRejected || isApproved);
            const badgeBg = isRejected ? "bg-red-100" : "bg-emerald-100";
            const badgeText = isRejected ? "text-red-600" : "text-emerald-700";
            const badgeLabel = isRejected ? "REJECTED" : "APPROVED";

            const displayTitle = trx.title || "Transaksi BISA";
            const isBonus = cat === "bonus_admin";

            return (
              <TouchableOpacity
                key={trx.id || idx}
                activeOpacity={0.7}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  logic.setSelectedTrx(trx);
                  logic.setShowTrxDetailModal(true);
                }}
                className={`bg-white px-4 py-3.5 flex-row items-center gap-3.5 ${idx !== logic.riwayatTransaksi.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <View className={`w-11 h-11 rounded-full items-center justify-center shrink-0 ${iconBg}`}>
                  {trxIcon(cat, isIn, trx.status)}
                </View>
                
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Text className="text-[13px] font-semibold text-gray-800 leading-snug" numberOfLines={1}>{displayTitle}</Text>
                    {showBadge ? (
                      <View className={`px-1.5 py-0.5 rounded-full ${badgeBg}`}>
                        <Text className={`text-[8px] font-bold tracking-wide ${badgeText}`}>{badgeLabel}</Text>
                      </View>
                    ) : null}
                  </View>

                  {isPenarikan ? (
                    <>
                      <Text className="text-[11px] font-normal text-gray-500 mt-0.5" numberOfLines={1}>
                        {(trx as any)._wd ? `${(trx as any)._wd.bank_name} • ${(trx as any)._wd.bank_number}` : trx.methodLabel} • {fmtWIBLocal(trx.created_at)}
                      </Text>
                      {(trx as any)._wd?.admin_note && isRejected ? (
                        <Text className="text-[11px] font-medium text-red-500 mt-0.5" numberOfLines={1}>{(trx as any)._wd.admin_note}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text className="text-[11px] font-normal text-gray-500 mt-0.5" numberOfLines={1}>
                      {fmtWIBLocal(trx.created_at)}
                    </Text>
                  )}
                </View>

                <View className="items-end shrink-0 ml-2">
                  <Text className={`text-[13px] font-semibold ${isCOD ? "text-amber-800" : (isIn || isBonus ? "text-emerald-600" : "text-gray-800")}`}>
                    {isCOD ? "Tunai " : (isIn ? "+" : "-") + " "}Rp {Math.abs(Number(trx.amount || 0)).toLocaleString("id-ID")}
                  </Text>
                  {isCOD ? (
                    <Text className="text-[10px] font-bold text-amber-600 mt-0.5">
                      TUNAI (DI LUAR SALDO)
                    </Text>
                  ) : isPenarikan && (isPending || isApproved || isRejected) ? (
                    <Text className="text-[10px] font-normal text-gray-400 mt-0.5">Net Rp {Number((trx as any).net ?? (trx as any)._wd?.net_amount ?? trx.amount).toLocaleString("id-ID")}</Text>
                  ) : (
                    <Text className="text-[10px] font-medium text-gray-400 mt-0.5 tracking-wide uppercase">
                      {trx.status || "BERHASIL"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

const BANK_OPTIONS = ["DANA", "GoPay", "SeaBank", "BRI", "BCA", "BNI"] as const;

// ---------- Modals ----------
function RekeningModal({ logic }: { logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  const [bankName, setBankName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const ktpName = String(logic.user?.nama || logic.user?.name || logic.user?.full_name || "").trim();

  React.useEffect(() => {
    if (logic.showRekeningModal) {
      setBankName(logic.rekening?.bank_name || "");
      setBankNumber(logic.rekening?.bank_number || "");
      // auto isi nama KTP — user nggak perlu ketik manual, anti-typo
      setBankHolder(logic.rekening?.bank_holder || ktpName || "");
      setShowBankPicker(false);
    }
  }, [logic.showRekeningModal, logic.rekening, logic.user]);

  // kalau ktpName ke-load belakangan, sync lagi selama belum diisi
  React.useEffect(() => {
    if (logic.showRekeningModal && !bankHolder && ktpName) setBankHolder(ktpName);
  }, [ktpName]);

  const handleSave = async () => {
    // feedback instan biar ketahuan tombol kepencet
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    console.log("[Rekening] tombol ditekan:", { bankName, bankNumber });
    if (!bankName.trim()) {
      Alert.alert("Pilih Bank", "Silakan pilih Bank / E-Wallet dari daftar.");
      return;
    }
    const cleanNumber = bankNumber.replace(/\s/g, "");
    if (!cleanNumber || cleanNumber.length < 8) {
      Alert.alert("Nomor tidak valid", "Nomor rekening / HP minimal 8 digit.");
      return;
    }
    // holder selalu pakai KTP biar 100% sama
    const finalHolder = (bankHolder.trim() || ktpName || "").trim();
    if (!finalHolder) {
      Alert.alert("Lengkapi profil", "Nama KTP belum ada. Lengkapi profil dulu.");
      return;
    }
    try {
      setSaving(true);
      console.log("[Rekening] menyimpan...", { bankName, cleanNumber, finalHolder });
      await logic.saveRekening({ bank_name: bankName.trim(), bank_number: cleanNumber, bank_holder: finalHolder });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logic.setShowRekeningModal(false);
      // kasih jeda biar modal ketutup dulu baru alert muncul
      setTimeout(() => Alert.alert("Berhasil", `Rekening ${bankName} berhasil dihubungkan.`), 300);
    } catch (e: any) {
      console.log("[Rekening] gagal:", e?.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Gagal", e?.message || "Gagal menyimpan rekening");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={logic.showRekeningModal} transparent animationType="slide" onRequestClose={() => logic.setShowRekeningModal(false)}>
      <Pressable onPress={() => logic.setShowRekeningModal(false)} className="flex-1 bg-black/60 justify-end">
        <Pressable onPress={(e: any) => e.stopPropagation?.()} className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: "92%" }}>
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Landmark size={20} color="#FF6B00" />
              <Text className="text-base font-extrabold text-gray-900">Rekening Terhubung</Text>
            </View>
            <TouchableOpacity onPress={() => logic.setShowRekeningModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex-row gap-2 mb-4">
              <ShieldCheck size={16} color="#D97706" />
              <Text className="text-[11px] text-amber-900 leading-4 flex-1">
                Hanya 1 rekening. <Text className="font-extrabold">Nama pemilik harus SAMA PERSIS</Text> dengan nama KTP di profil — untuk keamanan tarik dana.
              </Text>
            </View>
            {logic.user ? (
              <Text className="text-[11px] text-gray-500 mb-4">
                Nama KTP: <Text className="font-extrabold text-gray-900">{logic.user.nama || logic.user.name || logic.user.full_name || "-"}</Text>
              </Text>
            ) : null}
            <Text className="text-xs font-bold text-gray-700 mb-1.5">Bank / E-Wallet *</Text>
            <TouchableOpacity
              onPress={() => setShowBankPicker((v) => !v)}
              activeOpacity={0.8}
              className={`bg-gray-50 border rounded-xl px-4 py-3 flex-row items-center justify-between ${showBankPicker ? "border-[#FF6B00] bg-orange-50" : "border-gray-200"}`}
            >
              <Text className={`text-sm ${bankName ? "text-gray-900 font-bold" : "text-gray-400"}`}>{bankName || "Pilih Bank / E-Wallet"}</Text>
              <ChevronDown size={16} color={showBankPicker ? "#FF6B00" : "#9CA3AF"} style={{ transform: [{ rotate: showBankPicker ? "180deg" : "0deg" }] }} />
            </TouchableOpacity>
            {showBankPicker && (
              <View className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
                {BANK_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setBankName(opt);
                      setShowBankPicker(false);
                      Haptics.selectionAsync();
                    }}
                    className={`px-4 py-3 flex-row items-center justify-between border-b border-gray-50 ${bankName === opt ? "bg-orange-50" : "bg-white"}`}
                  >
                    <Text className={`text-sm ${bankName === opt ? "font-extrabold text-[#FF6B00]" : "text-gray-800"}`}>{opt}</Text>
                    {bankName === opt && <CheckCircle2 size={16} color="#FF6B00" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text className="text-xs font-bold text-gray-700 mt-3 mb-1.5">Nomor Rekening / No. HP *</Text>
            <TextInput
              value={bankNumber}
              onChangeText={setBankNumber}
              placeholder="08xxxxxxxx / 1234567890"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
            />
            <Text className="text-[11px] text-gray-400 mt-1">Untuk DANA/GoPay pakai nomor HP terdaftar.</Text>
            <Text className="text-xs font-bold text-gray-700 mt-3 mb-1.5">Nama Pemilik Rekening</Text>
            <View className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-gray-900 flex-1" numberOfLines={1}>{bankHolder || ktpName || "-"}</Text>
              <View className="bg-emerald-100 px-2 py-1 rounded-full ml-2">
                <Text className="text-[10px] font-extrabold text-emerald-700">Auto KTP</Text>
              </View>
            </View>
            <Text className="text-[11px] text-gray-400 mt-1">Otomatis sesuai KTP — tidak perlu diketik manual.</Text>
          </ScrollView>

          {/* Footer Tombol Fixed — di luar ScrollView agar 100% bisa diklik tanpa bentrok touch handler */}
          <View className="p-5 pt-3 pb-8 border-t border-gray-100 bg-white">
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
              className={`w-full py-3.5 rounded-xl items-center flex-row justify-center gap-2 ${saving ? "bg-gray-300" : "bg-[#FF6B00]"}`}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <ShieldCheck size={18} color="#fff" />}
              <Text className="text-white font-extrabold text-base">{saving ? "Menyimpan..." : logic.rekening ? "Simpan Perubahan" : "Hubungkan Rekening"}</Text>
            </TouchableOpacity>
            <Text className="text-[11px] text-gray-400 text-center mt-2.5">Rekening bisa diubah kapan saja, tetap 1 saja yang aktif.</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TrxDetailModal({ logic }: { logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  const t = logic.selectedTrx;
  if (!t) return null;
  const isIn = t.type === "in";
  const cat = String(t.category || "");
  const isPenarikan = cat === "penarikan";
  const sLow = String(t.status || "").toLowerCase();
  const isPending = sLow.includes("menunggu") || sLow === "pending";
  const isRejected = sLow.includes("ditolak") || sLow === "rejected";
  const isApproved = sLow.includes("cair") || sLow === "approved" || sLow.includes("berhasil");
  const wd = (t as any)._wd;
  return (
    <Modal visible={logic.showTrxDetailModal} transparent animationType="slide" onRequestClose={() => logic.setShowTrxDetailModal(false)}>
      <Pressable onPress={() => logic.setShowTrxDetailModal(false)} className="flex-1 bg-black/60 justify-end">
        <Pressable onPress={(e: any) => e.stopPropagation?.()} className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: "92%" }}>
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <Receipt size={20} color="#FF6B00" />
              <Text className="text-base font-extrabold text-gray-900">Rincian Transaksi</Text>
            </View>
            <TouchableOpacity onPress={() => logic.setShowTrxDetailModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View className={`border rounded-2xl p-4 items-center mb-4 ${isPenarikan && isPending ? "bg-amber-50 border-amber-200" : isPenarikan && isRejected ? "bg-red-50 border-red-200" : isPenarikan && isApproved ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-100"}`}>
              <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${isPending ? "bg-amber-100" : isRejected ? "bg-red-100" : isApproved ? "bg-emerald-100" : isIn ? "bg-emerald-50" : "bg-gray-100"}`}>
                {trxIcon(cat, isIn, t.status)}
              </View>
              <Text className="text-sm font-bold text-gray-900 text-center">{t.title}</Text>
              <Text className={`text-2xl font-extrabold mt-1 ${isIn ? "text-emerald-600" : isRejected ? "text-red-600" : "text-gray-900"}`}>
                {isIn ? "+" : "-"} Rp {Math.abs(Number(t.amount || 0)).toLocaleString("id-ID")}
              </Text>
              <View className={`mt-2 px-2.5 py-1 rounded-full border ${isPending ? "bg-amber-100 border-amber-200" : isRejected ? "bg-red-100 border-red-200" : isApproved ? "bg-emerald-100 border-emerald-200" : "bg-white border-gray-200"}`}>
                <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${isPending ? "text-amber-700" : isRejected ? "text-red-600" : isApproved ? "text-emerald-700" : "text-gray-600"}`}>{isPenarikan ? (isPending ? "PENDING • Menunggu ACC" : isRejected ? "DITOLAK" : isApproved ? "CAIR • APPROVED" : String(t.status).toUpperCase()) : `${kategoriLabel[cat] || cat} • ${t.status}`}</Text>
              </View>
              {isPenarikan && wd ? (
                <Text className="text-[11px] text-gray-500 mt-2 text-center">
                  {wd.bank_name} • {wd.bank_number} {wd.bank_holder ? `• a.n ${wd.bank_holder}` : ""} {"\n"}
                  Net Rp {Number(wd.net_amount ?? t.net ?? 0).toLocaleString("id-ID")} • Fee Rp {Number(wd.fee_amount ?? t.fee ?? 0).toLocaleString("id-ID")}
                </Text>
              ) : null}
            </View>

            <View className="gap-2.5">
              <Row label="Kategori" value={kategoriLabel[cat] || cat} />
              <Row label="Metode" value={t.methodLabel} />
              <Row label="Waktu" value={fmtWIB(t.created_at)} />
              <Row label="Status" value={String(t.status)} />
              <Row label="ID" value={String(t.rawId || t.id)} />
              {isPenarikan && wd ? (
                <>
                  <Row label="Nominal" value={`Rp ${Number(wd.amount).toLocaleString("id-ID")}`} />
                  <Row label="Biaya admin" value={`Rp ${Number(wd.fee_amount || 0).toLocaleString("id-ID")}`} />
                  <Row label="Diterima (Net)" value={`Rp ${Number(wd.net_amount || 0).toLocaleString("id-ID")}`} />
                  <Row label="Rekening" value={`${wd.bank_name} • ${wd.bank_number}`} />
                  <Row label="a.n" value={String(wd.bank_holder || "-")} />
                  {wd.admin_note ? <Row label="Catatan admin" value={String(wd.admin_note)} multiline /> : null}
                  {!isRejected && !isApproved ? <Row label="Proses" value="Maks 1x24 jam — menunggu ACC admin" /> : null}
                </>
              ) : null}
              {!isPenarikan && t.fee ? <Row label="Potongan" value={`Rp ${Number(t.fee).toLocaleString("id-ID")}`} /> : null}
              {!isPenarikan && t.gross ? <Row label="Nominal Kotor" value={`Rp ${Number(t.gross).toLocaleString("id-ID")}`} /> : null}
              {t.note && !wd?.admin_note ? <Row label="Catatan" value={t.note} multiline /> : null}
              {t.isCOD ? (
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
                  <Text className="text-[11px] text-amber-900 leading-4">COD dibayar tunai di tempat, tidak masuk ke saldo tarik dana. Hanya tercatat sebagai riwayat.</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity onPress={() => logic.setShowTrxDetailModal(false)} className="mt-6 w-full py-3.5 bg-gray-900 rounded-xl items-center">
              <Text className="text-white font-extrabold">Tutup</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
function WithdrawModal({ logic }: { logic: ReturnType<typeof useDompetUnifiedLogic> }) {
  const [amountText, setAmountText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const numAmount = Number(String(amountText).replace(/\D/g, "")) || 0;
  const feeFixed = logic.withdrawalConfig?.feeFixed ?? 2500;
  const feePercent = logic.withdrawalConfig?.feePercent ?? 0;
  const feeAmount = numAmount > 0 ? Math.round(feeFixed + (numAmount * feePercent) / 100) : 0;
  const netAmount = Math.max(0, numAmount - feeAmount);
  const minWd = logic.withdrawalConfig?.minWithdrawal ?? 10000;

  React.useEffect(() => {
    if (!logic.showWithdrawModal) {
      setAmountText("");
      setSubmitting(false);
    }
  }, [logic.showWithdrawModal]);

  // === CUSTOM ALERT/SUCCESS MODAL (cantik untuk WEB + ANDROID, ganti window.alert/window.confirm) ===
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState<null | { kind: "success" | "error" | "info"; title: string; msg: string; actionLabel?: string; onAction?: () => void }>(null);

  const showInfo = (title: string, msg: string, extra?: { actionLabel?: string; onAction?: () => void; kind?: "info" | "error" }) => {
    setShowResult({ kind: extra?.kind || "info", title, msg, actionLabel: extra?.actionLabel, onAction: extra?.onAction });
  };

  const executeWithdraw = async () => {
    setShowConfirm(false);
    try {
      setSubmitting(true);
      console.log("[Withdraw] mengirim pengajuan:", { userId: logic.user?.id, numAmount });
      await logic.requestWithdrawal(numAmount);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      const sMsg = `Penarikan Rp ${numAmount.toLocaleString("id-ID")} diajukan.\n\nNet diterima: Rp ${netAmount.toLocaleString("id-ID")}\nBiaya admin: Rp ${feeAmount.toLocaleString("id-ID")}\n\nMenunggu verifikasi admin (maks 1x24 jam).`;
      logic.setShowWithdrawModal(false);
      setAmountText("");
      setTimeout(() => setShowResult({ kind: "success", title: "Pengajuan Terkirim", msg: sMsg }), 280);
    } catch (e: any) {
      console.log("[Withdraw] gagal:", e?.message);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      setShowResult({ kind: "error", title: "Gagal Pengajuan", msg: e?.message || "Gagal mengajukan penarikan" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    console.log("[Withdraw] Ajukan Penarikan TAP", { numAmount, saldo: logic.saldo, submitting, submittingWithdraw: logic.submittingWithdraw, rekening: logic.rekening });
    if (submitting || logic.submittingWithdraw) {
      showInfo("Mohon tunggu", "Sedang memproses pengajuan sebelumnya...");
      return;
    }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    if (!logic.rekening?.bank_name || !logic.rekening?.bank_number) {
      showInfo("Hubungkan Rekening", "Hubungkan rekening dulu sebelum tarik dana.", {
        actionLabel: "Hubungkan",
        onAction: () => { logic.setShowWithdrawModal(false); setShowResult(null); setTimeout(() => logic.setShowRekeningModal(true), 250); },
      });
      return;
    }
    if (!numAmount || numAmount <= 0) { showInfo("Nominal kosong", "Silakan masukkan nominal penarikan."); return; }
    if (numAmount < minWd) { showInfo("Nominal kurang", `Minimal penarikan Rp ${minWd.toLocaleString("id-ID")}`, { kind: "error" }); return; }
    if (numAmount > logic.saldo) { showInfo("Saldo tidak cukup", `Saldo kamu Rp ${logic.saldo.toLocaleString("id-ID")}`, { kind: "error" }); return; }
    if (netAmount <= 0) { showInfo("Nominal terlalu kecil", "Nominal setelah potongan biaya harus > 0", { kind: "error" }); return; }
    const hasPending = (logic.withdrawalRequests || []).some((w: any) => String(w.status) === "pending");
    if (hasPending) { showInfo("Masih Ada Pengajuan Tertunda", "Kamu sudah punya penarikan yang menunggu verifikasi admin. Tunggu ACC/ditolak dulu sebelum ajukan baru."); return; }

    // tampilkan modal konfirmasi cantik (ganti window.confirm & Alert.alert)
    setShowConfirm(true);
  };

  const quick = [50000, 100000, 200000];
  const canSubmit = numAmount >= minWd && numAmount <= logic.saldo && netAmount > 0 && !submitting && !logic.submittingWithdraw;

  return (
    <>
      <Modal visible={logic.showWithdrawModal} transparent animationType="slide" onRequestClose={() => logic.setShowWithdrawModal(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} pointerEvents="box-none">
          <Pressable onPress={() => logic.setShowWithdrawModal(false)} style={StyleSheet.absoluteFill} />
          <View style={{ maxHeight: "92%", backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", zIndex: 10, elevation: 10 }} pointerEvents="auto">
          <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
            <View className="flex-row items-center gap-2"><Banknote size={20} color="#FF6B00" /><Text className="text-base font-extrabold text-gray-900">Tarik Dana</Text></View>
            <TouchableOpacity onPress={() => logic.setShowWithdrawModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"><X size={16} color="#6B7280" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <View className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex-row items-center justify-between">
              <View><Text className="text-[11px] font-bold text-gray-500 uppercase">Saldo Tersedia</Text><Text className="text-lg font-extrabold text-gray-900">Rp {logic.saldo.toLocaleString("id-ID")}</Text></View>
              <View className="bg-white border border-orange-200 rounded-xl px-3 py-2"><Text className="text-[10px] font-bold text-gray-500 text-center">Rekening</Text><Text className="text-xs font-extrabold text-gray-900 text-center" numberOfLines={1}>{logic.rekening ? `${logic.rekening.bank_name} • ${logic.rekening.bank_number}` : "Belum terhubung"}</Text></View>
            </View>

            {!logic.rekening?.bank_name ? (
              <View className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row gap-2 items-center">
                <ShieldCheck size={16} color="#D97706" /><Text className="text-xs text-amber-900 flex-1">Hubungkan rekening dulu — nama pemilik harus sama dengan KTP.</Text>
                <TouchableOpacity onPress={() => { logic.setShowWithdrawModal(false); logic.setShowRekeningModal(true); }} className="bg-amber-600 px-3 py-1.5 rounded-lg"><Text className="text-white text-xs font-extrabold">Hubungkan</Text></TouchableOpacity>
              </View>
            ) : (
              <View className="mt-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <Text className="text-[11px] font-bold text-gray-500">Tujuan penarikan</Text>
                <Text className="text-xs font-extrabold text-gray-900">{logic.rekening.bank_name} • {logic.rekening.bank_number}</Text>
                <Text className="text-[11px] text-gray-500">a.n {logic.rekening.bank_holder}</Text>
              </View>
            )}

            <Text className="text-xs font-bold text-gray-700 mt-4 mb-1.5">Nominal Penarikan</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3">
              <Text className="text-sm font-extrabold text-gray-500 mr-2">Rp</Text>
              <TextInput value={amountText} onChangeText={(v) => setAmountText(v.replace(/\D/g, ""))} placeholder={`Min ${minWd.toLocaleString("id-ID")}`} placeholderTextColor="#9CA3AF" keyboardType="number-pad" className="flex-1 py-3 text-sm font-extrabold text-gray-900" />
              {amountText ? <TouchableOpacity onPress={() => setAmountText("")} className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center"><X size={12} color="#6B7280" /></TouchableOpacity> : null}
            </View>
            <View className="flex-row gap-2 mt-2">
              {quick.map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => { try { Haptics.selectionAsync(); } catch {} setAmountText(String(v)); }}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${numAmount === v ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-white border-gray-200"}`}
                >
                  <Text className={`text-xs font-extrabold ${numAmount === v ? "text-white" : "text-gray-700"}`}>{(v/1000)}rb</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  const s = Math.max(0, Math.floor(Number(logic.saldo) || 0));
                  console.log("[Withdraw] tap Semua saldo=", s);
                  if (s <= 0) { showInfo("Saldo kosong", "Saldo tersedia Rp 0, belum bisa tarik dana.", { kind: "error" }); return; }
                  setAmountText(String(s));
                }}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="flex-1 py-2.5 rounded-xl border bg-gray-900 border-gray-900 items-center justify-center"
              >
                <Text className="text-xs font-extrabold text-white">Semua</Text>
              </TouchableOpacity>
            </View>

            {numAmount > 0 ? (
              <View className="mt-4 bg-white border border-gray-200 rounded-2xl p-3.5 gap-2">
                <View className="flex-row justify-between"><Text className="text-xs text-gray-500">Nominal</Text><Text className="text-xs font-bold text-gray-900">Rp {numAmount.toLocaleString("id-ID")}</Text></View>
                <View className="flex-row justify-between"><Text className="text-xs text-gray-500">Biaya admin ({feeFixed.toLocaleString("id-ID")} + {feePercent}%)</Text><Text className="text-xs font-bold text-amber-600">- Rp {feeAmount.toLocaleString("id-ID")}</Text></View>
                <View className="h-[1px] bg-gray-100" />
                <View className="flex-row justify-between"><Text className="text-xs font-extrabold text-gray-900">Diterima</Text><Text className="text-sm font-extrabold text-emerald-600">Rp {netAmount.toLocaleString("id-ID")}</Text></View>
                {numAmount < minWd ? <Text className="text-[11px] text-red-600 font-bold">Minimal Rp {minWd.toLocaleString("id-ID")}</Text> : null}
                {numAmount > logic.saldo ? <Text className="text-[11px] text-red-600 font-bold">Melebihi saldo</Text> : null}
              </View>
            ) : null}

            <Text className="text-[11px] text-gray-400 mt-3 leading-4">• Penarikan diproses admin maks 1x24 jam. • Jika ada pengajuan pending, ajukan baru setelah selesai. • Biaya admin diatur admin: Rp {feeFixed.toLocaleString("id-ID")} + {feePercent}%.</Text>
          </ScrollView>

          {/* Footer Fixed — tombol SELALU ENABLE */}
          <View className="p-5 pt-3 pb-8 border-t border-gray-100 bg-white" style={{ zIndex: 100, elevation: 10 }} pointerEvents="auto">
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ borderRadius: 12, backgroundColor: submitting || logic.submittingWithdraw ? "#FFB07A" : "#FF6B00", paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, elevation: 4, zIndex: 10 }}
            >
              {submitting || logic.submittingWithdraw ? <ActivityIndicator color="#fff" /> : <Banknote size={18} color="#fff" />}
              <Text className="text-white font-extrabold text-base">{submitting || logic.submittingWithdraw ? "Memproses..." : "Ajukan Penarikan"}</Text>
            </TouchableOpacity>
            {numAmount > 0 && numAmount < minWd ? (
              <Text className="text-[11px] text-amber-600 font-bold text-center mt-2">Minimal penarikan Rp {minWd.toLocaleString("id-ID")}</Text>
            ) : numAmount > logic.saldo ? (
              <Text className="text-[11px] text-red-600 font-bold text-center mt-2">Nominal melebihi saldo tersedia (Rp {logic.saldo.toLocaleString("id-ID")})</Text>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>

    {/* === MODAL KONFIRMASI CANTIK (center, WEB + ANDROID) === */}
    <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Pressable onPress={() => setShowConfirm(false)} style={StyleSheet.absoluteFill} />
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", elevation: 16 }}>
          <View className="p-5 pb-3 items-center">
            <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center mb-3">
              <Banknote size={26} color="#FF6B00" />
            </View>
            <Text className="text-base font-extrabold text-gray-900 text-center">Konfirmasi Penarikan</Text>
            <Text className="text-xs text-gray-500 text-center mt-1 leading-4">
              Tarik <Text className="font-extrabold text-gray-900">Rp {numAmount.toLocaleString("id-ID")}</Text> ke {"\n"}
              <Text className="font-extrabold text-gray-900">{logic.rekening?.bank_name} • {logic.rekening?.bank_number}</Text> ?
            </Text>
          </View>
          <View className="mx-5 bg-gray-50 border border-gray-200 rounded-2xl p-3.5 gap-2">
            <View className="flex-row justify-between"><Text className="text-xs text-gray-500">Nominal</Text><Text className="text-xs font-bold text-gray-900">Rp {numAmount.toLocaleString("id-ID")}</Text></View>
            <View className="flex-row justify-between"><Text className="text-xs text-gray-500">Biaya admin</Text><Text className="text-xs font-bold text-amber-600">- Rp {feeAmount.toLocaleString("id-ID")}</Text></View>
            <View className="h-[1px] bg-gray-200" />
            <View className="flex-row justify-between"><Text className="text-xs font-extrabold text-gray-900">Net diterima</Text><Text className="text-sm font-extrabold text-emerald-600">Rp {netAmount.toLocaleString("id-ID")}</Text></View>
          </View>
          <View className="p-4 pt-4 flex-row gap-3">
            <TouchableOpacity onPress={() => setShowConfirm(false)} className="flex-1 py-3.5 rounded-xl bg-gray-100 items-center"><Text className="text-sm font-extrabold text-gray-700">Batal</Text></TouchableOpacity>
            <TouchableOpacity onPress={executeWithdraw} disabled={submitting || logic.submittingWithdraw} className="flex-1 py-3.5 rounded-xl bg-[#FF6B00] items-center flex-row justify-center gap-2" style={{ opacity: submitting ? 0.7 : 1 }}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <CheckCircle2 size={16} color="#fff" />}
              <Text className="text-sm font-extrabold text-white">Ya, Ajukan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* === MODAL HASIL / INFO CANTIK (center, WEB + ANDROID) === */}
    <Modal visible={!!showResult} transparent animationType="fade" onRequestClose={() => setShowResult(null)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Pressable onPress={() => { const a = showResult?.onAction; const hasAction = !!showResult?.actionLabel; setShowResult(null); if (!hasAction && a) a(); }} style={StyleSheet.absoluteFill} />
        <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", elevation: 16 }}>
          <View className="p-6 items-center">
            <View className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${showResult?.kind === "success" ? "bg-emerald-100" : showResult?.kind === "error" ? "bg-red-100" : "bg-amber-100"}`}>
              {showResult?.kind === "success" ? <CheckCircle2 size={28} color="#059669" /> : showResult?.kind === "error" ? <X size={24} color="#DC2626" /> : <Clock3 size={24} color="#D97706" />}
            </View>
            <Text className="text-base font-extrabold text-gray-900 text-center">{showResult?.title}</Text>
            <Text className="text-xs text-gray-600 text-center mt-2 leading-5">{showResult?.msg}</Text>
          </View>
          <View className="px-5 pb-5 gap-2">
            {showResult?.actionLabel ? (
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setShowResult(null)} className="flex-1 py-3.5 rounded-xl bg-gray-100 items-center"><Text className="text-sm font-extrabold text-gray-700">Tutup</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { const a = showResult?.onAction; setShowResult(null); setTimeout(() => a?.(), 150); }} className="flex-1 py-3.5 rounded-xl bg-[#FF6B00] items-center"><Text className="text-sm font-extrabold text-white">{showResult?.actionLabel}</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowResult(null)} className="w-full py-3.5 rounded-xl bg-gray-900 items-center"><Text className="text-sm font-extrabold text-white">Mengerti</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View className={`flex-row ${multiline ? "items-start" : "items-center"} justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3`}>
      <Text className="text-xs font-bold text-gray-500 shrink-0">{label}</Text>
      <Text className={`text-xs font-bold text-gray-900 text-right ${multiline ? "flex-1" : ""}`} numberOfLines={multiline ? 0 : 1}>{value}</Text>
    </View>
  );
}

export default function UnifiedDompetPage() {
  const logic = useDompetUnifiedLogic();
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const isP = pathname.startsWith("/p/");
        logic.router.replace(isP ? "/p/profil" : "/c/profil");
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [logic.router, pathname])
  );

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
      <DompetHeader router={logic.router} logic={logic} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center px-4 pt-4">
          <SaldoCard logic={logic} />
        </View>
        <StatistikGrid logic={logic} />
        <TransactionList logic={logic} />
      </ScrollView>

      {/* Rincian Sumber modal: SAMA untuk semua */}
      <Modal visible={logic.showDetailModal} transparent animationType="slide" onRequestClose={() => logic.setShowDetailModal(false)}>
        <Pressable onPress={() => logic.setShowDetailModal(false)} className="flex-1 bg-black/60 justify-end">
          <Pressable onPress={(e: any) => e.stopPropagation?.()} className="bg-white rounded-t-3xl overflow-hidden p-5">
            <View className="flex-row items-center justify-between pb-4 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <FolderOpen size={20} color="#FF6B00" />
                <Text className="text-base font-extrabold text-gray-900">Rincian Sumber</Text>
              </View>
              <TouchableOpacity onPress={() => logic.setShowDetailModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="py-4 gap-3">
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5"><Clock3 size={14} color="#059669" /><Text className="text-xs font-extrabold text-emerald-900">Pembayaran Online</Text></View>
                  <Text className="text-[11px] text-emerald-800/70 mt-1">Masuk saldo & bisa ditarik setelah kerja selesai.</Text>
                </View>
                <Text className="text-base font-extrabold text-emerald-700">Rp {logic.detailPendapatan.escrow.toLocaleString("id-ID")}</Text>
              </View>
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5"><Banknote size={14} color="#D97706" /><Text className="text-xs font-extrabold text-amber-900">COD (Tunai)</Text></View>
                  <Text className="text-[11px] text-amber-800/70 mt-1">Tunai di tempat, hanya riwayat.</Text>
                </View>
                <Text className="text-base font-extrabold text-amber-700">Rp {logic.detailPendapatan.cod.toLocaleString("id-ID")}</Text>
              </View>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex-row justify-between items-center">
                <Text className="text-xs font-bold text-gray-500">Total pendapatan tercatat</Text>
                <Text className="text-xs font-extrabold text-gray-900">Rp {(logic.detailPendapatan.escrow + logic.detailPendapatan.cod).toLocaleString("id-ID")}</Text>
              </View>
              <Text className="text-[11px] text-gray-400">Refund & bonus admin muncul otomatis di riwayat, bukan di sini.</Text>
              <TouchableOpacity onPress={() => logic.setShowDetailModal(false)} className="mt-1 w-full py-3.5 bg-gray-900 rounded-xl items-center">
                <Text className="text-white font-extrabold">Tutup</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <WithdrawModal logic={logic} />

      <RekeningModal logic={logic} />
      <TrxDetailModal logic={logic} />
    </SafeAreaView>
  );
}
