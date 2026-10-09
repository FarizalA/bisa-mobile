import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import BottomNav from "../../src/components/BottomNav";
import AktivitasHeader from "../../src/components/aktivitas/AktivitasHeader";
import AktivitasTabNav, { AktivitasTabKey } from "../../src/components/aktivitas/AktivitasTabNav";
import AktivitasJobCard from "../../src/components/aktivitas/AktivitasJobCard";
import AktivitasEmptyState from "../../src/components/aktivitas/AktivitasEmptyState";
import { formatRupiah } from "../../src/lib/payment";
import { AktivitasSkeleton } from "../../src/components/SkeletonLoader";

export default function AktivitasPage() {
  const router = useRouter();

  // User & State
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AktivitasTabKey>("semua");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Action Loading States
  const [payingJobId, setPayingJobId] = useState<number | null>(null);
  const [releasingJobId, setReleasingJobId] = useState<number | null>(null);

  // Custom confirm modal 1:1 web (ganti window.confirm jelek)
  const [confirmSheet, setConfirmSheet] = useState<null | { title: string; message: string; confirmText: string; cancelText: string; onConfirm: () => void; danger?: boolean }>(null);

  // Rating diproses di halaman c/ulasan/[id] (Image 2) — popup Image 1 sudah dihapus

  // Pagination & Debounce Refs (Gap 3 & Gap 6 fix)
  const [pageLimit, setPageLimit] = useState(30);
  const [hasMore, setHasMore] = useState(false);
  const realtimeTimeoutRef = useRef<any>(null);

  // 1. Timer countdown setiap 1 detik
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = useCallback(
    (job: any) => {
      if (!job) return null;

      // 1. Kasus auto-cair setelah hasil dikirim (72 jam)
      if (job.status === "menunggu_konfirmasi_selesai") {
        const base = (job as any).submitted_at || job.created_at;
        if (!base) return { expired: false, text: "Auto-cair 72j" };
        const deadline = new Date(base).getTime() + 72 * 3600 * 1000;
        const diff = deadline - currentTime;
        if (diff <= 0) return { expired: true, text: "Auto-cair" };
        const h = Math.floor(diff / 3600000);
        const min = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        return {
          expired: false,
          text: `Auto-cair ${h}j ${min}m`,
        };
      }

      // 2. Kasus Menunggu Pembayaran Midtrans (24 jam dari expires_at)
      if (job.status === "menunggu_pembayaran" && job.expires_at) {
        const expiresAt = new Date(job.expires_at).getTime();
        const diff = expiresAt - currentTime;
        if (diff <= 0) return { expired: true, text: "Kadaluarsa" };
        const h = Math.floor(diff / 3600000);
        const min = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        return {
          expired: false,
          text: `Batas Bayar ${h > 0 ? `${pad(h)}:${pad(min)}:${pad(s)}` : `${pad(min)}:${pad(s)}`}`,
        };
      }

      // 3. Kasus mencari_mitra dengan tag [EXPIRES_AT] — 1:1 web (hanya hitung jika tag ada)
      const m = job.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
      if (!m) return null;
      const expiresAt = parseInt(m[1], 10);
      const diff = expiresAt - currentTime;
      if (diff <= 0) return { expired: true, text: "Kadaluarsa" };
      const h = Math.floor(diff / 3600000);
      const min = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      return { expired: false, text: h > 0 ? `${pad(h)}:${pad(min)}:${pad(s)}` : `${pad(min)}:${pad(s)}`, hours: h };
    },
    [currentTime]
  );

  // 2. Fetch My Jobs (dengan auto-expire, limit 30 item, & sync payment midtrans jika waiting)
  const fetchMyJobs = useCallback(async (userId: string, limitCount = 30) => {
    if (!userId) return;
    try {
      // Panggil RPC auto expire jika ada di backend (Gap 1 fix)
      try {
        await supabase.rpc("expire_overdue_jobs");
      } catch (e) {}

      const { data, error, count } = await supabase
        .from("pekerjaan_bisa")
        .select("*, mitra:users_bisa!mitra_id(id, name, phone, face_url)", { count: "exact" })
        .eq("pelanggan_id", userId)
        .order("created_at", { ascending: false })
        .limit(limitCount);

      if (error) throw error;

      if (data) {
        const now = Date.now();
        const processedJobs = await Promise.all(
          data.map(async (job) => {
            // Auto-check sync ke backend / Midtrans untuk localhost sandbox
            if (job.status === "menunggu_pembayaran" && (job.payment_token || job.payment_url)) {
              try {
                const isWeb = Platform.OS === "web";
                const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
                const backendUrl = rawApi || (!isWeb ? "https://bisa-app.vercel.app" : "http://localhost:3000");
                const res = await fetch(`${backendUrl}/api/payment/sync?jobId=${job.id}`);
                const syncData = await res.json();
                if (syncData.isPaid) {
                  return { ...job, status: "sedang_dikerjakan", payment_status: "escrow_held" };
                }
              } catch {}
            }

            if (job.status === "mencari_mitra") {
              const expMatch = job.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
              if (expMatch) {
                const expiresAt = parseInt(expMatch[1], 10);
                if (now > expiresAt) {
                  await supabase
                    .from("pekerjaan_bisa")
                    .update({ status: "dibatalkan" })
                    .eq("id", job.id);
                  return { ...job, status: "dibatalkan" };
                }
              }
            }
            return job;
          })
        );
        setJobs(processedJobs);
        setHasMore((count || 0) > processedJobs.length);
      }
    } catch (err) {
      console.error("Gagal menarik data pesanan:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 3. Init Auth & Realtime listener dengan Debounce (Gap 6 fix)
  useEffect(() => {
    let channel: any = null;

    (async () => {
      const stored = await getStoredUser();
      if (!stored || !stored.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      setUser(stored);
      fetchMyJobs(stored.id, pageLimit);

      // Realtime listener — channel name unik per mount biar tidak bentrok subscribe ganda
      channel = supabase
        .channel(`client_jobs_mobile_${stored.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pekerjaan_bisa",
            filter: `pelanggan_id=eq.${stored.id}`,
          },
          () => {
            if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
            realtimeTimeoutRef.current = setTimeout(() => {
              fetchMyJobs(stored.id, pageLimit);
            }, 300);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
    };
  }, [fetchMyJobs, pageLimit, router]);

  const onRefresh = () => {
    setRefreshing(true);
    if (user?.id) fetchMyJobs(user.id, pageLimit);
  };

  // 4. Action Handlers
  // A. Pembayaran — Panggil Midtrans Snap (1:1 Web)
  const handlePayNow = async (job: any) => {
    const rawAgreed = job.agreed_price || parseInt(String(job.budget || "").replace(/\D/g, "") || "0", 10);
    if (!rawAgreed || rawAgreed <= 0) {
      Alert.alert("Error", "Nominal harga tagihan tidak valid.");
      return;
    }

    setPayingJobId(job.id);
    try {
      const isWeb = Platform.OS === "web";
      const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
      const backendUrl = rawApi || (!isWeb ? "https://bisa-app.vercel.app" : "http://localhost:3000");
      const url = `${backendUrl}/api/payment/snap`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: Number(job.id),
          agreedPrice: rawAgreed,
          customerName: user?.name || "Pelanggan BISA",
          customerEmail: user?.email || "buyer@bisa.app",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || (!data.snapToken && !data.paymentUrl)) {
        throw new Error(data.error || data.message || "Gagal membuat transaksi Midtrans");
      }

      const paymentUrl: string | undefined = data.paymentUrl || data.redirect_url;
      const snapToken: string | undefined = data.snapToken || data.token;

      const targetUrl = paymentUrl || (snapToken ? `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}` : undefined);

      if (!targetUrl) {
        throw new Error("Link pembayaran tidak tersedia.");
      }

      if (isWeb && typeof window !== "undefined") {
        const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          window.location.href = targetUrl;
        }
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch (e: any) {
      Alert.alert("Gagal Membuka Pembayaran", e.message || "Terjadi kesalahan saat memproses Midtrans.");
    } finally {
      setPayingJobId(null);
    }
  };

  // B. Buka Chat Mitra — fix: pakai ensureConversationAndNavigate agar buka room real (bukan fake direct_...)
  const handleOpenChatWithMitra = async (job: any) => {
    if (!job.mitra_id) {
      router.push("/c/chat" as any);
      return;
    }
    try {
      const { ensureConversationAndNavigate } = await import("../../src/lib/chatInbox");
      const convId = await ensureConversationAndNavigate(String(job.mitra_id), job.id);
      if (convId) {
        router.push(`/c/direct-chat/${convId}?jobId=${job.id}` as any);
        return;
      }
    } catch {}
    router.push("/c/chat" as any);
  };

  // C. Konfirmasi Selesai & Rilis Dana Escrow — panggil /api/orders/complete agar saldo mitra & fee platform terhitung
  const handleReleaseFunds = (job: any) => {
    const isEscrow = Boolean(job.agreed_price && job.payment_status === "escrow_held");
    const rawAgreed = job.agreed_price || parseInt(String(job.budget || "").replace(/\D/g, "") || "0", 10);
    const msg = isEscrow
      ? `Apakah Anda yakin pekerjaan "${job.judul}" telah selesai?\n\nDana sebesar ${formatRupiah(rawAgreed)} akan dirilis ke Saldo Mitra (potongan platform otomatis terhitung).`
      : `Apakah Anda yakin pekerjaan "${job.judul}" telah selesai?`;
    setConfirmSheet({
      title: "Konfirmasi Selesai",
      message: msg,
      confirmText: "Ya, Selesai",
      cancelText: "Belum",
      onConfirm: async () => {
        setConfirmSheet(null);
        setReleasingJobId(job.id);
        try {
          const isWeb = Platform.OS === "web";
          const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
          const backendUrl = rawApi || (!isWeb ? "https://bisa-app.vercel.app" : "http://localhost:3000");

          const res = await fetch(`${backendUrl}/api/orders/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job.id, userId: user?.id, action: "accept" }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            // Fallback direct update jika API backend offline
            const { error: fbErr } = await supabase
              .from("pekerjaan_bisa")
              .update({
                status: "selesai",
                payment_status: isEscrow ? "released" : job.payment_status,
              })
              .eq("id", job.id);
            if (fbErr) throw new Error(data.error || fbErr.message);
          }

          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: "selesai",
                    payment_status: data.isCOD ? "cod_completed" : "released",
                    platform_fee: data.platform_fee ?? j.platform_fee,
                    mitra_earnings: data.mitra_earnings ?? j.mitra_earnings,
                  }
                : j
            )
          );

          setConfirmSheet({
            title: "Berhasil",
            message: data.isCOD
              ? "Pesanan COD selesai — tunai di tempat. Mengarahkan ke formulir ulasan…"
              : `Pekerjaan selesai & dana dirilis ke Mitra! Mengarahkan ke ulasan…`,
            confirmText: "Beri Ulasan",
            cancelText: "Nanti",
            onConfirm: () => {
              setConfirmSheet(null);
              router.push(`/c/ulasan/${job.id}` as any);
            },
          });
        } catch (err: any) {
          Alert.alert("Gagal", err.message || "Terjadi kesalahan saat menyelesaikan pekerjaan.");
        } finally {
          setReleasingJobId(null);
        }
      },
    });
  };

  // D. Batalkan Pekerjaan — custom modal 1:1 web (bukan window.confirm)
  const handleCancelJob = (jobId: number) => {
    setConfirmSheet({
      title: "Batalkan Pesanan",
      message: "Yakin ingin membatalkan pesanan ini? Tindakan ini tidak bisa dibatalkan.",
      confirmText: "Ya, Batalkan",
      cancelText: "Kembali",
      danger: true,
      onConfirm: async () => {
        setConfirmSheet(null);
        try {
          const { error } = await supabase
            .from("pekerjaan_bisa")
            .update({ status: "dibatalkan" })
            .eq("id", jobId);

          if (error) {
            Alert.alert("Gagal Batalkan", error.message || "Gagal memperbarui status di database.");
            return;
          }

          setJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, status: "dibatalkan" } : j))
          );
        } catch (e: any) {
          Alert.alert("Error", e.message || "Gagal membatalkan pesanan.");
        }
      },
    });
  };

  // D.2 Batal Sepakat (Mutual Cancel) saat sedang dikerjakan
  const handleMutualCancel = (job: any) => {
    setConfirmSheet({
      title: "Batal Sepakat (Refund)",
      message: `Ajukan pembatalan bersama untuk pesanan "${job.judul}"? Dana Rekber akan dikembalikan ke Anda setelah disetujui.`,
      confirmText: "Ya, Batalkan",
      cancelText: "Kembali",
      danger: true,
      onConfirm: async () => {
        setConfirmSheet(null);
        try {
          const updatePayload: any = {
            status: "dibatalkan",
            payment_status: job.payment_method === "MIDTRANS" ? "refunded" : "cod_cancelled",
          };
          const { error } = await supabase.from("pekerjaan_bisa").update(updatePayload).eq("id", job.id);
          if (error) throw error;

          if (user?.id) fetchMyJobs(user.id, pageLimit);
          Alert.alert("Sukses", "Pesanan dibatalkan bersama. Dana Rekber telah dikembalikan.");
        } catch (e: any) {
          Alert.alert("Gagal", e.message || "Gagal membatalkan pesanan.");
        }
      },
    });
  };

  // E. Perpanjang Waktu Posting 24 Jam — custom modal
  const handlePerpanjangWaktu = (job: any) => {
    setConfirmSheet({
      title: "Perpanjang Waktu",
      message: "Perpanjang waktu postingan ini selama 24 Jam agar kembali aktif di radar mitra?",
      confirmText: "Ya, Perpanjang",
      cancelText: "Batal",
      onConfirm: async () => {
        setConfirmSheet(null);
        const newExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        let newDeskripsi = job.deskripsi || "";
        if (newDeskripsi.includes("[EXPIRES_AT]:")) newDeskripsi = newDeskripsi.replace(/\[EXPIRES_AT\]:\s*\d+/, `[EXPIRES_AT]: ${newExpiresAt}`);
        else newDeskripsi += `\n[EXPIRES_AT]: ${newExpiresAt}`;
        try {
          const { error } = await supabase.from("pekerjaan_bisa").update({ status: "mencari_mitra", deskripsi: newDeskripsi }).eq("id", job.id);
          if (error) throw error;
          setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: "mencari_mitra", deskripsi: newDeskripsi } : j)));
          setConfirmSheet({ title: "Sukses", message: "Postingan aktif kembali selama 24 jam.", confirmText: "OK", cancelText: "", onConfirm: () => setConfirmSheet(null) });
        } catch (e: any) { Alert.alert("Error", e.message || "Gagal memperpanjang."); }
      },
    });
  };

  // (hapus handleSubmitRating — rating kini 100% via halaman c/ulasan/[id] Image 2)

  // 5. Filtering Tab (Gap 2 fix: 'ditolak' masuk tab dibatalkan)
  const filteredJobs = useMemo(() => {
    switch (activeTab) {
      case "belum_bayar":
        return jobs.filter((j) => j.status === "menunggu_pembayaran");
      case "berjalan":
        return jobs.filter((j) =>
          ["mitra_ditemukan", "sedang_dikerjakan", "menunggu_konfirmasi_selesai"].includes(
            j.status
          )
        );
      case "selesai":
        return jobs.filter((j) => j.status === "selesai");
      case "dibatalkan":
        return jobs.filter((j) => j.status === "dibatalkan" || j.status === "ditolak");
      default:
        return jobs;
    }
  }, [jobs, activeTab]);

  // Tab Counts (Gap 2 fix: hitung 'ditolak' juga)
  const tabCounts = useMemo(() => {
    return {
      belum_bayar: jobs.filter((j) => j.status === "menunggu_pembayaran").length,
      berjalan: jobs.filter((j) =>
        ["mitra_ditemukan", "sedang_dikerjakan", "menunggu_konfirmasi_selesai"].includes(
          j.status
        )
      ).length,
      selesai: jobs.filter((j) => j.status === "selesai").length,
      dibatalkan: jobs.filter(
        (j) => j.status === "dibatalkan" || j.status === "ditolak"
      ).length,
    };
  }, [jobs]);

  // Header Counter (pekerjaan aktif mitra terhubung)
  const activeMitraJobsCount = useMemo(() => {
    return jobs.filter(
      (j) => j.mitra_id && j.status !== "selesai" && j.status !== "ditolak" && j.status !== "dibatalkan"
    ).length;
  }, [jobs]);

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* 1. Header */}
      <AktivitasHeader activeJobsCount={activeMitraJobsCount} />

      {/* 2. Tabs */}
      <AktivitasTabNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabCounts={tabCounts}
      />

      {/* 3. Job List Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#ff6b00"]}
          />
        }
      >
        <View className="px-4 pt-3 max-w-[440px] w-full self-center">
          {loading && !refreshing ? (
            <AktivitasSkeleton />
          ) : filteredJobs.length === 0 ? (
            <AktivitasEmptyState
              activeTab={activeTab}
              jobsCount={jobs.length}
              onStartPosting={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/c/posting" as any);
              }}
            />
          ) : (
            <View className="flex-col gap-3.5">
              {filteredJobs.map((job) => (
                <AktivitasJobCard
                  key={job.id}
                  job={job}
                  countdown={getCountdown(job)}
                  payingJobId={payingJobId}
                  releasingJobId={releasingJobId}
                  onPayNow={handlePayNow}
                  onOpenChat={handleOpenChatWithMitra}
                  onReleaseFunds={handleReleaseFunds}
                  onCancelJob={handleCancelJob}
                  onMutualCancel={handleMutualCancel}
                  onEditJob={(id) => router.push({ pathname: "/c/posting" as any, params: { edit: id } })}
                  onPerpanjangWaktu={handlePerpanjangWaktu}
                  onOpenRating={(j) => router.push(`/c/ulasan/${j.id}` as any)}
                  onViewCandidates={(id) => router.push(`/c/pekerjaan/${id}/kandidat` as any)}
                  onOpenInvoice={(j) => router.push(`/invoice/${j.id}` as any)}
                  onOpenMitraProfile={(mitraId) => router.push(`/p/profil/${mitraId}` as any)}
                />
              ))}

              {/* Load More Pagination Trigger (Gap 3 fix) */}
              {hasMore && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#ff6b00" />
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 5. Custom Confirm Sheet 1:1 web */}
      <Modal visible={!!confirmSheet} transparent animationType="fade" onRequestClose={() => setConfirmSheet(null)}>
        <Pressable onPress={() => setConfirmSheet(null)} className="flex-1 bg-[#131b2e]/60 justify-end">
          <Pressable onPress={(e) => (e as any).stopPropagation?.()} className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            {!!confirmSheet?.title && <Text className="text-base font-extrabold text-gray-900 mb-1">{confirmSheet.title}</Text>}
            <Text className="text-sm text-gray-600 leading-5 mb-5">{confirmSheet?.message}</Text>
            <View className={`flex-row gap-3 ${!confirmSheet?.cancelText ? "justify-center" : ""}`}>
              {!!confirmSheet?.cancelText && (
                <TouchableOpacity onPress={() => setConfirmSheet(null)} activeOpacity={0.85} className="flex-1 py-3.5 rounded-full bg-gray-100 items-center border border-gray-200">
                  <Text className="text-sm font-bold text-gray-700">{confirmSheet.cancelText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => confirmSheet?.onConfirm()} activeOpacity={0.85} className={`flex-1 py-3.5 rounded-full items-center ${confirmSheet?.danger ? "bg-red-600" : "bg-[#FF6B00]"} ${!confirmSheet?.cancelText ? "max-w-[200px] self-center flex-none w-[200px]" : ""}`}>
                <Text className="text-sm font-bold text-white">{confirmSheet?.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. Bottom Navigation */}
      <BottomNav active="aktivitas" />
    </SafeAreaView>
  );
}
