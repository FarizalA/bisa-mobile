import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Animated, useWindowDimensions } from "react-native";
import {
  Clock,
  MapPin,
  Banknote,
  Lock,
  MessageSquare,
  ChevronRight,
  RotateCcw,
  Star,
  CheckCircle2,
  XCircle,
  Pencil,
  Target,
  Handshake,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { formatRupiah, calculatePaymentBreakdown } from "../../lib/payment";
import { formatNoInvoice } from "../../lib/invoice";

interface JobItem {
  id: number;
  judul: string;
  deskripsi?: string;
  kategori?: string;
  lokasi?: string;
  budget?: string;
  agreed_price?: number;
  payment_status?: string;
  status: string;
  is_rated?: boolean;
  mitra_id?: string;
  mitra?: {
    id?: string;
    name?: string;
    phone?: string;
    face_url?: string;
  };
}

interface AktivitasJobCardProps {
  job: JobItem;
  countdown: { expired: boolean; text: string } | null;
  payingJobId: number | null;
  releasingJobId: number | null;
  onPayNow: (job: JobItem) => void;
  onOpenChat: (job: JobItem) => void;
  onReleaseFunds: (job: JobItem) => void;
  onCancelJob: (jobId: number) => void;
  onMutualCancel: (job: JobItem) => void;
  onEditJob: (jobId: number) => void;
  onPerpanjangWaktu: (job: JobItem) => void;
  onOpenRating: (job: JobItem) => void;
  onViewCandidates: (jobId: number) => void;
  onOpenInvoice: (job: JobItem) => void;
  onOpenMitraProfile: (mitraId: string) => void;
}

function PingDot() {
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(0.7));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 2.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center", marginRight: 2 }}>
      <Animated.View style={{ position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563eb", transform: [{ scale }], opacity }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563eb" }} />
    </View>
  );
}

