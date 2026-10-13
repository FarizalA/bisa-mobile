import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Clock, Star, CheckCircle2, XCircle, X, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../../../src/lib/supabase";
import { getStoredUser } from "../../../../src/lib/user-storage";
import { safeBack } from "@/lib/navigation";

export default function KandidatMobilePage() {
  const router = useRouter();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [kandidatList, setKandidatList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [actingId, setActingId] = useState<number | null>(null);
  const [chattingId, setChattingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<null | { title: string; message: string; confirmText: string; cancelText: string; onConfirm: () => void; danger?: boolean }>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = useCallback((deskripsi: string) => {
    const m = deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
    if (!m) return null;
    const expiresAt = parseInt(m[1], 10);
    const diff = expiresAt - currentTime;
    if (diff <= 0) return { expired: true, text: "Kadaluarsa", displayText: "Kadaluarsa" };
    const h = Math.floor(diff / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const d = Math.floor(h / 24);
    const hRemaining = h % 24;
    const pad = (n: number) => String(n).padStart(2, "0");
    let displayText: string;
    if (d > 0) displayText = `${d}d ${hRemaining}h`;
    else if (h > 0) displayText = `${h}h ${min}m`;
    else displayText = `${pad(min)}:${pad(s)}`;
    return { expired: false, text: h > 0 ? `${pad(h)}:${pad(min)}:${pad(s)}` : `${pad(min)}:${pad(s)}`, displayText, hours: h };
  }, [currentTime]);

  const fetchData = useCallback(async () => {
    if (!jobId) return;
    try {
      const { data: jobData, error: jobErr } = await supabase.from("pekerjaan_bisa").select("*").eq("id", jobId).single();
      if (jobErr) throw jobErr;
      setJob(jobData);
      const { data: kand, error: kandErr } = await supabase
        .from("pelamar_pekerjaan")
        .select("id, harga_tawaran, pesan, status, created_at, mitra:mitra_id(id, name, phone, face_url, rating, total_orders)")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });
      if (kandErr) console.warn(kandErr.message);
      else setKandidatList(kand || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (!stored?.id) { router.replace("/(auth)/login" as any); return; }
      setUser(stored);
      fetchData();
    })();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [fetchData, router]);

  const handlePilihKandidat = (kandidat: any) => {
    const mitraId = kandidat.mitra?.id ?? kandidat.mitra_id;
    const hargaTawaran = kandidat.harga_tawaran || kandidat.harga || "";
    setConfirmModal({
      title: "Konfirmasi",
      message: `Pilih ${kandidat.mitra?.name || "Mitra ini"} untuk pekerjaan ini?`,
      confirmText: "Pilih Mitra Ini",
      cancelText: "Batal",
      onConfirm: async () => {
        setConfirmModal(null);
        setActingId(kandidat.id);
        try {
          const numHarga = parseInt(String(hargaTawaran).replace(/[^0-9]/g, ""), 10) || 0;
          const { error: candErr } = await supabase.from("pelamar_pekerjaan").update({ status: "diterima" }).eq("id", kandidat.id);
          if (candErr) throw candErr;
          const { error: jobErr } = await supabase.from("pekerjaan_bisa").update({ status: "menunggu_pembayaran", mitra_id: mitraId, agreed_price: numHarga > 0 ? numHarga : null, harga_deal: numHarga > 0 ? numHarga : null }).eq("id", jobId);
          if (jobErr) throw jobErr;
          try {
            await supabase.from("conversations").update({ job_id: jobId }).eq("client_id", user.id).eq("mitra_id", mitraId);
          } catch {}
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setConfirmModal({
            title: "Berhasil",
            message: "Kandidat diterima! Silakan bayar escrow di halaman Aktivitas.",
            confirmText: "Ke Aktivitas",
            cancelText: "",
            onConfirm: () => {
              setConfirmModal(null);
              router.replace("/c/aktivitas" as any);
            },
          });
        } catch (err: any) {
          Alert.alert("Gagal", err.message || String(err));
        } finally {
          setActingId(null);
        }
      },
    });
  };

  // Chat ke kandidat (Fase 5) — buat/ambil conversation lalu buka direct-chat
  const handleChatKandidat = async (kandidat: any) => {
    const mitraId = kandidat.mitra?.id ?? kandidat.mitra_id;
    if (!mitraId || !user?.id) return;
    setChattingId(kandidat.id);
    try {
      const { data: ex } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", user.id)
        .eq("mitra_id", mitraId)
        .eq("type", "direct")
        .maybeSingle();
      let cid: string | null = ex?.id || null;
      if (!cid) {
        const { data: nc, error: ncErr } = await supabase
          .from("conversations")
          .insert({ client_id: user.id, mitra_id: mitraId, job_id: Number(jobId), type: "direct", is_active: true })
          .select("id")
          .single();
        if (ncErr) throw ncErr;
        cid = nc?.id || null;
      }
      if (!cid) throw new Error("Gagal membuka chat");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/c/direct-chat/${cid}` as any);
    } catch (e: any) {
      Alert.alert("Gagal", e.message || String(e));
    } finally {
      setChattingId(null);
    }
  };

  const handleTolakKandidat = (kandidat: any) => {
    setConfirmModal({
      title: "Konfirmasi Tolak",
      message: `Yakin ingin menolak tawaran dari ${kandidat.mitra?.name || "Mitra ini"}?`,
      confirmText: "Tolak",
      cancelText: "Batal",
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setActingId(kandidat.id);
        try {
          const { error } = await supabase.from("pelamar_pekerjaan").update({ status: "ditolak" }).eq("id", kandidat.id);
          if (error) throw error;
          setKandidatList((prev) => prev.map((k) => (k.id === kandidat.id ? { ...k, status: "ditolak" } : k)));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (err: any) {
          Alert.alert("Gagal", err.message);
        } finally {
          setActingId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA] items-center justify-center">
        <ActivityIndicator color="#FF6B00" />
      </SafeAreaView>
    );
  }

  const cd = getCountdown(job?.deskripsi || "");

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      <View className="h-16 px-4 flex-row items-center gap-3 bg-white/90 border-b border-gray-100">
        <TouchableOpacity onPress={() => safeBack(router, "/c/aktivitas")} className="w-10 h-10 rounded-full items-center justify-center">
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1 min-w-0">
          <Text className="text-[16px] font-extrabold text-gray-900">Daftar Kandidat</Text>
          <Text className="text-[10px] font-bold text-gray-500 uppercase" numberOfLines={1}>{job?.judul || ""}</Text>
        </View>
        <View className="flex-row items-center gap-2 shrink-0">
          {cd && !cd.expired && (
            <View className="bg-red-50 border border-red-200 px-2 py-1 rounded-full flex-row items-center gap-1">
              <Clock size={11} color="#dc2626" />
              <Text className="text-[11px] font-extrabold text-red-600">{cd.displayText}</Text>
            </View>
          )}
          <View className="bg-orange-100 px-2.5 py-1.5 rounded-full">
            <Text className="text-[11px] font-extrabold text-orange-700">{kandidatList.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center px-4 pt-4 gap-3">
          {kandidatList.length === 0 ? (
            <View className="bg-white rounded-[32px] border border-gray-100 p-8 items-center">
              <Image source={require("../../../../assets/mascot.png")} style={{ width: 160, height: 160 }} resizeMode="contain" />
              <Text className="text-base font-extrabold text-gray-900 mt-3">Belum ada pelamar nih...</Text>
              <Text className="text-sm text-gray-500 font-medium text-center mt-1">Sistem BISA sedang menyiarkan pekerjaanmu ke mitra terdekat. Harap tunggu beberapa saat ya!</Text>
              <TouchableOpacity onPress={() => router.push("/c/aktivitas" as any)} className="mt-4 px-4 py-2 rounded-full bg-orange-50 border border-orange-200">
                <Text className="text-xs font-bold text-orange-600">Kembali ke Aktivitas</Text>
              </TouchableOpacity>
            </View>
          ) : kandidatList.map(kandidat => {
            const isDitols = kandidat.status === "ditolak";
            const isDiterima = kandidat.status === "diterima";
            const isMenunggu = !kandidat.status || kandidat.status === "menunggu";
            return (
              <View key={kandidat.id} className="bg-white rounded-[28px] border border-gray-100 p-4 gap-3">
                <TouchableOpacity onPress={() => router.push(`/p/profil/${kandidat.mitra?.id || kandidat.mitra_id}` as any)} activeOpacity={0.85} className="flex-row gap-3">
                  <Image source={kandidat.mitra?.face_url ? { uri: kandidat.mitra.face_url } : require("../../../../assets/mascot.png")} style={{ width: 56, height: 56, borderRadius: 16 }} className="border-2 border-orange-200 bg-orange-50" />
                  <View className="flex-1 min-w-0">
                    <View className="flex-row justify-between items-start gap-2">
                      <Text className="font-extrabold text-gray-900 flex-1" numberOfLines={1}>{kandidat.mitra?.name || `Mitra #${kandidat.mitra_id}`}</Text>
                      <View className={`${isDiterima ? "bg-emerald-100" : isDitols ? "bg-gray-100" : "bg-orange-100"} px-2 py-0.5 rounded-full`}>
                        <Text className={`text-[9px] font-extrabold uppercase ${isDiterima ? "text-emerald-700" : isDitols ? "text-gray-500" : "text-orange-700"}`}>{isDiterima ? "DITERIMA" : isDitols ? "DITOLAK" : "MENUNGGU"}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 mt-1 flex-wrap">
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <Text className="text-xs font-bold text-gray-600">{kandidat.mitra?.rating ? Number(kandidat.mitra.rating).toFixed(1) : "Baru"}</Text>
                      <Text className="text-[10px] text-gray-400">({kandidat.mitra?.total_orders ?? 0} ulasan)</Text>
                      {!!kandidat.harga_tawaran && <Text className="ml-2 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold">{String(kandidat.harga_tawaran)}</Text>}
                    </View>
                    {!!kandidat.pesan && <Text className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 italic">"{kandidat.pesan}"</Text>}
                  </View>
                </TouchableOpacity>
                {isMenunggu ? (
                  <View className="gap-2.5">
                    <TouchableOpacity
                      disabled={chattingId === kandidat.id}
                      onPress={() => handleChatKandidat(kandidat)}
                      activeOpacity={0.85}
                      className="w-full py-2.5 rounded-full bg-orange-50 border border-orange-200 items-center justify-center flex-row gap-1.5"
                    >
                      {chattingId === kandidat.id ? <ActivityIndicator size="small" color="#FF6B00" /> : <><MessageCircle size={15} color="#FF6B00" /><Text className="text-xs font-bold text-[#FF6B00]">Tanya / Chat Kandidat</Text></>}
                    </TouchableOpacity>
                    <View className="flex-row gap-2.5">
                      <TouchableOpacity disabled={actingId === kandidat.id} onPress={() => handleTolakKandidat(kandidat)} activeOpacity={0.85} className="flex-1 py-3 rounded-full bg-gray-100 items-center justify-center flex-row gap-1.5">
                        {actingId === kandidat.id ? <ActivityIndicator size="small" color="#6b7280" /> : <><X size={16} color="#374151" /><Text className="text-sm font-bold text-gray-700">Tolak</Text></>}
                      </TouchableOpacity>
                      <TouchableOpacity disabled={actingId === kandidat.id} onPress={() => handlePilihKandidat(kandidat)} activeOpacity={0.85} className="flex-[2] py-3 rounded-full bg-[#FF6B00] items-center justify-center flex-row gap-1.5">
                        {actingId === kandidat.id ? <ActivityIndicator color="#fff" /> : <><CheckCircle2 size={16} color="#fff" /><Text className="text-sm font-bold text-white">Pilih Mitra Ini</Text></>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className={`py-2.5 rounded-full items-center border ${isDiterima ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                    <Text className={`text-xs font-extrabold ${isDiterima ? "text-emerald-700" : "text-gray-500"}`}>{isDiterima ? "✓ Sudah diterima — cek Aktivitas untuk bayar" : "✕ Sudah ditolak"}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal Custom Confirm */}
      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <Pressable onPress={() => setConfirmModal(null)} className="flex-1 bg-[#131b2e]/60 justify-end">
          <Pressable onPress={(e) => (e as any).stopPropagation?.()} className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-4" />
            {!!confirmModal?.title && <Text className="text-base font-extrabold text-gray-900 mb-1">{confirmModal.title}</Text>}
            <Text className="text-sm text-gray-600 leading-5 mb-5">{confirmModal?.message}</Text>
            <View className={`flex-row gap-3 ${!confirmModal?.cancelText ? "justify-center" : ""}`}>
              {!!confirmModal?.cancelText && (
                <TouchableOpacity onPress={() => setConfirmModal(null)} activeOpacity={0.85} className="flex-1 py-3.5 rounded-full bg-gray-100 items-center border border-gray-200">
                  <Text className="text-sm font-bold text-gray-700">{confirmModal.cancelText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => confirmModal?.onConfirm()} activeOpacity={0.85} className={`flex-1 py-3.5 rounded-full items-center ${confirmModal?.danger ? "bg-red-600" : "bg-[#FF6B00]"} ${!confirmModal?.cancelText ? "max-w-[200px] self-center flex-none w-[200px]" : ""}`}>
                <Text className="text-sm font-bold text-white">{confirmModal?.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
