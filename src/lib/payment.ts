// Library Manajemen Pembayaran, Escrow, dan Komisi Developer untuk BISA Mobile

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
