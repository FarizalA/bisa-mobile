import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { supabase } from "../../src/lib/supabase";
import { setStoredUser } from "../../src/lib/user-storage";
import { compressImageDetailed, compressImageWithBase64, base64ToUint8Array } from "../../src/lib/imageCompression";
import { reverseGeocode } from "../../src/lib/geocode";
import DaftarHeader from "../../src/components/daftar/DaftarHeader";
import DaftarProgressCard from "../../src/components/daftar/DaftarProgressCard";
import DaftarBiodataSection from "../../src/components/daftar/DaftarBiodataSection";
import DaftarKycSection from "../../src/components/daftar/DaftarKycSection";
import DaftarTermsSubmit from "../../src/components/daftar/DaftarTermsSubmit";
import { DaftarImageSourceModal, DaftarBirthDateModal, DaftarPopupModal, DaftarPopup } from "../../src/components/daftar/DaftarModals";

export default function DaftarPage() {
  const router = useRouter();

  // State Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Tanggal Lahir (YYYY-MM-DD)
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const [address, setAddress] = useState("");
  const [alamatSingkat, setAlamatSingkat] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // File KYC
  const [ktpUri, setKtpUri] = useState<string | null>(null);
  const [faceUri, setFaceUri] = useState<string | null>(null);
  const [activePickerType, setActivePickerType] = useState<"ktp" | "face" | null>(null);

  // Status & Popup
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<DaftarPopup>({
    visible: false,
    title: "",
    message: "",
    type: "warning",
  });

  const showPopup = (
    message: string,
    type: "warning" | "error" | "success" | "info" = "warning",
    title?: string,
    actionText?: string,
    onAction?: () => void
  ) => {
    setPopup({
      visible: true,
      title:
        title ||
        (type === "error"
          ? "Terjadi Kesalahan"
          : type === "warning"
          ? "Perhatian"
          : "Pemberitahuan"),
      message,
      type,
      actionText: actionText || "Oke, Mengerti",
      onAction,
    });
  };

  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      : "";

  // Auto Reverse Geocoding dari Nominatim API saat lat/lng berubah (mirip Web)
  useEffect(() => {
    if (!latitude || !longitude) return;
    setIsGeocoding(true);
    const t = setTimeout(async () => {
      const sub = await reverseGeocode(latitude, longitude);
      if (sub) setAlamatSingkat(sub);
      setIsGeocoding(false);
    }, 800);
    return () => clearTimeout(t);
  }, [latitude, longitude]);

  // Tombol deteksi lokasi GPS bawaan HP
  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showPopup("Izin lokasi ditolak. Aktifkan GPS pada pengaturan perangkat Anda.", "warning", "Izin GPS Ditolak");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      showPopup("Gagal mengambil posisi GPS: " + (err?.message || ""), "error", "Gagal Deteksi Lokasi");
    }
  };

  // Handler ambil gambar (Kamera vs Galeri)
  const handleSelectImageSource = async (source: "camera" | "gallery") => {
    if (!activePickerType) return;
    const targetType = activePickerType;
    setActivePickerType(null);

    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Ditolak", "Izin akses kamera diperlukan untuk mengambil foto.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
          aspect: targetType === "ktp" ? [16, 10] : [1, 1],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Izin Ditolak", "Izin akses galeri foto diperlukan.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
          aspect: targetType === "ktp" ? [16, 10] : [1, 1],
        });
      }

      if (!result.canceled && result.assets?.[0]?.uri) {
        let selectedUri = result.assets[0].uri;
        try {
          const compDaftar = await compressImageDetailed(selectedUri);
          selectedUri = compDaftar.uri;
        } catch (error) {
          console.error("Gagal kompresi foto:", error);
        }
        if (targetType === "ktp") {
          setKtpUri(selectedUri);
        } else {
          setFaceUri(selectedUri);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error("ImagePicker error:", err);
      showPopup("Gagal mengambil foto: " + (err?.message || ""), "error", "Gagal Ambil Foto");
    }
  };

  // Upload berkas ke Supabase Storage
  const uploadFile = async (uri: string, prefix: string) => {
    try {
      let ext = "jpg";
      if (uri.startsWith("data:image/png")) ext = "png";
      else if (uri.startsWith("data:image/jpeg") || uri.startsWith("data:image/jpg")) ext = "jpg";
      else if (uri.startsWith("data:image/webp")) ext = "webp";
      else if (uri.includes(".")) {
        const pathOnly = uri.split("?")[0].split("#")[0];
        const lastPart = pathOnly.split("/").pop() || "";
        if (lastPart.includes(".")) {
          const rawExt = lastPart.split(".").pop()?.toLowerCase();
          if (rawExt && ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt)) {
            ext = rawExt;
          }
        }
      }

      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      // Upload biner lewat base64 — jauh lebih andal daripada fetch(uri).blob() di RN.
      // fetch().blob() di RN menghasilkan body cacat (Content-Type jadi text/plain),
      // sehingga gambar tidak bisa dirender di web admin.
      let payload: any;
      try {
        const comp = await compressImageWithBase64(uri, 1280, 0.7);
        payload = comp.base64 ? base64ToUint8Array(comp.base64) : (await (await fetch(uri)).blob());
      } catch {
        payload = await (await fetch(uri)).blob();
      }
      const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("kyc_dokumen")
        .upload(fileName, payload, {
          contentType,
          // Nama file selalu unik (timestamp + acak), jadi tidak perlu upsert.
          // upsert memicu operasi UPDATE yang tidak diizinkan policy RLS
          // (anon hanya boleh INSERT ke bucket KYC) sehingga unggahan gagal.
          upsert: false,
        });

      if (uploadError) {
        console.warn("Supabase Storage error:", uploadError);
        if (
          uploadError.message?.includes("row-level security") ||
          uploadError.message?.includes("policy") ||
          uploadError.message?.includes("security policy")
        ) {
          console.warn("Storage RLS aktif, menggunakan fallback URI untuk registrasi.");
          return { url: uri, error: null };
        }
        return { url: null, error: uploadError.message };
      }
      // Dokumen KYC disimpan di bucket private. Yang disimpan ke DB adalah path
      // objeknya (bukan URL publik), karena URL publik bucket private tidak bisa
      // dibuka. Admin membuat signed URL dari server saat menampilkan dokumen.
      return { url: fileName, error: null };
    } catch (err: any) {
      console.error("uploadFile catch error:", err);
      return { url: null, error: err?.message || "Gagal memproses file gambar." };
    }
  };

  // Submit Handler
  const handleDaftar = async () => {
    if (!terms) {
      showPopup("Harap centang persetujuan Syarat & Ketentuan terlebih dahulu.", "warning", "Persetujuan Diperlukan");
      return;
    }
    if (!name.trim()) {
      showPopup("Harap isi Nama Lengkap sesuai KTP Anda.", "warning", "Data Belum Lengkap");
      return;
    }
    if (!phone.trim()) {
      showPopup("Harap isi Nomor WhatsApp / HP Aktif Anda.", "warning", "Data Belum Lengkap");
      return;
    }
    if (!email.trim()) {
      showPopup("Harap isi Alamat Email Anda.", "warning", "Data Belum Lengkap");
      return;
    }
    if (password.length < 6) {
      showPopup("Kata Sandi minimal 6 karakter.", "warning", "Kata Sandi Lemah");
      return;
    }
    if (!birthDate) {
      showPopup("Harap isi Tanggal Lahir Anda.", "warning", "Data Belum Lengkap");
      return;
    }
    if (!latitude || !longitude) {
      showPopup("Harap tentukan titik lokasi domisili Anda di peta atau tekan 'Gunakan GPS Saya'.", "warning", "Lokasi GPS Wajib");
      return;
    }
    if (!address.trim()) {
      showPopup("Harap isi Alamat Lengkap Domisili Anda.", "warning", "Data Belum Lengkap");
      return;
    }
    if (!ktpUri) {
      showPopup("Mohon unggah Foto KTP Asli Anda untuk verifikasi KYC.", "warning", "Foto KTP Diperlukan");
      return;
    }
    if (!faceUri) {
      showPopup("Mohon unggah Swafoto (Selfie Wajah) Anda untuk verifikasi KYC.", "warning", "Swafoto Diperlukan");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim().replace(/\s+/g, "");
      const normalizePhone = (p: string) =>
        p.replace(/\s+/g, "").replace(/[^0-9]/g, "").replace(/^0/, "").replace(/^62/, "");

      // 1. Cek duplikat Email di Supabase
      const { data: dupEmail } = await supabase
        .from("users_bisa")
        .select("id,email,kyc_status")
        .ilike("email", normalizedEmail)
        .limit(1);

      if (dupEmail && dupEmail.length > 0) {
        const st = (dupEmail[0] as any).kyc_status;
        setLoading(false);
        showPopup(
          st === "Terverifikasi"
            ? "Email ini sudah terdaftar dan terverifikasi. Silakan langsung Login, tidak perlu daftar lagi."
            : "Email ini sudah terdaftar dan sedang menunggu verifikasi admin. Silakan login atau cek halaman Waiting.",
          "warning",
          "Email Sudah Terdaftar",
          "Ke Halaman Login",
          () => router.push("/login" as any)
        );
        return;
      }

      // 2. Cek duplikat Nomor HP di Supabase
      const { data: phoneRows } = await supabase
        .from("users_bisa")
        .select("id,phone,kyc_status")
        .limit(1000);

      if (phoneRows) {
        const target = normalizePhone(normalizedPhone);
        const dup = (phoneRows as any[]).find(
          (r) => r.phone && normalizePhone(r.phone) === target
        );
        if (dup) {
          setLoading(false);
          showPopup(
            dup.kyc_status === "Terverifikasi"
              ? "Nomor HP ini sudah terdaftar dan terverifikasi. Silakan langsung Login."
              : "Nomor HP ini sudah terdaftar. Silakan gunakan nomor lain atau login.",
            "warning",
            "Nomor HP Terdaftar",
            "Ke Halaman Login",
            () => router.push("/login" as any)
          );
          return;
        }
      }

      // 3. Upload Berkas KYC ke Storage
      const ktpRes = await uploadFile(ktpUri, "ktp");
      if (!ktpRes.url) {
        throw new Error("Gagal mengunggah Foto KTP: " + (ktpRes.error || "Kesalahan server"));
      }
      const ktpUrl = ktpRes.url;

      const faceRes = await uploadFile(faceUri, "face");
      if (!faceRes.url) {
        throw new Error("Gagal mengunggah Swafoto: " + (faceRes.error || "Kesalahan server"));
      }
      const faceUrl = faceRes.url;

      // 4. Insert data pengguna ke tabel `users_bisa`
      const { data, error: dbError } = await supabase
        .from("users_bisa")
        .insert([
          {
            name: name.trim(),
            phone: normalizedPhone,
            email: normalizedEmail,
            password: password,
            birth_date: birthDate,
            address: address.trim(),
            alamat_singkat: alamatSingkat.trim(),
            ktp_url: ktpUrl,
            face_url: faceUrl,
            latitude: latitude,
            longitude: longitude,
            kyc_status: "Menunggu",
            kyc_message: null,
          },
        ])
        .select();

      if (dbError) {
        if (
          (dbError as any).code === "23505" ||
          dbError.message?.includes("duplicate") ||
          dbError.message?.includes("unique constraint")
        ) {
          throw new Error(
            "Email atau Nomor HP ini sudah terdaftar. Silakan langsung Login."
          );
        }
        throw new Error(dbError.message);
      }

      const newUser: any = data?.[0];
      if (newUser) {
        const safe = { ...newUser };
        delete safe.password;
        await setStoredUser(safe);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/waiting" as any);
    } catch (err: any) {
      console.error(err);
      showPopup(err?.message || "Terjadi kesalahan saat pendaftaran.", "error", "Gagal Mendaftar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">
      <DaftarHeader />

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-[420px] w-full self-center">
          <DaftarProgressCard ktpUri={ktpUri} faceUri={faceUri} />

          <DaftarBiodataSection
            name={name} setName={setName}
            phone={phone} setPhone={setPhone}
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            showPassword={showPassword} setShowPassword={setShowPassword}
            birthDate={birthDate} setShowDatePickerModal={setShowDatePickerModal}
            latitude={latitude} longitude={longitude}
            setLatitude={setLatitude} setLongitude={setLongitude}
            alamatSingkat={alamatSingkat} setAlamatSingkat={setAlamatSingkat}
            address={address} setAddress={setAddress}
            isGeocoding={isGeocoding} handleUseCurrentLocation={handleUseCurrentLocation}
          />

          <DaftarKycSection
            ktpUri={ktpUri} faceUri={faceUri}
            setActivePickerType={setActivePickerType}
          />

          <DaftarTermsSubmit
            terms={terms} setTerms={setTerms}
            loading={loading} handleDaftar={handleDaftar}
          />
        </View>
      </ScrollView>

      <DaftarImageSourceModal
        visible={activePickerType !== null}
        pickerType={activePickerType}
        onClose={() => setActivePickerType(null)}
        onPick={handleSelectImageSource}
      />

      <DaftarBirthDateModal
        visible={showDatePickerModal}
        day={birthDay} month={birthMonth} year={birthYear}
        setDay={setBirthDay} setMonth={setBirthMonth} setYear={setBirthYear}
        onClose={() => setShowDatePickerModal(false)}
      />

      <DaftarPopupModal
        popup={popup}
        onClose={() => {
          const action = popup.onAction;
          setPopup((prev) => ({ ...prev, visible: false }));
          if (action) action();
        }}
      />
    </SafeAreaView>
  );
}
