import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MessageSquare, ChevronRight, Handshake, CheckCircle2, XCircle, Clock, Wallet, Star, Timer } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { formatRupiah } from "../../lib/payment";

function getOfferExpiryMs(job: ProviderJob): number | null {
  const anyJob = job as any;
  if (anyJob.expires_at) {
    const t = new Date(anyJob.expires_at).getTime();
    if (!isNaN(t)) return t;
  }
  const m = job.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  if (job.status === "menunggu_konfirmasi_mitra") return new Date(job.created_at).getTime() + 3 * 3600 * 1000;
  return null;
}

function OfferCountdown({ job }: { job: ProviderJob }) {
  const expiry = getOfferExpiryMs(job);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiry) return;
    const left = expiry - Date.now();
    if (left <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiry]);
  if (!expiry || job.status !== "menunggu_konfirmasi_mitra") return null;
  const left = expiry - now;
  if (left <= 0) {
    return (
      <View className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 flex-row items-center gap-1">
        <Timer size={11} color="#991b1b" />
        <Text className="text-[10px] font-black text-red-700">Kedaluarsa — gagal otomatis</Text>
      </View>
    );
  }
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const urgent = left < 30 * 60 * 1000;
  return (
    <View className={`px-2.5 py-1 rounded-full border flex-row items-center gap-1 ${urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <Timer size={11} color={urgent ? "#991b1b" : "#92400e"} />
      <Text className={`text-[10px] font-black tabular-nums ${urgent ? "text-red-700" : "text-amber-800"}`}>{hh}:{mm}:{ss}</Text>
    </View>
  );
}

export interface ProviderJob {
  id: string | number;
  judul: string;
  deskripsi?: string;
  status: string;
  budget: string;
  created_at: string;
  pelanggan_id?: number | string;
  mitra_id?: number | string;
  agreed_price?: number | null;
  payment_status?: string | null;
  is_rated?: boolean;
  expires_at?: string | null;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "menunggu_konfirmasi_mitra":
      return { color: "#b45309", bg: "#fef3c7", border: "#fde68a", text: "Ditawarkan ke Anda", icon: Handshake, progress: 25 };
    case "menunggu_pembayaran":
      return { color: "#92400e", bg: "#fef3c7", border: "#fde68a", text: "Menunggu Bayar Klien", icon: Clock, progress: 35 };
    case "mitra_ditemukan":
      return { color: "#065f46", bg: "#d1fae5", border: "#a7f3d0", text: "Mitra Ditemukan", icon: Handshake, progress: 45 };
    case "sedang_dikerjakan":
    case "dikerjakan":
      return { color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe", text: "Sedang Dikerjakan", icon: Clock, progress: 65 };
    case "menunggu_konfirmasi_selesai":
      return { color: "#b45309", bg: "#fef3c7", border: "#fde68a", text: "Menunggu Konfirmasi Klien", icon: Clock, progress: 85 };
    case "selesai":
      return { color: "#065f46", bg: "#d1fae5", border: "#a7f3d0", text: "Selesai & Lunas", icon: CheckCircle2, progress: 100 };
    case "dibatalkan":
    case "ditolak":
    case "expired":
      return { color: "#991b1b", bg: "#fee2e2", border: "#fecaca", text: "Dibatalkan", icon: XCircle, progress: 0 };
    // Lamaran cases - Menunggu kuning, Ditolak merah
    case "lamaran_menunggu":
      return { color: "#92400e", bg: "#FEF3C7", border: "#FDE68A", text: "Menunggu", icon: Clock, progress: 20 };
    case "lamaran_ditolak":
      return { color: "#991b1b", bg: "#FEE2E2", border: "#FECACA", text: "Ditolak", icon: XCircle, progress: 0 };
    case "lamaran_diterima":
      return { color: "#065f46", bg: "#D1FAE5", border: "#A7F3D0", text: "Diterima", icon: CheckCircle2, progress: 40 };
    default:
      return { color: "#4b5563", bg: "#f3f4f6", border: "#e5e7eb", text: status, icon: Clock, progress: 20 };
  }
}

function parseBudget(budget?: string) {
  if (!budget) return 0;
  const num = budget.replace(/[^\d]/g, "");
  return num ? parseInt(num, 10) : 0;
}

interface Props {
  jobs: ProviderJob[];
  filteredJobs: ProviderJob[];
  loading: boolean;
  error: string;
  activeTab: string;
  onOpenChat: (job: ProviderJob) => void;
  onOpenDetail: (job: ProviderJob) => void;
  onAccept: (job: ProviderJob) => void;
  onReject: (job: ProviderJob) => void;
  onStartWork: (job: ProviderJob) => void;
  onDeliver: (job: ProviderJob) => void;
  actingId: string | number | null;
}

import { AktivitasSkeleton } from "../SkeletonLoader";

export default function ProviderAktivitasJobList({ jobs, filteredJobs, loading, error, activeTab, onOpenChat, onOpenDetail, onAccept, onReject, onStartWork, onDeliver, actingId }: Props) {
  const router = useRouter();

  if (loading) {
    return <AktivitasSkeleton />;
  }

  if (error) {
    return (
      <View className="bg-red-50 border border-red-100 mx-0 mt-3 p-4 rounded-2xl items-center">
        <Text className="text-xs font-bold text-red-600 text-center">{error}</Text>
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View className="bg-white rounded-[24px] border border-gray-100 mt-4 p-6 items-center">
        <Text style={{ fontSize: 48 }}>📦</Text>
        <Text className="font-black text-gray-900 text-base mt-2">Belum Ada Aktivitas</Text>
        <Text className="text-xs text-gray-500 font-medium mt-1 text-center leading-relaxed">Anda belum mengambil pekerjaan apapun.{"\n"}Yuk, cari peluang di sekitar Anda!</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/p/cari-kerja" as any);
          }}
          activeOpacity={0.9}
          className="mt-4 h-11 px-6 bg-emerald-600 rounded-full items-center justify-center shadow-sm"
        >
          <Text className="text-white text-xs font-black">Cari Pekerjaan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (filteredJobs.length === 0) {
    const label = activeTab === "lamaran" ? "Lamaran" : activeTab === "ditawarkan" ? "Ditawarkan" : activeTab === "berjalan" ? "Berjalan" : activeTab === "selesai" ? "Selesai" : "Dibatalkan";
    return (
      <View className="bg-white rounded-[24px] border border-gray-100 p-6 items-center mt-3">
        <Text style={{ fontSize: 36, opacity: 0.5 }}>{activeTab === "berjalan" ? "⚙️" : activeTab === "selesai" ? "✅" : "❌"}</Text>
        <Text className="font-bold text-gray-900 text-base mt-2">Tidak Ada Data</Text>
        <Text className="text-xs text-gray-500 mt-1">Belum ada pesanan {label}.</Text>
      </View>
    );
  }

  return (
    <View className="flex-col gap-3">
      {filteredJobs.map((job) => {
        const cfg: any = getStatusConfig(job.status);
        const Icon = cfg.icon;
        const priceNum = (job as any).agreed_price ?? parseBudget(job.budget);
        const isEscrow = Boolean((job as any).agreed_price && (job as any).payment_status === "escrow_held");
        const isOffered = job.status === "menunggu_konfirmasi_mitra";
        const isWaitingPayment = job.status === "menunggu_pembayaran";
        const isWorking = ["mitra_ditemukan", "sedang_dikerjakan", "dikerjakan"].includes(job.status);
        const isDelivered = job.status === "menunggu_konfirmasi_selesai";
        const isDone = job.status === "selesai";

        return (
          <TouchableOpacity
            key={String(job.id)}
            onPress={() => onOpenDetail(job)}
            activeOpacity={0.96}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs relative overflow-hidden"
          >
            <View className="flex-row items-start gap-3">
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border, alignItems: "center", justifyContent: "center" } as any}>
                <Icon size={20} color={cfg.color} />
              </View>
              <View className="flex-1 min-w-0 pt-0.5">
                <View className="flex-row items-center justify-between gap-2 mb-1">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <View style={{ backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 } as any}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: cfg.color } as any}>{cfg.text}</Text>
                    </View>
                    {isOffered && <OfferCountdown job={job} />}
                  </View>
                  <Text className="text-[11px] font-bold text-gray-400">{new Date(job.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
                <Text className="font-bold text-gray-900 text-[15px] leading-snug" numberOfLines={2}>
                  {job.judul}
                </Text>

                <View className="mt-3 pt-3 border-t border-gray-50 gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[11px] font-bold text-gray-400">Nilai</Text>
                    <Text className="text-sm font-black text-emerald-600 flex-1" numberOfLines={1}>{priceNum > 0 ? formatRupiah(priceNum) : String(job.budget || "").split("(")[0].trim() || "—"}</Text>
                  </View>
                  <View className="flex-row items-center justify-end gap-1.5 flex-wrap">
                    {isDone && (
                      <TouchableOpacity
                        onPress={(e: any) => { e.stopPropagation(); router.push(`/p/ulasan/${job.id}` as any); }}
                        className="h-7 px-2.5 rounded-full bg-amber-50 border border-amber-200 flex-row items-center gap-1 shrink-0"
                      >
                        <Star size={12} color="#b45309" fill={job.is_rated ? "#f59e0b" : "transparent"} />
                        <Text className="text-[10px] font-black text-amber-800">{job.is_rated ? "Ulasan" : "Nilai Klien"}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={(e: any) => { e.stopPropagation(); onOpenChat(job); }} className="h-7 px-2.5 rounded-full bg-emerald-50 border border-emerald-100 flex-row items-center gap-1 shrink-0">
                      <MessageSquare size={12} color="#059669" />
                      <Text className="text-[10px] font-black text-emerald-700">Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onOpenDetail(job)} activeOpacity={0.7} className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center shrink-0 border border-gray-100">
                      <ChevronRight size={14} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress */}
                <View style={{ marginTop: 10, height: 5, backgroundColor: "#f3f4f6", borderRadius: 999, overflow: "hidden" } as any}>
                  <View style={{ width: `${cfg.progress}%`, height: "100%", backgroundColor: cfg.color || "#10b981", borderRadius: 999 } as any} />
                </View>

                {/* Inline actions for lamaran */}
                {(job as any).is_lamaran && (
                  <View className="flex-row gap-2 mt-3">
                    {job.status === "lamaran_ditolak" ? (
                      <TouchableOpacity
                        onPress={(e: any) => {
                          e.stopPropagation();
                          router.push("/p/cari-kerja" as any);
                        }}
                        className="flex-1 py-2.5 rounded-full bg-emerald-600 items-center justify-center"
                      >
                        <Text className="text-xs font-black text-white">Cari Pekerjaan Lain</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={(e: any) => {
                          e.stopPropagation();
                          router.push(`/p/cari-kerja?jobId=${job.id}` as any);
                        }}
                        className="flex-1 py-2.5 rounded-full border border-emerald-300 bg-emerald-50 items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-emerald-800">Lihat Detail Lamaran</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Inline actions for offered/working states (stopPropagation handled via outer press guard: parent still navigates, so we keep buttons above with e.stopPropagation) */}
                {isOffered && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity disabled={actingId === job.id} onPress={(e: any) => { e.stopPropagation(); onReject(job); }} className="flex-1 py-2.5 rounded-full border border-red-200 bg-white items-center justify-center">
                      <Text className="text-xs font-black text-red-600">Tolak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={actingId === job.id} onPress={(e: any) => { e.stopPropagation(); onAccept(job); }} className="flex-1 py-2.5 rounded-full bg-emerald-600 items-center justify-center">
                      {actingId === job.id ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Terima</Text>}
                    </TouchableOpacity>
                  </View>
                )}
                {isWorking && !isDelivered && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity onPress={(e: any) => { e.stopPropagation(); onOpenChat(job); }} className="flex-1 py-2.5 rounded-full border border-gray-200 bg-white items-center justify-center">
                      <Text className="text-xs font-bold text-gray-700">Chat Klien</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={actingId === job.id} onPress={(e: any) => { e.stopPropagation(); onStartWork(job); }} className="flex-1 py-2.5 rounded-full bg-emerald-600 items-center justify-center">
                      <Text className="text-xs font-black text-white">{job.status === "mitra_ditemukan" ? "Mulai Kerjakan" : "Kirim Hasil"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isDelivered && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity onPress={(e: any) => { e.stopPropagation(); onDeliver(job); }} className="flex-1 py-2.5 rounded-full bg-emerald-600 items-center justify-center">
                      <Text className="text-xs font-black text-white">Buka Detail — Kirim Hasil</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isWaitingPayment && (
                  <View className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex-row items-center justify-between">
                    <Text className="text-[11px] font-bold text-amber-800 flex-1">Menunggu Klien Bayar</Text>
                    <TouchableOpacity
                      onPress={(e: any) => {
                        if (e?.stopPropagation) e.stopPropagation();
                        onReject(job);
                      }}
                      className="px-3 py-1.5 rounded-full border border-red-200 bg-white items-center justify-center active:scale-95"
                    >
                      <Text className="text-[11px] font-bold text-red-600">Batalkan Pesanan</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isEscrow && !isDone && (
                  <View className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex-row items-center gap-2">
                    <Wallet size={14} color="#059669" />
                    <Text className="text-[11px] font-bold text-emerald-800">Dana Escrow aman — auto cair setelah klien konfirmasi</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
