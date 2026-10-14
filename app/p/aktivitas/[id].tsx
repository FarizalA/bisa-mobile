import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  MessageSquare,
  Copy,
  CheckCircle2,
  Send,
  Wallet,
  FileText,
  Link2,
  Handshake,
  Clock,
  Timer,
} from "lucide-react-native";
import { formatRupiah } from "../../../src/lib/payment";
import { fmtDate } from "../../../src/lib/invoice";
import { useMitraOrderDetail } from "../../../src/hooks/useMitraOrderDetail";
import {
  ConfirmModal,
  DeliveryModal,
  DisputeModal,
  MutualCancelModal,
  NiceAlertModal,
  RejectCancelModal,
  RejectModal,
} from "../../../src/components/provider-order/OrderModals";

export default function MitraOrderDetailPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const jobId = params?.id ? String(params.id) : "";

  const d = useMitraOrderDetail(jobId);
  const job = d.job;

  if (d.loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAF9] items-center justify-center">
        <ActivityIndicator color="#059669" size="large" />
      </SafeAreaView>
    );
  }

  if (!job) return null;

  let parsedBudget = 0;
  if (job.budget && typeof job.budget === "string") {
    const numStr = job.budget.replace(/[^\d]/g, "");
    parsedBudget = numStr ? parseInt(numStr, 10) : 0;
  }
  const priceNum = job.agreed_price ?? job.harga_deal ?? parsedBudget;

  let platformFee: number;
  let netEarnings: number;
  let feeLabelPct: number;

  // DB adalah sumber kebenaran setelah release — jika selesai tapi fee masih 0/null (job lama),
  // fallback ke estimasi feePct agar tidak tampil 0%
  if ((job.platform_fee != null || job.mitra_earnings != null) && !(job.status !== "selesai" && Number(job.platform_fee || 0) === 0)) {
    platformFee = Number(job.platform_fee || 0);
    netEarnings = Number(job.mitra_earnings || Math.max(0, priceNum - platformFee));
    feeLabelPct = priceNum > 0 ? Math.round((platformFee / priceNum) * 100) : (d.feePct ?? 10);
  } else if (d.feePct != null) {
    platformFee = Math.round((priceNum * d.feePct) / 100);
    netEarnings = priceNum - platformFee;
    feeLabelPct = d.feePct;
  } else {
    platformFee = Math.round(priceNum * 0.1);
    netEarnings = priceNum - platformFee;
    feeLabelPct = 10;
  }

  const isCOD = job.payment_method === "COD";
  const isPaid = ["mitra_ditemukan", "sedang_dikerjakan", "menunggu_konfirmasi_selesai", "selesai"].includes(job.status);
  const isPendingApproval = job.status === "menunggu_konfirmasi_mitra";
  const isWaitingPayment = job.status === "menunggu_pembayaran";
  const isWorking = ["sedang_dikerjakan", "mitra_ditemukan", "revisi_diminta"].includes(job.status);
  const isDelivered = job.status === "menunggu_konfirmasi_selesai";
  const isPendingCancel = job.status === "menunggu_persetujuan_batal";
  const isDone = job.status === "selesai" || job.payment_status === "released" || job.payment_status === "cod_completed";
  const isCancelled = job.status === "dibatalkan" || job.status === "expired" || job.status === "ditolak";

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF9]" edges={["top"]}>
      {/* Header */}
      <View className="bg-white/95 px-4 h-14 border-b border-gray-100 flex-row items-center justify-between shadow-xs">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity onPress={d.handleBack} activeOpacity={0.8} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
            <ArrowLeft size={18} color="#374151" />
          </TouchableOpacity>
          <View>
            <View className="flex-col">
              <Text className="text-sm font-black text-gray-900 leading-none">Detail Pesanan & Invoice</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-[10px] text-gray-400 font-mono">#{String(job.id).slice(0, 8)}</Text>
                <TouchableOpacity onPress={() => Alert.alert("ID Disalin", `#${job.id}`)}>
                  <Copy size={11} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Clock size={9} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-400 font-medium">{fmtDate(job.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={d.handleOpenDirectChat}
          activeOpacity={0.85}
          className="h-8 px-3 rounded-full bg-emerald-50 border border-emerald-200 flex-row items-center gap-1.5"
        >
          <MessageSquare size={13} color="#059669" />
          <Text className="text-xs font-black text-emerald-700">Chat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <View className="max-w-[440px] w-full self-center flex-col gap-3.5">
          {/* 1. Status Card & Stepper */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Pekerjaan</Text>
              <View className="flex-row items-center gap-1.5">
                <View className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                  <Text className="text-xs font-black text-blue-900">
                    {isDone
                      ? "Selesai & Lunas"
                      : isPendingCancel
                      ? "Menunggu Persetujuan Batal"
                      : isDelivered
                      ? "Menunggu Konfirmasi Klien"
                      : isWorking
                      ? "Sedang Dikerjakan"
                      : isWaitingPayment
                      ? "Menunggu Pembayaran"
                      : isPendingApproval
                      ? "Menunggu Persetujuan Anda"
                      : isCancelled
                      ? "Dibatalkan"
                      : job.status}
                  </Text>
                </View>
                {isPendingApproval && d.offerCountdown && (
                  <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 flex-row items-center gap-1">
                    <Timer size={11} color="#92400e" />
                    <Text className="text-[11px] font-black text-amber-800 tabular-nums">{d.offerCountdown}</Text>
                  </View>
                )}
                {isPendingCancel && d.cancelCountdown && (
                  <View className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 flex-row items-center gap-1">
                    <Timer size={11} color="#b91c1c" />
                    <Text className="text-[11px] font-black text-red-700 tabular-nums">{d.cancelCountdown}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stepper 4 step */}
            <View className="flex-row justify-between items-center mt-3.5 px-2">
              {[
                { label: "Pesanan", done: true, active: true },
                { label: isCOD ? "Konfirmasi" : "Escrow", done: isPaid && !isPendingApproval, active: isPendingApproval || isPaid || isWaitingPayment },
                { label: "Pengerjaan", done: isDelivered || isDone, active: isWorking || isDelivered || isDone || isPendingCancel },
                { label: "Selesai", done: isDone, active: isDone },
              ].map((s, idx) => (
                <View key={idx} className="items-center flex-col">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mb-1 ${
                      s.done ? "bg-emerald-600 text-white" : s.active ? "bg-emerald-100 border border-emerald-300" : "bg-gray-100"
                    }`}
                  >
                    {s.done ? (
                      <CheckCircle2 size={13} color="#ffffff" />
                    ) : (
                      <Text className={`text-[10px] font-black ${s.active ? "text-emerald-700" : "text-gray-400"}`}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text className={`text-[10px] font-bold ${s.active ? "text-gray-900" : "text-gray-400"}`}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Banner Sengketa Aktif (Fase 4) */}
          {job.status === "dalam_sengketa" && (
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-300 shadow-xs flex-col gap-2.5">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                  <FileText size={16} color="#b45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-amber-900">Pesanan Dalam Sengketa</Text>
                  <Text className="text-[10px] text-amber-700">Dana ditahan. Menunggu keputusan Admin setelah meninjau bukti & chat.</Text>
                </View>
              </View>
              {job.dispute_reason ? (
                <View className="bg-white rounded-xl p-3 border border-amber-200">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Alasan Sengketa:</Text>
                  <Text className="text-xs font-medium text-gray-800 italic">"{job.dispute_reason}"</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Banner Pengajuan Pembatalan oleh Klien */}
          {isPendingCancel && (
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-300 shadow-xs flex-col gap-2.5">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                  <Clock size={16} color="#b45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-amber-900">Klien Mengajukan Pembatalan</Text>
                  <Text className="text-[10px] text-amber-700">Respon dalam 24 jam atau saldo otomatis di-refund ke Klien</Text>
                </View>
              </View>
              <View className="bg-white rounded-xl p-3 border border-amber-200">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Alasan Klien:</Text>
                <Text className="text-xs font-medium text-gray-800 italic">
                  "{job.cancel_reason || job.alasan_penolakan || "Klien mengajukan pembatalan pesanan"}"
                </Text>
              </View>
              <View className="flex-row items-center justify-between pt-0.5">
                <Text className="text-[11px] font-bold text-amber-800">Batas Waktu Respon:</Text>
                <Text className="text-xs font-black text-red-600 font-mono">{d.cancelCountdown || "24 Jam"}</Text>
              </View>
            </View>
          )}

          {/* 2. Informasi Klien */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Informasi Klien</Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 min-w-0 pr-2">
                <View className="w-11 h-11 rounded-full bg-emerald-50 items-center justify-center overflow-hidden border border-emerald-100">
                  {job.pelanggan?.face_url ? (
                    <Image source={{ uri: job.pelanggan.face_url }} style={{ width: 44, height: 44 }} />
                  ) : (
                    <Text className="text-emerald-700 font-extrabold text-sm">{job.pelanggan?.name?.charAt(0) || "K"}</Text>
                  )}
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-black text-gray-900" numberOfLines={1}>
                    {job.pelanggan?.name || "Pelanggan BISA"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                    {job.lokasi || "Bojongsari"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={d.handleOpenDirectChat} className="p-2.5 rounded-full bg-emerald-50 border border-emerald-100">
                <Send size={15} color="#059669" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Rincian Pekerjaan */}
          <View className={`rounded-2xl p-4 border shadow-xs flex-col gap-1 ${isCancelled ? "bg-amber-50/70 border-amber-200" : "bg-white border-gray-100"}`}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rincian Pekerjaan</Text>
              <View className="flex-row items-center gap-1">
                <Clock size={10} color="#9CA3AF" />
                <Text className="text-[10px] font-bold text-gray-500">{fmtDate(job.created_at)}</Text>
              </View>
            </View>
            <Text className="text-base font-black mt-1 text-gray-900">{job.judul}</Text>
            {isCancelled ? (
              <View className="mt-2 bg-white rounded-xl border border-amber-200 px-3 py-2.5 flex-col gap-1">
                <Text className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wide">Alasan Pembatalan</Text>
                <Text className="text-xs text-gray-700 leading-relaxed">
                  {(job as any).cancel_reason || "Pesanan dibatalkan — menunggu konfirmasi / kedaluwarsa."}
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-gray-500 leading-relaxed mt-0.5">
                {job.deskripsi?.replace(/\[EXPIRES_AT\][\s\S]*$/, "").replace(/Metode Pembayaran:\s*COD/gi, "").replace(/Donasi:[^\n]*/gi, "").replace(/\n{2,}/g, "\n").trim() || "Pesanan langsung dari profil mitra."}
              </Text>
            )}
          </View>

          {/* 4. Rincian Pembayaran (COD / Escrow) */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex-col gap-2.5">
            <View className="flex-row items-center justify-between pb-2 border-b border-gray-100">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isCOD ? "Rincian Pembayaran (COD)" : "Rincian Pembayaran Online"}
              </Text>
              <View className={`px-2 py-0.5 rounded-full border ${isCOD ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <Text className={`text-[10px] font-black ${isCOD ? "text-amber-800" : "text-emerald-700"}`}>
                  {isCOD ? "Bayar di Tempat (COD)" : "Pembayaran Online"}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center text-xs">
              <Text className="text-xs text-gray-600">Nilai Kesepakatan (Total)</Text>
              <Text className="text-sm font-black text-gray-900">{formatRupiah(priceNum)}</Text>
            </View>

            {!isCOD && (
              <View className="flex-row justify-between items-center text-xs">
                <Text className="text-xs text-gray-500">Potongan Layanan Platform ({feeLabelPct}%)</Text>
                <Text className="text-xs font-bold text-red-500">- {formatRupiah(platformFee)}</Text>
              </View>
            )}

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <View className="flex-row items-center gap-1">
                <Wallet size={15} color="#059669" />
                <Text className="text-xs font-black text-gray-900">
                  {isCOD ? "Diterima Mitra (Tunai)" : isDone ? "Penghasilan Bersih Mitra" : "Estimasi Mitra Terima"}
                </Text>
              </View>
              <Text className="text-base font-black text-emerald-700">{formatRupiah(isCOD ? priceNum : netEarnings)}</Text>
            </View>

            {isDelivered && d.countdown && !isCOD && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row items-center gap-2.5">
                <Timer size={18} color="#d97706" />
                <View className="flex-1">
                  <Text className="text-[11px] font-black text-amber-900">{d.countdown}</Text>
                  <Text className="text-[10px] text-amber-700 mt-0.5">Jika Klien tidak merespons dalam 72 jam, dana otomatis cair ke Saldo Mitra.</Text>
                </View>
              </View>
            )}

            <View className={`rounded-xl p-3 border ${isPendingApproval && isCOD ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-100"}`}>
              <Text className={`text-[11px] leading-relaxed ${isPendingApproval && isCOD ? "text-amber-900" : "text-emerald-800"}`}>
                {isDone
                  ? "✅ Dana bersih telah ditransfer otomatis ke Saldo Dompet Anda dan siap ditarik."
                  : isPendingApproval && isCOD
                  ? '⏳ Klien memilih Bayar di Tempat (COD). Terima pesanan untuk mulai pengerjaan — pembayaran tunai diselesaikan setelah Klien klik "Terima Pesanan".'
                  : isCOD
                  ? '💵 Pembayaran dilakukan secara tunai oleh Klien setelah hasil kerja selesai dan Klien mengklik "Terima Pesanan".'
                  : `🔒 Pembayaran berhasil. Begitu Klien menerima hasil kerja, dana bersih ${formatRupiah(netEarnings)} langsung masuk ke Saldo Dompet Anda.`}
              </Text>
            </View>
          </View>

          {/* 5. Lampiran Hasil Kerja */}
          {(job.work_file_url || job.work_link_url || job.work_note) && (
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex-col gap-2.5">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hasil Kerja & Catatan</Text>
              {job.work_note && (
                <View className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Text className="text-xs text-gray-700 italic">"{job.work_note}"</Text>
                </View>
              )}
              {job.work_file_url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(job.work_file_url!)}
                  activeOpacity={0.88}
                  className="w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                  style={{ height: 200 }}
                >
                  <Image source={{ uri: job.work_file_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <View className="absolute bottom-2 right-2 bg-black/60 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                    <FileText size={10} color="#fff" />
                    <Text className="text-[10px] font-bold text-white">Ketuk untuk Buka Foto</Text>
                  </View>
                </TouchableOpacity>
              )}
              {job.work_link_url && (
                <TouchableOpacity onPress={() => Linking.openURL(job.work_link_url!)} className="flex-row items-center gap-1.5 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                  <Link2 size={14} color="#2563eb" />
                  <Text className="text-xs font-bold text-blue-600 flex-1" numberOfLines={1}>{job.work_link_url}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-gray-100 p-3 shadow-lg">
        <View className="max-w-[440px] w-full self-center flex-row gap-2">
          {isPendingApproval && (
            <>
              <TouchableOpacity
                onPress={() => d.setShowRejectModal(true)}
                disabled={d.acting}
                className="flex-1 py-3.5 rounded-full border border-red-200 bg-white items-center justify-center"
              >
                <Text className="text-xs font-black text-red-600">Tolak Pesanan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={d.handleAcceptOrder}
                disabled={d.acting}
                className="flex-1 py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md"
              >
                {d.acting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-xs font-black text-white">Terima Pesanan</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {isWorking && (
            <View className="w-full flex-col gap-2.5">
              {/* CTA utama — hijau, full-width */}
              <TouchableOpacity
                onPress={() => d.setShowDeliveryModal(true)}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 items-center justify-center shadow-md flex-row gap-2"
                style={{ shadowColor: "#059669", shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }}
              >
                <FileText size={15} color="#ffffff" />
                <Text className="text-[11px] font-black text-white tracking-widest uppercase">Kirim Hasil Kerja</Text>
              </TouchableOpacity>

              {/* Aksi sekunder — pill ghost sejajar */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={d.handleOpenDirectChat}
                  className="flex-1 py-2 rounded-full border border-gray-200 bg-gray-50 items-center justify-center flex-row gap-1"
                >
                  <MessageSquare size={13} color="#6b7280" />
                  <Text className="text-[10px] font-bold text-gray-500">Chat Klien</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => d.setShowMutualModal(true)}
                  className="flex-1 py-2 rounded-full border border-gray-200 bg-gray-50 items-center justify-center flex-row gap-1"
                >
                  <Handshake size={13} color="#6b7280" />
                  <Text className="text-[10px] font-bold text-gray-500">Batal Sepakat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => d.setShowDisputeModal(true)}
                  className="flex-1 py-2 rounded-full border border-amber-200 bg-amber-50/60 items-center justify-center flex-row gap-1"
                >
                  <FileText size={13} color="#d97706" />
                  <Text className="text-[10px] font-bold text-amber-700">Sengketa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isPendingCancel && (
            <>
              <TouchableOpacity
                onPress={() => d.setShowRejectCancelModal(true)}
                disabled={d.cancelResponding}
                className="flex-1 py-3.5 rounded-full border border-red-300 bg-red-50 items-center justify-center"
              >
                <Text className="text-xs font-bold text-red-700">Tolak (&gt;80%)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  d.askConfirm({
                    title: "Setujui Pembatalan?",
                    message: "Saldo akan dikembalikan secara penuh ke Klien dan pesanan akan ditutup.",
                    confirmText: "Ya, Setujui",
                    destructive: true,
                    onConfirm: () => {
                      d.setConfirmConfig(null);
                      d.handleMitraApproveCancel();
                    },
                  })
                }
                disabled={d.cancelResponding}
                className="flex-1 py-3.5 rounded-full bg-red-600 items-center justify-center shadow-md"
              >
                {d.cancelResponding ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-xs font-black text-white">Setujui Batal</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {isDelivered && (
            <>
              <TouchableOpacity
                onPress={() => d.setShowDeliveryModal(true)}
                className="flex-1 py-3.5 rounded-full border border-emerald-300 bg-emerald-50 items-center justify-center"
              >
                <Text className="text-xs font-black text-emerald-800">Perbarui Hasil Kerja</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={d.handleOpenDirectChat} className="flex-1 py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md">
                <Text className="text-xs font-black text-white">Buka Chat</Text>
              </TouchableOpacity>
            </>
          )}

          {isDone && (
            <TouchableOpacity onPress={() => router.push("/p/dompet" as any)} className="w-full py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md flex-row gap-2">
              <Wallet size={16} color="#ffffff" />
              <Text className="text-xs font-black text-white">Lihat Penghasilan di Dompet Saya</Text>
            </TouchableOpacity>
          )}

          {isCancelled && (
            <View className="w-full py-3 items-center justify-center bg-gray-100 rounded-2xl">
              <Text className="text-xs font-bold text-gray-500">Pesanan ini telah dibatalkan</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modals */}
      <DeliveryModal
        show={d.showDeliveryModal}
        onClose={() => d.setShowDeliveryModal(false)}
        imageUri={d.deliveryImageUri}
        onPickImage={d.handlePickImage}
        onRemoveImage={() => d.setDeliveryImageUri(null)}
        link={d.deliveryLink}
        onChangeLink={d.setDeliveryLink}
        note={d.deliveryNote}
        onChangeNote={d.setDeliveryNote}
        sending={d.sendingDelivery}
        onSendDelivery={d.handleSendDelivery}
      />

      <RejectModal
        show={d.showRejectModal}
        onClose={() => d.setShowRejectModal(false)}
        rejectReason={d.rejectReason}
        onChangeRejectReason={d.setRejectReason}
        acting={d.acting}
        onReject={d.handleRejectOrder}
      />

      <MutualCancelModal
        show={d.showMutualModal}
        onClose={() => d.setShowMutualModal(false)}
        isCOD={isCOD}
        mutualReason={d.mutualReason}
        onChangeMutualReason={d.setMutualReason}
        mutualActing={d.mutualActing}
        onMutualCancel={d.handleMutualCancel}
      />

      <RejectCancelModal
        show={d.showRejectCancelModal}
        onClose={() => d.setShowRejectCancelModal(false)}
        rejectCancelReason={d.rejectCancelReason}
        onChangeRejectCancelReason={d.setRejectCancelReason}
        cancelResponding={d.cancelResponding}
        onRejectCancel={d.handleMitraRejectCancel}
        onOpenHelp={() => {
          d.setShowRejectCancelModal(false);
          router.push("/p/bantuan" as any);
        }}
      />

      <DisputeModal
        show={d.showDisputeModal}
        onClose={() => d.setShowDisputeModal(false)}
        disputeReason={d.disputeReason}
        onChangeDisputeReason={d.setDisputeReason}
        disputeActing={d.disputeActing}
        onSubmitDispute={d.handleSubmitDispute}
      />

      <NiceAlertModal
        alert={d.alertInfo}
        onCloseAlert={() => d.setAlertInfo((p) => ({ ...p, show: false }))}
      />

      <ConfirmModal
        show={!!d.confirmConfig}
        onClose={() => d.setConfirmConfig(null)}
        config={d.confirmConfig as any}
      />
    </SafeAreaView>
  );
}