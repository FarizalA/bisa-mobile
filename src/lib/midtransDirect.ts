import { PaymentBreakdown } from "./payment";

export interface CreatePaymentParams {
  jobId: number;
  agreedPrice: number;
  customerName?: string;
  customerEmail?: string;
}

export interface PaymentGatewayResponse {
  success: boolean;
  orderId: string;
  snapToken?: string;
  paymentUrl?: string;
  breakdown: PaymentBreakdown;
  message?: string;
}

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "https://bisa-admin.vercel.app").replace(/\/$/, "");

/**
 * Request transaksi Snap via Backend Vercel (Secure).
 */
export async function createMidtransSnapTransaction(
  params: CreatePaymentParams
): Promise<PaymentGatewayResponse> {
  try {
    const { getSupabaseToken } = await import("./auth");
    const token = await getSupabaseToken();
    const res = await fetch(`${API_BASE}/api/payment/snap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => ({ success: false, message: "Gagal memproses data server." }));
    return data;
  } catch (err: any) {
    return {
      success: false,
      orderId: "",
      breakdown: {} as any,
      message: err.message || "Gagal menghubungi server BISA.",
    };
  }
}

/**
 * Cek status transaksi via Backend Vercel (Secure).
 */
export async function checkAndSyncMidtransStatus(
  jobId: number,
  orderIdParam?: string
): Promise<{ success: boolean; isPaid: boolean; status?: string }> {
  try {
    const { getSupabaseToken } = await import("./auth");
    const token = await getSupabaseToken();
    const url = new URL(`${API_BASE}/api/payment/status`);
    url.searchParams.append("jobId", String(jobId));
    if (orderIdParam) url.searchParams.append("orderId", orderIdParam);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({ success: false }));
    return data;
  } catch (err) {
    console.warn("Gagal cek status via server:", err);
    return { success: false, isPaid: false };
  }
}
