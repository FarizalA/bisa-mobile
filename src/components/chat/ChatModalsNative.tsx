import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { X, FileText, DollarSign, Receipt, Clock, ShieldCheck, CheckCircle2, Star, Calendar, ExternalLink, ChevronRight, Package, Copy } from "lucide-react-native";
import { formatRupiah, calculatePaymentBreakdown } from "../../lib/payment";
import { formatNoInvoice, paymentLabel, statusColorNative, fmtDate, buildOrderTimeline } from "../../lib/invoice";
import { OrderTimeline } from "../order/OrderTimeline";
import * as Haptics from "expo-haptics";

// 1. MODAL TAWAR HARGA
export function MobileOfferModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: string) => void;
}) {
  const [amount, setAmount] = useState("");

  const handleSend = () => {
    const raw = amount.replace(/\D/g, "");
    if (!raw || Number(raw) < 1000) {
      Alert.alert("Nominal Kurang", "Masukkan penawaran minimal Rp 1.000");
      return;
    }
    onSubmit(raw);
    setAmount("");
    onClose();
  };

  const formatted = amount ? `Rp ${Number(amount.replace(/\D/g, "")).toLocaleString("id-ID")}` : "";
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[26px] p-5 shadow-2xl w-full max-w-sm self-center">
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
              <DollarSign size={20} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-gray-900">Tawar Harga</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">Masukkan harga penawaranmu</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View className="mt-5">
            <View className="relative bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-1 flex-row items-center focus:border-[#FF6B00] focus:bg-white">
              <Text className="font-bold text-gray-500 mr-2 text-sm">Rp</Text>
              <TextInput
                keyboardType="numeric"
                placeholder="0"
                value={formatted.replace(/^Rp\s?/, "")}
                onChangeText={(t) => setAmount(t.replace(/\D/g, ""))}
                className="flex-1 py-3.5 font-bold text-sm text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              className="w-full mt-4 bg-[#FF6B00] py-3.5 rounded-full items-center shadow-sm"
              activeOpacity={0.92}
            >
              <Text className="text-white font-bold text-sm">Kirim Penawaran</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 2. MODAL BUAT INVOICE (KHUSUS MITRA)
export function MobileInvoiceModal({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (judul: string, harga: number) => void;
  loading: boolean;
}) {
  const [judul, setJudul] = useState("");
  const [harga, setHarga] = useState("");

  const handleSend = () => {
    if (!judul.trim()) {
      Alert.alert("Lengkapi Data", "Judul layanan wajib diisi");
      return;
    }
    const num = Number(harga.replace(/\D/g, ""));
    if (!num || num < 1000) {
      Alert.alert("Harga Tidak Valid", "Masukkan harga minimal Rp 1.000");
      return;
    }
    onSubmit(judul.trim(), num);
    setJudul("");
    setHarga("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[32px] p-5 shadow-2xl w-full max-w-sm self-center">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-2xl bg-emerald-50 items-center justify-center">
                <FileText size={18} color="#059669" />
              </View>
              <View>
                <Text className="font-extrabold text-base text-gray-900">Buat Tagihan / Invoice</Text>
                <Text className="text-[11px] text-gray-500 font-medium">Kirim kartu pesanan ke klien</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-5">
            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Judul Layanan / Pekerjaan</Text>
              <TextInput
                value={judul}
                onChangeText={setJudul}
                placeholder="Contoh: Perbaikan Instalasi Pipa"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900"
              />
            </View>
            <View className="mt-1">
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Harga Sepakat</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center">
                <Text className="font-bold text-gray-500 mr-2 text-sm">Rp</Text>
                <TextInput
                  keyboardType="numeric"
                  value={harga ? Number(harga.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                  onChangeText={(t) => setHarga(t.replace(/\D/g, ""))}
                  placeholder="0"
                  className="flex-1 font-extrabold text-base text-gray-900"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading}
            className="w-full bg-emerald-600 py-3.5 rounded-full items-center shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-extrabold text-xs">Kirim Invoice Pesanan</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// 3. MODAL DETAIL RINGKASAN ORDER / INVOICE (1:1 Web InvoiceDetailModal.tsx & InvoiceCard.tsx)
export function MobileOrderDetailModal({
  visible,
  order,
  isMitraView,
  myUserId,
  onClose,
  onCancel,
  onPay,
  onOpenActivity,
}: {
  visible: boolean;
  order: any;
  isMitraView: boolean;
  myUserId?: string;
  onClose: () => void;
  onCancel?: (jobId: string) => void;
  onPay?: (jobId: string) => void;
  onOpenActivity?: (jobId: string) => void;
}) {
  if (!order) return null;

  const rawBudget = order.agreed_price || parseInt(String(order.budget || "").replace(/\D/g, "") || "0", 10);
  const breakdown = calculatePaymentBreakdown(rawBudget);

  const jobId = String(order.jobId || order.id || "");
  const invNumber = formatNoInvoice(jobId);
  const isCOD = (order.payment_method || "").toUpperCase() === "COD";
  const st = (order.payment_status || order.status || "").toLowerCase();

  const isUnpaid = st === "belum_bayar" || st === "menunggu_pembayaran" || st === "pending";
  const isPayer = myUserId && (order.pelanggan_id || order.client_id)
    ? String(order.pelanggan_id || order.client_id) === String(myUserId)
    : !isMitraView;
  const canPayNow = isUnpaid && isPayer && !isCOD;

  const statusLabelText = paymentLabel(order.payment_method, order.payment_status || order.status);
  const statusNative = statusColorNative(order.payment_status || order.status);

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Nomor Tagihan Berhasil Disalin", invNumber);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-[#FAFAFA] rounded-t-[32px] p-5 shadow-2xl w-full max-w-md self-center max-h-[90%]">
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

          {/* Header Modal 1:1 Image 2 */}
          <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-200/60">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-xl bg-orange-50 items-center justify-center border border-orange-100">
                <Receipt size={18} color="#FF6B00" />
              </View>
              <View>
                <Text className="font-extrabold text-gray-900 text-sm">Invoice</Text>
                <Text className="text-[10px] text-gray-400 font-medium">
                  {invNumber} • {order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              {/* Header Kartu 1:1 Image 2 */}
              <View className="p-4 flex-row justify-between items-start">
                <View className="flex-row gap-2.5 flex-1 pr-2">
                  <View className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 items-center justify-center">
                    <Receipt size={15} color="#FF6B00" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <Text className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">TAGIHAN</Text>
                      {!isCOD && (
                        <View className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck size={9} color="#047857" />
                          <Text className="text-[9px] font-bold text-emerald-700">Online</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={handleCopy} className="flex-row items-center gap-1">
                      <Text className="text-xs font-extrabold text-gray-900" numberOfLines={1}>{invNumber}</Text>
                      <Copy size={11} color="#9CA3AF" />
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Clock size={10} color="#9CA3AF" />
                      <Text className="text-[10px] text-gray-400">{fmtDate(order.created_at)}</Text>
                    </View>
                  </View>
                </View>

                {/* Badge Status 1:1 Image 2 */}
                <View className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                  <Text className="text-gray-700 text-[10px] font-bold">
                    {isCOD ? "Bayar di Tempat (COD)" : statusLabelText}
                  </Text>
                </View>
              </View>

              <View className="mx-4 h-[1px] bg-gray-100" />

              {/* Klien & Mitra Pills 1:1 Image 2 */}
              <View className="p-3 flex-row gap-2">
                <View className="flex-1 flex-row items-center gap-1.5 bg-gray-50 rounded-xl px-2.5 py-2 border border-gray-100">
                  <View className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <Text className="text-[8px] font-bold text-gray-500 uppercase">KLIEN</Text>
                  <Text className="text-[11px] font-bold text-gray-900 flex-1" numberOfLines={1}>
                    {order.pelanggan_name || order.client?.name || "Klien BISA"}
                  </Text>
                </View>
                <View className="flex-1 flex-row items-center gap-1.5 bg-emerald-50/50 rounded-xl px-2.5 py-2 border border-emerald-100">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <Text className="text-[8px] font-bold text-emerald-700 uppercase">MITRA</Text>
                  <Text className="text-[11px] font-bold text-gray-900 flex-1" numberOfLines={1}>
                    {order.mitra_name || order.mitra?.name || "Mitra BISA"}
                  </Text>
                </View>
              </View>

              {/* Layanan Card 1:1 Image 2 */}
              <View className="mx-3 bg-gray-50 rounded-xl border border-gray-100 p-3 flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-white border border-gray-200 items-center justify-center">
                  <Package size={14} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] font-bold text-gray-400 uppercase">LAYANAN</Text>
                  <Text className="text-[13px] font-bold text-gray-900" numberOfLines={1}>{order.judul || "Layanan BISA"}</Text>
                  <Text className="text-[10px] text-gray-500">
                    {order.kategori || "Pesan Langsung"} • {order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </Text>
                </View>
              </View>

              {/* Rincian Fee 1:1 Image 2 (COD: Simpel, tanpa biaya layanan & penanganan) */}
              <View className="p-4">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Calendar size={11} color="#9CA3AF" />
                  <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">RINCIAN</Text>
                </View>
                <View className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                  <View className="flex-row justify-between px-3 py-2.5">
                    <Text className="text-xs text-gray-500">Biaya Jasa</Text>
                    <Text className="text-xs font-bold text-gray-900">{formatRupiah(breakdown.agreedPrice)}</Text>
                  </View>
                  {!isCOD && (
                    <>
                      <View className="flex-row justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
                        <Text className="text-xs text-gray-500">Biaya Layanan</Text>
                        <Text className="text-xs font-semibold text-gray-700">{formatRupiah(breakdown.appFee)}</Text>
                      </View>
                      <View className="flex-row justify-between px-3 py-2 border-t border-gray-100">
                        <Text className="text-xs text-gray-500">Biaya Penanganan</Text>
                        <Text className="text-xs font-semibold text-gray-700">{formatRupiah(breakdown.paymentGatewayFee)}</Text>
                      </View>
                    </>
                  )}
                  <View className="flex-row justify-between items-center px-3 py-2.5 bg-[#FFFBEB] border-t border-[#FEF3C7]">
                    <Text className="text-xs font-extrabold text-gray-900">Total Kesepakatan</Text>
                    <Text className="text-sm font-extrabold text-[#EA580C]">
                      {formatRupiah(isCOD ? breakdown.agreedPrice : breakdown.totalBuyerPays)}
                    </Text>
                  </View>
                </View>

                {/* Mitra Notice 1:1 Image 2 */}
                <View className={`mt-3 flex-row items-start gap-2 rounded-xl p-3 border ${isCOD ? "bg-[#FEFCE8] border-[#FEF08A]" : "bg-emerald-50 border-emerald-100"}`}>
                  <CheckCircle2 size={14} color={isCOD ? "#CA8A04" : "#059669"} style={{ marginTop: 2 }} />
                  <Text className={`text-[11px] leading-4 flex-1 ${isCOD ? "text-[#854D0E]" : "text-emerald-800"}`}>
                    <Text className="font-extrabold">Mitra terima {formatRupiah(breakdown.agreedPrice)}</Text>{" "}
                    {isCOD ? "— dibayarkan tunai oleh Klien setelah selesai." : "— otomatis masuk ke saldo setelah selesai."}
                  </Text>
                </View>

                {isCOD && (
                  <Text className="text-[10px] text-gray-400 mt-2 font-medium">Metode <Text className="text-gray-700 font-bold">COD</Text></Text>
                )}
              </View>
            </View>

            {/* Timeline Histori Pesanan (Fase 5) */}
            <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Clock size={11} color="#9CA3AF" />
                <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">RIWAYAT PESANAN</Text>
              </View>
              <OrderTimeline steps={buildOrderTimeline(order)} compact />
            </View>
          </ScrollView>

          {/* Action Buttons 1:1 Image 2 */}
          <View className="pt-2 gap-2">
            {canPayNow && onPay && (
              <TouchableOpacity
                onPress={() => { onClose(); onPay(jobId); }}
                className="w-full py-3.5 rounded-full bg-[#FF6B00] items-center active:scale-95 shadow-sm"
              >
                <Text className="text-white font-extrabold text-sm">Bayar Sekarang</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => { onClose(); onOpenActivity?.(jobId); }}
              className="w-full py-3.5 rounded-full bg-white border border-gray-200 items-center active:scale-95 shadow-xs"
            >
              <Text className="text-gray-800 font-bold text-sm">Buka Aktivitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { onClose(); }}
              className="w-full py-3.5 rounded-full bg-white border border-gray-200 items-center active:scale-95 flex-row justify-center gap-1.5 shadow-xs"
            >
              <FileText size={14} color="#374151" />
              <Text className="text-gray-800 font-bold text-sm">Buka Halaman Invoice Lengkap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 4. CLIENT PROFILE SHEET (1:1 Web ClientProfileSheet.tsx)
export function MobileClientProfileSheet({
  visible,
  clientProfileData,
  otherUser,
  jobInfo,
  onClose,
  onViewActivity,
}: {
  visible: boolean;
  clientProfileData: any;
  otherUser: any;
  jobInfo: any;
  onClose: () => void;
  onViewActivity: (jobId: string) => void;
}) {
  if (!visible) return null;

  const displayName = clientProfileData?.name || otherUser?.name || "Klien BISA";
  const faceUrl = clientProfileData?.face_url || otherUser?.face_url;
  const isKycVerified = clientProfileData?.kyc_status === "approved" || clientProfileData?.kyc_status === "verified";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-5 shadow-2xl w-full max-w-md self-center max-h-[85%]">
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

          {/* Profile Identity */}
          <View className="items-center pb-4 border-b border-gray-100">
            <View className="w-20 h-20 rounded-full bg-orange-50 border-2 border-orange-100 items-center justify-center overflow-hidden mb-2">
              {faceUrl ? (
                <Image source={{ uri: faceUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="text-2xl font-black text-[#FF6B00]">{displayName.charAt(0)}</Text>
              )}
            </View>
            <Text className="font-extrabold text-gray-900 text-lg text-center">{displayName}</Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <View className="bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-[#FF6B00]">Klien</Text>
              </View>
              {isKycVerified && (
                <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
                  <ShieldCheck size={11} color="#059669" />
                  <Text className="text-[10px] font-bold text-emerald-700">KYC Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Grid */}
          <View className="py-4 flex-row bg-gray-50 rounded-2xl my-3 border border-gray-100">
            <View className="flex-1 items-center">
              <Text className="text-[10px] font-bold text-gray-400 uppercase">Total Order</Text>
              <Text className="text-base font-black text-gray-900 mt-0.5">{clientProfileData?.totalJobs ?? 0}</Text>
            </View>
            <View className="w-[1px] bg-gray-200" />
            <View className="flex-1 items-center">
              <Text className="text-[10px] font-bold text-emerald-600 uppercase">Selesai</Text>
              <Text className="text-base font-black text-emerald-600 mt-0.5">{clientProfileData?.completedJobs ?? 0}</Text>
            </View>
            <View className="w-[1px] bg-gray-200" />
            <View className="flex-1 items-center">
              <Text className="text-[10px] font-bold text-gray-400 uppercase">Rating</Text>
              <Text className="text-base font-black text-amber-500 mt-0.5 flex-row items-center">
                ★ {clientProfileData?.avgRating || "5.0"}
              </Text>
            </View>
          </View>

          {/* Job Info */}
          {jobInfo && (
            <TouchableOpacity
              onPress={() => { onClose(); onViewActivity(jobInfo.id); }}
              className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3.5 flex-row items-center justify-between mb-4"
            >
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-[#FF6B00] uppercase">Pesanan Saat Ini</Text>
                <Text className="text-sm font-bold text-gray-900 mt-0.5" numberOfLines={1}>{jobInfo.judul}</Text>
              </View>
              <ChevronRight size={18} color="#FF6B00" />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} className="w-full py-3.5 rounded-full bg-gray-100 items-center">
            <Text className="text-gray-700 font-bold text-sm">Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// 5. EMOJI PICKER NATIVE (1:1 Web EmojiPicker.tsx)
const EMOJI_SET = [
  "😊", "😂", "😍", "🥰", "😎", "🤔", "😢", "😭",
  "😮", "😴", "🤗", "🙏", "👍", "👏", "🔥", "❤️",
  "✨", "🎉", "💪", "🤝", "😅", "😁", "🥺", "🤩",
  "😇", "🤣", "😌", "🙂", "💯", "👌", "💬", "⭐",
];

export function MobileEmojiPicker({
  visible,
  onClose,
  onSelectEmoji,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}) {
  if (!visible) return null;
  return (
    <View className="w-full bg-white border-t border-gray-100 p-3">
      <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-gray-100">
        <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pilih Emoji</Text>
        <TouchableOpacity onPress={onClose} className="p-1">
          <X size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <View className="flex-row flex-wrap gap-2 justify-between">
        {EMOJI_SET.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => onSelectEmoji(emoji)}
            className="w-9 h-9 rounded-xl items-center justify-center bg-gray-50 active:bg-orange-50"
          >
            <Text className="text-xl">{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
