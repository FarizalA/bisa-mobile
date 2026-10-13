import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
import { MapPin, CheckCircle, Clock, X, AlertTriangle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePopup } from "../PopupProvider.native";
import { supabase } from "../../lib/supabase";
import { getStoredUser } from "../../lib/user-storage";
import { useKycGate } from "../../hooks/useKycGate";

function parseDeskripsi(deskripsi: string) {
  let textDesc = deskripsi || "";
  let fotoUrl: string | null = null;
  let infoTambahan: string[] | null = null;
  const fotoMatch = textDesc.match(/\[FOTO LAMPIRAN\]:\s*(https?:\/\/[^\s]+)/);
  if (fotoMatch && fotoMatch[1]) {
    fotoUrl = fotoMatch[1];
    textDesc = textDesc.replace(fotoMatch[0], "").trim();
  }
  const infoTambahanIndex = textDesc.indexOf("[INFO TAMBAHAN]");
  if (infoTambahanIndex !== -1) {
    const rawInfo = textDesc.substring(infoTambahanIndex);
    textDesc = textDesc.substring(0, infoTambahanIndex).trim();
    infoTambahan = rawInfo
      .replace("[INFO TAMBAHAN]", "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("Koordinat GPS") && !line.includes("[EXPIRES_AT]"));
  }
  return { textDesc, fotoUrl, infoTambahan };
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "Baru saja";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Baru saja";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mnt yang lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} hari yang lalu`;
}

export default function ProviderHomeJobDetailModal({
  job,
  onClose,
  onApplied,
}: {
  job: any | null;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const [isApplying, setIsApplying] = useState(false);
  const [applyHarga, setApplyHarga] = useState("");
  const [applyPesan, setApplyPesan] = useState("");
  const [isApplied, setIsApplied] = useState(false);
  const [checkingApplied, setCheckingApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const insets = useSafeAreaInsets();
  const { showPopup } = usePopup();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const kycGate = useKycGate();

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (job) {
      setIsApplying(false);
      setApplyHarga(typeof job.budget === "number" ? `Rp ${Number(job.budget).toLocaleString("id-ID")}` : String(job.budget || ""));
      setApplyPesan("Saya siap mengerjakan ini dengan profesional.");
      setCancelConfirm(false);
      // cek sudah pernah lamar?
      (async () => {
        try {
          setCheckingApplied(true);
          const stored: any = await getStoredUser();
          if (!stored?.id) return;
          const { data } = await supabase.from("pelamar_pekerjaan").select("id").eq("job_id", job.id).eq("mitra_id", stored.id).limit(1);
          setIsApplied(Boolean(data && data.length > 0));
        } catch {}
        finally { setCheckingApplied(false); }
      })();
    }
  }, [job?.id]);

  const getCountdown = (deskripsi: string) => {
    const m = deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
    if (!m) return null;
    const expiresAt = parseInt(m[1], 10);
    const diff = expiresAt - currentTime;
    if (diff <= 0) return { expired: true, text: "Kadaluarsa" };
    const h = Math.floor(diff / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return { expired: false, text: h > 0 ? `${pad(h)}:${pad(min)}:${pad(s)}` : `${pad(min)}:${pad(s)}` };
  };

  if (!job) return null;

  const parsed = parseDeskripsi(job.deskripsi);
  const countdown = getCountdown(job.deskripsi);
  const pelangganName = job.pelanggan?.name || job.pelanggan_name || "Pelanggan";
  const pelangganFace = job.pelanggan?.face_url || job.pelanggan_face_url || null;
  const kategori = job.kategori || "Jasa Umum";
  const budgetText = typeof job.budget === "number" ? `Rp ${Number(job.budget).toLocaleString("id-ID")}` : String(job.budget || "Nego");
  const lokasiText = job.is_online ? "🌐 Online" : job.distance_km != null ? `${Number(job.distance_km).toFixed(1)} km` : (job.lokasi || "Di Lokasi");
  const alamatText = job.lokasi || job.alamat || "Alamat tidak tersedia";

  const handleApply = async () => {
    if (!applyHarga.trim()) {
      showPopup({ title: "Info", message: "Masukkan harga penawaran Anda.", type: "warning", theme: "provider" });
      return;
    }
    const ok = await kycGate.triggerKycGate("BID_JOB", () => {});
    const stored: any = await getStoredUser();
    if (!stored?.id) {
      showPopup({ title: "Gagal", message: "Sesi habis, silakan login kembali.", type: "error", theme: "provider" });
      return;
    }
    if (stored.kyc_status !== "Terverifikasi" && stored.kyc_status !== "approved" && stored.kyc_status !== "Disetujui") {
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await supabase.from("pelamar_pekerjaan").insert([{ job_id: job.id, mitra_id: stored.id, harga_tawaran: applyHarga, pesan: applyPesan }]);
      if (error) throw error;
      showPopup({ title: "Berhasil", message: "Lamaran terkirim! Klien akan meninjau penawaran Anda. 🎉", type: "success", theme: "provider" });
      setIsApplied(true);
      setIsApplying(false);
      onApplied?.();
    } catch (e: any) {
      showPopup({ title: "Gagal melamar", message: e.message || "Terjadi kesalahan", type: "error", theme: "provider" });
    } finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    try {
      const stored: any = await getStoredUser();
      if (!stored?.id) return;
      const { error } = await supabase.from("pelamar_pekerjaan").delete().eq("job_id", job.id).eq("mitra_id", stored.id);
      if (error) throw error;
      setIsApplied(false);
      setCancelConfirm(false);
      showPopup({ title: "Berhasil", message: "Lamaran berhasil dibatalkan.", type: "success", theme: "provider" });
      onApplied?.();
    } catch (e: any) {
      showPopup({ title: "Gagal", message: e.message || "Gagal membatalkan lamaran", type: "error", theme: "provider" });
    }
  };

  const openApplyForm = () => {
    kycGate.triggerKycGate("BID_JOB", () => {
      setApplyHarga(budgetText);
      setApplyPesan("Saya siap mengerjakan ini dengan profesional.");
      setIsApplying(true);
    });
  };

  return (
    <Modal visible={Boolean(job)} transparent animationType="slide" onRequestClose={() => (isApplying ? setIsApplying(false) : onClose())}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl flex-col overflow-hidden" style={{ height: "85%", maxHeight: "92%" }}>
          <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-gray-900">Detail Pekerjaan</Text>
            <TouchableOpacity onPress={() => (isApplying ? setIsApplying(false) : onClose())} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-4 flex-1" showsVerticalScrollIndicator={false}>
            {!isApplying ? (
              <View className="flex-col gap-4 pb-6">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center overflow-hidden border border-emerald-100">
                    {pelangganFace ? (
                      <Image source={{ uri: pelangganFace }} style={{ width: 48, height: 48 }} />
                    ) : (
                      <Text className="text-emerald-700 font-extrabold text-xl">{pelangganName.charAt(0) || "P"}</Text>
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-extrabold text-gray-900 text-base leading-snug">{job.judul || job.deskripsi || "Permintaan Layanan"}</Text>
                    <Text className="text-xs text-gray-500 font-bold mt-0.5">{pelangganName}</Text>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Kategori</Text>
                    <Text className="font-bold text-gray-800 text-xs mt-0.5" numberOfLines={1}>{kategori}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Budget</Text>
                    <Text className="font-black text-emerald-600 text-xs mt-0.5" numberOfLines={1}>{budgetText}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Lokasi</Text>
                    <Text className="font-bold text-gray-800 text-xs mt-0.5">{lokasiText}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Batas Waktu</Text>
                    <Text className="font-bold text-gray-800 text-xs mt-0.5">{countdown && !countdown.expired ? countdown.text : timeAgo(job.created_at)}</Text>
                  </View>
                </View>

                <View className="flex-col gap-1.5">
                  <Text className="text-xs font-extrabold text-gray-900">Deskripsi Pekerjaan</Text>
                  <View className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100/60">
                    <Text className="text-xs text-gray-700 leading-relaxed">{parsed.textDesc || "-"}</Text>
                  </View>
                </View>

                {!job.is_online && (
                  <View className="flex-col gap-1.5">
                    <Text className="text-xs font-extrabold text-gray-900">Alamat Pekerjaan</Text>
                    <View className="flex-row items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <MapPin size={16} color="#dc2626" />
                      <Text className="text-xs text-gray-700 flex-1">{alamatText}</Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-col gap-3 pb-6">
                <Text className="text-sm font-black text-gray-900">Lamar Pekerjaan Ini</Text>
                <View className="flex-col gap-1">
                  <Text className="text-xs font-bold text-gray-700">Harga Penawaran Anda</Text>
                  <TextInput value={applyHarga} onChangeText={setApplyHarga} placeholder="Misal: Rp 150.000" placeholderTextColor="#9ca3af" className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-900" />
                  <Text className="text-[10px] text-gray-400 font-medium">Budget klien: {budgetText}</Text>
                </View>
                <View className="flex-col gap-1">
                  <Text className="text-xs font-bold text-gray-700">Pesan ke Klien</Text>
                  <TextInput value={applyPesan} onChangeText={setApplyPesan} placeholder="Jelaskan keahlian Anda untuk order ini..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} textAlignVertical="top" className="w-full h-24 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900" />
                </View>
              </View>
            )}
          </ScrollView>

          <View
            className="p-4 border-t border-gray-100 bg-white"
            style={{ paddingBottom: Math.max(16, insets.bottom + 12) }}
          >
            {isApplied ? (
              <View className="flex-col gap-2">
                <View className="w-full py-3 bg-gray-100 rounded-full flex-row items-center justify-center gap-1.5">
                  <CheckCircle size={16} color="#059669" />
                  <Text className="text-xs font-bold text-gray-600">Sudah Melamar</Text>
                </View>
                <TouchableOpacity onPress={() => setCancelConfirm(true)} className="w-full py-2.5 bg-white border border-red-200 rounded-full items-center justify-center">
                  <Text className="text-xs font-bold text-red-600">Batalkan Lamaran</Text>
                </TouchableOpacity>
              </View>
            ) : !isApplying ? (
              <TouchableOpacity onPress={openApplyForm} className="w-full py-3.5 bg-emerald-600 rounded-full items-center justify-center shadow-md">
                <Text className="text-xs font-black text-white">Ajukan Diri / Lamar Pekerjaan</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleApply} disabled={submitting} className="w-full py-3.5 bg-emerald-600 rounded-full items-center justify-center shadow-md opacity-100">
                <Text className="text-xs font-black text-white">{submitting ? "Mengirim..." : "Kirim Lamaran Sekarang"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {cancelConfirm && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, zIndex: 9999, elevation: 9999 }}>
              <View style={{ backgroundColor: "#FFFFFF", width: "100%", maxWidth: 320, borderRadius: 28, padding: 24, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 25 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={28} color="#dc2626" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" }}>Batalkan Lamaran?</Text>
                <Text style={{ fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 18 }}>Apakah Anda yakin ingin membatalkan lamaran pekerjaan ini?</Text>
                <View style={{ width: "100%", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity onPress={handleCancel} activeOpacity={0.9} style={{ width: "100%", paddingVertical: 12, backgroundColor: "#dc2626", borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF" }}>Ya, Batalkan Lamaran</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCancelConfirm(false)} activeOpacity={0.8} style={{ width: "100%", paddingVertical: 12, backgroundColor: "#F3F4F6", borderRadius: 999, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>Tidak, Kembali</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
