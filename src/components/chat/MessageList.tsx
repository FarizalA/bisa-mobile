import React from "react";
import { View, Text, TouchableOpacity, Image, Linking } from "react-native";
import { Package, FileText, CheckCircle2, MapPin, DollarSign, Star } from "lucide-react-native";
import { useRouter } from "expo-router";
import { parseOrderContent, formatBudget } from "../../lib/chatHelpers";

function TimeLabel({ time }: { time: string }) {
  return <Text className="text-[10px] text-gray-400 font-medium text-right">{time}</Text>;
}

export function SystemBubble({ content }: { content: string }) {
  return (
    <View className="items-center my-2">
      <View className="max-w-[85%] bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2">
        <Text className="text-xs font-semibold text-emerald-900 text-center leading-relaxed">
          {content}
        </Text>
      </View>
    </View>
  );
}

export function TextBubble({
  content,
  isMe,
  time,
  isMitraView,
}: {
  content: string;
  isMe: boolean;
  time: string;
  isMitraView?: boolean;
}) {
  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <View
        className={`max-w-[78%] px-4 py-3 rounded-[20px] shadow-xs ${
          isMe
            ? `${isMitraView ? "bg-emerald-600" : "bg-[#FF6B00]"} rounded-br-md`
            : "bg-white border border-gray-200 rounded-bl-md"
        }`}
      >
        <Text
          className={`text-[14px] leading-5 ${
            isMe ? "text-white font-medium" : "text-gray-900"
          }`}
        >
          {content}
        </Text>
        <Text
          className={`text-[10px] mt-1.5 text-right font-medium ${
            isMe ? (isMitraView ? "text-emerald-100" : "text-orange-100") : "text-gray-400"
          }`}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

export function ImageBubble({
  url,
  isMe,
  time,
  onPreview,
}: {
  url: string;
  isMe: boolean;
  time: string;
  onPreview?: (url: string) => void;
}) {
  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <TouchableOpacity
        onPress={() => onPreview?.(url)}
        activeOpacity={0.85}
        className="max-w-[74%] rounded-[22px] overflow-hidden bg-white border border-gray-200 p-1 shadow-xs"
      >
        <Image
          source={{ uri: url }}
          style={{ width: 220, height: 220, borderRadius: 18 }}
          resizeMode="cover"
        />
        <View className="px-2 py-1">
          <TimeLabel time={time} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function LocationBubble({
  content,
  isMe,
  time,
}: {
  content: string;
  isMe: boolean;
  time: string;
}) {
  const mapUrl = content.match(/https:\/\/[^\s]+/)?.[0];
  const openMap = () => {
    if (!mapUrl) return;
    Linking.openURL(mapUrl).catch(() => {
      Linking.openURL(mapUrl);
    });
  };
  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <View className="max-w-[78%] bg-white border border-gray-200 rounded-[24px] p-4 shadow-sm">
        <View className="flex-row items-center gap-1.5 mb-1">
          <View className="w-6 h-6 rounded-full bg-red-50 items-center justify-center">
            <MapPin size={13} color="#EF4444" />
          </View>
          <Text className="text-xs font-bold text-gray-900">Lokasi Dibagikan</Text>
        </View>
        {mapUrl ? (
          <TouchableOpacity onPress={openMap} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-xs text-blue-600 font-semibold underline mt-2">Buka di Google Maps</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-xs text-gray-500 mt-2" numberOfLines={2}>{content}</Text>
        )}
        <View className="mt-2">
          <TimeLabel time={time} />
        </View>
      </View>
    </View>
  );
}

export function OfferBubble({
  content,
  isMe,
  time,
  onAction,
}: {
  content: string;
  isMe: boolean;
  time: string;
  onAction?: (amount: string, action: "accepted" | "rejected") => void;
}) {
  const [, amount, status] = content.split(":");
  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <View className="max-w-[78%] bg-white rounded-[24px] p-4 border border-gray-200 shadow-sm">
        <View className="flex-row items-center gap-1.5 mb-1">
          <View className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center">
            <DollarSign size={13} color="#374151" />
          </View>
          <Text className="text-xs font-bold text-gray-900">Penawaran Harga</Text>
        </View>
        <Text className="text-[20px] font-extrabold text-gray-950 tracking-tight mt-2">
          Rp {parseInt(amount || "0").toLocaleString("id-ID")}
        </Text>
        <Text className="text-[10px] text-gray-400 font-medium mt-1">{time}</Text>
        {status === "pending" && !isMe && onAction ? (
          <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-100">
            <TouchableOpacity
              onPress={() => onAction(amount, "accepted")}
              className="flex-1 bg-emerald-600 py-2.5 rounded-full items-center shadow-sm"
              activeOpacity={0.85}
            >
              <Text className="text-xs font-bold text-white">Terima</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onAction(amount, "rejected")}
              className="flex-1 bg-gray-100 py-2.5 rounded-full items-center"
              activeOpacity={0.85}
            >
              <Text className="text-xs font-bold text-gray-700">Tolak</Text>
            </TouchableOpacity>
          </View>
        ) : status === "accepted" ? (
          <View className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl py-2 items-center flex-row justify-center gap-1">
            <Text className="text-xs font-bold text-emerald-700">✓ Diterima</Text>
          </View>
        ) : status === "rejected" ? (
          <View className="mt-3 bg-red-50 border border-red-100 rounded-xl py-2 items-center flex-row justify-center gap-1">
            <Text className="text-xs font-bold text-red-600">✕ Ditolak</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// 1:1 ESCROW ORDER CARD BUBBLE SEPERTI WEB
export function OrderCardBubbleRN({
  content,
  isMe,
  time,
  isMitraView,
  jobStatusMap,
  paymentMethod,
  onAction,
  onViewDetail,
}: {
  content: string;
  isMe: boolean;
  time: string;
  isMitraView: boolean;
  jobStatusMap: Record<string, string>;
  paymentMethod?: string;
  onAction?: (jobId: string, action: string) => void;
  onViewDetail?: (detail: any) => void;
}) {
  const parsed = parseOrderContent(content);
  const cleanJudul = parsed.judul?.replace(/^Pesanan:\s*/i, "") || "Layanan";
  const liveStatus = jobStatusMap[String(parsed.jobId)] || parsed.status;

  const isPendingMitra = liveStatus === "menunggu_konfirmasi_mitra";
  const isCOD = (paymentMethod || "").toUpperCase() === "COD" || isPendingMitra;
  const isWaitingPay = liveStatus === "menunggu_pembayaran";
  const isWorking = ["mitra_ditemukan", "sedang_dikerjakan", "dikerjakan"].includes(liveStatus);
  const isReview = liveStatus === "menunggu_konfirmasi_selesai";
  const isDone = liveStatus === "selesai";
  const isCancelled = liveStatus === "dibatalkan" || liveStatus === "ditolak" || liveStatus === "expired";

  let statusLabel = "Menunggu Konfirmasi";
  let badgeBg = "#FEF3C7"; // amber-100
  let badgeText = "#92400E"; // amber-800

  if (isPendingMitra) {
    statusLabel = "Menunggu Konfirmasi";
    badgeBg = "#FEF3C7";
    badgeText = "#92400E";
  } else if (isWaitingPay) {
    statusLabel = "Menunggu Pembayaran";
    badgeBg = "#FEF3C7";
    badgeText = "#92400E";
  } else if (isCancelled) {
    statusLabel = "Ditolak";
    badgeBg = "#FEE2E2"; // red-100
    badgeText = "#B91C1C"; // red-700
  } else if (isDone) {
    statusLabel = "Selesai & Disetujui";
    badgeBg = "#D1FAE5"; // emerald-100
    badgeText = "#047857"; // emerald-700
  } else if (isWorking || isReview) {
    statusLabel = "Disetujui";
    badgeBg = "#D1FAE5";
    badgeText = "#047857";
  }

  return (
    <View className="items-center my-1.5 w-full">
      <View className="w-full max-w-[330px] bg-white rounded-[24px] border border-gray-200 overflow-hidden shadow-xs">
        {/* HEADER KARTU (1:1 Web & Image 2) */}
        <View
          className={`px-4 py-3 border-b flex-row items-center justify-between ${
            isMitraView
              ? "bg-[#F0FDF4] border-emerald-100"
              : isCOD
              ? "bg-[#FFFDF5] border-amber-100"
              : "bg-[#FFFBF7] border-orange-100"
          }`}
        >
          <View className="flex-row items-center gap-1.5">
            <Package
              size={15}
              color={isMitraView ? "#047857" : isCOD ? "#D97706" : "#FF6B00"}
              strokeWidth={2.4}
            />
            <Text
              className={`text-xs font-black tracking-wide ${
                isMitraView ? "text-emerald-700" : isCOD ? "text-amber-800" : "text-[#FF6B00]"
              }`}
            >
              {isCOD ? "PESANAN COD" : "PESANAN ESCROW"}
            </Text>
          </View>
          <View
            style={{ backgroundColor: badgeBg }}
            className="px-2.5 py-1 rounded-full"
          >
            <Text
              style={{ color: badgeText }}
              className="text-[10px] font-bold"
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* BODY KARTU ESCROW */}
        <View className="p-4">
          <View className="flex-row items-start gap-3 mb-3">
            <View
              className={`w-12 h-12 rounded-2xl border items-center justify-center ${
                isMitraView
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-orange-50 border-orange-100"
              }`}
            >
              <Package
                size={22}
                color={isMitraView ? "#059669" : "#FF6B00"}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] font-bold text-gray-900 leading-snug"
                numberOfLines={2}
              >
                {cleanJudul}
              </Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">
                ID: #{String(parsed.jobId || "").slice(0, 8)}
              </Text>
              <Text
                className={`text-[16px] font-extrabold mt-1 ${
                  isMitraView ? "text-emerald-700" : "text-[#FF6B00]"
                }`}
              >
                {formatBudget(parsed.budget)}
              </Text>
            </View>
          </View>

          {/* TOMBOL AKSI BERDASARKAN STATUS & ROLE */}
          <View className="pt-3 border-t border-gray-100 gap-2">
            {/* 1. MENUNGGU KONFIRMASI MITRA */}
            {isPendingMitra && (
              <>
                {isMitraView ? (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "reject")}
                      className="flex-1 py-2.5 rounded-full border border-red-200 items-center active:scale-95"
                    >
                      <Text className="text-[11px] font-bold text-red-600">Tolak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "accept")}
                      className="flex-1 py-2.5 rounded-full bg-emerald-600 items-center active:scale-95 shadow-xs"
                    >
                      <Text className="text-[11px] font-black text-white">Setujui</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 items-center">
                    <Text className="text-[11px] font-bold text-amber-800 italic">
                      Menunggu konfirmasi penerimaan dari Mitra...
                    </Text>
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "cancel")}
                      className="mt-1.5"
                    >
                      <Text className="text-[10px] font-bold text-red-600 underline">
                        Batalkan Pesanan
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* 2. MENUNGGU PEMBAYARAN */}
            {isWaitingPay && !isPendingMitra && (
              <>
                {!isMitraView ? (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "cancel")}
                      className="px-4 py-2.5 rounded-full border border-gray-200 items-center active:scale-95"
                    >
                      <Text className="text-[11px] font-bold text-gray-600">Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "pay")}
                      className="flex-1 py-2.5 rounded-full bg-[#FF6B00] items-center active:scale-95 shadow-xs"
                    >
                      <Text className="text-[11px] font-black text-white">Bayar Sekarang</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 items-center">
                    <Text className="text-[11px] font-bold text-amber-800">
                      Menunggu Klien melakukan pembayaran...
                    </Text>
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "cancel")}
                      className="mt-1.5"
                    >
                      <Text className="text-[10px] font-bold text-red-600 underline">
                        Batalkan Pesanan Ini
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* 3. SEDANG DIKERJAKAN */}
            {isWorking && (
              <>
                {isMitraView ? (
                  <TouchableOpacity
                    onPress={() => onAction?.(parsed.jobId, "deliver")}
                    className="w-full py-3 rounded-full bg-emerald-600 items-center shadow-xs flex-row justify-center gap-1.5 active:scale-95"
                  >
                    <FileText size={15} color="#fff" />
                    <Text className="text-xs font-black text-white">Kirim Hasil Kerja</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 items-center">
                    <Text className="text-[11px] font-bold text-emerald-800 text-center">
                      🔒 Dana diamankan di Rekber BISA. Mitra sedang mengerjakan pesanan Anda.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* 4. MENUNGGU PERSETUJUAN KLIEN */}
            {isReview && (
              <>
                {!isMitraView ? (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "revision")}
                      className="flex-1 py-2.5 rounded-full border border-amber-300 bg-amber-50 items-center active:scale-95"
                    >
                      <Text className="text-[11px] font-bold text-amber-800">Minta Revisi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onAction?.(parsed.jobId, "accept_final")}
                      className="flex-1 py-2.5 rounded-full bg-emerald-600 items-center active:scale-95 shadow-xs"
                    >
                      <Text className="text-[11px] font-black text-white">Terima Pesanan</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 items-center">
                    <Text className="text-[11px] font-bold text-blue-800 text-center">
                      Hasil kerja terkirim. Menunggu persetujuan Klien.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* 5. SELESAI */}
            {isDone && (
              <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 items-center">
                <Text className="text-[11px] font-extrabold text-emerald-800">
                  ✓ Pesanan Selesai & Lunas
                </Text>
              </View>
            )}

            {/* 6. DIBATALKAN */}
            {isCancelled && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-2.5 items-center">
                <Text className="text-[11px] font-bold text-red-700">
                  Pesanan Dibatalkan / Expired
                </Text>
              </View>
            )}
          </View>

          {/* LIHAT RINGKASAN ORDER LINK */}
          <TouchableOpacity
            onPress={() =>
              onViewDetail?.({
                jobId: parsed.jobId,
                judul: cleanJudul,
                budget: parsed.budget,
                status: liveStatus,
                payment_method: isCOD ? "COD" : paymentMethod,
              })
            }
            className="pt-2 items-center"
          >
            <Text className="text-[10px] font-bold text-gray-400 underline">
              Lihat Ringkasan Order
            </Text>
          </TouchableOpacity>
        </View>

        {/* TIMESTAMP */}
        <View className="px-4 pb-3">
          <TimeLabel time={time} />
        </View>
      </View>
    </View>
  );
}

