import { useState, useEffect, useCallback } from "react";
import { Alert, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { containsPhoneNumber } from "../lib/chatSecurity";
import { parseOrderContent } from "../lib/chatHelpers";
import { usePopup } from "../components/PopupProvider.native";
import { compressImage } from "../lib/imageCompression";

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
  let showPopup: any = () => {};
  try { showPopup = usePopup().showPopup; } catch {}

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
  const [payingCod, setPayingCod] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [deliveryJobId, setDeliveryJobId] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryFileUrl, setDeliveryFileUrl] = useState("");
  const [sendingDelivery, setSendingDelivery] = useState(false);
  const [revisionJobId, setRevisionJobId] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [sendingRevision, setSendingRevision] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);

  // Status sync
  const [jobStatusMap, setJobStatusMap] = useState<Record<string, string>>({});
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
          const { data: jobs } = await supabase.from("pekerjaan_bisa").select("id, status").in("id", Array.from(jobIds));
          if (jobs) {
            const map: Record<string, string> = {};
            jobs.forEach((j: any) => (map[String(j.id)] = j.status));
            setJobStatusMap(p => ({ ...p, ...map }));
          }
        }
      }
      const targetJobId = (conv as any).job_id;
      if (targetJobId) {
        const { data: info } = await supabase
          .from("pekerjaan_bisa")
          .select("id, judul, deskripsi, budget, status, payment_method, payment_status, kategori, agreed_price, created_at, pelanggan_id, mitra_id")
          .eq("id", targetJobId)
          .maybeSingle();
        if (info) setJobInfo(info);
      }
    } catch (e: any) { console.error("Load chat error", e); }
    finally { setLoading(false); }
  }, [conversationId, router]);

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
    if (sec.isForbidden) { Alert.alert("Keamanan Transaksi BISA", sec.reason || "Nomor telepon / kontak dilarang dikirim."); return; }
    setNewMessage("");
    try {
      const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content, message_type: "text" }).select().single();
      if (error) throw error;
      if (data) setMessages(prev => [...prev, data]);
      await updateLastMessage(content);
    } catch (e: any) { Alert.alert("Gagal Mengirim", e.message); setNewMessage(content); }
  };

  const pickImage = async (useCamera = false) => {
    try {
      setShowAttachments(false);
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Izin Ditolak", "Izin kamera diperlukan"); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Izin Ditolak", "Izin galeri diperlukan"); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      }
      if (!result.canceled && result.assets[0]?.uri) {
        setUploading(true);
        const asset = result.assets[0];
        
        // Kompres gambar sebelum diunggah
        const compressedUri = await compressImage(asset.uri, 1080, 0.7);

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
      Alert.alert("Gagal Upload Gambar", e.message || "Gagal mengunggah foto ke server");
    } finally {
      setUploading(false);
    }
  };

  const sendLocation = async () => {
    try {
      setShowAttachments(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Izin Ditolak", "Izin lokasi diperlukan"); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const url = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      const text = `📍 Lokasi Saya: ${url}`;
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content: text, message_type: "location" });
      await updateLastMessage("📍 Lokasi");
    } catch (e: any) { Alert.alert("Gagal Lokasi", e.message); }
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
      Alert.alert("Invoice Terkirim", "Kartu pesanan escrow berhasil dikirim!");
    } catch (e: any) { Alert.alert("Gagal", e.message); }
    finally { setSendingInvoice(false); }
  };

  const choosePayment = async (method: "MIDTRANS" | "COD") => {
    if (!payJobId) return;

    if (method === "COD") {
      setPayingCod(true);
      try {
        await supabase.from("pekerjaan_bisa").update({ metode_pembayaran: "cod", payment_method: "COD", status: "sedang_dikerjakan" }).eq("id", Number(payJobId));
        setShowPaySheet(false);
        Alert.alert("COD Dipilih", "Status → Sedang Dikerjakan. Bayar tunai setelah selesai.");
        fetchAll();
      } catch (e: any) { Alert.alert("Gagal", e.message); }
      finally { setPayingCod(false); }
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
      Alert.alert("Gagal", "Nominal harga tidak valid.");
      return;
    }
    setPayingOnline(true);
    setShowPaySheet(false);
    try {
      const isWeb = Platform.OS === "web";
      const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
      const backendUrl = rawApi || (!isWeb ? "https://bisa-app.vercel.app" : "http://localhost:3000");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (!data.snapToken && !data.paymentUrl)) throw new Error(data.error || data.message || "Gagal membuat transaksi Midtrans");
      const paymentUrl: string | undefined = data.paymentUrl || data.redirect_url;
      const snapToken: string | undefined = data.snapToken || data.token;
      // Mobile native / web: buka URL pembayaran resmi Midtrans
      if (paymentUrl) {
        await Linking.openURL(paymentUrl);
        try { showPopup({ title: "Menunggu Pembayaran", message: "Selesaikan pembayaran di halaman Midtrans. Status akan otomatis diperbarui via webhook.", type: "info" }); } catch {}
      } else if (snapToken && isWeb && typeof window !== "undefined" && (window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: () => { try { showPopup({ title: "Pembayaran Diproses", message: "Verifikasi webhook…", type: "success" }); } catch {} fetchAll(); },
          onPending: () => { try { showPopup({ title: "Menunggu", message: "Selesaikan pembayaran di metode yang dipilih.", type: "info" }); } catch {} },
          onError: () => { try { showPopup({ title: "Gagal", message: "Transaksi tidak berhasil.", type: "error" }); } catch {} },
        });
      } else if (snapToken) {
        // Fallback kalau hanya token tanpa paymentUrl (mis. sandbox): arahkan ke Snap hosted page via token
        const fallbackUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
        await Linking.openURL(fallbackUrl);
      } else {
        throw new Error("Link pembayaran tidak tersedia. Coba lagi.");
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
      if (jobInfo && String(jobInfo.id) === String(jobId)) {
        const p = Number((jobInfo as any).agreed_price) || 0;
        if (p > 0) budgetStr = `Rp ${p.toLocaleString("id-ID")}`;
        else if ((jobInfo as any).budget) budgetStr = String((jobInfo as any).budget);
      }
      if (!budgetStr) {
        try {
          const { data: _j } = await supabase.from("pekerjaan_bisa").select("agreed_price, budget").eq("id", Number(jobId)).maybeSingle();
          if (_j) {
            const p = Number((_j as any).agreed_price) || 0;
            if (p > 0) budgetStr = `Rp ${p.toLocaleString("id-ID")}`;
            else if ((_j as any).budget) budgetStr = String((_j as any).budget);
          }
        } catch {}
      }
      setPayBudget(budgetStr);
      setShowPaySheet(true);
    } else if (action === "deliver") {
      setDeliveryJobId(jobId);
      setShowDeliveryModal(true);
    } else if (action === "revision") {
      setRevisionJobId(jobId);
      setShowRevisionModal(true);
    } else if (action === "accept" || action === "accept_final") {
      // ✅ FIX WEB: Alert.alert TIDAK jalan di React Native Web — pakai window.confirm + showPopup
      // 1:1 web handleAcceptOrder → showPopup confirm → fetch /api/orders/complete → update state
      const doConfirmAccept = async () => {
        // Tampilkan popup confirm 1:1 web (mobile popup + fallback web)
        const runAccept = async () => {
          try {
                const numJobId = Number(jobId);
                const { data: job, error: fetchErr } = await supabase
                  .from("pekerjaan_bisa")
                  .select("*")
                  .eq("id", numJobId)
                  .single();

                if (fetchErr || !job) {
                  try { showPopup({ title: "Error", message: "Pesanan tidak ditemukan.", type: "error" }); } catch {}
                  return;
                }

                // 2. Baca setting persentase komisi platform dari Web Admin (1:1 web → admin_settings / app_settings)
                //    Web default = 10%, DB seed = 3%, admin bisa ubah 0-50% di /admin/keuangan
                let feePercentage = 10; // fallback 1:1 web (api/orders/complete & api/admin/escrow)
                try {
                  // coba admin_settings dulu (dipakai api escrow)
                  const { data: s1 } = await supabase.from("admin_settings").select("value").eq("key", "service_fee_percentage").maybeSingle();
                  if (s1 && s1.value !== undefined && s1.value !== null && String(s1.value).trim() !== "" && !isNaN(Number(s1.value))) {
                    feePercentage = Number(s1.value);
                  } else {
                    // fallback ke app_settings (dipakai api/admin/settings whitelist)
                    const { data: s2 } = await supabase.from("app_settings").select("value").eq("key", "service_fee_percentage").maybeSingle();
                    if (s2 && s2.value !== undefined && s2.value !== null && String(s2.value).trim() !== "" && !isNaN(Number(s2.value))) {
                      feePercentage = Number(s2.value);
                    }
                  }
                } catch (setErr) {
                  console.warn("Gagal membaca service_fee_percentage, pakai fallback 10%:", setErr);
                }

                const isCOD = job.payment_method === "COD" || job.payment_status === "cod_pending";
                const agreedPrice = Number(job.agreed_price) || Number(String(job.budget || "").replace(/\D/g, "")) || 0;
                const platformFee = Math.round((agreedPrice * feePercentage) / 100);
                const mitraEarnings = Math.max(0, agreedPrice - platformFee);

                if (isCOD) {
                  await supabase.from("pekerjaan_bisa").update({
                    status: "selesai",
                    payment_status: "cod_completed",
                    platform_fee: 0,
                    mitra_earnings: 0,
                    is_rated: false,
                  }).eq("id", numJobId);

                  await supabase.from("messages").insert({
                    conversation_id: conversationId,
                    sender_id: Number(myUserId),
                    message_type: "system",
                    content: "✅ Pesanan COD selesai — pembayaran tunai di tempat.",
                  });
                } else {
                  await supabase.from("pekerjaan_bisa").update({
                    status: "selesai",
                    payment_status: "released",
                    platform_fee: platformFee,
                    mitra_earnings: mitraEarnings,
                    is_rated: false,
                  }).eq("id", numJobId);

                  // Update saldo mitra di users_bisa
                  if (job.mitra_id && mitraEarnings > 0) {
                    const { data: mitraUser } = await supabase
                      .from("users_bisa")
                      .select("id, saldo, balance")
                      .eq("id", job.mitra_id)
                      .maybeSingle();

                    if (mitraUser) {
                      const cur = Number(mitraUser.saldo || mitraUser.balance || 0);
                      const newBal = cur + mitraEarnings;
                      await supabase.from("users_bisa").update({ saldo: newBal, balance: newBal }).eq("id", job.mitra_id);
                    }
                  }

                  const acceptMsg = `✅ Pesanan Diterima! Dana sebesar Rp ${mitraEarnings.toLocaleString("id-ID")} telah dirilis ke Saldo Mitra. Silakan berikan rating & ulasan.`;
                  await supabase.from("messages").insert({
                    conversation_id: conversationId,
                    sender_id: Number(myUserId),
                    message_type: "system",
                    content: acceptMsg,
                  });
                }

                // Update UI state langsung + SEMBUNYIKAN banner invoice 1:1 Image 2
                setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "selesai" }));
                setJobInfo((prev: any) => prev && String(prev.id) === String(jobId) ? { ...prev, status: "selesai" } : prev);
                setShowJobBanner(false);
                await updateLastMessage("✅ Pesanan Selesai & Dana Dirilis");
                await fetchAll();

                try { showPopup({ title: "Pesanan selesai! 🎉", message: "Dana diteruskan ke Mitra. Silakan beri ulasan.", type: "success" }); } catch {}
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
      // Panggil langsung — tidak nunggu fetch dulu biar tombol terasa instan
      doConfirmAccept();
      return;
    } else if (action === "reject" || action === "cancel") {
      const runCancel = async () => {
        try {
          const numJobId = Number(jobId);
          await supabase.from("pekerjaan_bisa").update({ status: "dibatalkan", payment_status: "cancelled" }).eq("id", numJobId);
          setJobStatusMap((p: Record<string, string>) => ({ ...p, [jobId]: "dibatalkan" }));
          setJobInfo((prev: any) => prev && String(prev.id) === String(numJobId) ? { ...prev, status: "dibatalkan", payment_status: "cancelled" } : prev);
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

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: String(myUserId),
            message_type: "system",
            content: `❌ Pesanan #${numJobId} telah dibatalkan.`,
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

  const sendDelivery = async () => {
    if (!deliveryJobId) return;
    setSendingDelivery(true);
    try {
      const file = deliveryFileUrl ? encodeURIComponent(deliveryFileUrl) : "";
      const link = deliveryLink ? encodeURIComponent(deliveryLink) : "";
      const note = deliveryNote ? encodeURIComponent(deliveryNote) : "";
      const content = `[DELIVERY]:${deliveryJobId}|${file}|${link}|${note}`;
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: Number(myUserId), content, message_type: "delivery" });
      await supabase.from("pekerjaan_bisa").update({ status: "menunggu_konfirmasi_selesai" }).eq("id", Number(deliveryJobId));
      setJobStatusMap(p => ({ ...p, [deliveryJobId]: "menunggu_konfirmasi_selesai" }));
      await updateLastMessage("📦 Hasil Kerja Dikirim");
      setShowDeliveryModal(false); setDeliveryLink(""); setDeliveryNote(""); setDeliveryFileUrl("");
      Alert.alert("Terkirim", "Menunggu konfirmasi Klien.");
    } catch (e: any) { Alert.alert("Gagal", e.message); }
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
    showDeliveryModal, setShowDeliveryModal, deliveryJobId, setDeliveryJobId, deliveryLink, setDeliveryLink, deliveryNote, setDeliveryNote, deliveryFileUrl, setDeliveryFileUrl, sendingDelivery,
    showRevisionModal, setShowRevisionModal, revisionJobId, setRevisionJobId, revisionNote, setRevisionNote, sendingRevision,
    showPaySheet, setShowPaySheet, payJobId, setPayJobId, payBudget, setPayBudget, payingCod, payingOnline,
    showOrderDetailModal, setShowOrderDetailModal, selectedOrderDetail, setSelectedOrderDetail,
    jobStatusMap, jobInfo, showJobBanner, setShowJobBanner, deletingChat,
    clientQuickReplies, mitraQuickReplies, isChatLocked,
    // actions (new names)
    sendMessage, pickImage, sendLocation, createOffer, actionOffer, createInvoice, choosePayment, orderAction, openOrderDetail, sendDelivery, requestRevision, deleteChat, fetchAll,
    // aliases for backward compat
    handleSendMessage: sendMessage, handlePickImage: pickImage, handleSendLocation: sendLocation,
    handleCreateOffer: createOffer, handleActionOffer: actionOffer, handleCreateInvoice: createInvoice,
    handleChoosePayment: choosePayment, handleOrderAction: orderAction, handleOpenOrderDetail: openOrderDetail,
    handleSendDelivery: sendDelivery, handleRequestRevision: requestRevision, handleDeletePersonalChat: deleteChat,
    fetchConversationAndMessages: fetchAll,
  };
}
