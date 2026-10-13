import { useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";
import { compressImageDetailed } from "../lib/imageCompression";
import { usePopup } from "../components/PopupProvider.native";
import { useKycGate } from "./useKycGate";

const LIST_RADIUS = ["Maks. 1 km", "Maks. 3 km", "Maks. 5 km", "Maks. 10 km", "Maks. 25 km", "Seluruh Kota"];
export type DeadlineOpt = { name: string; desc: string; urgent: boolean };
const LIST_DEADLINE: DeadlineOpt[] = [
  { name: "Sangat Segera (Sekarang)", desc: "Dalam waktu 1-2 jam", urgent: true },
  { name: "Hari ini, Sebelum 17:00 WIB", desc: "Kurang dari 4 jam dari sekarang", urgent: true },
  { name: "Hari ini, Fleksibel", desc: "Kapan saja hari ini", urgent: false },
  { name: "Besok Pagi", desc: "Antara jam 08:00 - 12:00", urgent: false },
  { name: "Atur Jadwal Nanti", desc: "Sesuai kesepakatan", urgent: false },
];
const LIST_MASA_BERLAKU = [
  { label: "1 Jam", value: 1 },
  { label: "2 Jam", value: 2 },
  { label: "6 Jam", value: 6 },
  { label: "12 Jam", value: 12 },
  { label: "24 Jam", value: 24 },
  { label: "48 Jam", value: 48 },
] as const;

const KATEGORI_POSTING = ["Service AC & Elektronik","Kelistrikan","Tukang & Sanitasi Air","Pertukangan Bangunan","Kebersihan Rumah","Antar & Kurir","Layanan IT & Komputer","Otomotif & Bengkel","Lainnya"] as const;
const KATEGORI_DESC: Record<string,string> = {
  "Service AC & Elektronik":"Cuci AC, isi freon, servis TV, dsb.",
  "Kelistrikan":"Konslet, pasang lampu, instalasi kabel, dsb.",
  "Tukang & Sanitasi Air":"Pompa, pipa air, keran, tandon, dsb.",
  "Pertukangan Bangunan":"Bocor atap, cat dinding, keramik, dsb.",
  "Kebersihan Rumah":"Sapu, pel, cuci piring, setrika, dsb.",
  "Antar & Kurir":"Kirim barang, pindahan rumah, dsb.",
  "Layanan IT & Komputer":"Servis laptop, instal ulang, jaringan, dsb.",
  "Otomotif & Bengkel":"Mogok, tambal ban, ganti oli, dsb.",
  "Lainnya":"Kebutuhan jasa lainnya",
};
const KATEGORI_ICON: Record<string,string> = {
  "Service AC & Elektronik":"ac_unit","Kelistrikan":"bolt","Tukang & Sanitasi Air":"plumbing","Pertukangan Bangunan":"architecture","Kebersihan Rumah":"cleaning_services","Antar & Kurir":"local_shipping","Layanan IT & Komputer":"computer","Otomotif & Bengkel":"two_wheeler","Lainnya":"apps",
};

export function usePostingMobileLogic() {
  const router = useRouter();
  const { showPopup } = usePopup();
  const kycGate = useKycGate();
  const params = useLocalSearchParams<{ edit?: string; service_title?: string; service_price?: string; is_chat?: string }>();
  const editId = params.edit ? String(params.edit) : null;
  const serviceTitle = params.service_title ? String(params.service_title) : null;
  const servicePrice = params.service_price ? String(params.service_price) : null;
  const isChatOnly = params.is_chat === "true";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<number | null>(null);

  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [budget, setBudget] = useState("150000");
  const [providerCount, setProviderCount] = useState(1);
  const [budgetType, setBudgetType] = useState<"total"|"per_orang">("total");
  const [isAutoNego, setIsAutoNego] = useState(true);

  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [kategori, setKategori] = useState({ name: "Tukang & Sanitasi Air", icon: "plumbing", desc: "Pompa, pipa air, keran, tandon" });
  const [kategoriLainnya, setKategoriLainnya] = useState("");
  const [radius, setRadius] = useState("Maks. 5 km");
  const [deadline, setDeadline] = useState<DeadlineOpt>({ name: "Hari ini, Sebelum 17:00 WIB", desc: "Kurang dari 4 jam dari sekarang", urgent: true });
  const [masaBerlaku, setMasaBerlaku] = useState({ label: "24 Jam", value: 24 });

  const [showCatModal, setShowCatModal] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showMasaModal, setShowMasaModal] = useState(false);

  const [mapCoords, setMapCoords] = useState({ lat: -7.42, lng: 109.12 });
  const [isLocating, setIsLocating] = useState(false);
  const [isGpsDetected, setIsGpsDetected] = useState(false); // New state to track if GPS has been detected
  const [alamatMap, setAlamatMap] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const bboxStr = `${mapCoords.lng - 0.01}%2C${mapCoords.lat - 0.01}%2C${mapCoords.lng + 0.01}%2C${mapCoords.lat + 0.01}`;

  const [showGpsConfirm, setShowGpsConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const [popup, setPopup] = useState<{ show: boolean; title: string; message: string; type: "success"|"error"|"info"; isSuccess: boolean }>({ show: false, title: "", message: "", type: "info", isSuccess: false });
  const closePopup = () => {
    const wasApproved = popup.type === "success";
    setPopup((p) => ({ ...p, show: false }));
    if (wasApproved) router.replace("/c/aktivitas" as any);
    else if (popup.isSuccess) router.replace("/c/home" as any);
  };

  const fetchJobForEdit = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("pekerjaan_bisa").select("*").eq("id", id).single();
      if (error) throw error;
      if (data) {
        setJudul(data.judul || "");
        let raw = data.deskripsi || "";
        const negoMatch = raw.match(/Nego:\s*(Ya|Tidak)/);
        if (negoMatch) { setIsAutoNego(negoMatch[1]==="Ya"); raw = raw.replace(/Nego:\s*(Ya|Tidak)\n?/,""); }
        const radiusMatch = raw.match(/Radius:\s*([^\n]+)/);
        if (radiusMatch) { setRadius(radiusMatch[1]); raw = raw.replace(/Radius:\s*[^\n]+\n?/,""); }
        const batasMatch = raw.match(/Batas Waktu:\s*([^\n]+)/);
        if (batasMatch) { const f = LIST_DEADLINE.find((d)=>d.name===batasMatch[1]); if (f) setDeadline(f); raw = raw.replace(/Batas Waktu:\s*[^\n]+\n?/,""); }
        const teknisiMatch = raw.match(/Teknisi:\s*(\d+)/);
        if (teknisiMatch) { setProviderCount(parseInt(teknisiMatch[1],10)); raw = raw.replace(/Teknisi:\s*\d+ orang\.\n?/,""); }
        const gpsMatch = raw.match(/Koordinat GPS:\s*([\d.-]+),\s*([\d.-]+)/);
        if (gpsMatch) { setMapCoords({ lat: parseFloat(gpsMatch[1]), lng: parseFloat(gpsMatch[2]) }); setIsGpsDetected(true); raw = raw.replace(/Koordinat GPS:\s*[\d.-]+,\s*[\d.-]+\n?/,""); }
        raw = raw.replace(/\[INFO TAMBAHAN\]\n?/,""); raw = raw.replace(/\[EXPIRES_AT\]:\s*\d+\n?/,"");
        const fotoMatch = raw.match(/\[FOTO LAMPIRAN\]:\s*([^\n]+)/);
        if (fotoMatch) { setFotoPreview(fotoMatch[1]); raw = raw.replace(/\[FOTO LAMPIRAN\]:\s*[^\n]+\n?/,""); }
        setDeskripsi(raw.trim());
        if (data.lokasi === "Dikerjakan Online") setIsOnline(true);
        else {
          let ex = data.lokasi; const am = data.lokasi.match(/\[(.*?)\]\s*(.*)/); if (am) { setAlamatMap(am[1]); ex = am[2].trim(); }
          setLokasi(ex);
        }
        setBudget(String(data.budget || "").replace(/\D/g,"") || "0");
        setBudgetType(String(data.budget||"").includes("Total") ? "total" : "per_orang");
        const isMain = (KATEGORI_POSTING as any).includes(data.kategori);
        if (isMain) { const found = LIST_RADIUS; setKategori({ name: data.kategori, icon: KATEGORI_ICON[data.kategori]||"category", desc: KATEGORI_DESC[data.kategori]||"" }); }
        else { setKategori({ name: "Lainnya", icon: "category", desc: "Kategori spesifik lainnya" }); setKategoriLainnya(data.kategori); }
      }
    } catch (e: any) { setPopup({ show:true, title:"Gagal Memuat", message: e?.message || "Gagal memuat data postingan.", type:"error", isSuccess:false }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (stored?.id) {
        setUser(stored);
        if (stored.address) setLokasi(stored.address);
      } else {
        setUser({ isGuest: true });
      }
      if (serviceTitle) setJudul(serviceTitle);
      if (servicePrice && servicePrice !== "0") setBudget(String(servicePrice).replace(/\D/g,""));
      if (isChatOnly) setDeskripsi("Tuliskan pertanyaan awal atau detail singkat yang ingin Anda diskusikan dengan mitra...");
      if (stored?.id) {
        try {
          const { data } = await supabase.from("users_bisa").select("can_post_jobs").eq("id", stored.id).maybeSingle();
          if (data && (data as any).can_post_jobs === false) setPopup({ show:true, title:"Akses Dibatasi", message:"Akses memposting pekerjaan untuk akun Anda sedang dinonaktifkan oleh Admin BISA.", type:"error", isSuccess:false });
        } catch {}
      }
    })();
  }, [router, serviceTitle, servicePrice, isChatOnly]);

  useEffect(() => { if (editId && user) fetchJobForEdit(String(editId)); }, [editId, user, fetchJobForEdit]);

  const handleDeteksiLokasi = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showPopup({ title: "Izin Lokasi", message: "Aktifkan izin lokasi di pengaturan HP Anda.", type: "warning", theme: "client" });
        setIsLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      setMapCoords({ lat: latitude, lng: longitude });
      setIsGpsDetected(true);

      // 1:1 web fallback OSM Nominatim reverse geocode jika Expo geocoder tidak dapat subregion
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          { headers: { "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7" } }
        );
        const data = await res.json();
        if (data?.address) {
          const area =
            data.address.suburb ||
            data.address.village ||
            data.address.town ||
            data.address.city_district ||
            data.address.county ||
            data.address.city;
          if (area) { setAlamatMap(String(area)); setIsLocating(false); return; }
        }
      } catch {}

      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev?.[0]) {
          const a: any = rev[0];
          const area = a.subregion || a.district || a.city || a.subLocality || a.name || "";
          if (area) setAlamatMap(String(area));
        }
      } catch {}
    } catch (e: any) {
      showPopup({ title: "Gagal GPS", message: e?.message || "Pastikan GPS aktif.", type: "error", theme: "client" });
    } finally {
      setIsLocating(false);
    }
  };

  const pickFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showPopup({ title: "Izin Galeri", message: "Aktifkan izin akses galeri di pengaturan HP.", type: "warning", theme: "client" });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setUploadingFoto(true);
    try {
      const comp = await compressImageDetailed(a.uri);
      const uri = comp.uri;
      setFotoUri(uri); setFotoPreview(uri);
    } catch (error) {
      console.error("Gagal kompresi foto:", error);
      setFotoUri(a.uri); setFotoPreview(a.uri);
    } finally {
      setUploadingFoto(false);
    }
  };
  const removeFoto = () => { setFotoUri(null); setFotoPreview(null); };

  const handleBudgetChange = (raw: string) => setBudget(raw.replace(/\D/g,""));

  const doSubmit = async () => {
    try {
      if (user?.id) {
        const { data: uData } = await supabase.from("users_bisa").select("can_post_jobs, kyc_status").eq("id", user.id).maybeSingle();
        if (uData && ((uData as any).can_post_jobs===false || (uData as any).kyc_status==="Dibekukan")) { setPopup({ show:true, title:"Akses Dibatasi", message:"Akun Anda tidak memiliki izin untuk memposting pekerjaan baru saat ini.", type:"error", isSuccess:false }); return; }
      }
    } catch {}
    if (!judul.trim() || !deskripsi.trim() || (!isOnline && !lokasi.trim()) || (kategori.name==="Lainnya" && !kategoriLainnya.trim())) {
      let msg = isOnline ? "Mohon isi judul dan deskripsi pengerjaan." : "Mohon isi judul, deskripsi, dan lokasi pengerjaan.";
      if (kategori.name==="Lainnya" && !kategoriLainnya.trim()) msg = "Mohon isi spesifikasi kategori lainnya.";
      setPopup({ show:true, title:"Data Belum Lengkap", message: msg, type:"error", isSuccess:false }); return;
    }
    setLoading(true);
    try {
      let fotoUrl = fotoPreview || "";
      // upload jika ada fotoUri lokal yang belum jadi URL storage
      if (fotoUri && fotoUri !== fotoPreview) fotoUrl = fotoPreview || fotoUri;
      if (fotoUri && !fotoUrl.startsWith("http")) {
        setUploadingFoto(true);
        const ext = (fotoUri.split(".").pop()?.split("?")[0] || "jpg").toLowerCase();
        const fileName = `kebutuhan_${Date.now()}.${ext}`;
        // expo web fetch uri -> blob, native fetch arrayBuffer
        try {
          const res: any = await fetch(fotoUri);
          const blob = await res.blob ? await res.blob() : new Blob([await res.arrayBuffer()]);
          const { error } = await supabase.storage.from("berkas_kyc").upload(fileName, blob as any, { contentType: `image/${ext==="png"?"png":"jpeg"}` });
          if (!error) {
            const { data: pub } = supabase.storage.from("berkas_kyc").getPublicUrl(fileName);
            fotoUrl = pub.publicUrl;
          }
        } catch {}
        setUploadingFoto(false);
      } else if (fotoPreview && fotoPreview.startsWith("http")) {
        fotoUrl = fotoPreview;
      }

      const finalBudget = budgetType==="total" ? `Rp ${parseInt(budget||"0").toLocaleString("id-ID")} (Total)` : `Rp ${parseInt(budget||"0").toLocaleString("id-ID")} / Teknisi`;
      const expiresAt = Date.now() + masaBerlaku.value * 60*60*1000;
      let detailTambahan = `[INFO TAMBAHAN]\nRadius: ${radius}\nBatas Waktu: ${deadline.name}\nNego: ${isAutoNego?"Ya":"Tidak"}\nTeknisi: ${providerCount} orang.\nKoordinat GPS: ${mapCoords.lat}, ${mapCoords.lng}\n[EXPIRES_AT]: ${expiresAt}`;
      if (fotoUrl) detailTambahan += `\n[FOTO LAMPIRAN]: ${fotoUrl}`;

      const kategoriAkhir = kategori.name==="Lainnya" ? kategoriLainnya.trim()||"Lainnya" : kategori.name;
      const payload: any = {
        pelanggan_id: user.id,
        kategori: kategoriAkhir,
        judul,
        deskripsi: `${deskripsi}\n\n${detailTambahan}`,
        budget: finalBudget,
        lokasi: isOnline ? "Dikerjakan Online" : alamatMap ? (lokasi ? `[${alamatMap}] ${lokasi}` : alamatMap) : lokasi,
        latitude: isOnline ? null : mapCoords.lat,
        longitude: isOnline ? null : mapCoords.lng,
        status: "menunggu_verifikasi",
        is_online: isOnline,
      };
      let returned: any, err: any;
      if (editId) { const r = await supabase.from("pekerjaan_bisa").update(payload).eq("id", editId).select(); returned = r.data; err = r.error; }
      else { const r = await supabase.from("pekerjaan_bisa").insert([payload]).select(); returned = r.data; err = r.error; }
      if (err) throw err;
      if (!returned || returned.length===0) throw new Error("Data tidak ditemukan setelah disimpan");
      setPollingJobId(returned[0].id);
      setPopup({ show:true, title:"Postingan Sedang Diverifikasi!", message:"Tim Admin BISA sedang meninjau permintaanmu untuk memastikan keamanan. Jika sesuai standar, akan langsung disebarkan ke mitra terdekat.", type:"success", isSuccess:true });
    } catch (e: any) { setPopup({ show:true, title:"Gagal Memposting", message: e.message||"Terjadi kesalahan sistem.", type:"error", isSuccess:false }); }
    finally { setLoading(false); setUploadingFoto(false); }
  };

  const handleSubmit = async () => {
    kycGate.triggerKycGate("POST_JOB", async () => {
      // Soft validation GPS: ingatkan user sebelum kirim jika offline tapi belum deteksi
      if (!isOnline && !isGpsDetected) {
        setShowGpsConfirm(true);
        return;
      }
      await doSubmit();
    });
  };

  const confirmGpsSubmit = async (deteksiDulu: boolean) => {
    setShowGpsConfirm(false);
    if (deteksiDulu) {
      await handleDeteksiLokasi();
      // jangan auto-submit, biarkan user lihat alamatMap lalu tekan Posting lagi
      return;
    }
    // Lanjut manual
    setPendingSubmit(true);
    await doSubmit();
    setPendingSubmit(false);
  };

  useEffect(() => {
    if (!pollingJobId) return;
    const iv = setInterval(async () => {
      try {
        const { data } = await supabase.from("pekerjaan_bisa").select("status").eq("id", pollingJobId).single();
        if (data?.status==="mencari_mitra" || data?.status==="ditolak") {
          clearInterval(iv); setPollingJobId(null);
          if (data.status==="ditolak") setPopup({ show:true, title:"Pesanan Ditolak", message:"Maaf, pesanan Anda ditolak oleh admin. Silakan coba lagi dengan deskripsi yang lebih detail.", type:"error", isSuccess:false });
          else setTimeout(()=> router.replace("/c/aktivitas" as any), 1800);
        }
      } catch {}
    }, 3000);
    return ()=> clearInterval(iv);
  }, [pollingJobId, router]);

  const listKategori = KATEGORI_POSTING.map((k)=>({ name:k, icon: KATEGORI_ICON[k], desc: KATEGORI_DESC[k] }));

  return {
    user, loading, pollingJobId,
    judul, setJudul, deskripsi, setDeskripsi, lokasi, setLokasi, budget, setBudget, handleBudgetChange,
    providerCount, setProviderCount, budgetType, setBudgetType, isAutoNego, setIsAutoNego,
    fotoUri, fotoPreview, pickFoto, removeFoto, uploadingFoto,
    kategori, setKategori, kategoriLainnya, setKategoriLainnya,
    radius, setRadius, deadline, setDeadline, masaBerlaku, setMasaBerlaku,
    isOnline, setIsOnline,
    showCatModal, setShowCatModal, showRadiusModal, setShowRadiusModal, showDeadlineModal, setShowDeadlineModal, showMasaModal, setShowMasaModal, setShowMasaBerlakuModal: setShowMasaModal,
    mapCoords, setMapCoords, bboxStr, alamatMap, isLocating, isGpsDetected, setIsGpsDetected, handleDeteksiLokasi,
    popup, closePopup, handleSubmit, showGpsConfirm, confirmGpsSubmit, pendingSubmit,
    listKategori, listRadius: LIST_RADIUS, listDeadline: LIST_DEADLINE, listMasaBerlaku: LIST_MASA_BERLAKU,
    editId,
    kycGate,
  };
}