export function RevisionCardBubbleRN({
  content,
  isMe,
  time,
}: {
  content: string;
  isMe: boolean;
  time: string;
}) {
  const parts = content.slice(11).split("|");
  let rNote = parts[1] || "";
  try {
    rNote = decodeURIComponent(rNote);
  } catch {}
  const rNum = parts[2] || "1";

  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"} w-full my-1`}>
      <View className="w-[300px] max-w-[86%] bg-[#FFFBEB] rounded-[24px] border border-amber-200 p-4 shadow-xs">
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm">🕒</Text>
            <Text className="text-xs font-black text-amber-900 tracking-wide">
              PERMINTAAN REVISI (#{rNum})
            </Text>
          </View>
          <View className="bg-amber-200/80 px-2.5 py-0.5 rounded-full">
            <Text className="text-[10px] font-bold text-amber-900">Maks 3x</Text>
          </View>
        </View>
        <View className="bg-white/80 rounded-xl p-3 border border-amber-200/50">
          <Text className="text-xs text-amber-950 leading-relaxed font-medium">
            &quot;{rNote || "Mohon perbaiki hasil kerja"}&quot;
          </Text>
        </View>
        <View className="mt-2.5 items-end">
          <Text className="text-[10px] text-amber-800/60 font-medium">{time}</Text>
        </View>
      </View>
    </View>
  );
}

