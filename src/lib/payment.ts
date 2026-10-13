// Library Manajemen Pembayaran, Escrow, dan Komisi Developer untuk BISA Mobile
import { supabase } from "./supabase";

export interface PaymentBreakdown {
  agreedPrice: number;
  appFee: number;
  paymentGatewayFee: number;
  commissionRate: number;
  platformCommission: number;
  mitraEarnings: number;
  platformEarnings: number;
  totalBuyerPays: number;
}

export const PLATFORM_COMMISSION_PERCENT = 0;
export const APP_ADMIN_FEE = 2000;

export function calculatePaymentBreakdown(agreedPrice: number): PaymentBreakdown {
  const safePrice = Math.max(0, Number(agreedPrice) || 0);
  const appFee = APP_ADMIN_FEE;
  const paymentGatewayFee = Math.round(safePrice * 0.02) + 4000;
  const commissionRate = PLATFORM_COMMISSION_PERCENT;
  const platformCommission = 0;
  const mitraEarnings = safePrice;
  const platformEarnings = appFee;
  const totalBuyerPays = safePrice + appFee + paymentGatewayFee;

  return {
    agreedPrice: safePrice,
    appFee,
    paymentGatewayFee,
    commissionRate,
    platformCommission,
    mitraEarnings,
    platformEarnings,
    totalBuyerPays,
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Memproses refund saldo pesanan jika terjadi pembatalan (Mutual Cancel / Cancel).
 * Jika status pesanan adalah escrow_held / paid, dana agreed_price dikembalikan ke users_bisa.saldo pelanggan
 * dan dicatat di tabel transactions (kategori: 'refund') sehingga muncul di Dompet dan bisa ditarik.
 */
export async function processOrderRefund(
  jobId: number | string,
  reason?: string
): Promise<{ success: boolean; refunded: boolean; amount: number; message: string }> {
  try {
    const numJobId = Number(jobId);
    if (!numJobId) throw new Error("ID pesanan tidak valid");

    const { data: job, error: jobErr } = await supabase
      .from("pekerjaan_bisa")
      .select("id, status, payment_status, payment_method, pelanggan_id, agreed_price, budget, judul")
      .eq("id", numJobId)
      .maybeSingle();

    if (jobErr || !job) {
      throw new Error(jobErr?.message || "Pesanan tidak ditemukan");
    }

    if (job.status === "dibatalkan" && job.payment_status === "refunded") {
      return { success: true, refunded: true, amount: 0, message: "Pesanan ini sudah dibatalkan dan direfund sebelumnya." };
    }

    const isCOD = job.payment_method === "COD" || job.payment_status === "cod_pending" || job.payment_status === "cod_completed";
    const isEscrowPaid = !isCOD && (
      job.payment_status === "escrow_held" ||
      job.payment_status === "paid" ||
      job.payment_status === "settlement" ||
      job.payment_status === "capture" ||
      job.status === "sedang_dikerjakan" ||
      job.status === "menunggu_konfirmasi_selesai"
    );

    // 1. Jika COD: tidak ada escrow yang ditahan, batalkan tanpa kredit saldo
    if (isCOD) {
      await supabase
        .from("pekerjaan_bisa")
        .update({ status: "dibatalkan", payment_status: "cod_cancelled" })
        .eq("id", numJobId);

      return {
        success: true,
        refunded: false,
        amount: 0,
        message: "Pesanan COD dibatalkan (tidak ada dana escrow yang ditahan).",
      };
    }

    // 2. Jika dana sudah dibayar & ditahan di Escrow: kembalikan ke saldo pelanggan
    if (isEscrowPaid) {
      const refundAmount = Number(job.agreed_price) || Number(String(job.budget || "").replace(/\D/g, "")) || 0;

      if (refundAmount > 0 && job.pelanggan_id) {
        // Ambil data saldo pelanggan saat ini
        const { data: clientUser } = await supabase
          .from("users_bisa")
          .select("id, saldo, balance")
          .eq("id", job.pelanggan_id)
          .maybeSingle();

        if (clientUser) {
          const curSaldo = Number(clientUser.saldo ?? clientUser.balance ?? 0);
          const newSaldo = curSaldo + refundAmount;

          await supabase
            .from("users_bisa")
            .update({ saldo: newSaldo, balance: newSaldo })
            .eq("id", job.pelanggan_id);

          // Catat ke ledger transactions (kategori: refund)
          try {
            await supabase.from("transactions").insert({
              user_id: job.pelanggan_id,
              type: "in",
              category: "refund",
              reference_id: numJobId,
              amount: refundAmount,
              title: `Refund: ${job.judul || `Pesanan #${job.id}`}`,
              description: `Pengembalian dana pembatalan pesanan #${job.id}${reason ? ` (${reason})` : ""}`,
              icon: "receipt",
              status: "Berhasil",
            });
          } catch (tErr) {
            console.warn("[Refund] Gagal mencatat ledger transactions:", tErr);
          }
        }
      }

      await supabase
        .from("pekerjaan_bisa")
        .update({ status: "dibatalkan", payment_status: "refunded" })
        .eq("id", numJobId);

      return {
        success: true,
        refunded: true,
        amount: refundAmount,
        message: `Pesanan dibatalkan. Dana sebesar Rp ${refundAmount.toLocaleString("id-ID")} telah dikembalikan ke saldo Dompet Anda dan dapat ditarik.`,
      };
    }

    // 3. Jika belum bayar (belum ada dana yang masuk)
    await supabase
      .from("pekerjaan_bisa")
      .update({ status: "dibatalkan", payment_status: "cancelled" })
      .eq("id", numJobId);

    return {
      success: true,
      refunded: false,
      amount: 0,
      message: "Pesanan dibatalkan.",
    };
  } catch (err: any) {
    console.error("[processOrderRefund] Error:", err);
    throw err;
  }
}

/**
 * Merilis dana escrow ke saldo Mitra saat Klien mengonfirmasi pesanan selesai.
 * Juga mencatat riwayat transaksi 'pemasukan' di tabel transactions untuk Mitra.
 */
export async function releaseEscrowPayout(
  jobId: number | string
): Promise<{ success: boolean; isCOD: boolean; earnings: number; fee: number; message: string }> {
  try {
    const { getSupabaseToken } = await import("./auth");
    const token = await getSupabaseToken();
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/order/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId: Number(jobId), action: "release" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Gagal rilis escrow");
    return { success: true, isCOD: data.isCOD || false, earnings: data.earnings || 0, fee: data.fee || 0, message: data.message || "" };
  } catch (err: any) {
    console.error("[releaseEscrowPayout] Error:", err);
    throw err;
  }
}

/**
 * Mengajukan pembatalan pesanan oleh Klien saat pekerjaan sedang dikerjakan.
 * Status berubah menjadi 'menunggu_persetujuan_batal' dan memberi batas 24 jam bagi Mitra untuk merespons.
 */
export async function requestOrderCancellation(
  jobId: number | string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const numJobId = Number(jobId);
    if (!numJobId) throw new Error("ID pesanan tidak valid");

    const { data: job, error: jobErr } = await supabase
      .from("pekerjaan_bisa")
      .select("id, status, payment_status, pelanggan_id, mitra_id, judul")
      .eq("id", numJobId)
      .maybeSingle();

  if (jobErr || !job) throw new Error(jobErr?.message || "Pesanan tidak ditemukan");

  const now = new Date().toISOString();
  const cleanReason = reason?.trim() || "Klien mengajukan pembatalan pesanan";

  const updatePayload: any = {
    status: "menunggu_persetujuan_batal",
    cancel_requested_at: now,
    cancel_reason: cleanReason,
    alasan_penolakan: cleanReason, // Fallback jika kolom cancel_reason belum terbaca
  };

  const { error: updErr } = await supabase
    .from("pekerjaan_bisa")
    .update(updatePayload)
    .eq("id", numJobId);

  if (updErr) throw new Error(updErr.message);

  // Injeksi notifikasi / pesan ke chat
  try {
    const { ensureConversationAndNavigate } = await import("./chatInbox");
    const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, false);
    if (convId) {
      const msg = `⚠️ Klien mengajukan pembatalan pesanan: "${cleanReason}". Mitra memiliki waktu 24 jam untuk merespons.`;
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: Number(job.pelanggan_id),
        message_type: "system",
        content: msg,
      } as any);
      await supabase.from("conversations").update({
        last_message: msg,
        last_message_at: now,
      } as any).eq("id", convId);
    }
  } catch (e) {
    console.warn("[requestOrderCancellation] chat inject warn:", e);
  }

  return {
    success: true,
    message: "Pengajuan pembatalan telah dikirim ke Mitra. Menunggu respon dalam 24 jam.",
  };
  } catch (err: any) {
    console.error("[requestOrderCancellation] Error:", err);
    throw err;
  }
}

