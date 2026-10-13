import { useState, useEffect, useCallback } from "react";
import { Alert, Platform, Linking, AppState } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { containsPhoneNumber } from "../lib/chatSecurity";
import { parseOrderContent } from "../lib/chatHelpers";
import { usePopup } from "../components/PopupProvider.native";
import { compressImageDetailed, compressImageWithBase64, base64ToUint8Array } from "../lib/imageCompression";
import { checkAndSyncMidtransStatus } from "../lib/midtransDirect";
import {
  processOrderRefund,
  releaseEscrowPayout,
  respondOrderCancellation,
} from "../lib/payment";

// Re-export helpers for convenience
export { formatBudget, parseOrderContent } from "../lib/chatHelpers";

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  client_id: string;
  mitra_id: string;
  type: string;
  job_id?: string;
  is_active?: boolean;
  deleted_by_client?: boolean;
  deleted_by_mitra?: boolean;
  mitra?: { id: string; name: string; face_url: string };
  client?: { id: string; name: string; face_url: string };
}

// ───────────────────────────────────────────────
// Clean 1:1 web implementation + upgrades
// ───────────────────────────────────────────────
export function useChatLogic(conversationId: string) {
  const router = useRouter();
  const popupContext = usePopup();
  const showPopup = popupContext?.showPopup || (() => {});

  // Core
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState("");
  const [myUserName, setMyUserName] = useState("");
  const [otherUser, setOtherUser] = useState<{ id: string; name: string; face_url: string } | null>(null);
  const [isMitraView, setIsMitraView] = useState(false);

  // UI flags
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showPaySheet, setShowPaySheet] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);

  // Action data
  const [offerAmount, setOfferAmount] = useState("");
  const [payJobId, setPayJobId] = useState("");
  const [payBudget, setPayBudget] = useState("");
  const [payAgreedPrice, setPayAgreedPrice] = useState(0);
  const [payingCod, setPayingCod] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [deliveryJobId, setDeliveryJobId] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryFileUrl, setDeliveryFileUrl] = useState("");
  const [deliveryPreviewUri, setDeliveryPreviewUri] = useState("");
  const [sendingDelivery, setSendingDelivery] = useState(false);
  const [revisionJobId, setRevisionJobId] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [sendingRevision, setSendingRevision] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);

  // Status sync
  const [jobStatusMap, setJobStatusMap] = useState<Record<string, string>>({});
  const [jobPaymentMethodMap, setJobPaymentMethodMap] = useState<Record<string, string>>({});
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [showJobBanner, setShowJobBanner] = useState(true);

  const clientQuickReplies = ["Halo, saya tertarik", "Berapa biayanya?", "Bisa hari ini?", "Terima kasih!"];
  const mitraQuickReplies = ["Siap, bisa dikerjakan 🙏", "Estimasi selesai besok", "Mohon detail lokasinya", "Terima kasih atas kepercayaannya!"];

  const isChatLocked = conversation?.is_active === false;

  const updateLastMessage = async (text: string) => {
    try {
      await supabase.from("conversations").update({ last_message: text, last_message_at: new Date().toISOString() }).eq("id", conversationId);
    } catch {}
  };

  const fetchAll = useCallback(async () => {
    try {
      const user: any = await getStoredUser();
      if (!user?.id) { router.replace("/(auth)/login" as any); return; }
      setMyUserId(String(user.id));
      if (user.name) setMyUserName(user.name);

      const { data: conv, error: convErr } = await supabase.from("conversations")
        .select(`id, client_id, mitra_id, type, is_active, deleted_by_client, deleted_by_mitra, job_id, client:client_id (id, name, face_url), mitra:mitra_id (id, name, face_url)`)
        .eq("id", conversationId).single();
      if (convErr) throw convErr;
      setConversation(conv as any);

      const isClient = String(conv.client_id) === String(user.id);
      setIsMitraView(!isClient);
      const other = isClient
        ? (Array.isArray((conv as any).mitra) ? (conv as any).mitra[0] : (conv as any).mitra)
        : (Array.isArray((conv as any).client) ? (conv as any).client[0] : (conv as any).client);
      setOtherUser(other || null);

      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (msgs) {
        setMessages(msgs as any);
        const jobIds = new Set<string>();
        msgs.forEach((m: any) => {
          if (m.content?.startsWith("[ORDER]:")) { const p = parseOrderContent(m.content); if (p.jobId) jobIds.add(p.jobId); }
          if (m.content?.startsWith("[DELIVERY]:")) { const id = m.content.slice(11).split("|")[0]; if (id) jobIds.add(id); }
        });
        if (jobIds.size) {
          const { data: jobs } = await supabase.from("pekerjaan_bisa").select("id, status, payment_token, payment_status, payment_method").in("id", Array.from(jobIds));
          if (jobs) {
            const map: Record<string, string> = {};
            const pmMap: Record<string, string> = {};
            jobs.forEach((j: any) => {
              map[String(j.id)] = j.status;
              if (j.payment_method) {
                pmMap[String(j.id)] = j.payment_method;
              }
              // Auto-sync ke Midtrans jika ada pesanan yang payment_status belum pernah tercermin
              if (
                (j.payment_status === "belum_bayar" || !j.payment_status) &&
                j.status !== "menunggu_persetujuan_batal" &&
                j.status !== "selesai" &&
                j.status !== "dibatalkan" &&
                j.payment_token
              ) {
                checkAndSyncMidtransStatus(Number(j.id), j.payment_token).then((res) => {
                  if (res.isPaid) {
                    setJobStatusMap((prev) => ({ ...prev, [String(j.id)]: "sedang_dikerjakan" }));
                    setJobPaymentMethodMap((prev) => ({ ...prev, [String(j.id)]: j.payment_method || "MIDTRANS" }));
                    setJobInfo((prev: any) =>
                      prev && String(prev.id) === String(j.id)
                        ? { ...prev, status: "sedang_dikerjakan", payment_status: "escrow_held" }
                        : prev
                    );
                  }
                });
              }
            });
            setJobStatusMap((p) => ({ ...p, ...map }));
            setJobPaymentMethodMap((p) => ({ ...p, ...pmMap }));
          }
        }
      }
      const targetJobId = (conv as any).job_id;
      if (targetJobId) {
        const { data: info } = await supabase
          .from("pekerjaan_bisa")
          .select("id, judul, deskripsi, budget, status, payment_method, payment_status, payment_token, kategori, agreed_price, created_at, pelanggan_id, mitra_id")
          .eq("id", targetJobId)
          .maybeSingle();
        if (info) {
          setJobInfo(info);
          if (
            (info.payment_status === "belum_bayar" || !info.payment_status) &&
            info.status !== "menunggu_persetujuan_batal" &&
            info.status !== "selesai" &&
            info.status !== "dibatalkan" &&
            (info as any).payment_token
          ) {
            checkAndSyncMidtransStatus(Number(info.id), (info as any).payment_token).then((res) => {
              if (res.isPaid) {
                setJobInfo((prev: any) =>
                  prev ? { ...prev, status: "sedang_dikerjakan", payment_status: "escrow_held" } : prev
                );
                setJobStatusMap((prev) => ({ ...prev, [String(info.id)]: "sedang_dikerjakan" }));
              }
            });
          }
        }
      }
    } catch (e: any) {
      console.error("Load chat error", e);
      setConversation(null);
      setOtherUser(null);
      setMessages([]);
    } finally { setLoading(false); }
  }, [conversationId, router]);

  // Auto-sync saat kembali ke aplikasi dari halaman pembayaran browser Midtrans
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchAll();
      }
    });
    return () => sub.remove();
  }, [fetchAll]);

  useEffect(() => {
    if (!conversationId) return;
    fetchAll();
    // Robust realtime: unique channel per mount to avoid "cannot add postgres_changes after subscribe()" on hot-reload
    const channelName = `mobile_chat_${conversationId}_${Date.now()}`;
    const channel = supabase.channel(channelName);
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, payload => {
        const nm = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === nm.id) ? prev : [...prev, nm]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, payload => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pekerjaan_bisa" }, payload => {
        const upd = payload.new as any;
        if (upd) {
          setJobStatusMap((p: Record<string, string>) => ({ ...p, [String(upd.id)]: upd.status }));
          if (upd.payment_method) {
            setJobPaymentMethodMap((p: Record<string, string>) => ({ ...p, [String(upd.id)]: upd.payment_method }));
          }
          setJobInfo((prev: any) => prev && String(prev.id) === String(upd.id) ? { ...prev, ...upd } : prev);
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") console.warn("Realtime channel error", channelName);
      });
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ── Actions
  const sendMessage = async () => {
    if (!newMessage.trim() || isChatLocked) return;
    const content = newMessage.trim();
    const sec = containsPhoneNumber(content);
    if (sec.isForbidden) {
      showPopup({
        title: "Keamanan Transaksi BISA",
        message: sec.reason || "Nomor telepon / kontak dilarang dikirim demi keamanan bersama.",
        type: "warning",
        theme: isMitraView ? "provider" : "client",
      });
      return;
    }
    setNewMessage("");
    try {
      const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content, message_type: "text" }).select().single();
      if (error) throw error;
      if (data) setMessages(prev => [...prev, data]);
      await updateLastMessage(content);
    } catch (e: any) {
      showPopup({
        title: "Gagal Mengirim",
        message: e.message || "Pesan gagal terkirim.",
        type: "error",
        theme: isMitraView ? "provider" : "client",
      });
      setNewMessage(content);
    }
  };

  const pickImage = async (useCamera = false) => {
    try {
      setShowAttachments(false);
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showPopup({ title: "Izin Ditolak", message: "Izin kamera diperlukan untuk mengambil foto.", type: "warning", theme: isMitraView ? "provider" : "client" });
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          showPopup({ title: "Izin Ditolak", message: "Izin akses galeri diperlukan.", type: "warning", theme: isMitraView ? "provider" : "client" });
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      }
      if (!result.canceled && result.assets[0]?.uri) {
        setUploading(true);
        const asset = result.assets[0];
        
        // Kompres gambar sebelum diunggah
        const comp = await compressImageDetailed(asset.uri, { maxDimension: 1080, quality: 0.7 });
        const compressedUri = comp.uri;

        const ext = (asset.fileName || asset.uri).split(".").pop() || "jpg";
        const fileName = `${conversationId}_${Date.now()}.${ext}`;
        const filePath = `chat_images/${fileName}`;

        // Cross-platform binary upload for Supabase Storage (Web & React Native Compatible)
        const response = await fetch(compressedUri);
        const blob = await response.blob();

        const { error: upErr } = await supabase.storage
          .from("job_attachments")
          .upload(filePath, blob, { contentType: asset.mimeType || "image/jpeg", upsert: true });

        if (upErr) throw upErr;
        const { data } = supabase.storage.from("job_attachments").getPublicUrl(filePath);
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: Number(myUserId),
          content: data.publicUrl,
          message_type: "image",
        });
        await updateLastMessage("📷 Foto");
      }
    } catch (e: any) {
      showPopup({
        title: "Gagal Upload Gambar",
        message: e.message || "Gagal mengunggah foto ke server.",
        type: "error",
        theme: isMitraView ? "provider" : "client",
      });
    } finally {
      setUploading(false);
    }
  };

  const sendLocation = async () => {
    try {
      setShowAttachments(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showPopup({ title: "Izin Ditolak", message: "Izin lokasi diperlukan.", type: "warning", theme: isMitraView ? "provider" : "client" });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const url = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      const text = `📍 Lokasi Saya: ${url}`;
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content: text, message_type: "location" });
      await updateLastMessage("📍 Lokasi");
    } catch (e: any) {
      showPopup({ title: "Gagal Lokasi", message: e.message, type: "error", theme: isMitraView ? "provider" : "client" });
    }
  };

  const createOffer = async (amountStr: string) => {
    const amount = amountStr.replace(/\D/g, "");
    if (!amount) return;
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content: `[OFFER]:${amount}:pending`, message_type: "offer" });
    await updateLastMessage("💰 Penawaran Harga");
    setShowOfferModal(false); setShowAttachments(false);
  };

  const actionOffer = async (amount: string, action: "accepted" | "rejected") => {
    const found = messages.find(m => m.content.startsWith(`[OFFER]:${amount}:pending`));
    if (!found) return;
    await supabase.from("messages").update({ content: `[OFFER]:${amount}:${action}` }).eq("id", found.id);
    await updateLastMessage(action === "accepted" ? "✅ Penawaran diterima" : "❌ Penawaran ditolak");

    if (action === "accepted") {
      const numAmount = Number(amount);
      const targetJobId = jobInfo?.id || conversation?.job_id;
      if (targetJobId && numAmount > 0) {
        try {
          await supabase
            .from("pekerjaan_bisa")
            .update({
              agreed_price: numAmount,
              budget: `Rp ${numAmount.toLocaleString("id-ID")}`,
            })
            .eq("id", Number(targetJobId));

          setJobInfo((prev: any) =>
            prev && String(prev.id) === String(targetJobId)
              ? { ...prev, agreed_price: numAmount, budget: `Rp ${numAmount.toLocaleString("id-ID")}` }
              : prev
          );
        } catch (jErr) {
          console.warn("Gagal update agreed_price dari penawaran:", jErr);
        }
      }
    }
  };

  const createInvoice = async (judul: string, harga: number) => {
    setSendingInvoice(true);
    try {
      const clientId = isMitraView ? conversation?.client_id : myUserId;
      const mitraId = isMitraView ? myUserId : conversation?.mitra_id;
      const { data: job, error: jobErr } = await supabase.from("pekerjaan_bisa").insert({
        judul, deskripsi: "Pesanan dibuat via chat", kategori: "Jasa Umum",
        budget: `Rp ${harga.toLocaleString("id-ID")}`, agreed_price: harga,
        pelanggan_id: Number(clientId), mitra_id: Number(mitraId), status: "menunggu_pembayaran",
      }).select().single();
      if (jobErr) throw jobErr;
      const orderContent = `[ORDER]:${job.id}|${encodeURIComponent(judul)}|${encodeURIComponent(`Rp ${harga.toLocaleString("id-ID")}`)}|menunggu_pembayaran`;
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content: orderContent, message_type: "order" });
      await supabase.from("conversations").update({ job_id: job.id }).eq("id", conversationId);
      await updateLastMessage(`📋 Pesanan: ${judul}`);
      setShowInvoiceModal(false);
      showPopup({ title: "Invoice Terkirim", message: "Kartu pesanan escrow berhasil dikirim!", type: "success", theme: isMitraView ? "provider" : "client" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error", theme: isMitraView ? "provider" : "client" });
    } finally {
      setSendingInvoice(false);
    }
  };

  const choosePayment = async (method: "MIDTRANS" | "COD") => {
    if (!payJobId) return;

    if (method === "COD") {
      setPayingCod(true);
      try {
        await supabase.from("pekerjaan_bisa").update({ metode_pembayaran: "cod", payment_method: "COD", status: "sedang_dikerjakan" }).eq("id", Number(payJobId));
        setShowPaySheet(false);
        showPopup({ title: "COD Dipilih", message: "Status → Sedang Dikerjakan. Bayar tunai setelah pekerjaan selesai.", type: "success", theme: isMitraView ? "provider" : "client" });
        fetchAll();
      } catch (e: any) {
        showPopup({ title: "Gagal", message: e.message, type: "error", theme: isMitraView ? "provider" : "client" });
      } finally {
        setPayingCod(false);
      }
      return;
    }
    // MIDTRANS — 1:1 web handleChoosePayment: minta Snap token lalu buka paymentUrl (mobile pakai Linking)
    let priceNum = Number((payBudget || "").replace(/\D/g, "")) || 0;
    if (!priceNum) {
      try {
        const { data: _job } = await supabase.from("pekerjaan_bisa").select("agreed_price, budget").eq("id", Number(payJobId)).maybeSingle();
        if (_job) priceNum = Number((_job as any).agreed_price) || Number(String((_job as any).budget || "").replace(/\D/g, "")) || 0;
      } catch {}
    }
    if (!priceNum) {
      showPopup({ title: "Gagal Pembayaran", message: "Nominal harga tidak valid.", type: "error", theme: isMitraView ? "provider" : "client" });
      return;
    }
    setPayingOnline(true);
    setShowPaySheet(false);
    try {
      const isWeb = Platform.OS === "web";
      let paymentUrl: string | undefined;
      let snapToken: string | undefined;
      // 1. Coba backend Vercel dulu
      try {
        const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
        const backendUrl = rawApi || "https://bisa-admin.vercel.app";
        const url = `${backendUrl}/api/payment/snap`;
        const stored: any = await getStoredUser().catch(() => null);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: Number(payJobId),
            agreedPrice: priceNum,
            customerName: stored?.name || myUserName || "Pelanggan BISA",
            customerEmail: stored?.email || "buyer@bisa.app",
          }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          paymentUrl = data.paymentUrl || data.redirect_url;
          snapToken = data.snapToken || data.token;
        } else {
          const dbg = await res.json().catch(() => ({}));
          console.warn("[chat] backend snap failed", res.status, dbg);
        }
      } catch (beErr) {
        console.warn("[chat] backend Vercel error, fallback direct Midtrans:", beErr);
      }
      // 2. Fallback Direct Midtrans resmi (sama seperti c/aktivitas yang udah aman)
      if (!paymentUrl && !snapToken) {
        const { createMidtransSnapTransaction } = await import("../lib/midtransDirect");
        const stored2: any = await getStoredUser().catch(() => null);
        const directRes = await createMidtransSnapTransaction({
          jobId: Number(payJobId),
          agreedPrice: priceNum,
          customerName: stored2?.name || myUserName || "Pelanggan BISA",
          customerEmail: stored2?.email || "buyer@bisa.app",
        });
        if (!directRes.success || (!directRes.paymentUrl && !directRes.snapToken)) {
          throw new Error(directRes.message || "Gagal membuat transaksi Midtrans.");
        }
        paymentUrl = directRes.paymentUrl;
        snapToken = directRes.snapToken;
      }
      const targetUrl = paymentUrl || (snapToken ? `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}` : undefined);
      if (!targetUrl) throw new Error("Link pembayaran tidak tersedia. Coba lagi.");
      if (isWeb && typeof window !== "undefined" && (window as any).snap && snapToken && !paymentUrl) {
        (window as any).snap.pay(snapToken, {
          onSuccess: () => { try { showPopup({ title: "Pembayaran Diproses", message: "Verifikasi webhook…", type: "success" }); } catch {} fetchAll(); },
          onPending: () => { try { showPopup({ title: "Menunggu", message: "Selesaikan pembayaran di metode yang dipilih.", type: "info" }); } catch {} },
          onError: () => { try { showPopup({ title: "Gagal", message: "Transaksi tidak berhasil.", type: "error" }); } catch {} },
        });
      } else {
        await Linking.openURL(targetUrl);
        try { showPopup({ title: "Menunggu Pembayaran", message: "Selesaikan pembayaran di halaman Midtrans. Status akan otomatis diperbarui via webhook.", type: "info" }); } catch {}
      }
      // Jangan langsung fetchAll — webhook Midtrans akan ubah status ke escrow_held / sedang_dikerjakan secara realtime
    } catch (e: any) {
      try { showPopup({ title: "Error", message: e.message || "Gagal membuka pembayaran", type: "error" }); } catch { Alert.alert("Gagal", e.message || "Gagal membuka pembayaran"); }
      setShowPaySheet(true);
    } finally {
      setPayingOnline(false);
    }
  };

  const orderAction = async (jobId: string, action: string) => {
    if (action === "pay") {
      setPayJobId(jobId);
      // 1:1 web: bawa budget asli (agreed_price / jobInfo / bubble) — bukan status
      let budgetStr = "";
      let priceNum = 0;
      if (jobInfo && String(jobInfo.id) === String(jobId)) {
        const p = Number((jobInfo as any).agreed_price) || 0;
        if (p > 0) { priceNum = p; budgetStr = `Rp ${p.toLocaleString("id-ID")}`; }
        else if ((jobInfo as any).budget) budgetStr = String((jobInfo as any).budget);
      }
      if (!budgetStr) {
        try {
          const { data: _j } = await supabase.from("pekerjaan_bisa").select("agreed_price, budget").eq("id", Number(jobId)).maybeSingle();
          if (_j) {
            const p = Number((_j as any).agreed_price) || 0;
            if (p > 0) { priceNum = p; budgetStr = `Rp ${p.toLocaleString("id-ID")}`; }
            else if ((_j as any).budget) budgetStr = String((_j as any).budget);
          }
        } catch {}
      }
      setPayBudget(budgetStr);
      setPayAgreedPrice(priceNum > 0 ? priceNum : Number((budgetStr || "").replace(/\D/g, "")) || 0);
      setShowPaySheet(true);
    } else if (action === "deliver") {
      // Mitra hanya boleh kirim hasil jika escrow sudah dibayar (bukan COD)
      const j = jobStatusMap[jobId];
      const ji = jobInfo;
      const isPaid = ["escrow_held", "paid", "settlement", "capture", "authorized"].includes(String(ji?.payment_status));
      const isCOD = ji?.payment_method === "COD" || ji?.payment_status === "cod_pending";
      if (!isPaid && !isCOD) {
        try {
          showPopup({
            title: "Belum Bayar",
            message: "Pelanggan belum menyelesaikan pembayaran. Silakan tunggu hingga dana escrow masuk.",
            type: "info",
          });
        } catch {}
        return;
      }
      setDeliveryJobId(jobId);
      setShowDeliveryModal(true);
    } else if (action === "revision") {
      setRevisionJobId(jobId);
      setShowRevisionModal(true);
    } else if (action === "check_payment") {
      try {
        const numJobId = Number(jobId);
        const res = await checkAndSyncMidtransStatus(numJobId);
        if (res.isPaid) {
          setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "sedang_dikerjakan" }));
          setJobInfo((prev: any) =>
            prev && String(prev.id) === String(numJobId)
              ? { ...prev, status: "sedang_dikerjakan", payment_status: "escrow_held" }
              : prev
          );
          await fetchAll();
          try {
            showPopup({
              title: "Pembayaran Terverifikasi! 🎉",
              message: "Dana disimpan aman di Escrow. Pengerjaan dapat dilanjutkan.",
              type: "success",
            });
          } catch {}
        } else {
          try {
            showPopup({
              title: "Status Pembayaran",
              message: "Pembayaran belum terdeteksi selesai dari Midtrans. Mohon selesaikan pembayaran terlebih dahulu.",
              type: "info",
            });
          } catch {}
        }
      } catch (e: any) {
        try { showPopup({ title: "Gagal Cek Status", message: e.message || "Terjadi kesalahan", type: "error" }); } catch {}
      }
      return;
    } else if (action === "mitra_accept") {
      try {
        const numJobId = Number(jobId);
        const { data: job, error: fetchErr } = await supabase
          .from("pekerjaan_bisa")
          .select("id, status, payment_status, payment_method, pelanggan_id, mitra_id, judul")
          .eq("id", numJobId)
          .maybeSingle();

        if (fetchErr || !job) {
          try { showPopup({ title: "Error", message: "Pesanan tidak ditemukan.", type: "error" }); } catch {}
          return;
        }

        const isMitraMe = Number(job.mitra_id) === Number(myUserId);
        if (!isMitraMe) {
          try { showPopup({ title: "Akses Ditolak", message: "Hanya Mitra yang ditugaskan yang dapat menyetujui pesanan ini.", type: "error" }); } catch {}
          return;
        }

        const nextStatus = job.payment_status === "belum_bayar" ? "menunggu_pembayaran" : "sedang_dikerjakan";
        const { error: updErr } = await supabase
          .from("pekerjaan_bisa")
          .update({ status: nextStatus })
          .eq("id", numJobId);

        if (updErr) throw updErr;

        const acceptNotice = `✅ Mitra telah menyetujui pesanan: "${job.judul || 'Pesanan Jasa'}". Pengerjaan dapat segera dimulai.`;
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: Number(myUserId),
          message_type: "system",
          content: acceptNotice,
        });

        // Update pesan order lama di chat
        try {
          const { data: orderMsgs } = await supabase
            .from("messages")
            .select("id, content")
            .eq("conversation_id", conversationId)
            .eq("message_type", "order");

          if (orderMsgs && orderMsgs.length > 0) {
            for (const m of orderMsgs) {
              if (m.content.startsWith(`[ORDER]:${numJobId}|`)) {
                const parts = m.content.split("|");
                parts[3] = nextStatus;
                await supabase.from("messages").update({ content: parts.join("|") }).eq("id", m.id);
              }
            }
          }
        } catch {}

        setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: nextStatus }));
        setJobInfo((prev: any) =>
          prev && String(prev.id) === String(numJobId) ? { ...prev, status: nextStatus } : prev
        );
        await updateLastMessage("✅ Pesanan Diterima oleh Mitra");
        await fetchAll();

        try {
          showPopup({
            title: "Pesanan Diterima! 🚀",
            message: "Anda telah menyetujui pesanan ini. Pengerjaan dapat dimulai.",
            type: "success",
          });
        } catch {}
      } catch (e: any) {
        try { showPopup({ title: "Gagal", message: e.message || "Gagal menyetujui pesanan", type: "error" }); } catch {}
      }
      return;
    } else if (action === "mitra_reject") {
      const runReject = async () => {
        try {
          const numJobId = Number(jobId);
          const res = await processOrderRefund(numJobId, "Ditolak oleh Mitra");

          setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "dibatalkan" }));
          setJobInfo((prev: any) =>
            prev && String(prev.id) === String(numJobId)
              ? { ...prev, status: "dibatalkan", payment_status: res.refunded ? "refunded" : "cancelled" }
              : prev
          );
          setShowJobBanner(false);

          // Update pesan order lama di chat
          try {
            const { data: orderMsgs } = await supabase
              .from("messages")
              .select("id, content")
              .eq("conversation_id", conversationId)
              .eq("message_type", "order");

            if (orderMsgs && orderMsgs.length > 0) {
              for (const m of orderMsgs) {
                if (m.content.startsWith(`[ORDER]:${numJobId}|`)) {
                  const parts = m.content.split("|");
                  parts[3] = "dibatalkan";
                  await supabase.from("messages").update({ content: parts.join("|") }).eq("id", m.id);
                }
              }
            }
          } catch {}

          const rejectMsg = `❌ Mitra menolak pesanan ini.${res.refunded ? ` Dana telah dikembalikan ke saldo Klien.` : ""}`;
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: String(myUserId),
            message_type: "system",
            content: rejectMsg,
          });
          await updateLastMessage("❌ Pesanan Ditolak");
          await fetchAll();

          try {
            showPopup({
              title: "Pesanan Ditolak",
              message: "Pesanan telah dibatalkan.",
              type: "info",
            });
          } catch {}
        } catch (e: any) {
          try { showPopup({ title: "Gagal", message: e.message || "Gagal menolak pesanan", type: "error" }); } catch {}
        }
      };

      try {
        showPopup({
          title: "Tolak Pesanan Ini?",
          message: "Apakah Anda yakin ingin menolak pesanan ini?",
          type: "delete",
          confirmText: "Ya, Tolak",
          cancelText: "Batal",
          onConfirm: runReject,
        });
      } catch {
        Alert.alert("Tolak Pesanan?", "Yakin ingin menolak pesanan ini?", [
          { text: "Batal", style: "cancel" },
          { text: "Ya, Tolak", style: "destructive", onPress: runReject },
        ]);
      }
      return;
    } else if (action === "accept" || action === "accept_final") {
      // KLIEN HANYA BOLEH TERIMA JIKA SUDAH BAYAR (bukan COD)
      // Sync ke Midtrans dulu bila payment_status belum tercermin (webhook telat).
      {
        const ji = jobInfo;
        let isPaid = ["escrow_held", "paid", "settlement", "capture", "authorized"].includes(String(ji?.payment_status));
        const isCOD = ji?.payment_method === "COD" || ji?.payment_status === "cod_pending" || ji?.payment_status === "cod_completed";
        // accept_final adalah Klien klik Terima → wajib sudah dibayar
        if (action === "accept_final" && !isPaid && !isCOD) {
          try {
            const syncRes = await checkAndSyncMidtransStatus(Number(jobId), (ji as any)?.payment_token);
            if (syncRes.isPaid) {
              isPaid = true;
              setJobInfo((prev: any) => prev ? { ...prev, status: "sedang_dikerjakan", payment_status: "escrow_held" } : prev);
            }
          } catch {}
        }
        if (action === "accept_final" && !isPaid && !isCOD) {
          try {
            showPopup({
              title: "Belum Bayar",
              message: "Selesaikan pembayaran escrow terlebih dahulu sebelum konfirmasi pesanan.",
              type: "info",
            });
          } catch {}
          return;
        }
      }

      // Safety routing jika dipanggil oleh Mitra saat status masih menunggu konfirmasi mitra
      const isPendingApproval = jobInfo?.status === "menunggu_konfirmasi_mitra";
      const isMitraMe = Number(jobInfo?.mitra_id) === Number(myUserId);
      if (isPendingApproval && isMitraMe && action === "accept") {
        return orderAction(jobId, "mitra_accept");
      }

      // KLIEN MENERIMA HASIL KERJA & MERILIS DANA KE MITRA
      const doConfirmAccept = async () => {
        const runAccept = async () => {
          try {
            const numJobId = Number(jobId);
            const res = await releaseEscrowPayout(numJobId);

            const acceptMsg = res.isCOD
              ? "✅ Pesanan COD selesai — pembayaran tunai di tempat."
              : `✅ Pesanan Diterima! Dana sebesar Rp ${res.earnings.toLocaleString("id-ID")} telah dirilis ke Saldo Mitra. Silakan berikan rating & ulasan.`;

            await supabase.from("messages").insert({
              conversation_id: conversationId,
              sender_id: Number(myUserId),
              message_type: "system",
              content: acceptMsg,
            });

            // Update UI state langsung
            setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "selesai" }));
            setJobInfo((prev: any) =>
              prev && String(prev.id) === String(jobId) ? { ...prev, status: "selesai" } : prev
            );
            setShowJobBanner(false);
            await updateLastMessage("✅ Pesanan Selesai & Dana Dirilis");
            await fetchAll();

            try {
              showPopup({
                title: "Pesanan selesai! 🎉",
                message: "Dana diteruskan ke Mitra. Silakan beri ulasan.",
                type: "success",
              });
            } catch {}
            setTimeout(() => {
              try { router.push(`/c/ulasan/${jobId}` as any); } catch {}
            }, 600);
          } catch (e: any) {
            try { showPopup({ title: "Error", message: e.message || "Gagal memproses", type: "error" }); } catch {}
          }
        };

        try {
          showPopup({
            title: "Selesaikan Pesanan?",
            message: "Setelah Terima, dana escrow diteruskan ke Mitra dan tidak bisa revisi lagi. Lanjutkan?",
            type: "confirm",
            confirmText: "Ya, Terima",
            cancelText: "Batal",
            onConfirm: runAccept,
          });
        } catch {
          Alert.alert("Selesaikan Pesanan?", "Setelah Terima, dana diteruskan ke Mitra.", [
            { text: "Batal", style: "cancel" },
            { text: "Ya, Terima", onPress: runAccept },
          ]);
        }
      };
      doConfirmAccept();
      return;
    } else if (action === "reject" || action === "cancel") {
      const runCancel = async () => {
        try {
          const numJobId = Number(jobId);
          const res = await processOrderRefund(numJobId, "Dibatalkan oleh pengguna");

          setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "dibatalkan" }));
          setJobInfo((prev: any) =>
            prev && String(prev.id) === String(numJobId)
              ? { ...prev, status: "dibatalkan", payment_status: res.refunded ? "refunded" : "cancelled" }
              : prev
          );
          setShowJobBanner(false);

          // Update pesan order lama menjadi status dibatalkan
          try {
            const { data: orderMsgs } = await supabase
              .from("messages")
              .select("id, content")
              .eq("conversation_id", conversationId)
              .eq("message_type", "order");

            if (orderMsgs && orderMsgs.length > 0) {
              for (const m of orderMsgs) {
                if (m.content.startsWith(`[ORDER]:${numJobId}|`)) {
                  const parts = m.content.split("|");
                  parts[3] = "dibatalkan";
                  await supabase.from("messages").update({ content: parts.join("|") }).eq("id", m.id);
                }
              }
            }
          } catch {}

          const cancelMsg = `❌ Pesanan #${numJobId} telah dibatalkan.${
            res.refunded
              ? ` Dana sebesar Rp ${res.amount.toLocaleString("id-ID")} telah dikembalikan ke saldo Dompet Anda dan dapat ditarik.`
              : ""
          }`;

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: String(myUserId),
            message_type: "system",
            content: cancelMsg,
          });
          await updateLastMessage("❌ Pesanan Dibatalkan");
          setMessages((prev: any[]) =>
            prev.map((m) => {
              if (m.content && m.content.startsWith(`[ORDER]:${numJobId}|`)) {
                const parts = m.content.split("|");
                parts[3] = "dibatalkan";
                return { ...m, content: parts.join("|") };
              }
              return m;
            })
          );
          await fetchAll();

          try {
            showPopup({
              title: "Pesanan Dibatalkan",
              message: res.refunded
                ? `Dana sebesar Rp ${res.amount.toLocaleString("id-ID")} telah dikembalikan ke saldo Dompet Anda.`
                : "Pesanan telah dibatalkan.",
              type: "info",
            });
          } catch {}
        } catch (e: any) {
          Alert.alert("Gagal", e.message || "Gagal membatalkan pesanan");
        }
      };

      try {
        showPopup({
          title: "Batalkan Pesanan?",
          message: "Yakin ingin membatalkan pesanan ini?",
          type: "delete",
          confirmText: "Ya, Batalkan",
          cancelText: "Kembali",
          onConfirm: runCancel,
        });
      } catch {
        Alert.alert("Batalkan Pesanan?", "Yakin ingin membatalkan pesanan ini?", [
          { text: "Kembali", style: "cancel" },
          { text: "Ya, Batalkan", style: "destructive", onPress: runCancel },
        ]);
      }
    } else if (action === "mitra_approve_cancel") {
      const runApproveCancel = async () => {
        try {
          const res = await respondOrderCancellation(jobId, true);
          setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "dibatalkan" }));
          setJobInfo((prev: any) =>
            prev && String(prev.id) === String(jobId)
              ? { ...prev, status: "dibatalkan", payment_status: "refunded" }
              : prev
          );
          setShowJobBanner(false);
          await updateLastMessage("✅ Pembatalan Disetujui");
          await fetchAll();
          try {
            showPopup({
              title: "Pembatalan Disetujui",
              message: "Pesanan dibatalkan dan dana dikembalikan ke Saldo Dompet Klien.",
              type: "success",
            });
          } catch {}
        } catch (e: any) {
          try { showPopup({ title: "Gagal", message: e.message, type: "error" }); } catch {}
        }
      };

      try {
        showPopup({
          title: "Setujui Pembatalan?",
          message: "Klien mengajukan pembatalan pesanan ini. Jika Anda setuju, dana pembayaran akan dikembalikan ke saldo Dompet Klien.",
          type: "confirm",
          confirmText: "Ya, Setujui",
          cancelText: "Batal",
          onConfirm: runApproveCancel,
        });
      } catch {
        Alert.alert("Setujui Pembatalan?", "Dana pembayaran akan dikembalikan ke saldo Dompet Klien.", [
          { text: "Batal", style: "cancel" },
          { text: "Ya, Setujui", onPress: runApproveCancel },
        ]);
      }
      return;
    } else if (action === "mitra_reject_cancel") {
      const runRejectCancel = async () => {
        try {
          await respondOrderCancellation(jobId, false, "Pekerjaan sedang berlangsung / progres > 80%");
          setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "sedang_dikerjakan" }));
          setJobInfo((prev: any) =>
            prev && String(prev.id) === String(jobId)
              ? { ...prev, status: "sedang_dikerjakan" }
              : prev
          );
          await updateLastMessage("❌ Pembatalan Ditolak");
          await fetchAll();
          try {
            showPopup({
              title: "Pembatalan Ditolak",
              message: "Pekerjaan tetap dilanjutkan. Jika ada kendala, hubungi Pusat Bantuan / Komplain.",
              type: "info",
            });
          } catch {}
        } catch (e: any) {
          try { showPopup({ title: "Gagal", message: e.message, type: "error" }); } catch {}
        }
      };

      try {
        showPopup({
          title: "Tolak Pembatalan?",
          message: "Tolak pembatalan karena pekerjaan sudah berjalan (>80%)? Pekerjaan akan tetap dilanjutkan.",
          type: "confirm",
          confirmText: "Tolak Pembatalan",
          cancelText: "Kembali",
          onConfirm: runRejectCancel,
        });
      } catch {
        Alert.alert("Tolak Pembatalan?", "Pekerjaan akan tetap dilanjutkan.", [
          { text: "Kembali", style: "cancel" },
          { text: "Tolak Pembatalan", onPress: runRejectCancel },
        ]);
      }
      return;
    }
  };

  const openOrderDetail = async (detail: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data } = await supabase
        .from("pekerjaan_bisa")
        .select(`id, judul, deskripsi, budget, agreed_price, status, payment_method, payment_status, kategori, created_at, pelanggan_id, mitra_id, client:pelanggan_id (id, name), mitra:mitra_id (id, name)`)
        .eq("id", Number(detail.jobId))
        .single();
      if (data) {
        setSelectedOrderDetail({
          ...data,
          jobId: data.id,
          pelanggan_name: Array.isArray((data as any).client) ? (data as any).client[0]?.name : (data as any).client?.name,
          mitra_name: Array.isArray((data as any).mitra) ? (data as any).mitra[0]?.name : (data as any).mitra?.name,
        });
      } else setSelectedOrderDetail(detail);
    } catch { setSelectedOrderDetail(detail); }
    setShowOrderDetailModal(true);
  };

  const pickDeliveryImage = async (useCamera = false) => {
    try {
      if (Platform.OS !== "web") {
        const perm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
          showPopup({ title: "Izin Ditolak", message: useCamera ? "Izin kamera diperlukan." : "Izin galeri diperlukan.", type: "warning", theme: isMitraView ? "provider" : "client" });
          return;
        }
      }
      let result: any;
      if (useCamera) result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
      else result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];

      // 1. Tampilkan preview instan di modal (langsung dari URI lokal perangkat, tidak putih/blank)
      setDeliveryPreviewUri(asset.uri);
      setUploading(true);

      const ext = (asset.fileName || asset.uri).split(".").pop()?.split("?")[0] || "jpg";
      const fileName = `delivery_${deliveryJobId || conversationId}_${Date.now()}.${ext}`;

      // 2. Kompresi gambar & peroleh base64 binary
      let base64Data = asset.base64;
      try {
        const manip = await compressImageWithBase64(asset.uri, 1080, 0.7);
        if (manip.base64) {
          base64Data = manip.base64;
        }
      } catch (compErr) {
        console.warn("[pickDeliveryImage] Compress warning, using original:", compErr);
      }

      let uploadPayload: any;
      let contentType = asset.mimeType || "image/jpeg";

      if (base64Data) {
        uploadPayload = base64ToUint8Array(base64Data);
        contentType = "image/jpeg";
      } else {
        const resp = await fetch(asset.uri);
        uploadPayload = await resp.blob();
      }

      let publicUrl = "";
      // 3. Upload ke job_attachments (chat_images) yang 100% stabil & terbukti bisa diakses publik
      const { error: upErr } = await supabase.storage
        .from("job_attachments")
        .upload(`chat_images/${fileName}`, uploadPayload, { contentType, upsert: true });

      if (!upErr) {
        publicUrl = supabase.storage.from("job_attachments").getPublicUrl(`chat_images/${fileName}`).data.publicUrl;
      } else {
        console.warn("[Delivery Upload] job_attachments error, fallback to deliveries bucket:", upErr.message);
        const { error: fbErr } = await supabase.storage
          .from("deliveries")
          .upload(`deliveries/${fileName}`, uploadPayload, { contentType, upsert: true });
        if (fbErr) throw upErr || fbErr;
        publicUrl = supabase.storage.from("deliveries").getPublicUrl(`deliveries/${fileName}`).data.publicUrl;
      }

      setDeliveryFileUrl(publicUrl);
      showPopup({ title: "Foto Ditambahkan", message: "Foto bukti berhasil disiapkan.", type: "success", theme: isMitraView ? "provider" : "client" });
    } catch (e: any) {
      setDeliveryPreviewUri("");
      setDeliveryFileUrl("");
      showPopup({ title: "Gagal Upload", message: e.message || "Gagal mengunggah foto.", type: "error", theme: isMitraView ? "provider" : "client" });
    } finally { setUploading(false); }
  };

  const sendDelivery = async () => {
    if (!deliveryJobId) return;
    const hasFile = !!deliveryFileUrl?.trim();
    const hasLink = !!deliveryLink?.trim();
    const hasNote = !!deliveryNote?.trim();
    if (!hasFile && !hasLink && !hasNote) {
      showPopup({ title: "Lampiran Diperlukan", message: "Sertakan foto bukti, link Drive, atau catatan untuk Klien sebelum mengirim.", type: "warning", theme: isMitraView ? "provider" : "client" });
      if (Platform.OS !== "web") Alert.alert("Lampiran Diperlukan", "Sertakan foto bukti, link Drive, atau catatan.");
      return;
    }
    if (hasLink && !/^https?:\/\/.+/i.test(deliveryLink.trim())) {
      showPopup({ title: "Link Tidak Valid", message: "Link harus diawali https://", type: "warning", theme: isMitraView ? "provider" : "client" });
      return;
    }
    setSendingDelivery(true);
    try {
      const file = deliveryFileUrl ? encodeURIComponent(deliveryFileUrl) : "";
      const link = deliveryLink ? encodeURIComponent(deliveryLink.trim()) : "";
      const note = deliveryNote ? encodeURIComponent(deliveryNote.trim()) : "";
      const content = `[DELIVERY]:${deliveryJobId}|${file}|${link}|${note}`;
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content, message_type: "delivery" });
      await supabase.from("pekerjaan_bisa").update({ status: "menunggu_konfirmasi_selesai", work_file_url: deliveryFileUrl || null, work_link_url: deliveryLink.trim() || null, work_note: deliveryNote.trim() || null, submitted_at: new Date().toISOString() }).eq("id", Number(deliveryJobId));
      setJobStatusMap(p => ({ ...p, [deliveryJobId]: "menunggu_konfirmasi_selesai" }));
      await updateLastMessage("📦 Hasil Kerja Dikirim");
      setShowDeliveryModal(false); setDeliveryLink(""); setDeliveryNote(""); setDeliveryFileUrl(""); setDeliveryPreviewUri("");
      try { showPopup({ title: "Terkirim", message: "Hasil kerja terkirim. Menunggu konfirmasi Klien.", type: "success", theme: isMitraView ? "provider" : "client" }); } catch { Alert.alert("Terkirim", "Menunggu konfirmasi Klien."); }
    } catch (e: any) { try { showPopup({ title: "Gagal", message: e.message, type: "error" }); } catch { Alert.alert("Gagal", e.message); } }
    finally { setSendingDelivery(false); }
  };

  const requestRevision = async () => {
    if (!revisionJobId || !revisionNote.trim()) return;
    setSendingRevision(true);
    try {
      const numJobId = Number(revisionJobId);
      const { data: job } = await supabase.from("pekerjaan_bisa").select("revision_count, max_revision, judul").eq("id", numJobId).single();
      const currentRev = Number(job?.revision_count) || 0;
      const maxRev = Number(job?.max_revision) || 3;

      if (currentRev >= maxRev) {
        Alert.alert("Batas Revisi Habis", `Maksimal permintaan revisi adalah ${maxRev} kali.`);
        return;
      }

      const nextRev = currentRev + 1;
      await supabase.from("pekerjaan_bisa").update({
        revision_count: nextRev,
        status: "sedang_dikerjakan",
      }).eq("id", numJobId);

      try {
        await supabase.from("order_revisions").insert({
          job_id: numJobId,
          client_id: Number(myUserId),
          note: revisionNote.trim(),
          revision_number: nextRev,
        });
      } catch {}

      const safeNote = encodeURIComponent(revisionNote.trim());
      const revContent = `[REVISION]:${revisionJobId}|${safeNote}|${nextRev}`;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: Number(myUserId),
        content: revContent,
        message_type: "revision",
      });

      setJobStatusMap((p: Record<string, string>) => ({ ...p, [revisionJobId]: "sedang_dikerjakan" }));
      setJobInfo((prev: any) => prev && String(prev.id) === String(revisionJobId) ? { ...prev, status: "sedang_dikerjakan" } : prev);
      await updateLastMessage(`🔄 Permintaan Revisi (#${nextRev})`);
      setShowRevisionModal(false);
      setRevisionNote("");
      Alert.alert("Revisi Dikirim", `Mitra telah diminta revisi (#${nextRev} dari maks ${maxRev}x).`);
    } catch (e: any) {
      Alert.alert("Gagal Kirim Revisi", e.message || "Terjadi kesalahan");
    } finally {
      setSendingRevision(false);
    }
  };

  const deleteChat = async () => {
    setDeletingChat(true);
    try {
      const col = isMitraView ? "deleted_by_mitra" : "deleted_by_client";
      await supabase.from("conversations").update({ [col]: true }).eq("id", conversationId);
      setShowDeleteModal(false);
      router.replace(isMitraView ? "/p/chat" as any : "/c/chat" as any);
    } catch (e: any) { Alert.alert("Gagal", e.message); }
    finally { setDeletingChat(false); }
  };

  return {
    // core
    conversationId, router, conversation, messages, newMessage, setNewMessage, loading, myUserId, myUserName, otherUser, isMitraView,
    // ui flags
    uploading, previewImage, setPreviewImage,
    showOfferModal, setShowOfferModal, offerAmount, setOfferAmount,
    showAttachments, setShowAttachments, showMenu, setShowMenu, showDeleteModal, setShowDeleteModal,
    showInvoiceModal, setShowInvoiceModal, sendingInvoice,
    showDeliveryModal, setShowDeliveryModal, deliveryJobId, setDeliveryJobId, deliveryLink, setDeliveryLink, deliveryNote, setDeliveryNote, deliveryFileUrl, setDeliveryFileUrl, deliveryPreviewUri, setDeliveryPreviewUri, sendingDelivery,
    showRevisionModal, setShowRevisionModal, revisionJobId, setRevisionJobId, revisionNote, setRevisionNote, sendingRevision,
    showPaySheet, setShowPaySheet, payJobId, setPayJobId, payBudget, setPayBudget, payAgreedPrice, payingCod, payingOnline,
    showOrderDetailModal, setShowOrderDetailModal, selectedOrderDetail, setSelectedOrderDetail,
    jobStatusMap, jobPaymentMethodMap, jobInfo, showJobBanner, setShowJobBanner, deletingChat,
    clientQuickReplies, mitraQuickReplies, isChatLocked,
    // actions (new names)
    sendMessage, pickImage, sendLocation, createOffer, actionOffer, createInvoice, choosePayment, orderAction, openOrderDetail, sendDelivery, pickDeliveryImage, requestRevision, deleteChat, fetchAll,
    // aliases for backward compat
    handleSendMessage: sendMessage, handlePickImage: pickImage, handleSendLocation: sendLocation,
    handleCreateOffer: createOffer, handleActionOffer: actionOffer, handleCreateInvoice: createInvoice,
    handleChoosePayment: choosePayment, handleOrderAction: orderAction, handleOpenOrderDetail: openOrderDetail,
    handleSendDelivery: sendDelivery, handlePickDeliveryImage: pickDeliveryImage, handleRequestRevision: requestRevision, handleDeletePersonalChat: deleteChat,
    fetchConversationAndMessages: fetchAll,
  };
}
