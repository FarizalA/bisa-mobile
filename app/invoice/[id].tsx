import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Receipt,
  Copy,
  Clock,
  ShieldCheck,
  Package,
  Wallet,
  CheckCircle2,
  Share2,
} from "lucide-react-native";
import { supabase } from "../../src/lib/supabase";
import {
  formatNoInvoice,
  fmtDate,
  fmtRupiah,
  paymentLabel,
  statusColorNative,
  resolveEffectivePaymentStatus,
} from "../../src/lib/invoice";
import { calculatePaymentBreakdown } from "../../src/lib/payment";
import { safeBack } from "@/lib/navigation";

export default function InvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const rawId = Array.isArray(id) ? id[0] : id || "";

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const numId = Number(rawId.replace(/\D/g, ""));

        // 1. Coba ambil dari invoices_bisa dulu (sumber resmi nomor/order) — via RPC fallback kalau RLS ketat
        // 2. Kalau belum ada, ambil dari pekerjaan_bisa lalu buat nomor bayangan yang sama dengan web /api/invoices
        let invoiceRow: any = null;
        try {
          const invRes = await supabase.from("invoices_bisa").select("*").eq("job_id", numId).maybeSingle();
          if (!invRes.error && invRes.data) invoiceRow = invRes.data;
        } catch {}

        const { data, error } = await supabase
          .from("pekerjaan_bisa")
          .select(`
            id,
            judul,
            deskripsi,
            kategori,
            budget,
            agreed_price,
            status,
            payment_method,
            payment_status,
            created_at,
            expires_at,
            invoice_number,
            pelanggan_id,
            mitra_id
          `)
          .eq("id", numId)
          .maybeSingle();

        if (error) throw error;
        if (alive) {
          if (data) {
            let pelanggan_name: string | null = null;
            let mitra_name: string | null = null;
            if ((data as any).pelanggan_id) {
              const { data: u1 } = await supabase.from("users_bisa").select("name").eq("id", (data as any).pelanggan_id).maybeSingle();
              pelanggan_name = (u1 as any)?.name || null;
            }
            if ((data as any).mitra_id) {
              const { data: u2 } = await supabase.from("users_bisa").select("name").eq("id", (data as any).mitra_id).maybeSingle();
              mitra_name = (u2 as any)?.name || null;
            }
            // prioritas kolom invoice_number di pekerjaan_bisa, lalu invoices_bisa, lalu generate dari created_at biar tanggalnya benar
            const realInvoiceNo = (data as any).invoice_number || invoiceRow?.invoice_number || null;
            // status efektif: sinkronkan dengan pekerjaan_bisa.status
            // supaya 'selesai' di card = 'Selesai & Lunas' di invoice, tidak 'Menunggu Pembayaran'
            const rawStatus = (invoiceRow?.payment_status || (data as any).payment_status || '').toLowerCase();
            const jobStatus = ((data as any).status || '').toLowerCase();
            // Jika job sudah selesai tapi invoice masih menunggu bayar -> paksa 'selesai'
            let effPaymentStatus = invoiceRow?.payment_status || (data as any).payment_status || jobStatus;
            if (jobStatus === 'selesai' && rawStatus !== 'selesai' && rawStatus !== 'cod_completed' && rawStatus !== 'escrow_released') {
              effPaymentStatus = 'selesai';
            }
            // Jika job masih escrow_held/paid tapi labelnya pending
            if ((jobStatus === 'sedang_dikerjakan' || jobStatus === 'mitra_ditemukan' || jobStatus === 'menunggu_konfirmasi_selesai') && (rawStatus === 'belum_bayar' || rawStatus === 'menunggu_pembayaran' || rawStatus === 'pending')) {
              effPaymentStatus = (data as any).payment_method?.toUpperCase() === 'COD' ? 'cod_pending' : 'escrow_held';
            }

            setOrder({
              ...data,
              ...invoiceRow, // invoice_row jadi sumber fee/total kalau pernah dibuat oleh web
              id: (data as any).id,
              status: (data as any).status,
              invoice_number: realInvoiceNo,
              effective_payment_status: effPaymentStatus,
              payment_status: effPaymentStatus,
              payment_method: (data as any).payment_method || invoiceRow?.payment_method || 'MIDTRANS',
              pelanggan_name,
              mitra_name,
            });
          }
        }
      } catch (err) {
        console.error("Gagal load invoice:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [rawId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center p-6">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text className="text-sm font-bold text-gray-500 mt-3">Memuat tagihan...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center p-6 text-center">
        <View className="w-14 h-14 rounded-full bg-red-50 border border-red-100 items-center justify-center mb-3">
          <Receipt size={24} color="#DC2626" />
        </View>
        <Text className="text-base font-extrabold text-gray-900">Tagihan Tidak Ditemukan</Text>
        <Text className="text-xs text-gray-500 mt-1 mb-5">
          Data invoice untuk pesanan #{rawId} tidak tersedia.
        </Text>
        <TouchableOpacity
          onPress={() => safeBack(router, "/")}
          className="px-6 py-2.5 rounded-full bg-[#FF6B00]"
        >
          <Text className="text-white font-bold text-sm">Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const rawBudget =
    order.agreed_price ||
    parseInt(String(order.budget || "").replace(/\D/g, "") || "0", 10);
  const breakdown = calculatePaymentBreakdown(rawBudget);

  const jobId = String(order.id || rawId);
  const invNumber = order.invoice_number || formatNoInvoice(jobId, order.created_at);
  const isCOD = (order.payment_method || "").toUpperCase() === "COD";
  const effectiveStatus = order.effective_payment_status || resolveEffectivePaymentStatus(order);
  const statusNative = statusColorNative(effectiveStatus);
  const statusLabelText = paymentLabel(order.payment_method, effectiveStatus);

  const handleCopy = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(invNumber);
      } else {
        await Share.share({ message: `Nomor Tagihan: ${invNumber}` });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Invoice BISA: ${invNumber}\nLayanan: ${order.judul}\nTotal: ${fmtRupiah(
          isCOD ? rawBudget : breakdown.totalBuyerPays
        )}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]" edges={["top", "bottom"]}>
      {/* HEADER */}
      <View className="h-14 px-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => safeBack(router, "/")}
          className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-100"
        >
          <ArrowLeft size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-base font-extrabold text-gray-900">Invoice</Text>
        <TouchableOpacity
          onPress={handleShare}
          className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-100"
        >
          <Share2 size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs mb-6">
          {/* TOP CARD HEADER */}
          <View className="p-4 flex-row justify-between items-start border-b border-gray-100">
            <View className="flex-row gap-2.5 flex-1 pr-2">
              <View className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 items-center justify-center">
                <Receipt size={17} color="#FF6B00" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 mb-0.5">
                  <Text className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                    TAGIHAN
                  </Text>
                  {!isCOD && (
                    <View className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                      <ShieldCheck size={9} color="#047857" />
                      <Text className="text-[9px] font-bold text-emerald-700">Rekber</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleCopy}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5 mt-0.5"
                >
                  <Text className="text-xs font-black text-gray-900" numberOfLines={1}>
                    {invNumber}
                  </Text>
                  <Copy size={11} color={copied ? "#059669" : "#9CA3AF"} />
                  {copied && <Text className="text-[10px] text-emerald-600 font-bold">Tersalin!</Text>}
                </TouchableOpacity>

                <View className="flex-row items-center gap-1 mt-1">
                  <Clock size={10} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-400 font-medium">
                    {fmtDate(order.created_at)}
                  </Text>
                </View>
              </View>
            </View>

            {/* STATUS BADGE */}
            <View
              style={{
                backgroundColor: statusNative.bg,
                borderColor: statusNative.border,
              }}
              className="px-2.5 py-1 rounded-full border"
            >
              <Text style={{ color: statusNative.text }} className="text-[10px] font-black">
                {statusLabelText}
              </Text>
            </View>
          </View>

          {/* KLIEN & MITRA */}
          <View className="p-3 flex-row gap-2 bg-gray-50/50 border-b border-gray-100">
            <View className="flex-1 flex-row items-center gap-1.5 bg-white rounded-xl px-2.5 py-2 border border-gray-100">
              <View className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <Text className="text-[8px] font-bold text-gray-400 uppercase">KLIEN</Text>
              <Text className="text-[11px] font-bold text-gray-900 flex-1" numberOfLines={1}>
                {order.pelanggan_name || "Pelanggan BISA"}
              </Text>
            </View>
            <View className="flex-1 flex-row items-center gap-1.5 bg-white rounded-xl px-2.5 py-2 border border-gray-100">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-[8px] font-bold text-emerald-600 uppercase">MITRA</Text>
              <Text className="text-[11px] font-bold text-gray-900 flex-1" numberOfLines={1}>
                {order.mitra_name || "Mitra BISA"}
              </Text>
            </View>
          </View>

          {/* LAYANAN CARD */}
          <View className="m-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-white border border-gray-200 items-center justify-center">
              <Package size={16} color="#6B7280" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                LAYANAN
              </Text>
              <Text className="text-xs font-black text-gray-900 leading-tight" numberOfLines={1}>
                {order.judul || "Layanan Jasa"}
              </Text>
              <Text className="text-[10px] text-gray-500 font-medium mt-0.5" numberOfLines={1}>
                {order.kategori || "Jasa Umum"} • {fmtDate(order.created_at).split(",")[0]}
              </Text>
            </View>
          </View>

          {/* RINCIAN BIAYA */}
          <View className="px-3 pb-3">
            <View className="flex-row items-center gap-1 mb-2 px-1">
              <Wallet size={12} color="#9CA3AF" />
              <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                RINCIAN BIAYA
              </Text>
            </View>

            <View className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
              <View className="flex-row justify-between items-center px-3.5 py-2.5">
                <Text className="text-xs text-gray-600 font-medium">Biaya Jasa</Text>
                <Text className="text-xs font-bold text-gray-900">
                  {fmtRupiah(rawBudget)}
                </Text>
              </View>

              {!isCOD && (
                <>
                  <View className="flex-row justify-between items-center px-3.5 py-2 bg-gray-50/50 border-t border-gray-100">
                    <Text className="text-xs text-gray-600 font-medium">Biaya Layanan</Text>
                    <Text className="text-xs font-semibold text-gray-700">
                      {fmtRupiah(breakdown.appFee)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center px-3.5 py-2 border-t border-gray-100">
                    <Text className="text-xs text-gray-600 font-medium">Biaya Penanganan</Text>
                    <Text className="text-xs font-semibold text-gray-700">
                      {fmtRupiah(breakdown.paymentGatewayFee)}
                    </Text>
                  </View>
                </>
              )}

              <View className="flex-row justify-between items-center px-3.5 py-3 bg-orange-50/60 border-t border-orange-100">
                <Text className="text-xs font-extrabold text-gray-900">Total Kesepakatan</Text>
                <Text className="text-sm font-black text-[#FF6B00]">
                  {fmtRupiah(isCOD ? rawBudget : breakdown.totalBuyerPays)}
                </Text>
              </View>
            </View>

            {/* NOTIFIKASI EARNINGS */}
            <View
              className={`mt-3 p-3 rounded-xl border flex-row items-start gap-2 ${
                isCOD
                  ? "bg-[#FEFCE8] border-[#FEF08A]"
                  : "bg-emerald-50/70 border-emerald-100"
              }`}
            >
              <CheckCircle2
                size={14}
                color={isCOD ? "#CA8A04" : "#059669"}
                style={{ marginTop: 2 }}
              />
              <Text
                className={`text-[11px] flex-1 leading-relaxed ${
                  isCOD ? "text-amber-900" : "text-emerald-800"
                }`}
              >
                <Text className="font-extrabold">
                  Mitra terima {fmtRupiah(isCOD ? rawBudget : breakdown.mitraEarnings)}
                </Text>
                <Text className="font-medium">
                  {isCOD
                    ? " — dibayarkan tunai oleh Klien langsung di tempat."
                    : " — diamankan Rekber BISA."}
                </Text>
              </Text>
            </View>

            <Text className="text-[10px] text-gray-400 mt-2 px-1">
              Metode:{" "}
              <Text className="font-bold text-gray-700">
                {(order.payment_method || "MIDTRANS").toUpperCase()}
              </Text>
              {order.expires_at ? ` • Batas: ${fmtDate(order.expires_at)}` : ""}
            </Text>
          </View>
        </View>

        {/* BOTTOM ACTION */}
        <TouchableOpacity
          onPress={() => safeBack(router, "/")}
          className="w-full py-3.5 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-xs"
        >
          <Text className="text-xs font-bold text-gray-700">Kembali ke Aktivitas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
