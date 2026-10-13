import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { checkAndSyncMidtransStatus } from "../lib/midtransDirect";

export interface ProviderJob {
  id: string | number;
  judul: string;
  status: string;
  created_at: string;
  budget: string;
  is_rated?: boolean;
  pelanggan_id?: number | string;
  mitra_id?: number | string;
  agreed_price?: number | null;
  payment_status?: string | null;
  deskripsi?: string;
  expires_at?: string | null;
  is_lamaran?: boolean;
  lamaran_status?: "menunggu" | "ditolak" | "diterima";
  harga_tawaran?: string;
  pesan_lamaran?: string;
}

export type ProviderAktivitasTab = "semua" | "lamaran" | "ditawarkan" | "berjalan" | "selesai" | "dibatalkan";

const BERJALAN = ["mitra_ditemukan", "sedang_dikerjakan", "dikerjakan", "menunggu_konfirmasi_selesai"];
const DIBATALKAN = ["dibatalkan", "ditolak", "expired", "lamaran_ditolak"];

export function useAktivitasProviderLogic() {
  const router = useRouter();
  const [jobs, setJobs] = useState<ProviderJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ProviderAktivitasTab>("semua");
  const realtimeTimeoutRef = useRef<any>(null);

  const fetchMyJobs = useCallback(async (mitraId: string | number, limit = 100) => {
    try {
      setError("");
      // Server expire untuk status yang lewat batas
      try { await supabase.rpc("expire_overdue_jobs"); } catch {}
      
      // 1. Ambil pekerjaan di mana user sudah menjadi mitra yang ditugaskan / ditawarkan
      const { data, error: fetchError } = await supabase
        .from("pekerjaan_bisa")
        .select("id, judul, status, created_at, budget, pelanggan_id, mitra_id, is_rated, agreed_price, payment_status, deskripsi, expires_at, work_file_url, work_link_url, payment_token, payment_url")
        .eq("mitra_id", mitraId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (fetchError) throw fetchError;

      // 2. Ambil pekerjaan di mana user mengajukan diri (pelamar_pekerjaan)
      const { data: pelamarData } = await supabase
        .from("pelamar_pekerjaan")
        .select(`
          id,
          job_id,
          harga_tawaran,
          pesan,
          status,
          created_at,
          pekerjaan:pekerjaan_bisa!job_id (
            id, judul, status, created_at, budget, pelanggan_id, mitra_id, deskripsi, expires_at
          )
        `)
        .eq("mitra_id", mitraId)
        .order("created_at", { ascending: false });

      const assignedJobIds = new Set((data || []).map((j: any) => String(j.id)));
      const lamaranJobs: ProviderJob[] = [];

      if (pelamarData) {
        for (const p of pelamarData as any[]) {
          // Jika job ini sudah ter-assign ke diri sendiri dan ada di list utama, skip agar tidak duplikat
          if (assignedJobIds.has(String(p.job_id))) continue;

          const pJob = p.pekerjaan;
          if (!pJob) continue;

          // Mapping status lamaran untuk tampilan yang jelas
          let mappedStatus = "lamaran_menunggu";
          if (p.status === "ditolak") {
            mappedStatus = "lamaran_ditolak";
          } else if (p.status === "diterima") {
            mappedStatus = "lamaran_diterima";
          }

          lamaranJobs.push({
            id: pJob.id,
            judul: pJob.judul,
            status: mappedStatus,
            created_at: p.created_at || pJob.created_at,
            budget: p.harga_tawaran ? `Rp ${Number(String(p.harga_tawaran).replace(/\D/g, "")).toLocaleString("id-ID")}` : pJob.budget,
            pelanggan_id: pJob.pelanggan_id,
            mitra_id: pJob.mitra_id,
            agreed_price: p.harga_tawaran ? Number(String(p.harga_tawaran).replace(/\D/g, "")) : null,
            deskripsi: pJob.deskripsi,
            expires_at: pJob.expires_at,
            is_lamaran: true,
            lamaran_status: p.status,
            harga_tawaran: p.harga_tawaran,
            pesan_lamaran: p.pesan,
          });
        }
      }

      // client-side soft expire: menunggu_konfirmasi_mitra -> 3 jam default, atau EXPIRES_AT / expires_at
      const now = Date.now();
      const THREE_H = 3 * 3600 * 1000;
      const processed = await Promise.all(
        (data || []).map(async (j: any) => {
          // Auto-sync status: kalau uang sudah masuk Midtrans tapi payment_status belum escrow_held, ubah ke sedang_dikerjakan
          if (
            (j.status === "menunggu_pembayaran" || j.payment_status === "belum_bayar" || j.payment_status === null) &&
            j.status !== "menunggu_persetujuan_batal" &&
            j.status !== "selesai" &&
            j.status !== "dibatalkan" &&
            ((j as any).payment_token || (j as any).payment_url)
          ) {
            try {
              const syncData = await checkAndSyncMidtransStatus(Number(j.id), (j as any).payment_token);
              if (syncData.isPaid) {
                return { ...j, status: "sedang_dikerjakan", payment_status: "escrow_held" } as ProviderJob;
              }
            } catch {}
          }

          if (j.status === "menunggu_konfirmasi_mitra" || j.status === "mencari_mitra") {
            let exp: number | null = null;
            if (j.expires_at) {
              const t = new Date(j.expires_at).getTime();
              if (!isNaN(t)) exp = t;
            }
            if (exp == null) {
              const m = j.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
              if (m) exp = parseInt(m[1], 10);
            }
            if (exp == null && j.status === "menunggu_konfirmasi_mitra") exp = new Date(j.created_at).getTime() + THREE_H;
            if (exp != null && now > exp) {
              try { await supabase.from("pekerjaan_bisa").update({ status: "dibatalkan" }).eq("id", j.id); } catch {}
              return { ...j, status: "dibatalkan" } as ProviderJob;
            }
          }
          return j as ProviderJob;
        })
      );

      // Gabungkan job yang sudah di-assign dan lamaran, urutkan berdasarkan created_at desc
      const combined = [...processed, ...lamaranJobs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setJobs(combined);
    } catch (err: any) {
      setError(err.message || "Gagal memuat aktivitas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: any = null;
    (async () => {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      await fetchMyJobs(stored.id);
      channel = supabase
        .channel(`provider_jobs_${stored.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "pekerjaan_bisa", filter: `mitra_id=eq.${stored.id}` }, () => {
          if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
          realtimeTimeoutRef.current = setTimeout(() => fetchMyJobs(stored.id), 300);
        })
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
    };
  }, [fetchMyJobs, router]);

  const handleOpenChat = useCallback(async (job: ProviderJob) => {
    if (!job.pelanggan_id) { router.push("/p/chat" as any); return; }
    try {
      const { ensureConversationAndNavigate } = await import("../lib/chatInbox");
      const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
      if (convId) router.push(`/p/direct-chat/${convId}?jobId=${job.id}` as any);
      else router.push("/p/chat" as any);
    } catch {
      router.push("/p/chat" as any);
    }
  }, [router]);

  const handleOpenDetail = useCallback((job: ProviderJob) => {
    router.push(`/p/aktivitas/${job.id}` as any);
  }, [router]);

  const isEscrow = useCallback((job: ProviderJob) => Boolean((job as any).agreed_price && (job as any).payment_status === "escrow_held"), []);

  const tabCounts = useMemo(() => ({
    lamaran: jobs.filter((j) => j.is_lamaran).length,
    ditawarkan: jobs.filter((j) => j.status === "menunggu_konfirmasi_mitra").length,
    berjalan: jobs.filter((j) => BERJALAN.includes(j.status)).length,
    selesai: jobs.filter((j) => j.status === "selesai").length,
    dibatalkan: jobs.filter((j) => DIBATALKAN.includes(j.status)).length,
  }), [jobs]);

  const filteredJobs = useMemo(() => {
    if (activeTab === "semua") return jobs;
    if (activeTab === "lamaran") return jobs.filter((j) => j.is_lamaran);
    if (activeTab === "ditawarkan") return jobs.filter((j) => j.status === "menunggu_konfirmasi_mitra");
    if (activeTab === "berjalan") return jobs.filter((j) => BERJALAN.includes(j.status));
    if (activeTab === "selesai") return jobs.filter((j) => j.status === "selesai");
    return jobs.filter((j) => DIBATALKAN.includes(j.status));
  }, [jobs, activeTab]);

  return {
    jobs,
    filteredJobs,
    loading,
    error,
    activeTab,
    setActiveTab,
    tabCounts,
    isEscrow,
    handleOpenChat,
    handleOpenDetail,
    fetchMyJobs,
    router,
  };
}

export type AktivitasProviderLogic = ReturnType<typeof useAktivitasProviderLogic>;
