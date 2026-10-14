import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { useKycGate } from "./useKycGate";

export interface Job {
  id: string;
  created_at: string;
  pelanggan_id?: string;
  pelanggan_name: string;
  pelanggan_face_url: string | null;
  judul: string;
  kategori: string;
  deskripsi: string;
  budget: string;
  lokasi: string;
  distance_km: number;
  is_online: boolean;
  latitude?: number;
  longitude?: number;
}

export function useCariKerjaLogic() {
  const params = useLocalSearchParams();
  const targetJobId = params?.jobId ? String(params.jobId) : null;
  const kycGate = useKycGate();

  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [radius, setRadius] = useState(1);
  const [activeCategory, setActiveCategory] = useState("Semua Jasa");

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortPrice, setSortPrice] = useState<"normal" | "tertinggi" | "terendah">("normal");
  const [sortDistance, setSortDistance] = useState<"terdekat" | "terjauh">("terdekat");
  const [mitraLoc, setMitraLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const [isApplying, setIsApplying] = useState(false);
  const [applyHarga, setApplyHarga] = useState("");
  const [applyPesan, setApplyPesan] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});

  const [cancelConfirm, setCancelConfirm] = useState<{ show: boolean; jobId: string | null }>({
    show: false,
    jobId: null,
  });

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" | "info" }>({
    show: false,
    message: "",
    type: "success",
  });
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (deskripsi: string) => {
    const m = deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
    if (!m) return null;
    const expiresAt = parseInt(m[1], 10);
    const diff = expiresAt - currentTime;
    if (diff <= 0) return { expired: true, text: "Kadaluarsa" };
    const h = Math.floor(diff / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return { expired: false, text: h > 0 ? `${pad(h)}:${pad(min)}:${pad(s)}` : `${pad(min)}:${pad(s)}`, hours: h };
  };

  const parseDeskripsi = (deskripsi: string) => {
    let textDesc = deskripsi || "";
    let fotoUrl: string | null = null;
    let infoTambahan: string[] | null = null;

    const fotoMatch = textDesc.match(/\[FOTO LAMPIRAN\]:\s*(https?:\/\/[^\s]+)/);
    if (fotoMatch && fotoMatch[1]) {
      fotoUrl = fotoMatch[1];
      textDesc = textDesc.replace(fotoMatch[0], "").trim();
    }

    const infoTambahanIndex = textDesc.indexOf("[INFO TAMBAHAN]");
    if (infoTambahanIndex !== -1) {
      const rawInfo = textDesc.substring(infoTambahanIndex);
      textDesc = textDesc.substring(0, infoTambahanIndex).trim();
      infoTambahan = rawInfo
        .replace("[INFO TAMBAHAN]", "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("Koordinat GPS") && !line.includes("[EXPIRES_AT]"));
    }

    return { textDesc, fotoUrl, infoTambahan };
  };

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Baru saja";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} mnt yang lalu`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari yang lalu`;
  };

  const extractPrice = (budgetStr: string) => {
    const num = budgetStr.replace(/[^0-9]/g, "");
    return num ? parseInt(num) : 0;
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortPrice === "tertinggi") {
      const diff = extractPrice(b.budget) - extractPrice(a.budget);
      if (diff !== 0) return diff;
    }
    if (sortPrice === "terendah") {
      const diff = extractPrice(a.budget) - extractPrice(b.budget);
      if (diff !== 0) return diff;
    }
    if (sortDistance === "terdekat") return (a.distance_km ?? 9999) - (b.distance_km ?? 9999);
    if (sortDistance === "terjauh") return (b.distance_km ?? 9999) - (a.distance_km ?? 9999);
    return 0;
  });

  const fetchNearbyJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        setError("Sesi habis, silakan login kembali.");
        setLoading(false);
        return;
      }
      setUser(stored);

      const { data: mitraData, error: mitraError } = await supabase
        .from("users_bisa")
        .select("latitude, longitude")
        .eq("id", stored.id)
        .single();

      if (mitraError) throw mitraError;
      if (!mitraData?.latitude || !mitraData?.longitude) {
        throw new Error("Lokasi Anda belum diatur. Mohon perbarui profil lokasi Anda.");
      }

      setMitraLoc({ lat: mitraData.latitude, lng: mitraData.longitude });

      const { data: jobsData, error: jobsError } = await supabase.rpc("get_nearby_jobs", {
        provider_lat: mitraData.latitude,
        provider_lon: mitraData.longitude,
        search_radius_km: radius,
        search_query: searchQuery,
        filter_kategori: activeCategory,
      });

      let rawJobs: any[] | null = null;

      if (jobsError) {
        // Fallback: RPC bisa gagal karena mismatch tipe enum (42804) di sisi DB.
        // Ambil langsung dari tabel lalu hitung jarak di sisi klien agar app tetap jalan.
        console.warn("[fetchNearbyJobs] RPC gagal, pakai fallback tabel:", jobsError.message);
        const { data: fb, error: fbErr } = await supabase
          .from("pekerjaan_bisa")
          .select("*, pelanggan:users_bisa!pelanggan_id(name, face_url)")
          .eq("status", "mencari_mitra")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("created_at", { ascending: false })
          .limit(200);

        if (fbErr) throw fbErr;

        const R = 6371;
        const toRad = (d: number) => (d * Math.PI) / 180;
        rawJobs = (fb || []).map((j: any) => {
          const dLat = toRad(j.latitude - mitraData.latitude);
          const dLon = toRad(j.longitude - mitraData.longitude);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(mitraData.latitude)) *
              Math.cos(toRad(j.latitude)) *
              Math.sin(dLon / 2) ** 2;
          const distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return {
            ...j,
            pelanggan_name: j.pelanggan?.name || "Pelanggan",
            pelanggan_face_url: j.pelanggan?.face_url || null,
            distance_km,
          };
        });
      } else {
        rawJobs = jobsData;
      }

      const filtered = (rawJobs || []).filter((job: any) => {
        if (String(job.pelanggan_id) === String(stored.id)) return false;
        const m = job.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
        if (m && Date.now() > parseInt(m[1], 10)) return false;
        // Filter radius & kategori dipakai saat fallback (RPC sudah memfilternya)
        if (jobsError) {
          if (typeof job.distance_km === "number" && job.distance_km > radius) return false;
          if (activeCategory && activeCategory !== "Semua Jasa" && job.kategori !== activeCategory) return false;
        }
        return true;
      });
      setJobs(filtered);

      const { data: appliedData } = await supabase
        .from("pelamar_pekerjaan")
        .select("job_id")
        .eq("mitra_id", stored.id);

      if (appliedData) {
        const appliedMap: Record<string, boolean> = {};
        appliedData.forEach((app: any) => (appliedMap[String(app.job_id)] = true));
        setAppliedJobs(appliedMap);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal mengambil data pekerjaan");
    } finally {
      setLoading(false);
    }
  }, [radius, searchQuery, activeCategory]);

  useEffect(() => {
    fetchNearbyJobs();
  }, [fetchNearbyJobs]);

  // Auto-open job detail if navigated with jobId query param (e.g. from Home "Ambil Job")
  useEffect(() => {
    if (!targetJobId) return;

    const findAndSelect = async () => {
      const match = jobs.find((j) => String(j.id) === targetJobId);
      if (match) {
        setSelectedJob(match);
        return;
      }

      // Jika belum ada di list terdekat, ambil langsung dari DB
      try {
        const { data: singleJob } = await supabase
          .from("pekerjaan_bisa")
          .select("*, pelanggan:users_bisa!pelanggan_id(name, phone, face_url)")
          .eq("id", targetJobId)
          .single();

        if (singleJob) {
          const formatted: Job = {
            id: String(singleJob.id),
            created_at: singleJob.created_at,
            pelanggan_id: String(singleJob.pelanggan_id),
            pelanggan_name: singleJob.pelanggan?.name || "Pelanggan",
            pelanggan_face_url: singleJob.pelanggan?.face_url || null,
            judul: singleJob.judul || "Permintaan Layanan",
            kategori: singleJob.kategori || "Jasa Umum",
            deskripsi: singleJob.deskripsi || "",
            budget: typeof singleJob.budget === "number" ? `Rp ${singleJob.budget.toLocaleString("id-ID")}` : String(singleJob.budget || "Nego"),
            lokasi: singleJob.lokasi || "Di Lokasi",
            distance_km: 0,
            is_online: Boolean(singleJob.is_online),
            latitude: singleJob.latitude,
            longitude: singleJob.longitude,
          };
          setSelectedJob(formatted);
        }
      } catch (e) {
        console.error("Error auto fetching job by id:", e);
      }
    };

    findAndSelect();
  }, [targetJobId, jobs]);

  const handleApplyJob = async (jobId: string) => {
    if (!user) {
      showToast("Sesi habis, silakan login kembali.", "error");
      return;
    }
    if (user.kyc_status !== "Terverifikasi") {
      showToast("Akun Anda belum terverifikasi KYC. Anda tidak bisa melamar pekerjaan.", "error");
      return;
    }
    if (!applyHarga) {
      showToast("Masukkan harga penawaran Anda.", "info");
      return;
    }

    try {
      const { error } = await supabase.from("pelamar_pekerjaan").insert([
        { job_id: jobId, mitra_id: user.id, harga_tawaran: applyHarga, pesan: applyPesan },
      ]);
      if (error) throw error;
      showToast("Lamaran terkirim! Klien akan meninjau penawaran Anda. 🎉", "success");
      setAppliedJobs((prev) => ({ ...prev, [jobId]: true }));
      setIsApplying(false);
      setSelectedJob(null);
      setApplyHarga("");
      setApplyPesan("");
    } catch (err: any) {
      showToast("Gagal melamar: " + err.message, "error");
    }
  };

  const handleCancelApplication = async (jobId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("pelamar_pekerjaan")
        .delete()
        .eq("job_id", jobId)
        .eq("mitra_id", user.id);
      if (error) throw error;
      setAppliedJobs((prev) => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });
      showToast("Lamaran berhasil dibatalkan.", "success");
      setSelectedJob(null);
      setIsApplying(false);
    } catch (err: any) {
      showToast("Gagal membatalkan lamaran: " + err.message, "error");
    }
  };

  const openApplyForm = (job: Job) => {
    kycGate.triggerKycGate("BID_JOB", () => {
      setApplyHarga(job.budget);
      setApplyPesan("Saya siap mengerjakan ini dengan profesional.");
      setIsApplying(true);
    });
  };

  return {
    user,
    jobs,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    radius,
    setRadius,
    activeCategory,
    setActiveCategory,
    viewMode,
    setViewMode,
    sortPrice,
    setSortPrice,
    sortDistance,
    setSortDistance,
    mitraLoc,
    selectedJob,
    setSelectedJob,
    fullScreenImage,
    setFullScreenImage,
    isApplying,
    setIsApplying,
    applyHarga,
    setApplyHarga,
    applyPesan,
    setApplyPesan,
    appliedJobs,
    cancelConfirm,
    setCancelConfirm,
    toast,
    showToast,
    getCountdown,
    parseDeskripsi,
    timeAgo,
    sortedJobs,
    handleApplyJob,
    handleCancelApplication,
    openApplyForm,
    fetchNearbyJobs,
    kycGate,
  };
}

export type CariKerjaLogic = ReturnType<typeof useCariKerjaLogic>;
