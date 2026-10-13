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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import AktivitasHeader from "../../src/components/aktivitas/AktivitasHeader";
import AktivitasTabNav, { AktivitasTabKey } from "../../src/components/aktivitas/AktivitasTabNav";
import AktivitasJobCard from "../../src/components/aktivitas/AktivitasJobCard";
import AktivitasEmptyState from "../../src/components/aktivitas/AktivitasEmptyState";
import {
  formatRupiah,
  processOrderRefund,
  requestOrderCancellation,
  checkAndProcessExpiredCancellations,
  submitOrderDispute,
} from "../../src/lib/payment";
import { AktivitasSkeleton } from "../../src/components/SkeletonLoader";
import { checkAndSyncMidtransStatus } from "../../src/lib/midtransDirect";

export default function AktivitasPage() {
  const router = useRouter();

  // User & State
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AktivitasTabKey>("semua");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Action Loading States
  const [payingJobId, setPayingJobId] = useState<number | null>(null);
  const [releasingJobId, setReleasingJobId] = useState<number | null>(null);

  // Custom confirm modal 1:1 web (ganti window.confirm jelek)
  const [confirmSheet, setConfirmSheet] = useState<null | { title: string; message: string; confirmText: string; cancelText: string; onConfirm: () => void; danger?: boolean }>(null);

  // Modal Pengajuan Pembatalan oleh Klien (Mitra diberi 24 jam)
  const [cancelModal, setCancelModal] = useState<{ visible: boolean; job: any; reason: string; loading: boolean }>({
    visible: false,
    job: null,
    reason: "",
    loading: false,
  });

  // Modal Ajukan Sengketa (Fase 4)
  const [disputeModal, setDisputeModal] = useState<{ visible: boolean; job: any; reason: string; loading: boolean }>({
    visible: false,
    job: null,
    reason: "",
    loading: false,
  });

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
      // Auto-refund pembatalan yang telah melewati 24 jam tanpa respon mitra
      try {
        await checkAndProcessExpiredCancellations();
      } catch (e) {}

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
            // Auto-check sync langsung ke Midtrans API (tidak bergantung server Vercel)
            if (
              (job.status === "menunggu_pembayaran" || job.payment_status === "belum_bayar" || job.payment_status === null) &&
              job.status !== "menunggu_persetujuan_batal" &&
              job.status !== "selesai" &&
              job.status !== "dibatalkan" &&
              (job.payment_token || job.payment_url)
            ) {
              try {
                const syncData = await checkAndSyncMidtransStatus(job.id, job.payment_token);
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

  useFocusEffect(
    useCallback(() => {
      checkAndProcessExpiredCancellations().catch(() => {});
      if (user?.id) {
        fetchMyJobs(user.id, pageLimit);
      }
    }, [user?.id, pageLimit, fetchMyJobs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    checkAndProcessExpiredCancellations().catch(() => {});
    if (user?.id) fetchMyJobs(user.id, pageLimit);
  };

  // 4. Action Handlers
  // A. Pembayaran — Panggil Midtrans Snap (1:1 Web + Mobile Direct Fallback)
  const handlePayNow = async (job: any) => {
    const rawAgreed = job.agreed_price || parseInt(String(job.budget || "").replace(/\D/g, "") || "0", 10);
    if (!rawAgreed || rawAgreed <= 0) {
      Alert.alert("Error", "Nominal harga tagihan tidak valid.");
      return;
    }

    setPayingJobId(job.id);
    try {
      const isWeb = Platform.OS === "web";
      let paymentUrl: string | undefined;
      let snapToken: string | undefined;

      // 1. Coba backend Vercel dulu
      try {
        const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
        const backendUrl = rawApi || "https://bisa-admin.vercel.app";
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

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          paymentUrl = data.paymentUrl || data.redirect_url;
          snapToken = data.snapToken || data.token;
        }
      } catch (beErr) {
        console.warn("Backend Vercel error, fallback ke Direct Midtrans:", beErr);
      }

      // 2. Jika backend 404 / gagal, gunakan Direct Midtrans Snap API resmi
      if (!paymentUrl && !snapToken) {
        const { createMidtransSnapTransaction } = await import("../../src/lib/midtransDirect");
        const directRes = await createMidtransSnapTransaction({
          jobId: Number(job.id),
          agreedPrice: rawAgreed,
          customerName: user?.name || "Pelanggan BISA",
          customerEmail: user?.email || "buyer@bisa.app",
        });

        if (!directRes.success || (!directRes.paymentUrl && !directRes.snapToken)) {
          throw new Error(directRes.message || "Gagal membuat transaksi Midtrans.");
        }

        paymentUrl = directRes.paymentUrl;
        snapToken = directRes.snapToken;
      }

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
  const handleReleaseFunds = async (job: any) => {
    const isEscrow = Boolean(job.agreed_price && job.payment_status === "escrow_held");
    const isCOD = job.payment_method === "COD" || job.payment_status === "cod_pending" || job.payment_status === "cod_completed";
    const rawAgreed = job.agreed_price || parseInt(String(job.budget || "").replace(/\D/g, "") || "0", 10);
    
    // SYNC STATUS PEMBAYARAN TERLEBIH DAHULU JIKA BELUM TERCERMIN
    let effectivePaidEscrow = isEscrow;
    if (!isEscrow && !isCOD && job.status !== "menunggu_pembayaran") {
      try {
        const syncData = await checkAndSyncMidtransStatus(job.id, job.payment_token);
        if (syncData.isPaid) {
          // Update local state dengan status baru
          setJobs((prev) => prev.map((j) => 
            j.id === job.id ? { ...j, status: "sedang_dikerjakan", payment_status: "escrow_held" } : j
          ));
          effectivePaidEscrow = true;
        } else {
          Alert.alert(
            "Pembayaran Belum Terdeteksi",
            "Sistem belum mendeteksi pembayaran masuk. Silakan tunggu atau coba lagi nanti.\nJika sudah bayar, pastikan transaksi berhasil."
          );
          return;
        }
      } catch (e: any) {
        console.error("Sync error:", e);
        Alert.alert("Gagal Sinkronisasi", "Tidak dapat mengecek status pembayaran.");
        return;
      }
    }
    
    const msg = effectivePaidEscrow || isCOD
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
          const backendUrl = rawApi || (!isWeb ? "https://bisa-admin.vercel.app" : "http://localhost:3000");

          const res = await fetch(`${backendUrl}/api/order/action`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await (await import("../../src/lib/auth")).getSupabaseToken()}`,
            },
            body: JSON.stringify({ jobId: job.id, action: "release" }),
          });

          const data = await res.json().catch(() => ({}));
          
          if (!res.ok || data.success === false) {
            throw new Error(data.error || data.message || "Gagal merilis dana escrow");
          }

          const isCODFinal = data.isCOD || job.payment_method === "COD";

          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: "selesai",
                    payment_status: isCODFinal ? "cod_completed" : "released",
                    platform_fee: data.fee ?? j.platform_fee,
                    mitra_earnings: data.earnings ?? j.mitra_earnings,
                  }
                : j
            )
          );

          setConfirmSheet({
            title: "Berhasil",
            message: isCODFinal
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
          const res = await processOrderRefund(jobId, "Dibatalkan oleh Klien");
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: "dibatalkan", payment_status: res.refunded ? "refunded" : "cancelled" } : j
            )
          );
          if (res.refunded) {
            Alert.alert(
              "Sukses",
              `Pesanan dibatalkan. Dana sebesar Rp ${res.amount.toLocaleString("id-ID")} telah dikembalikan ke saldo Dompet Anda dan dapat ditarik.`
            );
          } else {
            Alert.alert("Sukses", "Pesanan telah dibatalkan.");
          }
        } catch (e: any) {
          Alert.alert("Error", e.message || "Gagal membatalkan pesanan.");
        }
      },
    });
  };

  // D.2 Batal Sepakat / Pengajuan Pembatalan saat sedang dikerjakan (Mitra harus menyetujui, max 24 jam)
  const handleMutualCancel = (job: any) => {
    setCancelModal({
      visible: true,
      job,
      reason: "",
      loading: false,
    });
  };

  const handleSubmitCancelRequest = async () => {
    if (!cancelModal.job) return;
    setCancelModal((p) => ({ ...p, loading: true }));
    try {
      const reasonText = cancelModal.reason.trim() || "Klien mengajukan pembatalan pesanan";
      await requestOrderCancellation(cancelModal.job.id, reasonText);
      setCancelModal({ visible: false, job: null, reason: "", loading: false });
      Alert.alert(
        "Pengajuan Pembatalan Dikirim",
        "Pengajuan telah dikirim ke Mitra. Mitra memiliki waktu 24 jam untuk merespon. Jika Mitra tidak merespon dalam 24 jam, dana otomatis dikembalikan ke saldo dompet Anda."
      );
      if (user?.id) fetchMyJobs(user.id, pageLimit);
    } catch (e: any) {
      Alert.alert("Gagal", e.message || "Gagal mengajukan pembatalan.");
      setCancelModal((p) => ({ ...p, loading: false }));
    }
  };

  // F. Ajukan Sengketa ke Admin (Fase 4) — saat hasil kerja tidak sesuai
  const handleDispute = (job: any) => {
    setDisputeModal({ visible: true, job, reason: "", loading: false });
  };

  const handleSubmitDispute = async () => {
    if (!disputeModal.job) return;
    const reason = disputeModal.reason.trim();
    if (reason.length < 10) {
      Alert.alert("Alasan Terlalu Singkat", "Mohon jelaskan sengketa minimal 10 karakter agar Admin bisa meninjau.");
      return;
    }
    setDisputeModal((p) => ({ ...p, loading: true }));
    try {
      await submitOrderDispute(disputeModal.job.id, reason);
      setDisputeModal({ visible: false, job: null, reason: "", loading: false });
      Alert.alert(
        "Sengketa Diajukan",
        "Admin akan meninjau bukti & chat Anda. Dana ditahan sampai keputusan: released ke Mitra atau refund ke Saldo Anda."
      );
      if (user?.id) fetchMyJobs(user.id, pageLimit);
    } catch (e: any) {
      Alert.alert("Gagal", e.message || "Gagal mengajukan sengketa.");
      setDisputeModal((p) => ({ ...p, loading: false }));
    }
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
          [
            "mitra_ditemukan",
            "sedang_dikerjakan",
            "menunggu_konfirmasi_selesai",
            "menunggu_persetujuan_batal",
          ].includes(j.status)
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
        [
          "mitra_ditemukan",
          "sedang_dikerjakan",
          "menunggu_konfirmasi_selesai",
          "menunggu_persetujuan_batal",
        ].includes(j.status)
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
                  onDispute={handleDispute}
                  disputeReason={(job as any).dispute_reason ?? null}
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

      {/* 6. Modal Pengajuan Pembatalan Klien (Mitra diberi 24 Jam) */}
      <Modal
        visible={cancelModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancelModal.loading) setCancelModal((p) => ({ ...p, visible: false }));
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: "#ffffff", borderRadius: 24, padding: 20, width: "100%", maxWidth: 360, gap: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Ajukan Pembatalan</Text>
              <TouchableOpacity
                onPress={() => setCancelModal((p) => ({ ...p, visible: false }))}
                disabled={cancelModal.loading}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#6b7280" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: "#4b5563", lineHeight: 18 }}>
              Pekerjaan sedang berlangsung. Pengajuan pembatalan akan dikirimkan ke Mitra. Mitra memiliki waktu <Text style={{ fontWeight: "bold", color: "#b45309" }}>24 jam</Text> untuk merespon. Jika Mitra tidak merespon dalam 24 jam, dana otomatis di-refund ke saldo dompet Anda.
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151" }}>Alasan Pembatalan (Opsional):</Text>
              <TextInput
                value={cancelModal.reason}
                onChangeText={(text) => setCancelModal((p) => ({ ...p, reason: text }))}
                placeholder="Contoh: Mitra belum mulai / ada perubahan rencana..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: "#f9fafb",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 12,
                  color: "#111827",
                  minHeight: 70,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setCancelModal((p) => ({ ...p, visible: false }))}
                disabled={cancelModal.loading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#4b5563" }}>Kembali</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitCancelRequest}
                disabled={cancelModal.loading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" }}
              >
                {cancelModal.loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#ffffff" }}>Kirim Pengajuan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ajukan Sengketa Klien (Fase 4) */}
      <Modal
        visible={disputeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!disputeModal.loading) setDisputeModal((p) => ({ ...p, visible: false }));
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: "#ffffff", borderRadius: 24, padding: 20, width: "100%", maxWidth: 360, gap: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Ajukan Sengketa</Text>
                <Text style={{ fontSize: 10, color: "#6b7280" }}>Ditinjau Admin BISA</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDisputeModal((p) => ({ ...p, visible: false }))}
                disabled={disputeModal.loading}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fbbf24" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#92400e" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: "#4b5563", lineHeight: 18 }}>
              Hasil kerja tidak sesuai? Ajukan sengketa ke Admin. Dana akan <Text style={{ fontWeight: "900", color: "#92400e" }}>ditahan</Text> sampai Admin memutuskan: rilis ke Mitra atau refund ke Saldo Anda. Diskusikan dulu via Chat jika masih bisa.
            </Text>

            <View style={{ backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fbbf24", borderRadius: 12, padding: 10, flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 10, color: "#92400e", flex: 1, lineHeight: 15 }}>
                Pastikan chat & bukti lengkap. Admin akan meninjau bukti sebelum memutuskan.
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151" }}>Alasan Sengketa (min. 10 karakter):</Text>
              <TextInput
                value={disputeModal.reason}
                onChangeText={(text) => setDisputeModal((p) => ({ ...p, reason: text }))}
                placeholder="Jelaskan kronologi & alasan sengketa..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: "#f9fafb",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 12,
                  color: "#111827",
                  minHeight: 90,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setDisputeModal((p) => ({ ...p, visible: false }))}
                disabled={disputeModal.loading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#4b5563" }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitDispute}
                disabled={disputeModal.loading}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: "#d97706", alignItems: "center", justifyContent: "center" }}
              >
                {disputeModal.loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#ffffff" }}>Ajukan Sengketa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
