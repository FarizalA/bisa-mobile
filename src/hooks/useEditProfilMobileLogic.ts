import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { getStoredUser, setStoredUser } from "../lib/user-storage";
import { compressImageDetailed } from "../lib/imageCompression";
import { safeBack } from "@/lib/navigation";
import { usePopup } from "../components/PopupProvider.native";

export interface Service {
  id?: number;
  title: string;
  description?: string;
  price: number;
  unit: string;
  is_popular: boolean;
}
export interface Portfolio {
  id?: number;
  project_title: string;
  project_description?: string;
  image_urls: string[];
}
export interface GalleryItem {
  id?: number;
  image_url: string;
  caption?: string;
}

function extFromUri(uri: string): string {
  const m = uri.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  return (m?.[1] || "jpg").toLowerCase();
}
function mimeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/jpeg";
  return "image/jpeg";
}
async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

export function useEditProfilMobileLogic() {
  const router = useRouter();
  const { showPopup } = usePopup();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "karya" | "status">("info");

  // BASIC INFO
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [alamatSingkat, setAlamatSingkat] = useState("");
  const [kategori, setKategori] = useState("Lainnya");
  const [keahlian, setKeahlian] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [faceUrl, setFaceUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mitraDescription, setMitraDescription] = useState("");

  // GALLERY
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // SERVICES
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState<Service>({ title: "", description: "", price: 0, unit: "unit", is_popular: false });

  // PORTFOLIO
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [newPortfolio, setNewPortfolio] = useState<Portfolio>({ project_title: "", project_description: "", image_urls: [] });
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pendingPortfolioUris, setPendingPortfolioUris] = useState<string[]>([]);

  // AVAILABILITY
  const [availabilityStatus, setAvailabilityStatus] = useState("Tersedia Sekarang");
  const [availabilityCustom, setAvailabilityCustom] = useState("");
  const AVAILABILITY_PRESETS = ["Tersedia Sekarang", "Bisa Instan (< 15 menit)", "Tersedia 2 jam lagi", "Tersedia 5 menit lagi", "Sedang Offline"];

  // CHARACTERISTICS (read-only Auto)
  const [charOnTime, setCharOnTime] = useState(0);
  const [charResponse, setCharResponse] = useState("< 5 menit");
  const [charWarranty, setCharWarranty] = useState("100%");

  const fetchGallery = useCallback(async (userId: number) => {
    try {
      const { data } = await supabase.from("mitra_gallery").select("*").eq("mitra_id", userId).order("order_index", { ascending: true });
      if (data) setGallery(data as any);
    } catch {}
  }, []);
  const fetchServices = useCallback(async (userId: number) => {
    try {
      const { data } = await supabase.from("mitra_services").select("*").eq("mitra_id", userId).order("order_index", { ascending: true });
      if (data) setServices(data as any);
    } catch {}
  }, []);
  const fetchPortfolio = useCallback(async (userId: number) => {
    try {
      const { data } = await supabase.from("mitra_portfolio").select("*").eq("mitra_id", userId).order("created_at", { ascending: false });
      if (data) setPortfolio(data as any);
    } catch {}
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const stored = await getStoredUser();
        if (!stored?.id) {
          router.replace("/(auth)/login" as any);
          return;
        }
        setUser(stored);
        const { data } = await supabase.from("users_bisa").select("*").eq("id", stored.id).maybeSingle();
        const d = data || stored;
        setName(d.name || "");
        setPhone(d.phone || "");
        setEmail(d.email || "");
        setAddress(d.address || "");
        setAlamatSingkat(d.alamat_singkat || "");
        setKategori((d as any).kategori || "Lainnya");
        setKeahlian(d.keahlian || "");
        setBasePrice(String(d.base_price ?? 0));
        setFaceUrl(d.face_url || "");
        setPreviewImage(d.face_url || "");
        setMitraDescription(d.mitra_description || "");
        setAvailabilityStatus(d.availability_status || "Tersedia Sekarang");
        setAvailabilityCustom(d.availability_custom_text || "");
        setCharOnTime(d.char_on_time || 0);
        setCharResponse(d.char_response || "< 5 menit");
        setCharWarranty(d.char_warranty || "100%");
        if (d.id) await Promise.all([fetchGallery(d.id), fetchServices(d.id), fetchPortfolio(d.id)]);
        if (data) await setStoredUser(data);
      } catch (e) {
        console.error("Gagal fetch profil", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router, fetchGallery, fetchServices, fetchPortfolio]);

  // AVATAR — Kamera / Galeri native
  const pickAvatar = async (useCamera = false) => {
    if (!user) return;
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showPopup({ title: "Izin Kamera Ditolak", message: "Aktifkan izin kamera di pengaturan HP.", type: "warning" });
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          showPopup({ title: "Izin Galeri Ditolak", message: "Aktifkan izin galeri di pengaturan HP.", type: "warning" });
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      } as any);
      let picked: ImagePicker.ImagePickerResult = result;
      if (useCamera && !result.canceled) {
        const cam = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!cam.canceled) picked = cam;
      }
      if (picked.canceled || !picked.assets?.[0]) return;
      let uri = picked.assets[0].uri;
      setUploadingImage(true);
      const comp = await compressImageDetailed(uri);
      uri = comp.uri;
      const ext = extFromUri(uri);
      const mime = mimeFromExt(ext);
      const ab = await uriToArrayBuffer(uri);
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("profile_photos").upload(`profiles/${fileName}`, ab as any, { contentType: mime, upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("profile_photos").getPublicUrl(`profiles/${fileName}`);
      setFaceUrl(pub.publicUrl);
      setPreviewImage(pub.publicUrl);
      showPopup({ title: "Berhasil", message: "Foto profil berhasil diperbarui.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal Upload", message: e.message || "Gagal upload foto.", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAvatarCamera = async () => {
    if (!user) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showPopup({ title: "Izin Kamera", message: "Aktifkan izin akses kamera.", type: "warning" });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (res.canceled || !res.assets?.[0]) return;
      let uri = res.assets[0].uri;
      setUploadingImage(true);
      const comp = await compressImageDetailed(uri);
      uri = comp.uri;
      const ext = extFromUri(uri);
      const mime = mimeFromExt(ext);
      const ab = await uriToArrayBuffer(uri);
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("profile_photos").upload(`profiles/${fileName}`, ab as any, { contentType: mime, upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("profile_photos").getPublicUrl(`profiles/${fileName}`);
      setFaceUrl(pub.publicUrl);
      setPreviewImage(pub.publicUrl);
      showPopup({ title: "Berhasil", message: "Foto profil berhasil diperbarui.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // GALLERY
  const pickGallery = async () => {
    if (!user) return;
    if (gallery.length >= 5) {
      showPopup({ title: "Limit Galeri", message: "Maksimal 5 foto galeri.", type: "warning" });
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showPopup({ title: "Izin Galeri", message: "Aktifkan izin akses galeri.", type: "warning" });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 5 - gallery.length, quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      setUploadingGallery(true);
      let added = 0;
      for (const a of res.assets) {
        if (gallery.length + added >= 5) break;
        const comp = await compressImageDetailed(a.uri);
        const uri = comp.uri;
        const ext = extFromUri(uri);
        const mime = mimeFromExt(ext);
        const ab = await uriToArrayBuffer(uri);
        const fileName = `${user.id}_gallery_${Date.now()}_${added}.${ext}`;
        const { error } = await supabase.storage.from("profile_photos").upload(`gallery/${fileName}`, ab as any, { contentType: mime, upsert: true });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("profile_photos").getPublicUrl(`gallery/${fileName}`);
        const { data: row, error: insErr } = await supabase.from("mitra_gallery").insert({ mitra_id: user.id, image_url: pub.publicUrl, order_index: gallery.length + added }).select();
        if (insErr) throw insErr;
        if (row?.[0]) {
          setGallery((prev) => [...prev, row[0] as any]);
          added++;
        }
      }
      if (added > 0) showPopup({ title: "Berhasil", message: `${added} foto ditambahkan ke galeri.`, type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal Galeri", message: e.message, type: "error" });
    } finally {
      setUploadingGallery(false);
    }
  };

  const deleteGalleryItem = async (id: number) => {
    try {
      const { error } = await supabase.from("mitra_gallery").delete().eq("id", id);
      if (error) throw error;
      setGallery((prev) => prev.filter((g) => g.id !== id));
      showPopup({ title: "Berhasil", message: "Foto galeri dihapus.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    }
  };

  // SERVICES
  const addService = async () => {
    if (!newService.title.trim() || newService.price <= 0 || !user) {
      showPopup({ title: "Validasi", message: "Judul dan harga wajib diisi.", type: "warning" });
      return;
    }
    if (services.length >= 5) {
      showPopup({ title: "Limit Layanan", message: "Maksimal 5 layanan.", type: "warning" });
      return;
    }
    try {
      const { data, error } = await supabase.from("mitra_services").insert({ mitra_id: user.id, ...newService, order_index: services.length }).select();
      if (error) throw error;
      if (data?.[0]) setServices((prev) => [...prev, data[0] as any]);
      setNewService({ title: "", description: "", price: 0, unit: "unit", is_popular: false });
      showPopup({ title: "Berhasil", message: "Layanan berhasil ditambahkan.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    }
  };
  const deleteService = async (id: number) => {
    try {
      const { error } = await supabase.from("mitra_services").delete().eq("id", id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      showPopup({ title: "Berhasil", message: "Layanan dihapus.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    }
  };

  // PORTFOLIO — pilih 1-5 foto dulu (preview), baru upload saat tambah project
  const pickPortfolioImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showPopup({ title: "Izin Galeri", message: "Aktifkan izin galeri di pengaturan HP.", type: "warning" });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      if (res.assets.length > 5) {
        showPopup({ title: "Limit Foto", message: "Maksimal 5 foto per project.", type: "warning" });
        return;
      }
      const uris: string[] = [];
      const previews: string[] = [];
      for (const a of res.assets) {
        if ((a.fileSize || 0) > 5 * 1024 * 1024) {
          showPopup({ title: "Foto Melebihi Limit", message: `${a.fileName || "Foto"} melebihi 5 MB.`, type: "warning" });
          continue;
        }
        uris.push(a.uri);
        previews.push(a.uri);
      }
      setPendingPortfolioUris(uris);
      setPreviewUrls(previews);
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    }
  };

  const addPortfolio = async () => {
    if (!newPortfolio.project_title.trim() || !user) {
      showPopup({ title: "Validasi", message: "Judul project wajib diisi.", type: "warning" });
      return;
    }
    if (pendingPortfolioUris.length === 0) {
      showPopup({ title: "Validasi", message: "Pilih minimal 1 foto (maksimal 5).", type: "warning" });
      return;
    }
    if (portfolio.length >= 6) {
      showPopup({ title: "Limit Project", message: "Maksimal 6 project portofolio.", type: "warning" });
      return;
    }
    setUploadingPortfolio(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < pendingPortfolioUris.length; i++) {
        const comp = await compressImageDetailed(pendingPortfolioUris[i]);
        const uri = comp.uri;
        const ext = extFromUri(uri);
        const mime = mimeFromExt(ext);
        const ab = await uriToArrayBuffer(uri);
        const fileName = `${user.id}_portfolio_${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from("profile_photos").upload(`portfolio/${fileName}`, ab as any, { contentType: mime, upsert: true });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("profile_photos").getPublicUrl(`portfolio/${fileName}`);
        uploadedUrls.push(pub.publicUrl);
      }
      const { data, error } = await supabase.from("mitra_portfolio").insert({ mitra_id: user.id, project_title: newPortfolio.project_title, project_description: newPortfolio.project_description, image_urls: uploadedUrls }).select();
      if (error) throw error;
      if (data?.[0]) setPortfolio((prev) => [...prev, data[0] as any]);
      setNewPortfolio({ project_title: "", project_description: "", image_urls: [] });
      setPendingPortfolioUris([]);
      setPreviewUrls([]);
      showPopup({ title: "Berhasil", message: "Project portofolio berhasil ditambahkan.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const deletePortfolioItem = async (id: number) => {
    try {
      const { error } = await supabase.from("mitra_portfolio").delete().eq("id", id);
      if (error) throw error;
      setPortfolio((prev) => prev.filter((p) => p.id !== id));
      showPopup({ title: "Berhasil", message: "Project portofolio dihapus.", type: "success" });
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message, type: "error" });
    }
  };

  // SAVE — nama TIDAK dikirim (terkunci KTP)
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("users_bisa").update({
        phone,
        email,
        address,
        alamat_singkat: alamatSingkat,
        kategori,
        keahlian,
        base_price: parseFloat(basePrice) || 0,
        face_url: faceUrl,
        mitra_description: mitraDescription,
        availability_status: availabilityStatus,
        availability_custom_text: availabilityCustom,
        char_on_time: charOnTime,
        char_response: charResponse,
        char_warranty: charWarranty,
      }).eq("id", user.id);
      if (error) throw error;
      const updated = { ...user, phone, email, address, alamat_singkat: alamatSingkat, kategori, keahlian, base_price: parseFloat(basePrice) || 0, face_url: faceUrl, mitra_description: mitraDescription };
      await setStoredUser(updated);
      setUser(updated);
      showPopup({ title: "Berhasil", message: "Profil berhasil disimpan.", type: "success" });
      setTimeout(() => router.replace("/c/profil" as any), 900);
    } catch (e: any) {
      showPopup({ title: "Gagal Simpan", message: e.message || "Gagal menyimpan profil.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return {
    user,
    loading,
    saving,
    activeTab,
    setActiveTab,
    name,
    phone,
    setPhone,
    email,
    setEmail,
    address,
    setAddress,
    alamatSingkat,
    setAlamatSingkat,
    kategori,
    setKategori,
    keahlian,
    setKeahlian,
    basePrice,
    setBasePrice,
    faceUrl,
    previewImage,
    uploadingImage,
    pickAvatar,
    handleAvatarCamera,
    mitraDescription,
    setMitraDescription,
    gallery,
    uploadingGallery,
    pickGallery,
    deleteGalleryItem,
    services,
    newService,
    setNewService,
    addService,
    deleteService,
    portfolio,
    newPortfolio,
    setNewPortfolio,
    uploadingPortfolio,
    previewUrls,
    pendingPortfolioUris,
    pickPortfolioImages,
    addPortfolio,
    deletePortfolioItem,
    availabilityStatus,
    setAvailabilityStatus,
    availabilityCustom,
    setAvailabilityCustom,
    AVAILABILITY_PRESETS,
    charOnTime,
    charResponse,
    charWarranty,
    handleSave,
  };
}
export type EditProfilMobileLogic = ReturnType<typeof useEditProfilMobileLogic>;