/**
 * Merespons pengajuan pembatalan oleh Mitra (Setujui atau Tolak/Kendala > 80%).
 */
export async function respondOrderCancellation(
  jobId: number | string,
  approved: boolean,
  rejectReason?: string
): Promise<{ success: boolean; refunded: boolean; message: string }> {
  try {
    const numJobId = Number(jobId);
    if (!numJobId) throw new Error("ID pesanan tidak valid");

    const { data: job, error: jobErr } = await supabase
      .from("pekerjaan_bisa")
      .select("id, status, payment_status, pelanggan_id, mitra_id, cancel_reason, alasan_penolakan, judul")
      .eq("id", numJobId)
      .maybeSingle();

    if (jobErr || !job) throw new Error(jobErr?.message || "Pesanan tidak ditemukan");

    const now = new Date().toISOString();

    if (approved) {
      // Mitra setuju batal -> dana dikembalikan (refund) ke Saldo Klien
      const reasonText = (job as any).cancel_reason || (job as any).alasan_penolakan || "Disetujui oleh Mitra";
      const refRes = await processOrderRefund(numJobId, `Persetujuan Batal Mitra: ${reasonText}`);

      try {
        const { ensureConversationAndNavigate } = await import("./chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          const msg = `✅ Mitra telah menyetujui pembatalan pesanan. Dana telah dikembalikan ke Saldo Dompet Klien.`;
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: Number(job.mitra_id),
            message_type: "system",
            content: msg,
          } as any);
          await supabase.from("conversations").update({
            last_message: msg,
            last_message_at: now,
          } as any).eq("id", convId);
        }
      } catch {}

      return {
        success: true,
        refunded: refRes.refunded,
        message: refRes.message,
      };
    } else {
      // Mitra menolak pembatalan (misal pekerjaan sudah > 80% atau ada perselisihan)
      const cleanRejectReason = rejectReason?.trim() || "Pekerjaan sedang berlangsung / progres > 80%";
      await supabase
        .from("pekerjaan_bisa")
        .update({
          status: "sedang_dikerjakan",
          alasan_penolakan: `Pembatalan ditolak: ${cleanRejectReason}`,
        })
        .eq("id", numJobId);

      try {
        const { ensureConversationAndNavigate } = await import("./chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          const msg = `❌ Mitra menolak pengajuan pembatalan dengan alasan: "${cleanRejectReason}". Pekerjaan tetap dilanjutkan. Jika ada kendala, silakan hubungi Pusat Bantuan / Komplain.`;
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: Number(job.mitra_id),
            message_type: "system",
            content: msg,
          } as any);
          await supabase.from("conversations").update({
            last_message: msg,
            last_message_at: now,
          } as any).eq("id", convId);
        }
      } catch {}

      return {
        success: true,
        refunded: false,
        message: "Pengajuan pembatalan ditolak. Pekerjaan dilanjutkan.",
      };
    }
  } catch (err: any) {
    console.error("[respondOrderCancellation] Error:", err);
    throw err;
  }
}