export default function AktivitasJobCard({
  job,
  countdown,
  payingJobId,
  releasingJobId,
  onPayNow,
  onOpenChat,
  onReleaseFunds,
  onCancelJob,
  onMutualCancel,
  onEditJob,
  onPerpanjangWaktu,
  onOpenRating,
  onViewCandidates,
  onOpenInvoice,
  onOpenMitraProfile,
}: AktivitasJobCardProps) {
  useWindowDimensions();

  const isPaidEscrow = Boolean(job.agreed_price && job.payment_status === "escrow_held");
  const rawAgreed = job.agreed_price || parseInt(String(job.budget || "").replace(/\D/g, "") || "0", 10);
  const agreedPrice = isNaN(rawAgreed) ? 0 : rawAgreed;
  const breakdown = agreedPrice > 0 ? calculatePaymentBreakdown(agreedPrice) : null;

  const cleanDeskripsi = (job.deskripsi || "").replace(/\[EXPIRES_AT\]:\s*\d+/g, "").split("[INFO")[0].trim();
  const anyJob = job as any;
  const [renderNow] = useState(() => Date.now());
  const elapsedWorkingMs = anyJob.created_at ? renderNow - new Date(anyJob.created_at).getTime() : 0;
  const isWorkingOver24h = isPaidEscrow && (job.status === "sedang_dikerjakan" || job.status === "mitra_ditemukan") && elapsedWorkingMs > 24 * 3600 * 1000 && !anyJob.work_file_url && !anyJob.work_link_url;
  const invNumber = (job as any).invoice_number || formatNoInvoice(job.id, (job as any).created_at);

  return (
    <View
      className="bg-white border border-gray-100 rounded-[24px] px-4 py-4 flex-col gap-3.5"
      style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}
    >
      {/* 1. Header: kategori + status */}
      <View className="flex-row items-center justify-between gap-2 pb-3 border-b border-gray-50">
        <View className="px-3 h-6 rounded-full bg-gray-900 items-center justify-center shrink-0 max-w-[52%]">
          <Text className="text-[10px] font-black text-white tracking-wider uppercase leading-none" numberOfLines={1} ellipsizeMode="tail">
            {job.kategori || "Layanan Umum"}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 shrink-0">
          {(() => {
            if (!countdown || countdown.expired) return null;
            if (!["mencari_mitra", "menunggu_pembayaran", "menunggu_konfirmasi_selesai"].includes(job.status)) return null;
            const isPayWait = job.status === "menunggu_pembayaran";
            const isAutoCair = job.status === "menunggu_konfirmasi_selesai";
            return (
              <View className={`${isPayWait ? "bg-amber-50 border-amber-200" : isAutoCair ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"} border px-2 py-1 rounded-full flex-row items-center gap-1`}>
                <Clock size={11} color={isAutoCair ? "#047857" : isPayWait ? "#b45309" : "#dc2626"} />
                <Text className={`text-[10px] font-bold tabular-nums ${isPayWait ? "text-amber-800" : isAutoCair ? "text-emerald-800" : "text-red-600"}`}>{countdown.text}</Text>
              </View>
            );
          })()}
          {job.status === "menunggu_verifikasi" ? (
            <View className="bg-orange-100 px-2.5 py-1 rounded-full border border-orange-200"><Text className="text-[10px] font-bold text-orange-700">Meninjau</Text></View>
          ) : job.status === "menunggu_pembayaran" ? (
            <View className="bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200"><Text className="text-[10px] font-bold text-amber-700">Menunggu Bayar</Text></View>
          ) : job.status === "mencari_mitra" ? (
            <View className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex-row items-center gap-1"><PingDot /><Text className="text-[10px] font-bold text-blue-600">Mencari Mitra</Text></View>
          ) : job.status === "ditolak" ? (
            <View className="bg-red-100 px-2.5 py-1 rounded-full border border-red-200"><Text className="text-[10px] font-bold text-red-700">Ditolak Admin</Text></View>
          ) : job.status === "selesai" ? (
            <View className="bg-emerald-100 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-emerald-200"><CheckCircle2 size={11} color="#047857" /><Text className="text-[10px] font-bold text-emerald-800">Selesai & Lunas</Text></View>
          ) : job.status === "dibatalkan" ? (
            <View className="bg-red-100 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-red-100"><XCircle size={11} color="#b91c1c" /><Text className="text-[10px] font-bold text-red-700">Dibatalkan</Text></View>
          ) : job.status === "menunggu_persetujuan_batal" ? (
            <View className="bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 flex-row items-center gap-1"><Clock size={11} color="#b45309" /><Text className="text-[10px] font-bold text-amber-800">Menunggu Respon Mitra</Text></View>
          ) : (
            <View className="bg-emerald-50 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-emerald-100"><CheckCircle2 size={11} color="#059669" /><Text className="text-[10px] font-bold text-emerald-700">Sedang Dikerjakan</Text></View>
          )}
        </View>
      </View>

      {/* 2. Judul & Invoice — tap = invoice */}
      <TouchableOpacity onPress={() => onOpenInvoice(job)} activeOpacity={0.85} className="flex-col gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[17px] font-black text-gray-900 leading-tight flex-1" numberOfLines={1} ellipsizeMode="tail">{job.judul}</Text>
          {(job.status === "mencari_mitra" || job.status === "menunggu_verifikasi") && (
            <TouchableOpacity onPress={() => onViewCandidates(job.id)} activeOpacity={0.8} className="bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 flex-row items-center gap-0.5 shrink-0">
              <Text className="text-xs font-black text-orange-600">Lihat Kandidat</Text><ChevronRight size={14} color="#ea580c" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
        <Text className="text-[11px] font-black text-orange-600 tracking-wide uppercase leading-none" numberOfLines={1}>{invNumber}</Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Clock size={10} color="#9ca3af" />
          <Text className="text-[11px] font-bold text-gray-400">
            {(job as any).created_at ? new Date((job as any).created_at).toLocaleString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : "—"}
          </Text>
        </View>
        {cleanDeskripsi ? <Text className="text-xs text-gray-500 leading-relaxed mt-1" numberOfLines={2} ellipsizeMode="tail">{cleanDeskripsi}</Text> : null}
      </TouchableOpacity>

      {/* 3. Budget & Lokasi — dua kartu sejajar, anti-overflow */}
      <View className="flex-row gap-2">
        <View className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 flex-row items-center gap-2.5 min-w-0">
          <View className="w-8 h-8 rounded-full bg-white border border-orange-100 items-center justify-center shadow-sm shrink-0"><Banknote size={14} color="#ea580c" /></View>
          <View className="flex-1 min-w-0">
            <Text className="text-[8px] font-black text-gray-400 tracking-widest uppercase leading-none mb-1">Estimasi Biaya</Text>
            <Text className="text-[12px] font-black text-gray-900 leading-none" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{agreedPrice > 0 ? formatRupiah(agreedPrice) : (job.budget || "Nego")}</Text>
          </View>
        </View>
        <View className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 flex-row items-center gap-2.5 min-w-0">
          <View className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center shrink-0"><MapPin size={14} color="#6b7280" /></View>
          <View className="flex-1 min-w-0">
            <Text className="text-[8px] font-black text-gray-400 tracking-widest uppercase leading-none mb-1">Lokasi</Text>
            <Text className="text-xs font-bold text-gray-700 leading-none" numberOfLines={1} ellipsizeMode="tail">{job.lokasi || "Lokasi Klien"}</Text>
          </View>
        </View>
      </View>

      {/* 4. Pembayaran Online badge — rapih, Aman di kanan tidak ketiban */}
      {isPaidEscrow && (
        <View className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-3 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
            <View className="w-9 h-9 rounded-full bg-white border border-emerald-200 items-center justify-center shadow-sm shrink-0"><Lock size={16} color="#059669" /></View>
            <View className="flex-1 min-w-0">
              <Text className="text-[9px] font-black text-emerald-700 tracking-widest uppercase leading-none mb-1">Pembayaran Online • Aman</Text>
              <Text className="text-xs font-black text-emerald-900 leading-none" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Dana {formatRupiah(breakdown?.totalBuyerPays || agreedPrice)} Ditahan</Text>
            </View>
          </View>
          <View className="bg-emerald-600 px-3 py-1 rounded-full flex-row items-center gap-1 shrink-0"><CheckCircle2 size={10} color="#fff" /><Text className="text-[10px] font-black text-white leading-none">Aman</Text></View>
        </View>
      )}

      {/* 5. Mitra card */}
      {job.mitra && job.status !== "mencari_mitra" && job.status !== "menunggu_verifikasi" && job.status !== "dibatalkan" && (
        <View className="bg-white border border-gray-100 rounded-2xl px-3 py-3 flex-row items-center justify-between gap-2">
          <TouchableOpacity onPress={() => job.mitra_id && onOpenMitraProfile(job.mitra_id)} activeOpacity={0.85} className="flex-row items-center gap-3 flex-1 min-w-0">
            <View className="relative shrink-0">
              <Image source={job.mitra.face_url ? { uri: job.mitra.face_url } : require("../../../assets/mascot.png")} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#ffedd5" }} className="bg-orange-50" />
              <View style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#10b981", borderWidth: 2, borderColor: "#fff" }} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[13px] font-black text-gray-900 leading-tight" numberOfLines={1} ellipsizeMode="tail">{job.mitra.name || "Mitra BISA"}</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <Text className="text-[11px] font-bold text-emerald-700 flex-1" numberOfLines={1}>{job.status === "menunggu_konfirmasi_selesai" ? "Sudah Kirim Hasil" : "Mitra Terpilih • Siap Kerja"}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onOpenChat(job)} activeOpacity={0.85} className="px-4 py-2 rounded-full bg-white border border-orange-200 flex-row items-center gap-1.5 shadow-sm shrink-0">
            <MessageSquare size={14} color="#ea580c" /><Text className="text-xs font-black text-orange-600">Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Tombol aksi — vertikal full-width biar rapih di layar sempit */}
      {(job.status === "mencari_mitra" || job.status === "menunggu_verifikasi") && (
        <View className="flex-col gap-2 pt-0.5">
          <TouchableOpacity onPress={() => onViewCandidates(job.id)} activeOpacity={0.88} className="w-full py-3 rounded-xl bg-orange-50 border border-orange-200 items-center justify-center flex-row gap-2">
            <Target size={18} color="#ea580c" strokeWidth={2.5} /><Text className="text-[13px] font-black text-orange-600">Pilih & Pantau Kandidat Mitra</Text>
          </TouchableOpacity>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => onEditJob(job.id)} activeOpacity={0.85} className="flex-1 py-2.5 rounded-xl bg-gray-100 border border-gray-200 items-center justify-center flex-row gap-1.5"><Pencil size={14} color="#374151" /><Text className="text-xs font-bold text-gray-700">Edit</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onCancelJob(job.id)} activeOpacity={0.85} className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 items-center justify-center flex-row gap-1.5"><XCircle size={15} color="#dc2626" /><Text className="text-xs font-bold text-red-600">Batalkan</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {job.status === "menunggu_pembayaran" && (
        <View className="flex-col gap-2">
          <TouchableOpacity onPress={() => onPayNow(job)} disabled={payingJobId === job.id} activeOpacity={0.88} className="w-full py-3.5 rounded-xl bg-[#ff6b00] items-center justify-center flex-row gap-1.5 shadow-sm">
            <Banknote size={16} color="#fff" /><Text className="text-xs font-black text-white" numberOfLines={1}>{payingJobId === job.id ? "Menyiapkan..." : `Bayar Sekarang (${formatRupiah(agreedPrice)})`}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onCancelJob(job.id)} activeOpacity={0.85} className="w-full py-2.5 rounded-xl bg-gray-50 border border-gray-200 items-center justify-center flex-row gap-1.5"><XCircle size={15} color="#6b7280" /><Text className="text-xs font-bold text-gray-600">Batalkan Pesanan</Text></TouchableOpacity>
        </View>
      )}

      {job.status === "menunggu_persetujuan_batal" && (
        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex-col gap-2">
          <View className="flex-row items-center gap-2">
            <Clock size={15} color="#b45309" />
            <Text className="text-xs font-black text-amber-900">Pengajuan Pembatalan Dikirim</Text>
          </View>
          <Text className="text-[11px] text-amber-800 leading-relaxed">
            Menunggu respon Mitra (maksimal 24 jam). Jika Mitra tidak merespon dalam 24 jam, dana akan otomatis dikembalikan ke saldo dompet Anda.
          </Text>
          <TouchableOpacity
            onPress={() => onOpenChat(job)}
            activeOpacity={0.88}
            className="w-full py-2.5 rounded-xl bg-white border border-amber-300 items-center justify-center flex-row gap-1.5 mt-1"
          >
            <MessageSquare size={13} color="#b45309" />
            <Text className="text-xs font-bold text-amber-900">Hubungi Mitra di Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {(job.status === "sedang_dikerjakan" || job.status === "menunggu_konfirmasi_selesai" || isPaidEscrow) && job.status !== "selesai" && job.status !== "menunggu_persetujuan_batal" && (
        <View className="flex-col gap-2">
          <TouchableOpacity
            onPress={() => (isWorkingOver24h ? onCancelJob(job.id) : onMutualCancel(job))}
            activeOpacity={0.88}
            className="w-full py-2.5 rounded-xl bg-red-50 border border-red-200 items-center justify-center flex-row gap-1.5"
          >
            {isWorkingOver24h ? <XCircle size={15} color="#b91c1c" /> : <Handshake size={15} color="#b91c1c" />}
            <Text className="text-xs font-black text-red-700">{isWorkingOver24h ? "Batalkan & Refund" : "Batal Sepakat"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReleaseFunds(job)}
            disabled={releasingJobId === job.id}
            activeOpacity={0.88}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 items-center justify-center flex-row gap-2"
            style={{ shadowColor: "#059669", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}
          >
            <CheckCircle2 size={16} color="#fff" />
            <Text className="text-xs font-black text-white text-center" numberOfLines={2} style={{ lineHeight: 16 }}>
              {releasingJobId === job.id ? "Memproses..." : isPaidEscrow ? `Konfirmasi Selesai & Rilis Dana (${formatRupiah(agreedPrice)})` : "Tandai Pekerjaan Selesai"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {job.status === "selesai" && (
        <TouchableOpacity onPress={() => onOpenRating(job)} activeOpacity={0.88} className="w-full py-3 rounded-xl bg-amber-500 items-center justify-center flex-row gap-1.5">
          <Star size={15} color="#fff" fill="#fff" /><Text className="text-xs font-black text-white">{job.is_rated ? "Ulasan Tersimpan (Lihat/Edit)" : "Beri Ulasan untuk Mitra"}</Text>
        </TouchableOpacity>
      )}

      {job.status === "dibatalkan" && (
        <TouchableOpacity onPress={() => onPerpanjangWaktu(job)} activeOpacity={0.88} className="w-full py-2.5 rounded-xl bg-gray-100 border border-gray-200 items-center justify-center flex-row gap-1.5">
          <RotateCcw size={14} color="#374151" /><Text className="text-xs font-bold text-gray-700">Posting Ulang / Perpanjang 24 Jam</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
