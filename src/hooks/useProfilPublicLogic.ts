import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Share, Alert, Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { usePopup } from "../components/PopupProvider.native";

export interface Review {
  id: number;
  rating: number;
  komentar: string;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  job_title?: string;
}

export interface Service {
  id: number;
  title: string;
  description: string | null;
  price: number;
  unit: string | null;
  is_popular: boolean | null;
  order_index?: number | null;
}

export interface Portfolio {
  id: number;
  project_title: string;
  project_description: string | null;
  image_urls: string[];
}

export interface GalleryItem {
  id: number;
  image_url: string;
  caption: string | null;
}

export const RANKS = [
  // 1:1 web HTML: bg rgb(243,244,246) / color rgb(156,163,175) / military_tech -> Medal
  { key: "basic", label: "Basic", min: 0, color: "#9CA3AF", bg: "#F3F4F6", icon: "Medal", gradient: ["#F3F4F6", "#F3F4F6", "#F3F4F6"] },
  // bg rgb(219,234,254) / color rgb(59,130,246) / workspace_premium -> Award
  { key: "intermediate", label: "Intermediate", min: 500, color: "#3B82F6", bg: "#DBEAFE", icon: "Award", gradient: ["#DBEAFE", "#DBEAFE", "#DBEAFE"] },
  // bg rgb(255,237,213) / color rgb(255,107,0) / stars -> Stars
  { key: "advanced", label: "Advanced", min: 1500, color: "#FF6B00", bg: "#FFEDD5", icon: "Stars", gradient: ["#FFEDD5", "#FFEDD5", "#FFEDD5"] },
  // bg rgb(254,249,195) / color rgb(202,138,4) / emoji_events -> Trophy
  { key: "expert", label: "Expert", min: 3000, color: "#CA8A04", bg: "#FEF9C3", icon: "Trophy", gradient: ["#FEF9C3", "#FEF9C3", "#FEF9C3"] },
  { key: "legend", label: "Legend", min: 5000, color: "#8B5CF6", bg: "#EDE9FE", icon: "Crown", gradient: ["#8B5CF6", "#D946EF", "#FBBF24"] },
] as const;

export function getRank(points: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  let next: (typeof RANKS)[number] | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (points >= RANKS[i].min) current = RANKS[i] as (typeof RANKS)[number];
  }
  const idx = RANKS.findIndex((r) => r.key === current.key);
  if (idx < RANKS.length - 1) next = RANKS[idx + 1] as (typeof RANKS)[number];
  return { current, next };
}

