import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  MessageSquare,
  Copy,
  CheckCircle2,
  Send,
  Wallet,
  Timer,
  FileText,
  Camera,
  X,
  Link2,
  Handshake,
  Clock,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../src/lib/supabase";
import { getStoredUser } from "../../../src/lib/user-storage";
import {
  formatRupiah,
  processOrderRefund,
  respondOrderCancellation,
  checkAndProcessExpiredCancellations,
} from "../../../src/lib/payment";
import { fmtDate } from "../../../src/lib/invoice";
import { safeBack } from "@/lib/navigation";
import { compressImage, compressImageWithBase64, base64ToUint8Array } from "../../../src/lib/imageCompression";
import { checkAndSyncMidtransStatus } from "../../../src/lib/midtransDirect";

interface JobDetail {
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
  pelanggan?: {
    id: number;
    name: string;
    phone: string;
    face_url: string;
  };
}

export default function MitraOrderDetailPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const jobId = params?.id ? String(params.id) : "";

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

  // Nice popup (ganti window.alert jelek localhost:8081 says)
  const [alertInfo, setAlertInfo] = useState<{ show: boolean; title: string; message: string; variant: "success" | "error" | "info" }>({
    show: false,
    title: "",
    message: "",
    variant: "success",
  });
  const showNiceAlert = (title: string, message: string, variant: "success" | "error" | "info" = "success") => {
    if (Platform.OS === "web") setAlertInfo({ show: true, title, message, variant });
    else Alert.alert(title, message);
  };

  // Auto-close sukses 3 detik biar ga ngendok di HP
  useEffect(() => {
    if (!alertInfo.show || alertInfo.variant !== "success") return;
    const t = setTimeout(() => setAlertInfo((p) => ({ ...p, show: false })), 2800);
    return () => clearTimeout(t);
  }, [alertInfo.show, alertInfo.variant]);

  // Countdown auto-release
  const [countdown, setCountdown] = useState<string | null>(null);
  const [offerCountdown, setOfferCountdown] = useState<string | null>(null);
  const [offerExpired, setOfferExpired] = useState(false);
  const [feePct, setFeePct] = useState<number | null>(null);

  // Realtime subscription untuk auto-update status (misal klien klik terima pesanan -> step 4 auto terceklis)
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

  useFocusEffect(
    useCallback(() => {
      fetchJobDetail();
      checkAndProcessExpiredCancellations();
    }, [jobId])
  );

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
  }, [job]);

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

  const fetchJobDetail = async () => {
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
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    safeBack(router, "/p/aktivitas")
  };

  const handleOpenDirectChat = async () => {
    if (!job?.pelanggan_id) {
      Alert.alert("Gagal Buka Chat", "Data klien tidak ditemukan.");
      return;
    }
    try {
      const stored: any = await getStoredUser();
      // Fallback mitra_id dari sesi jika job belum ter-assign (masih menunggu_konfirmasi)
      const currentMitraId = job.mitra_id || stored?.id;
      if (!currentMitraId) {
        Alert.alert("Sesi Habis", "Silakan login kembali.");
        return;
      }
      const { ensureConversationAndNavigate } = await import("../../../src/lib/chatInbox");
      const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
      console.log("[Mitra Chat] pelanggan_id:", job.pelanggan_id, "mitra_id:", currentMitraId, "jobId:", job.id, "convId:", convId);
      if (convId) router.push(`/p/direct-chat/${convId}?jobId=${job.id}` as any);
      else Alert.alert("Gagal Buka Chat", "Room gagal dibuat. Cek Supabase RLS conversations/messages INSERT (Allow all) atau coba lagi.");
    } catch (e: any) {
      console.error("[Mitra Chat] error:", e);
      Alert.alert("Gagal Buka Chat", e?.message || "Terjadi kesalahan");
    }
  };

  const handleAcceptOrder = async () => {
    if (!job) return;
    setActing(true);
    try {
      const storedUser: any = await getStoredUser();
      const effectiveMitraId = Number(job.mitra_id || storedUser?.id);
      const nextStatus = job.payment_status === "belum_bayar" ? "menunggu_pembayaran" : "sedang_dikerjakan";
      const { error: updErr } = await supabase.from("pekerjaan_bisa").update({ status: nextStatus }).eq("id", job.id);
      if (updErr) throw updErr;
      try {
        const { ensureConversationAndNavigate } = await import("../../../src/lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          await supabase.from("messages").insert({ conversation_id: convId, sender_id: String(effectiveMitraId), message_type: "system", content: `✅ Mitra telah menerima pesanan: "${job.judul || 'Pesanan Jasa'}". Pengerjaan dapat segera dimulai.` } as any);
          await supabase.from("conversations").update({ last_message: "✅ Pesanan Diterima oleh Mitra", last_message_at: new Date().toISOString() } as any).eq("id", convId);
        }
      } catch {}
      const msg = "Anda telah menyetujui pesanan ini. Pengerjaan dapat segera dimulai.";
      showNiceAlert("Pesanan Diterima", msg, "success");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setActing(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!job) return;
    setActing(true);
    try {
      const storedUser: any = await getStoredUser();
      const effectiveMitraId = Number(job.mitra_id || storedUser?.id);
      const res = await processOrderRefund(job.id, rejectReason.trim() ? `Alasan: ${rejectReason.trim()}` : "Ditolak oleh Mitra");
      try {
        const { ensureConversationAndNavigate } = await import("../../../src/lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          const rejectMsg = `❌ Mitra menolak pesanan ini.${rejectReason.trim() ? ` Alasan: ${rejectReason.trim()}` : ''}${res.refunded ? ` Dana telah dikembalikan ke saldo Klien.` : ''}`;
          await supabase.from("messages").insert({ conversation_id: convId, sender_id: String(effectiveMitraId), message_type: "system", content: rejectMsg } as any);
          await supabase.from("conversations").update({ last_message: rejectMsg, last_message_at: new Date().toISOString() } as any).eq("id", convId);
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
  };

  const API_BASE = (process.env.EXPO_PUBLIC_API_URL as string) || "https://bisa-admin.vercel.app";

  const handlePickImage = async () => {
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
        base64: true,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        let uri = res.assets[0].uri;
        let base64 = res.assets[0].base64;
        try {
          const comp = await compressImageWithBase64(uri);
          uri = comp.uri;
          if (comp.base64) base64 = comp.base64;
        } catch (error) {
          console.error("Gagal kompresi foto:", error);
        }
        setDeliveryImageUri(uri);
        (globalThis as any)._deliveryBase64 = base64;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Gagal membuka galeri");
    }
  };

  const handleSendDelivery = async () => {
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

      // 1. Update status pekerjaan di Supabase (Anti-CORS)
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

      // 3. Inject [DELIVERY] message ke chat langsung via Supabase (UUID string murni, TIDAK pakai Number)
      try {
        const { ensureConversationAndNavigate } = await import("../../../src/lib/chatInbox");
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
          
          const { error: convErr } = await supabase.from("conversations").update({ 
            last_message: "📦 Hasil Pekerjaan Dikirim", 
            last_message_at: new Date().toISOString() 
          } as any).eq("id", String(convId));
          if (convErr) console.error("[Delivery] conv update error:", convErr);
        }
      } catch (chatErr) {
        console.warn("[Delivery] chat inject warn:", chatErr);
      }

      // Hapus total fetch ke Vercel api/delivery/create untuk mencegah CORS & ERR_FAILED di localhost:8081!
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
  };

  const handleMutualCancel = async () => {
    if (!job) return;
    setMutualActing(true);
    try {
      const res = await processOrderRefund(job.id, mutualReason.trim() ? `Batal Sepakat: ${mutualReason.trim()}` : "Batal Sepakat Bersama");

      const cancelMsg = `❌ Pesanan dibatalkan secara bersama (mutual) oleh Klien & Mitra: ${job.judul || 'Pesanan #' + job.id}${mutualReason.trim() ? ` Alasan: ${mutualReason.trim()}` : ''}${res.refunded ? ` (Dana sebesar Rp ${res.amount.toLocaleString("id-ID")} dikembalikan ke saldo Klien)` : ''}`;

      try {
        const { ensureConversationAndNavigate } = await import("../../../src/lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String(job.pelanggan_id), job.id, true);
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: String(job.mitra_id),
            message_type: "system",
            content: cancelMsg,
          } as any);
          await supabase.from("conversations").update({
            last_message: cancelMsg,
            last_message_at: new Date().toISOString(),
          } as any).eq("id", convId);
        }
      } catch {}

      setShowMutualModal(false);
      setMutualReason("");
      showNiceAlert("Batal Sepakat Berhasil", res.refunded ? "Pesanan telah dibatalkan. Dana dikembalikan ke Klien." : "Pesanan telah dibatalkan bersama.", "success");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setMutualActing(false);
    }
  };

  const handleMitraApproveCancel = async () => {
    if (!job) return;
    setCancelResponding(true);
    try {
      const res = await respondOrderCancellation(job.id, true);
      showNiceAlert("Pembatalan Disetujui", "Pesanan telah dibatalkan dan dana dikembalikan ke Klien.", "success");
      await fetchJobDetail();
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Gagal menyetujui pembatalan", "error");
    } finally {
      setCancelResponding(false);
    }
  };

  const handleMitraRejectCancel = async () => {
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
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAF9] items-center justify-center">
        <ActivityIndicator color="#059669" size="large" />
      </SafeAreaView>
    );
  }

  if (!job) return null;

  let parsedBudget = 0;
  if (job.budget && typeof job.budget === "string") {
    const numStr = job.budget.replace(/[^\d]/g, "");
    parsedBudget = numStr ? parseInt(numStr, 10) : 0;
  }
  const priceNum = job.agreed_price ?? job.harga_deal ?? parsedBudget;

  let platformFee: number;
  let netEarnings: number;
  let feeLabelPct: number;

  // DB adalah sumber kebenaran setelah /api/orders/complete — jika selesai tapi fee masih 0/null (job lama), fallback ke estimasi feePct agar tidak tampil 0%
  if ((job.platform_fee != null || job.mitra_earnings != null) && !(job.status !== "selesai" && Number(job.platform_fee || 0) === 0)) {
    platformFee = Number(job.platform_fee || 0);
    netEarnings = Number(job.mitra_earnings || Math.max(0, priceNum - platformFee));
    feeLabelPct = priceNum > 0 ? Math.round((platformFee / priceNum) * 100) : (feePct ?? 10);
  } else if (feePct != null) {
    platformFee = Math.round((priceNum * feePct) / 100);
    netEarnings = priceNum - platformFee;
    feeLabelPct = feePct;
  } else {
    platformFee = Math.round(priceNum * 0.1);
    netEarnings = priceNum - platformFee;
    feeLabelPct = 10;
  }

  const isCOD = job.payment_method === "COD";
  const isPaid = ["mitra_ditemukan", "sedang_dikerjakan", "menunggu_konfirmasi_selesai", "selesai"].includes(job.status);
  const isPendingApproval = job.status === "menunggu_konfirmasi_mitra";
  const isWaitingPayment = job.status === "menunggu_pembayaran";
  const isWorking = ["sedang_dikerjakan", "mitra_ditemukan", "revisi_diminta"].includes(job.status);
  const isDelivered = job.status === "menunggu_konfirmasi_selesai";
  const isPendingCancel = job.status === "menunggu_persetujuan_batal";
  const isDone = job.status === "selesai" || job.payment_status === "released" || job.payment_status === "cod_completed";
  const isCancelled = job.status === "dibatalkan" || job.status === "expired" || job.status === "ditolak";

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF9]" edges={["top"]}>
      {/* Header Plek Screenshot */}
      <View className="bg-white/95 px-4 h-14 border-b border-gray-100 flex-row items-center justify-between shadow-xs">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity onPress={handleBack} activeOpacity={0.8} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
            <ArrowLeft size={18} color="#374151" />
          </TouchableOpacity>
          <View>
            <View className="flex-col">
              <Text className="text-sm font-black text-gray-900 leading-none">Detail Pesanan & Invoice</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-[10px] text-gray-400 font-mono">#{String(job.id).slice(0, 8)}</Text>
                <TouchableOpacity onPress={() => Alert.alert("ID Disalin", `#${job.id}`)}>
                  <Copy size={11} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Clock size={9} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-400 font-medium">{fmtDate(job.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleOpenDirectChat}
          activeOpacity={0.85}
          className="h-8 px-3 rounded-full bg-emerald-50 border border-emerald-200 flex-row items-center gap-1.5"
        >
          <MessageSquare size={13} color="#059669" />
          <Text className="text-xs font-black text-emerald-700">Chat</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="max-w-[440px] w-full self-center flex-col gap-3.5">
          {/* 1. Status Card & Stepper (Screenshot 1) */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Pekerjaan</Text>
              <View className="flex-row items-center gap-1.5">
                <View className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                  <Text className="text-xs font-black text-blue-900">
                    {isDone
                      ? "Selesai & Lunas"
                      : isPendingCancel
                      ? "Menunggu Persetujuan Batal"
                      : isDelivered
                      ? "Menunggu Konfirmasi Klien"
                      : isWorking
                      ? "Sedang Dikerjakan"
                      : isWaitingPayment
                      ? "Menunggu Pembayaran"
                      : isPendingApproval
                      ? "Menunggu Persetujuan Anda"
                      : isCancelled
                      ? "Dibatalkan"
                      : job.status}
                  </Text>
                </View>
                {isPendingApproval && offerCountdown && (
                  <View className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 flex-row items-center gap-1">
                    <Timer size={11} color="#92400e" />
                    <Text className="text-[11px] font-black text-amber-800 tabular-nums">{offerCountdown}</Text>
                  </View>
                )}
                {isPendingCancel && cancelCountdown && (
                  <View className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 flex-row items-center gap-1">
                    <Timer size={11} color="#b91c1c" />
                    <Text className="text-[11px] font-black text-red-700 tabular-nums">{cancelCountdown}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stepper 4 step (Plek screenshot: Pesanan, Konfirmasi, Pengerjaan, Selesai) */}
            <View className="flex-row justify-between items-center mt-3.5 px-2">
              {[
                { label: "Pesanan", done: true, active: true },
                { label: isCOD ? "Konfirmasi" : "Escrow", done: isPaid && !isPendingApproval, active: isPendingApproval || isPaid || isWaitingPayment },
                { label: "Pengerjaan", done: isDelivered || isDone, active: isWorking || isDelivered || isDone || isPendingCancel },
                { label: "Selesai", done: isDone, active: isDone },
              ].map((s, idx) => (
                <View key={idx} className="items-center flex-col">
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mb-1 ${
                      s.done ? "bg-emerald-600 text-white" : s.active ? "bg-emerald-100 border border-emerald-300" : "bg-gray-100"
                    }`}
                  >
                    {s.done ? <CheckCircle2 size={13} color="#ffffff" /> : <Text className={`text-[10px] font-black ${s.active ? "text-emerald-700" : "text-gray-400"}`}>{idx + 1}</Text>}
                  </View>
                  <Text className={`text-[10px] font-bold ${s.active ? "text-gray-900" : "text-gray-400"}`}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Banner Pengajuan Pembatalan oleh Klien */}
          {isPendingCancel && (
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-300 shadow-xs flex-col gap-2.5">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                  <Clock size={16} color="#b45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-amber-900">Klien Mengajukan Pembatalan</Text>
                  <Text className="text-[10px] text-amber-700">Respon dalam 24 jam atau saldo otomatis di-refund ke Klien</Text>
                </View>
              </View>
              <View className="bg-white rounded-xl p-3 border border-amber-200">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Alasan Klien:</Text>
                <Text className="text-xs font-medium text-gray-800 italic">
                  "{job.cancel_reason || job.alasan_penolakan || 'Klien mengajukan pembatalan pesanan'}"
                </Text>
              </View>
              <View className="flex-row items-center justify-between pt-0.5">
                <Text className="text-[11px] font-bold text-amber-800">Batas Waktu Respon:</Text>
                <Text className="text-xs font-black text-red-600 font-mono">{cancelCountdown || "24 Jam"}</Text>
              </View>
            </View>
          )}

          {/* 2. Informasi Klien */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Informasi Klien</Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 min-w-0 pr-2">
                <View className="w-11 h-11 rounded-full bg-emerald-50 items-center justify-center overflow-hidden border border-emerald-100">
                  {job.pelanggan?.face_url ? (
                    <Image source={{ uri: job.pelanggan.face_url }} style={{ width: 44, height: 44 }} />
                  ) : (
                    <Text className="text-emerald-700 font-extrabold text-sm">{job.pelanggan?.name?.charAt(0) || "K"}</Text>
                  )}
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-black text-gray-900" numberOfLines={1}>
                    {job.pelanggan?.name || "Pelanggan BISA"}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                    {job.lokasi || "Bojongsari"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleOpenDirectChat} className="p-2.5 rounded-full bg-emerald-50 border border-emerald-100">
                <Send size={15} color="#059669" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Rincian Pekerjaan — header alasan pembatalan saat Dibatalkan */}
          <View className={`rounded-2xl p-4 border shadow-xs flex-col gap-1 ${isCancelled ? "bg-amber-50/70 border-amber-200" : "bg-white border-gray-100"}`}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rincian Pekerjaan</Text>
              <View className="flex-row items-center gap-1">
                <Clock size={10} color="#9CA3AF" />
                <Text className="text-[10px] font-bold text-gray-500">{fmtDate(job.created_at)}</Text>
              </View>
            </View>
            <Text className={`text-base font-black mt-1 ${isCancelled ? "text-gray-900" : "text-gray-900"}`}>{job.judul}</Text>
            {isCancelled ? (
              <View className="mt-2 bg-white rounded-xl border border-amber-200 px-3 py-2.5 flex-col gap-1">
                <Text className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wide">Alasan Pembatalan</Text>
                <Text className="text-xs text-gray-700 leading-relaxed">
                  {(job as any).cancel_reason || "Pesanan dibatalkan — menunggu konfirmasi / kedaluwarsa."}
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-gray-500 leading-relaxed mt-0.5">
                {job.deskripsi?.replace(/\[EXPIRES_AT\][\s\S]*$/, "").replace(/Metode Pembayaran:\s*COD/gi, "").replace(/Donasi:[^\n]*/gi, "").replace(/\n{2,}/g, "\n").trim() || "Pesanan langsung dari profil mitra."}
              </Text>
            )}
          </View>

          {/* 4. Rincian Pembayaran (COD / Escrow) */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex-col gap-2.5">
            <View className="flex-row items-center justify-between pb-2 border-b border-gray-100">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isCOD ? "Rincian Pembayaran (COD)" : "Rincian Pembayaran Online"}
              </Text>
              <View className={`px-2 py-0.5 rounded-full border ${isCOD ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <Text className={`text-[10px] font-black ${isCOD ? "text-amber-800" : "text-emerald-700"}`}>
                  {isCOD ? "Bayar di Tempat (COD)" : "Pembayaran Online"}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center text-xs">
              <Text className="text-xs text-gray-600">Nilai Kesepakatan (Total)</Text>
              <Text className="text-sm font-black text-gray-900">{formatRupiah(priceNum)}</Text>
            </View>

            {!isCOD && (
              <View className="flex-row justify-between items-center text-xs">
                <Text className="text-xs text-gray-500">Potongan Layanan Platform ({feeLabelPct}%)</Text>
                <Text className="text-xs font-bold text-red-500">- {formatRupiah(platformFee)}</Text>
              </View>
            )}

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <View className="flex-row items-center gap-1">
                <Wallet size={15} color="#059669" />
                <Text className="text-xs font-black text-gray-900">
                  {isCOD ? "Diterima Mitra (Tunai)" : isDone ? "Penghasilan Bersih Mitra" : "Estimasi Mitra Terima"}
                </Text>
              </View>
              <Text className="text-base font-black text-emerald-700">{formatRupiah(isCOD ? priceNum : netEarnings)}</Text>
            </View>

            {isDelivered && countdown && !isCOD && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row items-center gap-2.5">
                <Timer size={18} color="#d97706" />
                <View className="flex-1">
                  <Text className="text-[11px] font-black text-amber-900">{countdown}</Text>
                  <Text className="text-[10px] text-amber-700 mt-0.5">Jika Klien tidak merespons dalam 72 jam, dana otomatis cair ke Saldo Mitra.</Text>
                </View>
              </View>
            )}

            <View className={`rounded-xl p-3 border ${isPendingApproval && isCOD ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-100"}`}>
              <Text className={`text-[11px] leading-relaxed ${isPendingApproval && isCOD ? "text-amber-900" : "text-emerald-800"}`}>
                {isDone
                  ? "✅ Dana bersih telah ditransfer otomatis ke Saldo Dompet Anda dan siap ditarik."
                  : isPendingApproval && isCOD
                  ? '⏳ Klien memilih Bayar di Tempat (COD). Terima pesanan untuk mulai pengerjaan — pembayaran tunai diselesaikan setelah Klien klik "Terima Pesanan".'
                  : isCOD
                  ? '💵 Pembayaran dilakukan secara tunai oleh Klien setelah hasil kerja selesai dan Klien mengklik "Terima Pesanan".'
                  : `🔒 Pembayaran berhasil. Begitu Klien menerima hasil kerja, dana bersih ${formatRupiah(netEarnings)} langsung masuk ke Saldo Dompet Anda.`}
              </Text>
            </View>
          </View>

          {/* 5. Lampiran Hasil Kerja jika ada */}
          {(job.work_file_url || job.work_link_url || job.work_note) && (
            <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex-col gap-2.5">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hasil Kerja & Catatan</Text>
              {job.work_note && (
                <View className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Text className="text-xs text-gray-700 italic">"{job.work_note}"</Text>
                </View>
              )}
              {job.work_file_url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(job.work_file_url!)}
                  activeOpacity={0.88}
                  className="w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                  style={{ height: 200 }}
                >
                  <Image source={{ uri: job.work_file_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <View className="absolute bottom-2 right-2 bg-black/60 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                    <FileText size={10} color="#fff" />
                    <Text className="text-[10px] font-bold text-white">Ketuk untuk Buka Foto</Text>
                  </View>
                </TouchableOpacity>
              )}
              {job.work_link_url && (
                <TouchableOpacity onPress={() => Linking.openURL(job.work_link_url!)} className="flex-row items-center gap-1.5 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                  <Link2 size={14} color="#2563eb" />
                  <Text className="text-xs font-bold text-blue-600 flex-1" numberOfLines={1}>{job.work_link_url}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Plek Screenshot */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-gray-100 p-3 shadow-lg">
        <View className="max-w-[440px] w-full self-center flex-row gap-2">
          {isPendingApproval && (
            <>
              <TouchableOpacity
                onPress={() => setShowRejectModal(true)}
                disabled={acting}
                className="flex-1 py-3.5 rounded-full border border-red-200 bg-white items-center justify-center"
              >
                <Text className="text-xs font-black text-red-600">Tolak Pesanan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAcceptOrder}
                disabled={acting}
                className="flex-1 py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md"
              >
                {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Terima Pesanan</Text>}
              </TouchableOpacity>
            </>
          )}

          {isWorking && (
            <>
              <TouchableOpacity
                onPress={() => setShowMutualModal(true)}
                className="px-3.5 py-3 rounded-full border border-red-200 bg-red-50 items-center justify-center flex-row gap-1"
              >
                <Handshake size={14} color="#b91c1c" />
                <Text className="text-xs font-bold text-red-700">Batal Sepakat</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenDirectChat} className="px-3.5 py-3 rounded-full border border-gray-200 bg-white items-center justify-center flex-row gap-1">
                <MessageSquare size={14} color="#374151" />
                <Text className="text-xs font-bold text-gray-700">Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDeliveryModal(true)}
                className="flex-1 py-3 rounded-full bg-emerald-600 items-center justify-center shadow-md flex-row gap-1.5"
              >
                <FileText size={15} color="#ffffff" />
                <Text className="text-xs font-black text-white">Kirim Hasil Kerja</Text>
              </TouchableOpacity>
            </>
          )}

          {isPendingCancel && (
            <>
              <TouchableOpacity
                onPress={() => setShowRejectCancelModal(true)}
                disabled={cancelResponding}
                className="flex-1 py-3.5 rounded-full border border-red-300 bg-red-50 items-center justify-center"
              >
                <Text className="text-xs font-bold text-red-700">Tolak (&gt;80%)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Setujui Pembatalan?",
                    "Saldo akan dikembalikan secara penuh ke Klien dan pesanan akan ditutup.",
                    [
                      { text: "Batal", style: "cancel" },
                      { text: "Ya, Setujui", style: "destructive", onPress: handleMitraApproveCancel },
                    ]
                  );
                }}
                disabled={cancelResponding}
                className="flex-1 py-3.5 rounded-full bg-red-600 items-center justify-center shadow-md"
              >
                {cancelResponding ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-xs font-black text-white">Setujui Batal</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {isDelivered && (
            <>
              <TouchableOpacity
                onPress={() => setShowDeliveryModal(true)}
                className="flex-1 py-3.5 rounded-full border border-emerald-300 bg-emerald-50 items-center justify-center"
              >
                <Text className="text-xs font-black text-emerald-800">Perbarui Hasil Kerja</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenDirectChat} className="flex-1 py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md">
                <Text className="text-xs font-black text-white">Buka Chat</Text>
              </TouchableOpacity>
            </>
          )}

          {isDone && (
            <TouchableOpacity onPress={() => router.push("/p/dompet" as any)} className="w-full py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md flex-row gap-2">
              <Wallet size={16} color="#ffffff" />
              <Text className="text-xs font-black text-white">Lihat Penghasilan di Dompet Saya</Text>
            </TouchableOpacity>
          )}

          {isCancelled && (
            <View className="w-full py-3 items-center justify-center bg-gray-100 rounded-2xl">
              <Text className="text-xs font-bold text-gray-500">Pesanan ini telah dibatalkan</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal Kirim Hasil Kerja */}
      <Modal visible={showDeliveryModal} transparent animationType="slide" onRequestClose={() => setShowDeliveryModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 gap-3.5 max-h-[85%]">
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center">
                  <FileText size={18} color="#059669" />
                </View>
                <View>
                  <Text className="font-black text-gray-900 text-sm">Kirim Hasil Kerja</Text>
                  <Text className="text-[10px] text-gray-500">Foto bukti atau link pengerjaan</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowDeliveryModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <X size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {deliveryImageUri ? (
              <View className="w-full rounded-xl overflow-hidden border-2 border-emerald-300 bg-emerald-50">
                <Image source={{ uri: deliveryImageUri }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                <View className="flex-row gap-2 p-2">
                  <TouchableOpacity onPress={handlePickImage} className="flex-1 py-2 rounded-full bg-white border border-emerald-200 items-center">
                    <Text className="text-xs font-bold text-emerald-700">Ganti Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDeliveryImageUri(null)} className="px-4 py-2 rounded-full bg-red-50 border border-red-200 items-center">
                    <Text className="text-xs font-bold text-red-600">Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                className="w-full py-8 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center gap-1.5"
              >
                <Camera size={22} color="#9ca3af" />
                <Text className="text-xs font-bold text-gray-600">Tap untuk pilih Foto Bukti</Text>
                <Text className="text-[10px] text-gray-400">JPG/PNG max 5MB</Text>
              </TouchableOpacity>
            )}

            <View className="flex-col gap-1">
              <Text className="text-[11px] font-bold text-gray-700">Link Dokumen (Opsional)</Text>
              <TextInput
                value={deliveryLink}
                onChangeText={setDeliveryLink}
                placeholder="https://drive.google.com/..."
                placeholderTextColor="#9ca3af"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900"
              />
            </View>

            <View className="flex-col gap-1">
              <Text className="text-[11px] font-bold text-gray-700">Pesan untuk Klien (Opsional)</Text>
              <TextInput
                value={deliveryNote}
                onChangeText={setDeliveryNote}
                placeholder="Pekerjaan sudah diselesaikan sesuai instruksi..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 min-h-[60px]"
              />
            </View>

            <TouchableOpacity
              onPress={handleSendDelivery}
              disabled={sendingDelivery}
              className="w-full py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md"
            >
              {sendingDelivery ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Kirim Hasil Kerja</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Tolak Pesanan */}
      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3">
            <Text className="text-sm font-black text-gray-900">Tolak Pesanan Ini?</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Alasan penolakan..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs min-h-[80px]"
            />
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity onPress={() => setShowRejectModal(false)} className="flex-1 py-3 rounded-full border border-gray-200 items-center">
                <Text className="text-xs font-bold text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRejectOrder} disabled={acting} className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center">
                {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Konfirmasi Tolak</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nice Alert — premium mobile, anim slide, auto-close 3s untuk sukses, shadow tebal */}
      <Modal visible={alertInfo.show} transparent animationType="slide" onRequestClose={() => setAlertInfo({ ...alertInfo, show: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              width: "100%",
              maxWidth: 360,
              borderRadius: 28,
              padding: 20,
              gap: 12,
              shadowColor: "#065f46",
              shadowOpacity: 0.18,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 22,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alertInfo.variant === "success" ? "#ECFDF5" : alertInfo.variant === "error" ? "#FEF2F2" : "#EFF6FF",
                borderWidth: 1,
                borderColor: alertInfo.variant === "success" ? "#A7F3D0" : alertInfo.variant === "error" ? "#FECACA" : "#BFDBFE",
              }}
            >
              {alertInfo.variant === "success" ? <CheckCircle2 size={26} color="#059669" /> : alertInfo.variant === "error" ? <X size={26} color="#dc2626" /> : <FileText size={26} color="#2563eb" />}
            </View>
            <View style={{ gap: 6, alignItems: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827", textAlign: "center" }}>{alertInfo.title}</Text>
              <Text style={{ fontSize: 12, color: "#4b5563", textAlign: "center", lineHeight: 18 }}>{alertInfo.message}</Text>
            </View>

            {alertInfo.variant === "success" && (
              <View style={{ backgroundColor: "#F0FDF4", borderColor: "#A7F3D0", borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 11, color: "#065f46", fontWeight: "700", textAlign: "center" }}>✓ Tersimpan & otomatis masuk chat Klien</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setAlertInfo({ ...alertInfo, show: false })}
              activeOpacity={0.9}
              style={{ width: "100%", paddingVertical: 13, borderRadius: 999, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginTop: 4, shadowColor: "#059669", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.2 }}>OK, Mengerti</Text>
            </TouchableOpacity>

            {alertInfo.variant === "success" && <Text style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 2 }}>Tertutup otomatis dalam 3 detik…</Text>}
          </View>
        </View>
      </Modal>

      {/* Modal Batal Sepakat Bersama */}
      <Modal visible={showMutualModal} transparent animationType="fade" onRequestClose={() => setShowMutualModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                <Handshake size={16} color="#dc2626" />
              </View>
              <View>
                <Text className="font-black text-gray-900 text-sm">Batal Sepakat Bersama</Text>
                <Text className="text-[10px] text-gray-500">Refund instan ke Klien</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600 leading-relaxed">
              {isCOD ? "Pesanan COD akan dibatalkan secara langsung." : "Dana akan langsung dikembalikan ke Klien."}
            </Text>
            <TextInput
              value={mutualReason}
              onChangeText={setMutualReason}
              placeholder="Alasan pembatalan..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs min-h-[60px]"
            />
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity onPress={() => setShowMutualModal(false)} className="flex-1 py-3 rounded-full border border-gray-200 items-center">
                <Text className="text-xs font-bold text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleMutualCancel} disabled={mutualActing} className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center">
                {mutualActing ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Batalkan Bersama</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tolak Pembatalan (Progres > 80% / Komplain) */}
      <Modal visible={showRejectCancelModal} transparent animationType="fade" onRequestClose={() => setShowRejectCancelModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3.5">
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-2.5">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                  <Clock size={16} color="#b45309" />
                </View>
                <View>
                  <Text className="font-black text-gray-900 text-sm">Tolak Pembatalan</Text>
                  <Text className="text-[10px] text-gray-500">Pekerjaan sudah berjalan / &gt; 80%</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowRejectCancelModal(false)} className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
                <X size={15} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-600 leading-relaxed">
              Jika pekerjaan telah dikerjakan atau hampir selesai (&gt; 80%), Anda berhak menolak pembatalan. Pesanan akan tetap berjalan. Anda juga dapat mengajukan komplain ke Pusat Bantuan jika terjadi perselisihan.
            </Text>

            <TextInput
              value={rejectCancelReason}
              onChangeText={setRejectCancelReason}
              placeholder="Alasan penolakan (misal: pengerjaan sudah 85%)..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 min-h-[75px]"
            />

            <TouchableOpacity
              onPress={() => {
                setShowRejectCancelModal(false);
                router.push("/p/bantuan" as any);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 items-center justify-center flex-row gap-1.5"
            >
              <Text className="text-xs font-bold text-amber-800">Butuh Bantuan? Buka Pusat Bantuan</Text>
            </TouchableOpacity>

            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity onPress={() => setShowRejectCancelModal(false)} className="flex-1 py-3 rounded-full border border-gray-200 items-center justify-center">
                <Text className="text-xs font-bold text-gray-700">Tutup</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleMitraRejectCancel} disabled={cancelResponding} className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center shadow-md">
                {cancelResponding ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Tolak Pengajuan</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