/**
 * Mengajukan sengketa (dispute) ke admin untuk pesanan yang bermasalah.
 * Digunakan saat: revisi sudah batas maksimal, atau mitra menolak pembatalan.
 * Status pekerjaan berubah menjadi 'dalam_sengketa' dan menunggu keputusan admin.
 */
export async function submitOrderDispute(
  jobId: number | string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const numJobId = Number(jobId);
    if (!numJobId) throw new Error("ID pesanan tidak valid");
    const cleanReason = reason?.trim();
    if (!cleanReason || cleanReason.length < 10) {
      throw new Error("Alasan sengketa wajib diisi minimal 10 karakter.");
    }

    const { getSupabaseToken } = await import("./auth");
    const token = await getSupabaseToken();
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/order/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId: numJobId, action: "dispute", reason: cleanReason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Gagal mengajukan sengketa");

    // Injeksi pesan sistem ke chat sebagai bukti
    try {
      const { data: job } = await supabase
        .from("pekerjaan_bisa")
        .select("pelanggan_id, mitra_id, judul")
        .eq("id", numJobId)
        .maybeSingle();
      if (job) {
        const { ensureConversationAndNavigate } = await import("./chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), numJobId, false);
        if (convId) {
          const msg = `⚖️ Sengketa diajukan: "${cleanReason}". Menunggu peninjauan Admin. Semua transaksi ditahan sampai keputusan.`;
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: Number(job.pelanggan_id),
            message_type: "system",
            content: msg,
          } as any);
          await supabase.from("conversations").update({
            last_message: msg,
            last_message_at: new Date().toISOString(),
          } as any).eq("id", convId);
        }
      }
    } catch (e) {
      console.warn("[submitOrderDispute] chat inject warn:", e);
    }

    return {
      success: true,
      message: data.message || "Sengketa berhasil diajukan. Menunggu peninjauan admin.",
    };
  } catch (err: any) {
    console.error("[submitOrderDispute] Error:", err);
    throw err;
  }
}

