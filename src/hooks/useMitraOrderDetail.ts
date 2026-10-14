// src/hooks/useMitraOrderDetail.ts
// Logika halaman detail pesanan Mitra (app/p/aktivitas/[id].tsx).
//
// TUJUAN: pindahkan seluruh state + business logic dari route file (1432 baris)
// ke hook ini, agar route hanya meng-compose komponen.
//
// Semua handler TIDAK diubah perilakunya — pemindahan 1:1 supaya alur yang
// sudah terbukti bekerja (terima, kirim hasil, batal, sengketa) tidak rusak.
import { useState, useEffect, useCallback } from "react";
import { Alert, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { safeBack } from "../lib/navigation";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import {
  processOrderRefund,
  respondOrderCancellation,
  checkAndProcessExpiredCancellations,
  submitOrderDispute,
} from "../lib/payment";
import { checkAndSyncMidtransStatus } from "../lib/midtransDirect";
import {
  compressImageWithBase64,
  base64ToUint8Array,
} from "../lib/imageCompression";

export interface JobDetail {
  id: number;
  judul: string;
  deskripsi: string;
  kategori: string;
  budget: string;
  agreed_price: number;
  harga_deal?: number | null;
  platform_fee: number;
  mitra_earnings: number;
  status: string;
  payment_status: string;
  payment_method: string;
  lokasi: string;
  created_at: string;
  updated_at?: string | null;
  submitted_at?: string | null;
  expires_at: string | null;
  work_file_url: string | null;
  work_link_url: string | null;
  work_note: string | null;
  pelanggan_id: number;
  mitra_id: number;
  cancel_requested_at?: string | null;
  cancel_reason?: string | null;
  alasan_penolakan?: string | null;
  dispute_reason?: string | null;
  dispute_at?: string | null;
  dispute_status?: string | null;
  pelanggan?: {
    id: number;
    name: string;
    phone: string;
    face_url: string;
  };
}

type AlertVariant = "success" | "error" | "info";
export type AlertState = {
  show: boolean;
  title: string;
  message: string;
  variant: AlertVariant;
};

export function useMitraOrderDetail(jobId: string) {
  const router = useRouter();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Delivery Modal
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryImageUri, setDeliveryImageUri] = useState<string | null>(null);
  const [deliveryLink, setDeliveryLink] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [sendingDelivery, setSendingDelivery] = useState(false);

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Mutual Cancel Modal
  const [showMutualModal, setShowMutualModal] = useState(false);
  const [mutualReason, setMutualReason] = useState("");
  const [mutualActing, setMutualActing] = useState(false);

  // Cancel Request by Client
  const [showRejectCancelModal, setShowRejectCancelModal] = useState(false);
  const [rejectCancelReason, setRejectCancelReason] = useState("");
  const [cancelResponding, setCancelResponding] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState<string | null>(null);

  // Dispute (sengketa) — Fase 4
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeActing, setDisputeActing] = useState(false);

  // Confirm dialog (Alert.alert + tombol = no-op di web, jadi pakai modal sendiri)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const askConfirm = useCallback((cfg: typeof confirmConfig) => setConfirmConfig(cfg), []);


  // Countdowns & fee
  const [countdown, setCountdown] = useState<string | null>(null);
  const [offerCountdown, setOfferCountdown] = useState<string | null>(null);
  const [offerExpired, setOfferExpired] = useState(false);
  const [feePct, setFeePct] = useState<number | null>(null);

  // Nice popup (ganti window.alert jelek localhost:8081 says)
  const [alertInfo, setAlertInfo] = useState<AlertState>({
    show: false,
    title: "",
    message: "",
    variant: "success",
  });
  const showNiceAlert = useCallback(
    (title: string, message: string, variant: AlertVariant = "success") => {
      if (Platform.OS === "web") setAlertInfo({ show: true, title, message, variant });
      else Alert.alert(title, message);
    },
    []
  );

  // Auto-close sukses 3 detik biar ga ngendok di HP
  useEffect(() => {
    if (!alertInfo.show || alertInfo.variant !== "success") return;
    const t = setTimeout(() => setAlertInfo((p) => ({ ...p, show: false })), 2800);
    return () => clearTimeout(t);
  }, [alertInfo.show, alertInfo.variant]);

  // Realtime subscription untuk auto-update status
  useEffect(() => {
    if (!jobId) return;
    const numJobId = Number(jobId);
    const channel = supabase
      .channel(`pekerjaan_bisa_mitra_${numJobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pekerjaan_bisa",
          filter: `id=eq.${numJobId}`,
        },
        (payload) => {
          if (payload.new) {
            setJob((prev: any) => (prev ? { ...prev, ...payload.new } : (payload.new as any)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchJobDetail = useCallback(async () => {
    try {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }

      // Auto-sync status langsung ke Midtrans API
      try {
        await checkAndSyncMidtransStatus(Number(jobId));
      } catch {}

      const { data, error } = await supabase
        .from("pekerjaan_bisa")
        .select("*, pelanggan:users_bisa!pelanggan_id(id, name, phone, face_url)")
        .eq("id", jobId)
        .maybeSingle();

      if (error || !data) {
        Alert.alert("Tidak Ditemukan", "Pesanan tidak ditemukan.");
        router.replace("/p/aktivitas" as any);
        return;
      }
      setJob(data as any);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Gagal memuat detail");
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useFocusEffect(
    useCallback(() => {
      fetchJobDetail();
      checkAndProcessExpiredCancellations();
    }, [fetchJobDetail])
  );

  // Fee percentage dari admin_settings (fallback app_settings)
  useEffect(() => {
    let isMounted = true;
    if (jobId) {
      supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "service_fee_percentage")
        .maybeSingle()
        .then(async ({ data }) => {
          if (isMounted) {
            let v = data?.value ? Number(data.value) : null;
            if (v == null || isNaN(v)) {
              const { data: appData } = await supabase
                .from("app_settings")
                .select("value")
                .eq("key", "service_fee_percentage")
                .maybeSingle();
              v = appData?.value ? Number(appData.value) : null;
            }
            if (v != null && !isNaN(v)) setFeePct(v);
            else setFeePct(10);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  // 24h cancel window: Menunggu Persetujuan Batal -> auto refund jika mitra tidak respon
  useEffect(() => {
    if (!job || job.status !== "menunggu_persetujuan_batal") {
      setCancelCountdown(null);
      return;
    }
    const base = (job as any).cancel_requested_at || job.created_at;
    const deadline = new Date(base).getTime() + 24 * 3600 * 1000;
    const tick = () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        setCancelCountdown("00:00:00 (Batas Waktu Habis)");
        checkAndProcessExpiredCancellations().then(() => fetchJobDetail());
        return;
      }
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setCancelCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job, fetchJobDetail]);

  // 72h auto-cair setelah mitra kirim hasil
  useEffect(() => {
    if (!job || job.status !== "menunggu_konfirmasi_selesai") {
      setCountdown(null);
      return;
    }
    const base = (job as any).submitted_at || job.created_at;
    if (!base) {
      setCountdown("Auto-cair dalam maks 3x24 jam jika Klien tidak merespons");
      return;
    }
    const deadline = new Date(base).getTime() + 72 * 3600 * 1000;
    const tick = () => {
      const left = deadline - Date.now();
      if (left <= 0) {
        setCountdown("Waktu auto-cair tiba — sistem akan mencairkan otomatis");
        return;
      }
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const d = Math.floor(h / 24);
      const hh = h % 24;
      setCountdown(d > 0 ? `Auto-cair dalam ${d} hari ${hh} jam ${m} mnt` : `Auto-cair dalam ${hh} jam ${m} mnt`);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [job]);

  // 3h offer window: Menunggu Konfirmasi -> auto gagal
  useEffect(() => {
    if (!job || job.status !== "menunggu_konfirmasi_mitra") {
      setOfferCountdown(null);
      setOfferExpired(false);
      return;
    }
    let expiry: number | null = null;
    if (job.expires_at) {
      const t = new Date(job.expires_at).getTime();
      if (!isNaN(t)) expiry = t;
    }
    if (expiry == null) {
      const m = job.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
      if (m) expiry = parseInt(m[1], 10);
    }
    if (expiry == null) expiry = new Date(job.created_at).getTime() + 3 * 3600 * 1000;
    const tick = () => {
      const left = expiry! - Date.now();
      if (left <= 0) {
        setOfferCountdown("00:00:00");
        setOfferExpired(true);
        // fire-and-forget auto-expire to dibatalkan (idempotent)
        supabase.from("pekerjaan_bisa").update({ status: "dibatalkan" }).eq("id", job.id).then(() => {
          setJob((prev) => (prev ? { ...prev, status: "dibatalkan" } as any : prev));
        });
        return;
      }
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setOfferCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [job]);

  // --- Handlers ---

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    safeBack(router, "/p/aktivitas");
  }, [router]);

  const handleOpenDirectChat = useCallback(async () => {
    if (!job?.pelanggan_id) {
      Alert.alert("Gagal Buka Chat", "Data klien tidak ditemukan.");
      return;
    }
    try {
      const stored: any = await getStoredUser();
      const currentMitraId = job.mitra_id || stored?.id;
      if (!currentMitraId) {
        Alert.alert("Sesi Habis", "Silakan login kembali.");
        return;
      }
      const { ensureConversationAndNavigate } = await import("../lib/chatInbox");
      const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
      if (convId) router.push(`/p/direct-chat/${convId}?jobId=${job.id}` as any);
      else
        Alert.alert(
          "Gagal Buka Chat",
          "Room gagal dibuat. Cek Supabase RLS conversations/messages INSERT (Allow all) atau coba lagi."
        );
    } catch (e: any) {
      console.error("[Mitra Chat] error:", e);
      Alert.alert("Gagal Buka Chat", e?.message || "Terjadi kesalahan");
    }
  }, [job, router]);

  const handleAcceptOrder = useCallback(async () => {
    if (!job) return;
    // Guard: hanya bisa menerima pesanan yang memang menunggu persetujuan mitra.
    // Tanpa guard ini, update `.eq("id")` buta bisa menimpa status `menunggu_persetujuan_batal`
    // (atau status final lain) sehingga pengajuan batal hilang tanpa pernah diproses.
    const ACCEPTABLE = ["menunggu_konfirmasi_mitra", "menunggu_pembayaran"];
    if (!ACCEPTABLE.includes(job.status)) {
      showNiceAlert(
        "Tidak Bisa Diterima",
        `Pesanan ini sudah berstatus "${job.status}". Muat ulang halaman.`,
        "error"
      );
      await fetchJobDetail();
      return;
    }
    setActing(true);
    try {
      const storedUser: any = await getStoredUser();
      const effectiveMitraId = Number(job.mitra_id || storedUser?.id);
      const nextStatus = job.payment_status === "belum_bayar" ? "menunggu_pembayaran" : "sedang_dikerjakan";
      // Bersihkan sisa pengajuan pembatalan supaya tidakyx바이gba
      const { error: updErr } = await supabase
        .from("pekerjaan_bisa")
        .update({ status: nextStatus, cancel_requested_at: null, cancel_reason: null })
        .eq("id", job.id)
        .eq("status", job.status); // optimistic lock: hanya update bila status tak berubah
      if (updErr) throw updErr;
      try {
        const { ensureConversationAndNavigate } = await import("../lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: String(effectiveMitraId),
            message_type: "system",
            content: `✅ Mitra telah menerima pesanan: "${job.judul || "Pesanan Jasa"}". Pengerjaan dapat segera dimulai.`,
          } as any);
          await supabase
            .from("conversations")
            .update({ last_message: "✅ Pesanan Diterima oleh Mitra", last_message_at: new Date().toISOString() } as any)
            .eq("id", convId);
        }
      } catch {}
      showNiceAlert("Pesanan Diterima", "Anda telah menyetujui pesanan ini. Pengerjaan dapat segera dimulai.", "success");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setActing(false);
    }
  }, [job, fetchJobDetail, showNiceAlert]);

  const handleRejectOrder = useCallback(async () => {
    if (!job) return;
    setActing(true);
    try {
      const storedUser: any = await getStoredUser();
      const effectiveMitraId = Number(job.mitra_id || storedUser?.id);
      const res = await processOrderRefund(
        job.id,
        rejectReason.trim() ? `Alasan: ${rejectReason.trim()}` : "Ditolak oleh Mitra"
      );
      try {
        const { ensureConversationAndNavigate } = await import("../lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          const rejectMsg = `❌ Mitra menolak pesanan ini.${rejectReason.trim() ? ` Alasan: ${rejectReason.trim()}` : ""}${
            res.refunded ? ` Dana telah dikembalikan ke saldo Klien.` : ""
          }`;
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: String(effectiveMitraId),
            message_type: "system",
            content: rejectMsg,
          } as any);
          await supabase
            .from("conversations")
            .update({ last_message: rejectMsg, last_message_at: new Date().toISOString() } as any)
            .eq("id", convId);
        }
      } catch {}
      setShowRejectModal(false);
      setRejectReason("");
      showNiceAlert("Pesanan Ditolak", "Pesanan telah dibatalkan.", "info");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setActing(false);
    }
  }, [job, rejectReason, fetchJobDetail, showNiceAlert]);

  const handlePickImage = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input") as HTMLInputElement;
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file: File | undefined = e.target?.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setDeliveryImageUri(url);
            (window as any)._deliveryFile = file;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        };
        input.click();
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Diperlukan", "Aktifkan izin galeri untuk memilih foto bukti pengerjaan.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        let uri = res.assets[0].uri;
        let base64 = res.assets[0].base64;
        const comp = await compressImageWithBase64(uri);
        uri = comp.uri;
        if (comp.base64) base64 = comp.base64;
        setDeliveryImageUri(uri);
        (globalThis as any)._deliveryBase64 = base64;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Gagal membuka galeri");
    }
  }, []);

  const handleSendDelivery = useCallback(async () => {
    if (!job) return;
    if (!deliveryImageUri && !deliveryLink.trim()) {
      const msg = "Sertakan foto bukti pengerjaan atau tautan dokumen hasil kerja.";
      showNiceAlert("Lampiran Diperlukan", msg, "error");
      return;
    }
    setSendingDelivery(true);
    try {
      const storedUser: any = await getStoredUser();
      const effectiveMitraId = Number(job.mitra_id || storedUser?.id);
      if (!effectiveMitraId) throw new Error("Mitra ID tidak valid / sesi habis");

      let fileUrl: string | null = null;
      if (deliveryImageUri) {
        const fileName = `job_${job.id}_${Date.now()}.jpg`;
        try {
          let uploadPayload: any;
          let contentType = "image/jpeg";
          if (Platform.OS === "web" && (window as any)._deliveryFile) {
            uploadPayload = (window as any)._deliveryFile as File;
            contentType = uploadPayload.type || contentType;
          } else if ((globalThis as any)._deliveryBase64) {
            uploadPayload = base64ToUint8Array((globalThis as any)._deliveryBase64);
          } else {
            const resp = await fetch(deliveryImageUri);
            uploadPayload = await resp.blob();
          }

          // Coba upload ke job_attachments (chat_images) yang 100% stabil & publik
          const { error: upErr } = await supabase.storage
            .from("job_attachments")
            .upload(`chat_images/${fileName}`, uploadPayload, { contentType, upsert: true });

          if (!upErr) {
            const { data } = supabase.storage.from("job_attachments").getPublicUrl(`chat_images/${fileName}`);
            fileUrl = data.publicUrl || null;
          } else {
            console.warn("[Delivery] job_attachments error, fallback to deliveries:", upErr.message);
            const { error: fbErr } = await supabase.storage
              .from("deliveries")
              .upload(`deliveries/${fileName}`, uploadPayload, { contentType, upsert: true });
            if (!fbErr) {
              const { data } = supabase.storage.from("deliveries").getPublicUrl(`deliveries/${fileName}`);
              fileUrl = data.publicUrl || null;
            }
          }
        } catch (up: any) {
          console.warn("[Delivery] storage upload catch:", up?.message || up);
        }
      }

      // 1. Update status pekerjaan di Supabase
      const updatePayload: any = {
        status: "menunggu_konfirmasi_selesai",
        submitted_at: new Date().toISOString(),
        work_file_url: fileUrl || null,
        work_link_url: deliveryLink.trim() || null,
        work_note: deliveryNote.trim() || null,
      };
      const { error: updErr } = await supabase.from("pekerjaan_bisa").update(updatePayload).eq("id", job.id);
      if (updErr) throw new Error(updErr.message || "Gagal update pekerjaan_bisa");

      // 2. Simpan ke order_deliveries
      try {
        await supabase.from("order_deliveries").insert({
          job_id: Number(job.id),
          mitra_id: effectiveMitraId,
          file_url: fileUrl || null,
          link_url: deliveryLink.trim() || null,
          note: deliveryNote.trim() || null,
        } as any);
      } catch (e) {
        console.warn("[Delivery] order_deliveries insert warn:", e);
      }

      // 3. Inject [DELIVERY] message ke chat langsung via Supabase
      try {
        const { ensureConversationAndNavigate } = await import("../lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);

        if (convId) {
          const safeFile = encodeURIComponent(fileUrl || "");
          const safeLink = encodeURIComponent(deliveryLink.trim() || "");
          const safeNote = encodeURIComponent(deliveryNote.trim() || "");
          const content = `[DELIVERY]:${job.id}|${safeFile}|${safeLink}|${safeNote}`;

          const { error: msgErr } = await supabase.from("messages").insert({
            conversation_id: String(convId),
            sender_id: String(effectiveMitraId),
            message_type: "delivery",
            content,
          } as any);
          if (msgErr) console.error("[Delivery] msg insert error:", msgErr);

          const { error: convErr } = await supabase
            .from("conversations")
            .update({ last_message: "📦 Hasil Pekerjaan Dikirim", last_message_at: new Date().toISOString() } as any)
            .eq("id", String(convId));
          if (convErr) console.error("[Delivery] conv update error:", convErr);
        }
      } catch (chatErr) {
        console.warn("[Delivery] chat inject warn:", chatErr);
      }

      // Bersihkan form
      setShowDeliveryModal(false);
      setDeliveryImageUri(null);
      if (Platform.OS === "web") delete (window as any)._deliveryFile;
      setDeliveryLink("");
      setDeliveryNote("");

      showNiceAlert("Hasil Kerja Terkirim!", "Menunggu persetujuan Klien untuk merilis dana.", "success");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal Kirim", e.message || "Terjadi kesalahan", "error");
    } finally {
      setSendingDelivery(false);
    }
  }, [job, deliveryImageUri, deliveryLink, deliveryNote, fetchJobDetail, showNiceAlert]);

  const handleMutualCancel = useCallback(async () => {
    if (!job) return;
    setMutualActing(true);
    try {
      const res = await processOrderRefund(
        job.id,
        mutualReason.trim() ? `Batal Sepakat: ${mutualReason.trim()}` : "Batal Sepakat Bersama"
      );

      const cancelMsg = `❌ Pesanan dibatalkan secara bersama (mutual) oleh Klien & Mitra: ${job.judul || "Pesanan #" + job.id}${
        mutualReason.trim() ? ` Alasan: ${mutualReason.trim()}` : ""
      }${res.refunded ? ` (Dana sebesar Rp ${res.amount.toLocaleString("id-ID")} dikembalikan ke saldo Klien)` : ""}`;

      try {
        const { ensureConversationAndNavigate } = await import("../lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: String(job.mitra_id),
            message_type: "system",
            content: cancelMsg,
          } as any);
          await supabase
            .from("conversations")
            .update({ last_message: cancelMsg, last_message_at: new Date().toISOString() } as any)
            .eq("id", convId);
        }
      } catch {}

      setShowMutualModal(false);
      setMutualReason("");
      showNiceAlert(
        "Batal Sepakat Berhasil",
        res.refunded ? "Pesanan telah dibatalkan. Dana dikembalikan ke Klien." : "Pesanan telah dibatalkan bersama.",
        "success"
      );
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setMutualActing(false);
    }
  }, [job, mutualReason, fetchJobDetail, showNiceAlert]);

  const handleMitraApproveCancel = useCallback(async () => {
    if (!job) return;
    setCancelResponding(true);
    try {
      await respondOrderCancellation(job.id, true);
      showNiceAlert("Pembatalan Disetujui", "Pesanan telah dibatalkan dan dana dikembalikan ke Klien.", "success");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Gagal menyetujui pembatalan", "error");
    } finally {
      setCancelResponding(false);
    }
  }, [job, fetchJobDetail, showNiceAlert]);

  const handleMitraRejectCancel = useCallback(async () => {
    if (!job) return;
    setCancelResponding(true);
    try {
      const reasonText = rejectCancelReason.trim() || "Pekerjaan sedang berlangsung / progres > 80%";
      await respondOrderCancellation(job.id, false, reasonText);
      setShowRejectCancelModal(false);
      setRejectCancelReason("");
      showNiceAlert("Pembatalan Ditolak", "Pekerjaan tetap dilanjutkan. Jika ada kendala, hubungi Pusat Bantuan.", "info");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Gagal menolak pembatalan", "error");
    } finally {
      setCancelResponding(false);
    }
  }, [job, rejectCancelReason, fetchJobDetail, showNiceAlert]);

  const handleSubmitDispute = useCallback(async () => {
    if (!job) return;
    const reason = disputeReason.trim();
    if (reason.length < 10) {
      showNiceAlert("Alasan Kurang", "Mohon jelaskan sengketa minimal 10 karakter.", "error");
      return;
    }
    setDisputeActing(true);
    try {
      await submitOrderDispute(job.id, reason);
      setShowDisputeModal(false);
      setDisputeReason("");
      showNiceAlert("Sengketa Diajukan", "Admin akan meninjau bukti & chat. Dana ditahan sampai keputusan.", "info");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Gagal mengajukan sengketa", "error");
    } finally {
      setDisputeActing(false);
    }
  }, [job, disputeReason, fetchJobDetail, showNiceAlert]);

  return {
    // data
    job,
    loading,
    feePct,
    // countdown
    countdown,
    offerCountdown,
    offerExpired,
    cancelCountdown,
    // confirm
    confirmConfig,
    setConfirmConfig,
    askConfirm,
    // modal visibility
    showDeliveryModal,
    setShowDeliveryModal,
    showRejectModal,
    setShowRejectModal,
    showMutualModal,
    setShowMutualModal,
    showRejectCancelModal,
    setShowRejectCancelModal,
    showDisputeModal,
    setShowDisputeModal,
    // form fields
    deliveryImageUri,
    setDeliveryImageUri,
    deliveryLink,
    setDeliveryLink,
    deliveryNote,
    setDeliveryNote,
    rejectReason,
    setRejectReason,
    mutualReason,
    setMutualReason,
    rejectCancelReason,
    setRejectCancelReason,
    disputeReason,
    setDisputeReason,
    // loading flags
    acting,
    sendingDelivery,
    mutualActing,
    cancelResponding,
    disputeActing,
    // alert
    alertInfo,
    setAlertInfo,
    showNiceAlert,
    // handlers
    handleBack,
    handleOpenDirectChat,
    handleAcceptOrder,
    handleRejectOrder,
    handlePickImage,
    handleSendDelivery,
    handleMutualCancel,
    handleMitraApproveCancel,
    handleMitraRejectCancel,
    handleSubmitDispute,
  };
}