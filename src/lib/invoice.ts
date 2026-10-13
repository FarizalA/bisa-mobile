// Port 1:1 dari C:\bisaaaa\bisa-app\bisa-app\lib\invoice.ts
import { calculatePaymentBreakdown } from "./payment";

export type InvoiceData = {
  invoice_number: string;
  job_id: number | string;
  judul: string;
  kategori?: string | null;
  pelanggan_id?: number | null;
  mitra_id?: number | null;
  pelanggan_name?: string;
  mitra_name?: string;
  agreed_price: number;
  platform_fee: number;
  gateway_fee: number;
  total_amount: number;
  mitra_earnings: number;
  payment_method: string;
  payment_status: string;
  payment_url?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  issued_at: string;
  created_at: string;
  job_status?: string;
  job_created_at?: string;
};

export function formatNoInvoice(jobId: number | string, dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validD = !isNaN(d.getTime()) ? d : new Date();
  const ymd = `${validD.getFullYear()}${String(validD.getMonth() + 1).padStart(2, "0")}${String(validD.getDate()).padStart(2, "0")}`;
  return `INV-${ymd}-${String(jobId).padStart(5, "0")}`;
}

export function resolveEffectivePaymentStatus(jobOrInv: { status?: string | null; job_status?: string | null; payment_status?: string | null; payment_method?: string | null } | null | undefined): string {
  if (!jobOrInv) return 'menunggu_pembayaran';
  const js = (jobOrInv.job_status || jobOrInv.status || '').toLowerCase();
  const ps = (jobOrInv.payment_status || '').toLowerCase();
  const pm = (jobOrInv.payment_method || '').toUpperCase();
  if (js === 'selesai' || ps === 'selesai' || ps === 'cod_completed' || ps === 'escrow_released') return 'selesai';
  if (js === 'dibatalkan' || js === 'cancelled' || ps === 'dibatalkan' || ps === 'cancelled' || ps === 'cod_cancelled' || js === 'ditolak') return 'dibatalkan';
  if (js === 'sedang_dikerjakan' || js === 'menunggu_konfirmasi_selesai' || js === 'mitra_ditemukan') {
    if (pm === 'COD') return 'cod_pending';
    return 'escrow_held';
  }
  if (pm === 'COD' || js === 'menunggu_konfirmasi_mitra' || ps === 'cod_pending') return 'cod_pending';
  if (ps === 'escrow_held' || ps === 'paid' || ps === 'settlement' || ps === 'lunas') return 'escrow_held';
  return ps || js || 'menunggu_pembayaran';
}

export function breakdownFromPrice(price: number) {
  return calculatePaymentBreakdown(price);
}

export type TimelineStep = {
  key: string;
  label: string;
  description?: string;
  timestamp?: string | null;
  state: "done" | "active" | "pending" | "cancelled";
};