export function useProfilPublicLogic(targetId: string) {
  const router = useRouter();
  const popupContext = usePopup();
  const showPopup = popupContext?.showPopup || (() => {});

  const [userProfile, setUserProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [portfolioModal, setPortfolioModal] = useState<{ project: Portfolio; imgIdx: number } | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReviewsSheet, setShowReviewsSheet] = useState(false);
  const [reviewsFilterRating, setReviewsFilterRating] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS" | "COD">("MIDTRANS");
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [codDonationEnabled, setCodDonationEnabled] = useState(true);
  const [codPaymentEnabled, setCodPaymentEnabled] = useState(true);

  const fetchReviews = async (userId: number) => {
    try {
      let { data } = await supabase
        .from("reviews_bisa")
        .select("id, rating, komentar, created_at, reviewer_id, job_id, pekerjaan_id")
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        const { data: fb } = await supabase
          .from("ratings_bisa")
          .select("id, rating, review, created_at, rater_id, job_id")
          .eq("ratee_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(20);
        if (fb) data = fb.map(d => ({ id: d.id, rating: d.rating, komentar: d.review || "", created_at: d.created_at, reviewer_id: d.rater_id, job_id: d.job_id, pekerjaan_id: d.job_id })) as any;
      }

      if (data && data.length > 0) {
        const rIds = [...new Set(data.map((r: any) => r.reviewer_id).filter(Boolean))];
        const { data: revs } = await supabase.from("users_bisa").select("id, name, face_url").in("id", rIds);
        const rMap = Object.fromEntries(revs?.map((u: any) => [u.id, u]) || []);
        const jIds = [...new Set(data.map((r: any) => r.pekerjaan_id || r.job_id).filter(Boolean))];
        let jMap: Record<string, string> = {};
        if (jIds.length > 0) {
          const { data: js } = await supabase.from("pekerjaan_bisa").select("id, judul").in("id", jIds);
          if (js) jMap = Object.fromEntries(js.map((j: any) => [j.id, j.judul]));
        }
        setReviews(data.map((item: any) => ({
          id: item.id,
          rating: item.rating,
          komentar: item.komentar || item.review || "Memberikan penilaian tanpa komentar.",
          created_at: item.created_at,
          reviewer_name: rMap[item.reviewer_id]?.name || "Klien BISA",
          reviewer_avatar: rMap[item.reviewer_id]?.face_url,
          job_title: jMap[item.pekerjaan_id || item.job_id] || "Pesanan Jasa",
        })));
      } else {
        setReviews([]);
      }
    } catch {}
  };

  const fetchServices = async (mitraId: number, basePrice: number) => {
    try {
      const { data } = await supabase.from("mitra_services").select("*").eq("mitra_id", mitraId).order("order_index", { ascending: true }).limit(20);
      if (data && data.length > 0) {
        setServices(data);
        setSelectedServiceId(data[0].id);
      } else if (basePrice) {
        setServices([{ id: -1, title: "Layanan Dasar", description: "Paket standar sesuai keahlian", price: basePrice, unit: "unit", is_popular: true }]);
        setSelectedServiceId(-1);
      }
    } catch {}
  };

  const fetchPortfolio = async (mitraId: number) => {
    try {
      const { data } = await supabase.from("mitra_portfolio").select("*").eq("mitra_id", mitraId).order("created_at", { ascending: false }).limit(9);
      if (data) setPortfolio(data);
    } catch {}
  };

  const fetchGallery = async (mitraId: number, faceUrl: string) => {
    try {
      const { data } = await supabase.from("mitra_gallery").select("*").eq("mitra_id", mitraId).order("order_index", { ascending: true });
      if (data && data.length > 0) setGallery(data);
      else setGallery([{ id: -1, image_url: faceUrl || "", caption: null }]);
    } catch {
      setGallery([{ id: -1, image_url: faceUrl || "", caption: null }]);
    }
  };

  const loadData = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const stored = await getStoredUser();
      let lId: number | null = null;
      if (stored?.id) {
        lId = Number(stored.id);
        setLoggedInUserId(lId);
      }
      if (lId && String(lId) === String(targetId)) setIsOwnProfile(true);
      const { data: user } = await supabase.from("users_bisa").select("*").eq("id", Number(targetId)).single();
      if (user) {
        setUserProfile(user);
        await Promise.all([fetchReviews(user.id), fetchServices(user.id, Number(user.base_price || 0)), fetchPortfolio(user.id), fetchGallery(user.id, user.face_url)]);
        if (lId) {
          const { data } = await supabase.from("user_favorites").select("id").eq("user_id", lId).eq("mitra_id", user.id).maybeSingle();
          setIsFavorite(!!data);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    loadData();
    supabase.from("app_settings").select("value").in("key", ["cod_donation_enabled", "cod_payment_enabled"]).then(({ data }) => {
      const map = new Map((data || []).map((r: any) => [r.key, r.value]));
      if (map.has("cod_donation_enabled")) {
        const v: any = map.get("cod_donation_enabled");
        setCodDonationEnabled(v === false || v === "false" ? false : Boolean(v));
      }
      if (map.has("cod_payment_enabled")) {
        const v: any = map.get("cod_payment_enabled");
        // default enabled when missing; only false disables
        setCodPaymentEnabled(!(v === false || v === "false"));
      }
    });
  }, [loadData]);

  const rawKeahlian = userProfile?.keahlian ? String(userProfile.keahlian).split(",").map((k: string) => k.trim()).filter(Boolean) : [];
  const keahlianList: string[] = Array.from(new Set(rawKeahlian));
  const xp = userProfile?.experience_points ?? 0;
  const { current: rank } = getRank(xp);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : userProfile?.rating ? Number(userProfile.rating).toFixed(1) : "Baru";
  const ratingCount = reviews.length > 0 ? reviews.length : userProfile?.total_orders || 0;
  const fStar = reviews.filter(r => r.rating === 5).length;
  const fiveStarPct = reviews.length > 0 ? Math.round((fStar / reviews.length) * 100) : 0;
  const onTimeVal = userProfile?.char_on_time ? `${userProfile.char_on_time}%` : reviews.length > 0 ? `${fiveStarPct}%` : userProfile?.total_orders > 0 ? "100%" : "-";
  const responseVal = userProfile?.char_response || (userProfile?.is_active ? "< 5 mnt" : "-");
  const warrantyVal = userProfile?.char_warranty || (userProfile?.kyc_status === "Terverifikasi" || userProfile?.is_trusted ? "100%" : "-");
  const availabilityText = userProfile?.availability_custom_text || userProfile?.availability_status || (userProfile?.is_active ? "Tersedia Sekarang" : "Sedang Offline");
  const isAvailableGreen = /tersedia|instan/i.test(availabilityText);
  const selectedService = services.find(s => s.id === selectedServiceId) || services[0];
  const isFeaturedActive = !!userProfile?.is_featured && (!userProfile?.featured_until || new Date(userProfile.featured_until) > new Date());

  const toggleFavorite = async () => {
    if (!loggedInUserId) {
      try { showPopup({ type: "info", title: "Login Dulu", message: "Silakan login." }); } catch {}
      router.push("/(auth)/login" as any);
      return;
    }
    if (isOwnProfile) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        await supabase.from("user_favorites").delete().eq("user_id", loggedInUserId).eq("mitra_id", userProfile.id);
        setIsFavorite(false);
      } else {
        await supabase.from("user_favorites").insert({ user_id: loggedInUserId, mitra_id: userProfile.id });
        setIsFavorite(true);
      }
    } catch {} finally {
      setFavLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = `https://bisa-admin.vercel.app/p/profil/${userProfile?.id || targetId}`;
      await Share.share({ title: userProfile?.name || "Mitra BISA", message: `Lihat profil di BISA: ${url}`, url });
    } catch {}
  };

  const handleStartDirectChat = async () => {
    if (!loggedInUserId) { router.push("/(auth)/login" as any); return; }
    if (isOwnProfile || !userProfile) return;
    try {
      const { data: ex } = await supabase.from("conversations").select("id").or(`and(client_id.eq.${loggedInUserId},mitra_id.eq.${userProfile.id}),and(client_id.eq.${userProfile.id},mitra_id.eq.${loggedInUserId})`).maybeSingle();
      if (ex) router.push(`/c/direct-chat/${ex.id}` as any);
      else {
        const { data: nc } = await supabase.from("conversations").insert({ client_id: loggedInUserId, mitra_id: userProfile.id, type: "direct", is_active: true }).select("id").single();
        if (nc) router.push(`/c/direct-chat/${nc.id}` as any);
      }
    } catch {}
  };

  const handleCheckoutOrder = async () => {
    if (!loggedInUserId || !selectedService || !userProfile) return;
    const dNum = donationAmount ? Number(String(donationAmount).replace(/\D/g, "")) : 0;
    if (paymentMethod === "COD" && codDonationEnabled && dNum > 0 && dNum < 3000) {
      try { showPopup({ type: "warning", title: "Donasi minimal", message: "Donasi minimal Rp 3.000 untuk mendukung sistem." }); } catch {}
      return;
    }
    setIsOrdering(true);
    try {
      const priceNum = Number(selectedService.price);
      const isWaitingPayment = paymentMethod !== "COD";
      const expiresAt = new Date(Date.now() + (isWaitingPayment ? 24 * 3600 * 1000 : 3 * 3600 * 1000)).toISOString();
      const judul = `Pesanan: ${selectedService.title}`;
      const budgetStr = `Rp ${priceNum.toLocaleString("id-ID")}`;
      const deskripsi = `Pesanan langsung dari profil mitra.\nMetode Pembayaran: ${paymentMethod}${dNum > 0 ? `\nDonasi: Rp ${dNum.toLocaleString("id-ID")}` : ""}`;
      const lokasi = userProfile.alamat_singkat || (userProfile as any).address || "Sesuai kesepakatan";

      const payload: any = {
        pelanggan_id: loggedInUserId,
        mitra_id: userProfile.id,
        kategori: "Pesan Langsung",
        judul,
        deskripsi,
        budget: budgetStr,
        agreed_price: priceNum,
        lokasi,
        status: isWaitingPayment ? "menunggu_pembayaran" : "menunggu_konfirmasi_mitra",
        payment_method: paymentMethod,
        payment_status: isWaitingPayment ? "belum_bayar" : "cod_pending",
        is_online: false,
        expires_at: expiresAt,
        revision_count: 0,
        max_revision: 3,
        is_rated: false,
      };
      const { data: nj, error: insertErr } = await supabase.from("pekerjaan_bisa").insert(payload).select("id").single();
      if (insertErr || !nj) throw new Error(insertErr?.message || "Gagal membuat pesanan");

      // conversations 1:1 web — client_id+mitra_id+type direct, last_message sesuai metode
      const lastMsg = isWaitingPayment ? `📦 Pesanan Baru: ${selectedService.title}` : `⏳ Menunggu Konfirmasi Mitra: ${selectedService.title}`;
      let cid: string | null = null;
      const { data: ex } = await supabase.from("conversations").select("id").eq("client_id", loggedInUserId).eq("mitra_id", userProfile.id).eq("type", "direct").maybeSingle();
      if (ex?.id) {
        cid = ex.id;
        await supabase.from("conversations").update({ job_id: nj.id, last_message: lastMsg, last_message_at: new Date().toISOString() }).eq("id", cid);
      } else {
        const { data: ncc } = await supabase.from("conversations").insert({ client_id: loggedInUserId, mitra_id: userProfile.id, job_id: nj.id, type: "direct", is_active: true, last_message: lastMsg, last_message_at: new Date().toISOString() }).select("id").single();
        cid = ncc?.id || null;
      }
      if (!cid) throw new Error("Gagal membuat room chat");
      const safeTitle = encodeURIComponent(selectedService.title);
      const safeBudget = encodeURIComponent(budgetStr);
      const orderStatus = isWaitingPayment ? "menunggu_pembayaran" : "menunggu_konfirmasi_mitra";
      await supabase.from("messages").insert({ conversation_id: cid, sender_id: loggedInUserId, message_type: "order", content: `[ORDER]:${nj.id}|${safeTitle}|${safeBudget}|${orderStatus}` });

      setShowCheckoutModal(false);
      if (!isWaitingPayment) {
        const msg = dNum >= 3000 ? `Donasi Rp ${dNum.toLocaleString("id-ID")} tercatat. QR donasi akan muncul di chat.` : "Bayar tunai ke Mitra setelah hasil dikirim & Anda klik Terima.";
        try { showPopup({ type: "success", title: "Pesanan COD Dibuat!", message: `Kartu pesanan COD muncul di chat. ${msg}` }); } catch {}
      } else {
        try { showPopup({ type: "success", title: "Pesanan Dibuat!", message: "Pesanan dibuat. Selesaikan pembayaran untuk memulai pengerjaan." }); } catch {}
      }
      router.push(`/c/direct-chat/${cid}` as any);
    } catch (e: any) {
      try { showPopup({ type: "error", title: "Gagal", message: e?.message || "Gagal membuat pesanan" }); } catch {}
    } finally { setIsOrdering(false); }
  };

  return { targetId, router, userProfile, reviews, services, portfolio, gallery, galleryIndex, setGalleryIndex, selectedServiceId, setSelectedServiceId, loading, isOwnProfile, isFavorite, favLoading, portfolioModal, setPortfolioModal, showAllServices, setShowAllServices, isDescExpanded, setIsDescExpanded, isOrdering, showCheckoutModal, setShowCheckoutModal, showReviewsSheet, setShowReviewsSheet, reviewsFilterRating, setReviewsFilterRating, paymentMethod, setPaymentMethod, donationAmount, setDonationAmount, codDonationEnabled, codPaymentEnabled, keahlianList, rank, avgRating, ratingCount, fiveStarPct, onTimeVal, responseVal, warrantyVal, availabilityText, isAvailableGreen, selectedService, isFeaturedActive, toggleFavorite, handleShare, handleStartDirectChat, handleCheckoutOrder, openCheckout: () => { if(!loggedInUserId) router.push("/(auth)/login" as any); else { if(!codPaymentEnabled) setPaymentMethod("MIDTRANS"); else setPaymentMethod("MIDTRANS"); setDonationAmount(""); setShowCheckoutModal(true); } } };
}