export function DeliveryBubbleRN({
  content,
  isMe,
  time,
  onPreview,
  onRequestRevision,
  onAccept,
  jobId,
  isMitraView,
  isFinished = false,
  jobStatus,
}: {
  content: string;
  isMe: boolean;
  time: string;
  onPreview?: (url: string) => void;
  onRequestRevision?: (jobId: string) => void;
  onAccept?: (jobId: string) => void;
  jobId?: string;
  isMitraView?: boolean;
  isFinished?: boolean;
  jobStatus?: string;
}) {
  const raw = content.startsWith("[DELIVERY]:") ? content.slice(11) : content;
  const parts = raw.split("|");
  const dJobId = parts[0] || jobId || "";
  const fileUrl = (()=>{ try{ return decodeURIComponent(parts[1] || ""); }catch{ return parts[1]||""; } })();
  const linkUrl = (()=>{ try{ return decodeURIComponent(parts[2] || ""); }catch{ return parts[2]||""; } })();
  const note = (()=>{ try{ return parts[3] ? decodeURIComponent(parts.slice(3).join("|")) : ""; }catch{ return parts.slice(3).join("|"); } })();
  const isImage = !!fileUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(fileUrl);
  const finished = isFinished || jobStatus === "selesai" || jobStatus === "finished";
  let router: any = null;
  try { router = useRouter(); } catch {}

  return (
    <View className={`flex-row ${isMe ? "justify-end" : "justify-start"} w-full`}>
      <View className={`w-[300px] max-w-[86%] bg-white rounded-[20px] border overflow-hidden shadow-sm ${finished ? "border-gray-200" : "border-emerald-200"}`}>
        {/* Header — 1:1 web: bg gray & text gray when finished */}
        <View className={`px-4 py-3 border-b flex-row items-center justify-between ${finished ? "bg-gray-50 border-gray-100" : "bg-[#ecfdf5] border-emerald-100"}`}>
          <View className="flex-row items-center gap-1.5">
            <FileText size={14} color={finished ? "#6B7280" : "#047857"} />
            <Text className={`text-xs font-black tracking-widest ${finished ? "text-gray-500" : "text-emerald-700"}`}>HASIL KERJA MITRA</Text>
          </View>
          <View className={`px-2.5 py-0.5 rounded-full border ${finished ? "bg-gray-100 border-gray-200" : "bg-emerald-100 border-emerald-200"}`}>
            <Text className={`text-[10px] font-bold ${finished ? "text-gray-500" : "text-emerald-800"}`}>{finished ? "Selesai" : "Terkirim"}</Text>
          </View>
        </View>

        <View className="p-3.5 gap-3">
          {note ? (
            <View className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <Text className="text-xs text-gray-700 leading-5">&quot;{note}&quot;</Text>
            </View>
          ) : null}

          {fileUrl ? (
            <View className="gap-1">
              <Text className="text-[10px] font-bold text-gray-400 tracking-widest">LAMPIRAN FILE / FOTO</Text>
              {isImage ? (
                <TouchableOpacity onPress={() => onPreview?.(fileUrl)} activeOpacity={0.88} className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                  <Image source={{ uri: fileUrl }} style={{ width: "100%", height: 176, borderRadius: 16, opacity: finished ? 0.45 : 1 } as any} resizeMode="cover" />
                  {finished ? (
                    <View className="absolute inset-0 bg-gray-600/30 items-center justify-center rounded-[16px]">
                       <View className="bg-white/90 px-3 py-1.5 rounded-full border border-gray-200">
                          <Text className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest">Selesai</Text>
                       </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => Linking.openURL(fileUrl)} className={`rounded-xl px-3 py-2.5 border ${finished ? "bg-gray-50 border-gray-100" : "bg-emerald-50 border-emerald-100"}`}>
                  <Text className={`text-xs font-bold underline ${finished ? "text-gray-500" : "text-emerald-700"}`} numberOfLines={1}>Unduh Dokumen Hasil Kerja</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {linkUrl ? (
            <View className="gap-1">
              <Text className="text-[10px] font-bold text-gray-400 tracking-widest">LINK EKSTERNAL</Text>
              <TouchableOpacity onPress={() => Linking.openURL(linkUrl)} className={`rounded-xl px-3 py-2.5 flex-row items-center gap-1.5 border ${finished ? "bg-gray-50 border-gray-100" : "bg-blue-50 border-blue-100"}`}>
                <Text className={`text-xs font-bold flex-1 ${finished ? "text-gray-400" : "text-blue-600"}`} numberOfLines={1}>{linkUrl}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Actions — only for Klien — 1:1 web */}
          {!isMitraView ? (
            finished ? (
              <View className="pt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => router?.push?.(`/c/ulasan/${dJobId}`)}
                  className="w-full py-3 rounded-full items-center justify-center shadow-sm flex-row gap-2"
                  style={{ backgroundColor: "#FF6B00" } as any}
                  activeOpacity={0.88}
                >
                  <Star size={14} color="#fff" fill="#fff" />
                  <Text className="text-[13px] font-black text-white tracking-tight">Beri Ulasan untuk Mitra</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row gap-2 pt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => onRequestRevision?.(dJobId)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="flex-1 py-3 rounded-full border border-amber-200 bg-amber-50 items-center justify-center active:bg-amber-100"
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-bold text-amber-800">Minta Revisi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onAccept?.(dJobId)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="flex-1 py-3 rounded-full bg-emerald-600 items-center justify-center shadow-sm active:bg-emerald-700"
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-black text-white">Terima</Text>
                </TouchableOpacity>
              </View>
            )
          ) : finished ? (
              <View className="pt-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => router?.push?.(`/p/ulasan/${dJobId}`)}
                  className="w-full py-3 rounded-full items-center justify-center shadow-sm flex-row gap-2 border border-orange-200 bg-orange-50"
                  activeOpacity={0.88}
                >
                  <Star size={14} color="#FF6B00" fill="#FF6B00" />
                  <Text className="text-[13px] font-black text-[#FF6B00] tracking-tight">Beri Ulasan untuk Klien</Text>
                </TouchableOpacity>
              </View>
          ) : null}
        </View>

        <View className="px-4 pb-2.5 items-end">
          <Text className="text-[10px] text-gray-400">{time}</Text>
        </View>
      </View>
    </View>
  );
}