// Timeline histori pesanan (Fase 5) — urutan: Dibuat -> Mitra Dipilih -> Terbayar Escrow -> Dikerjakan -> Terkirim -> Selesai
export function buildOrderTimeline(order: {
  status?: string | null;
  job_status?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  mitra_id?: number | string | null;
  created_at?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
  mitra_earnings?: number | null;
} | null | undefined): TimelineStep[] {
  if (!order) return [];
  const js = (order.job_status || order.status || "").toLowerCase();
  const ps = (order.payment_status || "").toLowerCase();
  const pm = (order.payment_method || "").toUpperCase();
  const isCOD = pm === "COD" || ps === "cod_pending" || ps === "cod_completed";

  const isCancelled = js === "dibatalkan" || js === "cancelled" || js === "ditolak" || js === "expired" || ps === "cancelled" || ps === "cod_cancelled" || ps === "refunded";
  const isDone = js === "selesai" || ps === "selesai" || ps === "cod_completed" || ps === "released" || ps === "escrow_released";
  const hasMitra = !!order.mitra_id;
  const isPaid = isCOD
    ? ps === "cod_completed"
    : (ps === "escrow_held" || ps === "paid" || ps === "settlement" || ps === "lunas" || ps === "released" || ps === "escrow_released");
  const isWorking = js === "sedang_dikerjakan" || js === "menunggu_konfirmasi_selesai" || js === "mitra_ditemukan" || isDone;
  const isDelivered = js === "menunggu_konfirmasi_selesai" || isDone;

  // Posisi langkah tertinggi yang sudah tercapai
  type Raw = { key: string; label: string; description?: string; timestamp?: string | null; reached: boolean };
  const steps: Raw[] = [
    { key: "created", label: "Pesanan Dibuat", description: "Pesanan dipublikasikan ke mitra", timestamp: order.created_at, reached: true },
    { key: "mitra", label: "Mitra Dipilih", description: hasMitra ? "Mitra telah menerima pekerjaan" : "Menunggu mitra menerima", timestamp: hasMitra ? order.updated_at : null, reached: hasMitra },
    { key: "paid", label: isCOD ? "Konfirmasi COD" : "Terbayar (Escrow)", description: isCOD ? "Pembayaran tunai saat serah terima" : "Dana ditahan aman oleh BISA", timestamp: isCOD ? null : (order.paid_at || (isPaid ? order.updated_at : null)), reached: isPaid },
    { key: "working", label: "Sedang Dikerjakan", description: "Mitra mengerjakan pesanan", timestamp: isWorking ? order.updated_at : null, reached: isWorking },
    { key: "delivered", label: "Pekerjaan Terkirim", description: "Mitra mengirim hasil pekerjaan", timestamp: isDelivered ? order.updated_at : null, reached: isDelivered },
    { key: "done", label: "Selesai", description: "Pesanan selesai dan dana diteruskan", timestamp: isDone ? order.updated_at : null, reached: isDone },
  ];

  if (isCancelled) {
    const lastReached = steps.reduce((acc, s, i) => (s.reached ? i : acc), 0);
    return steps.map((s, i) => {
      if (i < lastReached) return { key: s.key, label: s.label, description: s.description, timestamp: s.timestamp, state: "done" as const };
      if (i === lastReached) return { key: s.key, label: s.label, description: s.description, timestamp: s.timestamp, state: "cancelled" as const };
      return { key: s.key, label: s.label, description: s.description, timestamp: s.timestamp, state: "pending" as const };
    });
  }

  // Langkah pertama yang belum tercapai = active
  const activeIdx = steps.findIndex((s) => !s.reached);
  return steps.map((s, i) => {
    if (s.reached && (activeIdx === -1 || i < activeIdx)) return { key: s.key, label: s.label, description: s.description, timestamp: s.timestamp, state: "done" as const };
    if (i === activeIdx) return { key: s.key, label: s.label, description: s.description, timestamp: s.timestamp, state: "active" as const };
    return { key: s.key, label: s.label, description: s.description, timestamp: s.timestamp, state: "pending" as const };
  });
}

export function paymentLabel(method?: string | null, status?: string | null): string {
  const m = (method || "").toUpperCase();
  const s = (status || "").toLowerCase();
  if (s === "dibatalkan" || s === "cancelled" || s === "cod_cancelled") return "Dibatalkan";
  if (s === "escrow_held" || s === "paid" || s === "settlement" || s === "lunas") return "Terbayar (Escrow)";
  if (s === "selesai") return "Selesai & Lunas";
  if (s === "menunggu_pembayaran" || s === "belum_bayar" || s === "pending") return "Menunggu Pembayaran";
  if (s === "menunggu_konfirmasi_mitra" || s === "cod_pending") return m === "COD" ? "Bayar di Tempat (COD)" : "Menunggu Konfirmasi";
  if (s === "cod_completed") return "Selesai (COD)";
  if (m === "COD") return "Bayar di Tempat (COD)";
  return "Menunggu Pembayaran";
}

export function statusColor(status?: string | null): string {
  const s = (status || "").toLowerCase();
  if (s === "escrow_held" || s === "paid" || s === "settlement" || s === "sedang_dikerjakan") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "selesai" || s === "cod_completed") return "bg-green-100 text-green-700 border-green-200";
  if (s === "dibatalkan" || s === "cancelled" || s === "cod_cancelled") return "bg-red-100 text-red-700 border-red-200";
  if (s === "menunggu_pembayaran" || s === "belum_bayar" || s === "pending" || s === "menunggu_konfirmasi_mitra" || s === "cod_pending") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB";
  } catch {
    return iso;
  }
}

export function fmtRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
}

// Helper tambahan untuk Native badge color object
export function statusColorNative(status?: string | null): { bg: string; text: string; border: string } {
  const s = (status || "").toLowerCase();
  if (s === "escrow_held" || s === "paid" || s === "settlement" || s === "sedang_dikerjakan") return { bg: "#D1FAE5", text: "#047857", border: "#A7F3D0" };
  if (s === "selesai" || s === "cod_completed") return { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" };
  if (s === "dibatalkan" || s === "cancelled" || s === "cod_cancelled") return { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" };
  if (s === "menunggu_pembayaran" || s === "belum_bayar" || s === "pending" || s === "menunggu_konfirmasi_mitra" || s === "cod_pending") return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
  return { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB" };
}
