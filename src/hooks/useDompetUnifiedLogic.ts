import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getStoredUser, setStoredUser } from "../lib/user-storage";

export type Rekening = { bank_name: string; bank_number: string; bank_holder: string } | null;

export function useDompetUnifiedLogic() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [detailPendapatan, setDetailPendapatan] = useState<{ escrow: number; cod: number }>({
    escrow: 0,
    cod: 0,
  });
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
  const [riwayatTransaksi, setRiwayatTransaksi] = useState<any[]>([]);
  const [rekening, setRekening] = useState<Rekening>(null);

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRekeningModal, setShowRekeningModal] = useState(false);
  const [showTrxDetailModal, setShowTrxDetailModal] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<any>(null);

  // State konfigurasi penarikan
  const [withdrawalConfig, setWithdrawalConfig] = useState<{ feeFixed: number; feePercent: number; minWithdrawal: number }>({
    feeFixed: 2500,
    feePercent: 0,
    minWithdrawal: 10000,
  });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);

  const fetchUnifiedWalletData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const storedUser: any = await getStoredUser();
      if (!storedUser || !storedUser.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      // fetch fresh user row to get saldo, bank, and name for validation
      let dbUserData: any = null;
      try {
        const { data } = await supabase.from("users_bisa").select("*").eq("id", storedUser.id).maybeSingle();
        dbUserData = data;
        if (data) await setStoredUser(data);
      } catch {}
      const freshUser = dbUserData || storedUser;
      setUser(freshUser);

      // fetch riwayat penarikan DIRECT SUPABASE (1:1 Web) agar realtime dan tidak stale dari Vercel
      let wRequestsLocal: any[] = [];
      try {
        const { data: directWd } = await supabase.from("withdrawal_requests").select("*").eq("user_id", storedUser.id).order("created_at", { ascending: false }).limit(20);
        if (directWd && directWd.length > 0) {
          wRequestsLocal = directWd;
          setWithdrawalRequests(directWd);
        }
      } catch (e) {
        console.warn("Gagal fetch direct withdrawal_requests:", e);
      }

      // fallback via backend API jika direct supabase kosong/terkendala
      if (wRequestsLocal.length === 0) {
        try {
          const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
          const backendUrl = rawApi || "https://bisa-admin.vercel.app";
          const wRes = await fetch(`${backendUrl}/api/withdraw/request?userId=${storedUser.id}`).then((r) => r.json());
          if (wRes?.success) {
            if (wRes.feeFixed !== undefined && wRes.feePercent !== undefined) {
              setWithdrawalConfig((prev) => ({
                feeFixed: Number(wRes.feeFixed ?? prev.feeFixed),
                feePercent: Number(wRes.feePercent ?? prev.feePercent),
                minWithdrawal: Number(wRes.minWithdrawal ?? prev.minWithdrawal),
              }));
            }
            if (Array.isArray(wRes.requests) && wRes.requests.length > 0) {
              wRequestsLocal = wRes.requests;
              setWithdrawalRequests(wRes.requests);
            }
          }
        } catch {}
      }

      // OVERRIDE DIRECT SUPABASE — ini yang paling real-time & jadi sumber kebenaran (bypass Vercel cache/deploy)
      try {
        let fFixed: number | null = null;
        let fPercent: number | null = null;
        try {
          const { data: stRows } = await supabase.from("admin_settings").select("key,value").in("key", ["withdrawal_fee_fixed", "withdrawal_fee_percent"]);
          (stRows || []).forEach((r: any) => {
            // value bisa string "0" — jangan pakai falsy check
            if (r.key === "withdrawal_fee_fixed" && r.value !== null && r.value !== undefined && String(r.value) !== "") fFixed = Number(r.value);
            if (r.key === "withdrawal_fee_percent" && r.value !== null && r.value !== undefined && String(r.value) !== "") fPercent = Number(r.value);
          });
        } catch {}

        // Fallback app_settings jika admin_settings kena RLS / kosong
        if (fFixed === null || fPercent === null) {
          try {
            const { data: appRows } = await supabase.from("app_settings").select("key,value").in("key", ["withdrawal_fee_fixed", "withdrawal_fee_percent"]);
            (appRows || []).forEach((r: any) => {
              if (r.key === "withdrawal_fee_fixed" && fFixed === null && r.value !== null && r.value !== undefined) fFixed = Number(r.value);
              if (r.key === "withdrawal_fee_percent" && fPercent === null && r.value !== null && r.value !== undefined) fPercent = Number(r.value);
            });
          } catch {}
        }

        if (fFixed !== null || fPercent !== null) {
          setWithdrawalConfig((prev) => ({
            ...prev,
            feeFixed: fFixed !== null && !isNaN(fFixed) ? fFixed : prev.feeFixed,
            feePercent: fPercent !== null && !isNaN(fPercent) ? fPercent : prev.feePercent,
          }));
        }
      } catch (e) {
        console.warn("Gagal baca fee dari Supabase direct:", e);
      }

      // rekening: baca dari backend dulu, lalu DIRECT supabase app_settings, lalu kolom users_bisa
      let rk: Rekening = null;
      try {
        const rawApi2 = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
        const bUrl = rawApi2 || "https://bisa-admin.vercel.app";
        const rkRes: any = await fetch(`${bUrl}/api/rekening/save?userId=${storedUser.id}`).then((r) => r.json()).catch(() => null);
        if (rkRes?.success && rkRes?.rekening?.bank_name) {
          rk = { bank_name: String(rkRes.rekening.bank_name), bank_number: String(rkRes.rekening.bank_number), bank_holder: String(rkRes.rekening.bank_holder) };
        }
      } catch {}
      // jika backend belum kebaca / belum deploy — baca langsung dari Supabase app_settings (tanpa butuh backend)
      if (!rk) {
        try {
          const appKey = `rekening_user_${storedUser.id}`;
          const { data: rkRow } = await supabase.from("app_settings").select("value").eq("key", appKey).maybeSingle();
          if ((rkRow as any)?.value) {
            const rawVal = (rkRow as any).value;
            const v = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;
            if (v?.bank_name || v?.bank_number) {
              rk = { bank_name: String(v.bank_name || ""), bank_number: String(v.bank_number || ""), bank_holder: String(v.bank_holder || "") };
            }
          }
        } catch {}
      }
      // fallback terakhir ke kolom users_bisa / local storage
      if (!rk) {
        const localKey = `rekening_user_${storedUser.id}`;
        // coba dari freshUser yang sudah di-setStoredUser (kadang berisi bank_*)
        const fromUser =
          freshUser?.bank_name || freshUser?.bank_number || freshUser?.bank_holder
            ? { bank_name: String(freshUser.bank_name || ""), bank_number: String(freshUser.bank_number || ""), bank_holder: String(freshUser.bank_holder || "") }
            : freshUser?.rekening_bank || freshUser?.account_bank
            ? { bank_name: String(freshUser.rekening_bank || freshUser.account_bank || ""), bank_number: String(freshUser.rekening_no || freshUser.account_number || ""), bank_holder: String(freshUser.rekening_name || freshUser.account_holder || "") }
            : null;
        if (fromUser && (fromUser.bank_name || fromUser.bank_number)) rk = fromUser;
        // fallback dari storage HP yang sudah kita simpan payload lokal
        if (!rk && freshUser?.[localKey]) {
          const v = freshUser[localKey];
          const vv = typeof v === "string" ? JSON.parse(v) : v;
          if (vv?.bank_name) rk = vv;
        }
      }
      if (rk && !rk.bank_name && !rk.bank_number) setRekening(null);
      else setRekening(rk);

      const dbSaldo = Number(dbUserData?.saldo ?? dbUserData?.balance ?? storedUser.saldo ?? 0);

      const { data: trxData } = await supabase.from("transactions").select("*").eq("user_id", storedUser.id).order("created_at", { ascending: false });

      const { data: completedJobs } = await supabase.from("pekerjaan_bisa").select("*").eq("mitra_id", storedUser.id).eq("status", "selesai").order("created_at", { ascending: false });

      // gabungkan riwayat withdrawal_requests sebagai transaksi virtual (1:1 persis Web)
      const wdHistory = (wRequestsLocal || []).map((w: any) => {
        const stRaw = String(w.status || "pending").toLowerCase();
        const stUpper = stRaw === "approved" ? "APPROVED" : stRaw === "rejected" ? "REJECTED" : "PENDING";
        const titleText = stRaw === "pending" ? "Penarikan • Menunggu ACC Admin" : stRaw === "approved" ? "Penarikan • Cair" : "Penarikan • Ditolak";
        return {
          id: `wd-${w.id}`,
          rawId: w.id,
          type: "out" as const,
          category: "penarikan" as const,
          title: titleText,
          amount: -Math.abs(Number(w.amount || 0)),
          fee: Number(w.fee_amount || 0),
          fee_amount: Number(w.fee_amount || 0),
          gross: Number(w.amount || 0),
          net: Number(w.net_amount || w.amount || 0),
          net_amount: Number(w.net_amount || w.amount || 0),
          isCOD: false,
          created_at: w.created_at || w.requested_at,
          status: stUpper,
          methodLabel: `${w.bank_name || ""} • ${w.bank_number || ""}`.trim() || "Transfer Bank",
          note: w.admin_note ? `Catatan admin: ${w.admin_note}` : stRaw === "pending" ? "Diproses maks 1x24 jam" : "",
          _wd: w,
        };
      });

      let escrowTotal = 0;
      let codTotal = 0;
      const jobHistory = (completedJobs || []).map((job: any) => {
        const isCOD = job.payment_method === "COD" || job.metode_pembayaran === "cod";
        const gross = Number(job.agreed_price) || Number(job.harga_deal) || Number(job.harga) || (parseInt(String(job.budget || "").replace(/[^0-9]/g, "")) || 0);
        const amount = isCOD ? gross : Number(job.mitra_earnings) || gross;
        const fee = isCOD ? 0 : Number(job.platform_fee || 0);
        if (isCOD) codTotal += amount; else escrowTotal += amount;
        return {
          id: `job-${job.id}`,
          rawId: job.id,
          type: "in",
          category: "hasil_kerja",
          title: job.judul || job.deskripsi || `Hasil Kerja #${job.id}`,
          amount,
          fee,
          gross,
          isCOD,
          created_at: job.created_at,
          status: isCOD ? "Tunai" : "Berhasil",
          methodLabel: isCOD ? "COD" : "Pembayaran Online",
          payment_status: job.payment_status,
          note: job.judul || job.deskripsi || "",
        };
      });

      setDetailPendapatan({ escrow: escrowTotal, cod: codTotal });
      setCompletedJobsCount((completedJobs || []).length);

      const categoryFromTrx = (t: any) => {
        const title = String(t.title || t.description || "").toLowerCase();
        const type = String(t.type || "").toLowerCase();
        if (title.includes("bonus") || title.includes("reward") || title.includes("insentif")) return "bonus_admin";
        if (title.includes("refund") || title.includes("pengembalian") || title.includes("batal")) return "refund";
        if (title.includes("tarik") || title.includes("withdraw") || title.includes("penarikan") || type === "out") return "penarikan";
        if (title.includes("topup") || title.includes("isi saldo")) return "topup";
        if (title.includes("hasil kerja") || title.includes("pesanan")) return "hasil_kerja";
        return t.category || "lainnya";
      };

      const generalTrx = (trxData || []).map((t: any) => {
        const cat = categoryFromTrx(t);
        return {
          id: `trx-${t.id}`,
          rawId: t.id,
          type: t.type || (String(t.amount).startsWith("-") ? "out" : "in"),
          category: cat,
          title: t.title || t.description || "Transaksi BISA",
          amount: Number(t.amount || 0),
          status: t.status || "Berhasil",
          created_at: t.created_at,
          isCOD: false,
          methodLabel: t.method || t.payment_method || (cat === "bonus_admin" ? "Sistem BISA" : cat === "refund" ? "Saldo BISA" : "Saldo BISA"),
          fee: Number(t.fee || t.platform_fee || 0),
          note: t.note || t.description || "",
        };
      });

      // Filter deduplikasi: hasil kerja sudah diambil lengkap dari pekerjaan_bisa (ada rincian COD/Rekber/fee)
      // Jadi transaksi dari tabel `transactions` yang merupakan duplikat hasil kerja tidak dimasukkan lagi.
      const nonDuplicateGeneralTrx = generalTrx.filter((t) => t.category !== "hasil_kerja");

      const combined = [...nonDuplicateGeneralTrx, ...jobHistory, ...wdHistory].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Saldo real = DB 1:1 (sudah dipotong saat admin ACC). Jangan fallback ke escrowTotal (itu historis).
      // escrowTotal tetap tampil di "Rincian Sumber" saja.
      setSaldo(dbSaldo);
      setRiwayatTransaksi(combined);
    } catch (e) {
      console.error("Gagal fetch dompet terpadu:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUnifiedWalletData();
  }, [fetchUnifiedWalletData]);

  // Polling realtime 5 detik silent (jangan trigger loading full-screen, biar gak kedip "Memuat...")
  useEffect(() => {
    const id = setInterval(() => {
      fetchUnifiedWalletData(true);
    }, 5000);
    return () => clearInterval(id);
  }, [fetchUnifiedWalletData]);

  const saveRekening = useCallback(async (data: { bank_name: string; bank_number: string; bank_holder: string }) => {
    if (!user?.id) throw new Error("User tidak ditemukan");
    const namaKtp = String(user.nama || user.name || user.full_name || user.username || "").trim();
    if (!namaKtp) throw new Error("Nama profil belum dilengkapi");
    if (!data.bank_name || !data.bank_number) throw new Error("Pilih Bank/E-Wallet dan nomor rekening wajib diisi");

    const finalHolder = data.bank_holder?.trim() || namaKtp;
    const payload: any = {
      bank_name: data.bank_name.trim(),
      bank_number: data.bank_number.trim(),
      bank_holder: finalHolder,
    };

    // SIMPAN:
    // 1. Simpan langsung ke `app_settings` via Supabase client (karena app_settings terbuka & anti-RLS/anti-kolom-hilang)
    // 2. Coba kirim ke Backend API jika ada
    // 3. Update local state & storage user
    const appSettingsKey = `rekening_user_${user.id}`;
    let savedSuccessfully = false;

    // Cara A: Direct Supabase ke app_settings (100% jalan instan di client tanpa nunggu vercel deploy)
    try {
      const { error: directErr } = await supabase.from("app_settings").upsert(
        { key: appSettingsKey, value: JSON.stringify(payload), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (!directErr) savedSuccessfully = true;
    } catch {}

    // Cara B: Lewat backend API
    try {
      const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
      const backendUrl = rawApi || "https://bisa-app.vercel.app";
      const r = await fetch(`${backendUrl}/api/rekening/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...payload }),
      });
      const res = await r.json().catch(() => null);
      if (res?.success) savedSuccessfully = true;
    } catch {}

    // Cara C: Coba update kolom users_bisa jika sewaktu-waktu kolomnya sudah ditambahkan
    try {
      await supabase.from("users_bisa").update(payload).eq("id", user.id);
    } catch {}

    if (!savedSuccessfully) {
      // kalau A & B gagal jaringan, simpan offline ke storage HP agar user tidak terblokir
      console.warn("Rekening disimpan lokal di HP sementara");
    }

    const updated = { ...user, ...payload };
    setUser(updated);
    setRekening(payload);
    await setStoredUser(updated);
    return true;
  }, [user]);

  return {
    user, loading, saldo, detailPendapatan, completedJobsCount, riwayatTransaksi, rekening, withdrawalRequests,
    showTopupModal, setShowTopupModal,
    showWithdrawModal, setShowWithdrawModal,
    showDetailModal, setShowDetailModal,
    showRekeningModal, setShowRekeningModal,
    showTrxDetailModal, setShowTrxDetailModal,
    selectedTrx, setSelectedTrx,
    saveRekening,
    requestWithdrawal: async (amount: number) => {
      if (!user?.id) throw new Error("Pengguna tidak ditemukan");
      if (submittingWithdraw) {
        console.log("[Withdraw] dicegah karena masih proses sebelumnya");
        return;
      }
      setSubmittingWithdraw(true);
      try {
        // 1. Cek apakah ada pengajuan penarikan yang masih PENDING (anti-spam / duplikasi)
        try {
          const { data: pendingDirect } = await supabase
            .from("withdrawal_requests")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .limit(1);

          if (pendingDirect && pendingDirect.length > 0) {
            throw new Error("Anda masih memiliki pengajuan penarikan yang sedang diproses admin.");
          }
        } catch (e: any) {
          if (e?.message?.includes("masih memiliki")) throw e;
        }

        // 2. Hitung biaya admin dan nominal bersih
        const feeFixed = withdrawalConfig?.feeFixed ?? 2500;
        const feePercent = withdrawalConfig?.feePercent ?? 0;
        const feeAmount = Math.round(feeFixed + (amount * feePercent) / 100);
        const netAmount = Math.max(0, amount - feeAmount);
        if (netAmount <= 0) {
          throw new Error("Nominal penarikan terlalu kecil setelah dipotong biaya admin.");
        }

        const rkCurrent = rekening || {
          bank_name: "DANA",
          bank_number: "-",
          bank_holder: user.name || user.nama || "-",
        };

        // 3. Simpan tiket pengajuan langsung ke Supabase (status: 'pending' untuk di-ACC Admin)
        let insertedData: any = null;
        let directErr: any = null;

        try {
          const { data: insData, error: insErr } = await supabase
            .from("withdrawal_requests")
            .insert({
              user_id: user.id,
              amount,
              fee_amount: feeAmount,
              net_amount: netAmount,
              bank_name: rkCurrent.bank_name,
              bank_number: rkCurrent.bank_number,
              bank_holder: rkCurrent.bank_holder,
              status: "pending",
            })
            .select()
            .single();

          if (insErr) {
            directErr = insErr;
          } else {
            insertedData = insData;
          }
        } catch (err: any) {
          directErr = err;
        }

        // 4. Jika direct insert gagal, coba fallback ke backend API (jika server tersedia)
        if (!insertedData && directErr) {
          console.warn("[Withdraw] Direct insert gagal, coba backend API:", directErr);
          try {
            const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
            const backendUrl = rawApi || "https://bisa-admin.vercel.app";
            const res = await fetch(`${backendUrl}/api/withdraw/request`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, amount }),
            });
            const data = await res.json().catch(() => null);
            if (data?.success) {
              insertedData = data.data;
            } else {
              throw new Error(data?.error || directErr?.message || "Gagal mengajukan penarikan");
            }
          } catch (apiErr: any) {
            throw new Error(directErr?.message || apiErr?.message || "Gagal mengajukan penarikan");
          }
        }

        // 5. Refresh data dompet agar riwayat & status pending langsung ter-update di UI
        await fetchUnifiedWalletData(true);
        return {
          success: true,
          message: "Pengajuan penarikan berhasil dikirim dan menunggu verifikasi admin.",
          data: insertedData,
        };
      } finally {
        setSubmittingWithdraw(false);
      }
    },
    withdrawalConfig,
    submittingWithdraw,
    refetch: fetchUnifiedWalletData,
    router,
  };
}