/**
 * Memeriksa seluruh pesanan 'menunggu_persetujuan_batal' yang sudah melewati batas 24 jam tanpa respon mitra.
 * Jika sudah > 24 jam, otomatis dibatalkan dan direfund ke Klien.
 */
export async function checkAndProcessExpiredCancellations(): Promise<number> {
  try {
    const { data: pendingJobs, error } = await supabase
      .from("pekerjaan_bisa")
      .select("id, cancel_requested_at, created_at, status, payment_status, pelanggan_id, mitra_id, judul")
      .eq("status", "menunggu_persetujuan_batal");

    if (error || !pendingJobs || pendingJobs.length === 0) return 0;

    let processedCount = 0;
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 3600 * 1000;

    for (const j of pendingJobs) {
      const reqTimeStr = (j as any).cancel_requested_at || j.created_at;
      if (!reqTimeStr) continue;
      const reqTime = new Date(reqTimeStr).getTime();
      if (now - reqTime >= TWENTY_FOUR_HOURS) {
        try {
          await processOrderRefund(j.id, "Batal otomatis: Mitra tidak merespons dalam 24 jam");
          processedCount++;

          try {
            const { ensureConversationAndNavigate } = await import("./chatInbox");
            const convId = await ensureConversationAndNavigate(String(j.pelanggan_id), j.id, false);
            if (convId) {
              const msg = `⏰ Mitra tidak merespons pengajuan pembatalan dalam 24 jam. Pesanan otomatis dibatalkan dan dana dikembalikan ke Saldo Dompet Klien.`;
              await supabase.from("messages").insert({
                conversation_id: convId,
                sender_id: Number(j.pelanggan_id),
                message_type: "system",
                content: msg,
              } as any);
              await supabase.from("conversations").update({
                last_message: msg,
                last_message_at: new Date().toISOString(),
              } as any).eq("id", convId);
            }
          } catch {}
        } catch (e) {
          console.warn("[checkAndProcessExpiredCancellations] job", j.id, e);
        }
      }
    }
    return processedCount;
  } catch (err) {
    console.warn("[checkAndProcessExpiredCancellations] Error:", err);
    return 0;
  }
}
