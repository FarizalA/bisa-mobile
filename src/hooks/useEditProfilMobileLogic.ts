import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { getStoredUser, setStoredUser } from "../lib/user-storage";
import { compressImage } from "../lib/imageCompression";
import { safeBack } from "@/lib/navigation";

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
          Alert.alert("Izin Kamera Ditolak", "Aktifkan izin kamera di pengaturan.");
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Galeri Ditolak", "Aktifkan izin galeri di pengaturan.");
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        // fallback kamera jika diminta — expo tidak punya launchCameraAsync terpisah di web, cek platform
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      } as any);
      // Jika useCamera true dan di native, coba kamera
      let picked: ImagePicker.ImagePickerResult = result;
      if (useCamera && !result.canceled) {
        // sudah dapat dari library — tapi jika mau kamera, launchCamera
        const cam = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
        if (!cam.canceled) picked = cam;
      }
      if (picked.canceled || !picked.assets?.[0]) return;
      let uri = picked.assets[0].uri;
      if (picked.assets[0].fileSize && picked.assets[0].fileSize > 5 * 1024 * 1024) {
        Alert.alert("File Terlalu Besar", "Maksimal 5 MB");
        return;
      }
      setUploadingImage(true);
      uri = await compressImage(uri);
      const ext = extFromUri(uri);
      const mime = mimeFromExt(ext);
      const ab = await uriToArrayBuffer(uri);
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("profile_photos").upload(`profiles/${fileName}`, ab as any, { contentType: mime, upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("profile_photos").getPublicUrl(`profiles/${fileName}`);
      setFaceUrl(pub.publicUrl);
      setPreviewImage(pub.publicUrl);
      Alert.alert("Berhasil", "Foto profil diperbarui");
    } catch (e: any) {
      Alert.alert("Gagal Upload", e.message || "Gagal upload foto");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAvatarCamera = async () => {
    if (!user) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Kamera", "Aktifkan izin kamera.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (res.canceled || !res.assets?.[0]) return;
      let uri = res.assets[0].uri;
      setUploadingImage(true);
      uri = await compressImage(uri);
      const ext = extFromUri(uri);
      const mime = mimeFromExt(ext);
      const ab = await uriToArrayBuffer(uri);
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("profile_photos").upload(`profiles/${fileName}`, ab as any, { contentType: mime, upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("profile_photos").getPublicUrl(`profiles/${fileName}`);
      setFaceUrl(pub.publicUrl);
      setPreviewImage(pub.publicUrl);
      Alert.alert("Berhasil", "Foto profil diperbarui");
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // GALLERY
  const pickGallery = async () => {
    if (!user) return;
    if (gallery.length >= 5) {
      Alert.alert("Limit Galeri", "Maksimal 5 foto galeri");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Galeri", "Aktifkan izin galeri.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 5 - gallery.length, quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      setUploadingGallery(true);
      let added = 0;
      for (const a of res.assets) {
        if (gallery.length + added >= 5) break;
        if ((a.fileSize || 0) > 5 * 1024 * 1024) {
          Alert.alert("Skip", `${a.fileName || "Foto"} melebihi 5 MB — dilewati`);
          continue;
        }
        const uri = await compressImage(a.uri);
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
      if (added > 0) Alert.alert("Berhasil", `${added} foto ditambahkan ke galeri`);
    } catch (e: any) {
      Alert.alert("Gagal Galeri", e.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  const deleteGalleryItem = async (id: number) => {
    try {
      const { error } = await supabase.from("mitra_gallery").delete().eq("id", id);
      if (error) throw error;
      setGallery((prev) => prev.filter((g) => g.id !== id));
      Alert.alert("Berhasil", "Foto galeri dihapus");
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    }
  };

  // SERVICES
  const addService = async () => {
    if (!newService.title.trim() || newService.price <= 0 || !user) {
      Alert.alert("Validasi", "Judul dan harga wajib diisi");
      return;
    }
    if (services.length >= 5) {
      Alert.alert("Limit", "Maksimal 5 layanan");
      return;
    }
    try {
      const { data, error } = await supabase.from("mitra_services").insert({ mitra_id: user.id, ...newService, order_index: services.length }).select();
      if (error) throw error;
      if (data?.[0]) setServices((prev) => [...prev, data[0] as any]);
      setNewService({ title: "", description: "", price: 0, unit: "unit", is_popular: false });
      Alert.alert("Berhasil", "Layanan ditambahkan");
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    }
  };
  const deleteService = async (id: number) => {
    try {
      const { error } = await supabase.from("mitra_services").delete().eq("id", id);
      if (error) throw error;
      setServices((prev) => prev.filter((s) => s.id !== id));
      Alert.alert("Berhasil", "Layanan dihapus");
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    }
  };

  // PORTFOLIO — pilih 1-5 foto dulu (preview), baru upload saat tambah project
  const pickPortfolioImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Galeri", "Aktifkan izin galeri.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      if (res.assets.length > 5) {
        Alert.alert("Limit", "Maksimal 5 foto per project");
        return;
      }
      const uris: string[] = [];
      const previews: string[] = [];
      for (const a of res.assets) {
        if ((a.fileSize || 0) > 5 * 1024 * 1024) {
          Alert.alert("Skip", `${a.fileName || "Foto"} melebihi 5 MB`);
          continue;
        }
        uris.push(a.uri);
        previews.push(a.uri);
      }
      setPendingPortfolioUris(uris);
      setPreviewUrls(previews);
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    }
  };

  const addPortfolio = async () => {
    if (!newPortfolio.project_title.trim() || !user) {
      Alert.alert("Validasi", "Judul project wajib diisi");
      return;
    }
    if (pendingPortfolioUris.length === 0) {
      Alert.alert("Validasi", "Pilih minimal 1 foto (max 5)");
      return;
    }
    if (portfolio.length >= 6) {
      Alert.alert("Limit", "Maksimal 6 project portofolio");
      return;
    }
    setUploadingPortfolio(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < pendingPortfolioUris.length; i++) {
        const uri = await compressImage(pendingPortfolioUris[i]);
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
      Alert.alert("Berhasil", "Project portofolio ditambahkan");
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const deletePortfolioItem = async (id: number) => {
    try {
      const { error } = await supabase.from("mitra_portfolio").delete().eq("id", id);
      if (error) throw error;
      setPortfolio((prev) => prev.filter((p) => p.id !== id));
      Alert.alert("Berhasil", "Project dihapus");
    } catch (e: any) {
      Alert.alert("Gagal", e.message);
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
        keahlian,
        base_price: parseFloat(basePrice) || 0,
        face_url: faceUrl,
        mitra_description: mitraDescription,
        availability_status: availabilityStatus,
        availability_custom_text: availabilityCustom,
        // karakteristik Auto — tetap kirim tapi mitra lihat read-only
        char_on_time: charOnTime,
        char_response: charResponse,
        char_warranty: charWarranty,
      }).eq("id", user.id);
      if (error) throw error;
      const updated = { ...user, phone, email, address, alamat_singkat: alamatSingkat, keahlian, base_price: parseFloat(basePrice) || 0, face_url: faceUrl, mitra_description: mitraDescription };
      await setStoredUser(updated);
      setUser(updated);
      Alert.alert("Berhasil", "Profil berhasil disimpan");
      setTimeout(() => safeBack(router, "/c/home"), 900);
    } catch (e: any) {
      Alert.alert("Gagal Simpan", e.message || "Gagal menyimpan profil");
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
