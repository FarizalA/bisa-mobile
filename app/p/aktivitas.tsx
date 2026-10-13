import React, { useState, useCallback, useEffect } from "react";
import { View, ScrollView, RefreshControl, Alert, Modal, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { CheckCircle2, X, FileText } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import ProviderAktivitasHeader from "../../src/components/provider-aktivitas/ProviderAktivitasHeader";
import ProviderAktivitasTabs, { ProviderAktivitasTabKey } from "../../src/components/provider-aktivitas/ProviderAktivitasTabs";
import ProviderAktivitasJobList, { ProviderJob } from "../../src/components/provider-aktivitas/ProviderAktivitasJobList";
import { useAktivitasProviderLogic } from "../../src/hooks/useAktivitasProviderLogic";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";

export default function AktivitasProviderPage() {
  const router = useRouter();
  const logic = useAktivitasProviderLogic();
  const { filteredJobs, jobs, loading, error, activeTab, setActiveTab, tabCounts, handleOpenChat, handleOpenDetail, fetchMyJobs } = logic;

  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ show: boolean; job: ProviderJob | null }>({ show: false, job: null });
  const [rejectReason, setRejectReason] = useState("");
  const [alertInfo, setAlertInfo] = useState<{ show: boolean; title: string; message: string; variant: "success" | "error" | "info" }>({ show: false, title: "", message: "", variant: "success" });
  const showNiceAlert = (title: string, message: string, variant: "success" | "error" | "info" = "success") => {
    if (Platform.OS === "web") setAlertInfo({ show: true, title, message, variant });
    else Alert.alert(title, message);
  };
  useEffect(() => {
    if (!alertInfo.show || alertInfo.variant !== "success") return;
    const t = setTimeout(() => setAlertInfo((p) => ({ ...p, show: false })), 2800);
    return () => clearTimeout(t);
  }, [alertInfo.show, alertInfo.variant]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const s: any = await getStoredUser();
      if (s?.id) await fetchMyJobs(s.id);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMyJobs]);

  const handleOpenJobAction = (job: ProviderJob) => {
    if ((job as any).is_lamaran) {
      router.push(`/p/cari-kerja?jobId=${job.id}` as any);
      return;
    }
    handleOpenDetail(job);
  };

  const handleAccept = async (job: ProviderJob) => {
    setActingId(job.id);
    try {
      const s: any = await getStoredUser();
      const mitraId = Number((job as any).mitra_id || s?.id);
      if (!mitraId) throw new Error("Mitra tidak dikenali");
      const nextStatus = (job as any).payment_status === "belum_bayar" ? "menunggu_pembayaran" : "sedang_dikerjakan";
      const { error: updErr } = await supabase.from("pekerjaan_bisa").update({ status: nextStatus }).eq("id", job.id);
      if (updErr) throw updErr;
      // Inject system msg to chat jika ada
      try {
        const { ensureConversationAndNavigate } = await import("../../src/lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String((job as any).pelanggan_id), job.id, true);
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: String(mitraId),
            message_type: "system",
            content: `✅ Mitra telah menerima pesanan: "${job.judul || 'Pesanan Jasa'}". Pengerjaan dapat segera dimulai.`,
          } as any);
          await supabase.from("conversations").update({
            last_message: "✅ Pesanan Diterima oleh Mitra",
            last_message_at: new Date().toISOString(),
          } as any).eq("id", convId);
        }
      } catch {}
      const msg = "Pengerjaan dapat segera dimulai.";
      showNiceAlert("Pesanan Diterima", msg, "success");
      if (s?.id) await fetchMyJobs(s.id);
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async () => {
    const job = rejectModal.job;
    if (!job) return;
    setActingId(job.id);
    try {
      const s: any = await getStoredUser();
      const mitraId = Number((job as any).mitra_id || s?.id);
      if (!mitraId) throw new Error("Mitra tidak dikenali");
      const { error: updErr } = await supabase.from("pekerjaan_bisa").update({ status: "dibatalkan", payment_status: "cancelled" }).eq("id", job.id);
      if (updErr) throw updErr;
      // Inject reject msg to chat
      try {
        const { ensureConversationAndNavigate } = await import("../../src/lib/chatInbox");
        const convId = await ensureConversationAndNavigate(String((job as any).pelanggan_id), job.id, true);
        if (convId) {
          const rejectMsg = `❌ Mitra menolak pesanan ini.${rejectReason.trim() ? ` Alasan: ${rejectReason.trim()}` : ''}`;
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: String(mitraId),
            message_type: "system",
            content: rejectMsg,
          } as any);
          await supabase.from("conversations").update({
            last_message: rejectMsg,
            last_message_at: new Date().toISOString(),
          } as any).eq("id", convId);
        }
      } catch {}
      setRejectModal({ show: false, job: null });
      setRejectReason("");
      const msg = "Pesanan telah dibatalkan.";
      showNiceAlert("Pesanan Ditolak", msg, "info");
      if (s?.id) await fetchMyJobs(s.id);
    } catch (e: any) {
      showNiceAlert("Gagal", e.message || "Terjadi kesalahan", "error");
    } finally {
      setActingId(null);
    }
  };

  const handleStartWork = async (job: ProviderJob) => {
    // mitra_ditemukan -> sedang_dikerjakan (if already escrow, otherwise keep flow)
    try {
      setActingId(job.id);
      const { error } = await supabase.from("pekerjaan_bisa").update({ status: "sedang_dikerjakan" }).eq("id", job.id);
      if (error) throw error;
      const s: any = await getStoredUser();
      if (s?.id) await fetchMyJobs(s.id);
      router.push(`/p/aktivitas/${job.id}` as any);
    } catch (e: any) {
      Alert.alert("Gagal", e.message || "Gagal memulai pengerjaan");
    } finally {
      setActingId(null);
    }
  };

  const handleDeliver = (job: ProviderJob) => {
    router.push(`/p/aktivitas/${job.id}` as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      <ProviderAktivitasHeader />
      <View className="flex-1 flex-col">
        <ProviderAktivitasTabs activeTab={activeTab as ProviderAktivitasTabKey} setActiveTab={setActiveTab as any} tabCounts={tabCounts as any} />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#059669"]} />}
        >
          <View className="px-4 pt-3 max-w-[440px] w-full self-center">
            <ProviderAktivitasJobList
              jobs={jobs as any}
              filteredJobs={filteredJobs as any}
              loading={loading}
              error={error}
              activeTab={activeTab}
              onOpenChat={handleOpenChat as any}
              onOpenDetail={handleOpenJobAction as any}
              onAccept={handleAccept as any}
              onReject={(j: any) => setRejectModal({ show: true, job: j })}
              onStartWork={handleStartWork as any}
              onDeliver={handleDeliver as any}
              actingId={actingId}
            />
          </View>
        </ScrollView>
      </View>

      {/* Reject Reason Modal */}
      <Modal visible={rejectModal.show} transparent animationType="fade" onRequestClose={() => setRejectModal({ show: false, job: null })}>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-[24px] w-full max-w-sm p-5 shadow-2xl gap-3">
            <Text className="text-sm font-black text-gray-900">Tolak Pesanan?</Text>
            <Text className="text-xs text-gray-500">Berikan alasan singkat (opsional) — klien akan mendapat notifikasi.</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Alasan..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="w-full min-h-[84px] p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900"
            />
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity onPress={() => setRejectModal({ show: false, job: null })} className="flex-1 py-3 rounded-full border border-gray-200 bg-white items-center">
                <Text className="text-xs font-bold text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={actingId === rejectModal.job?.id}
                className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center"
              >
                {actingId === rejectModal.job?.id ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-xs font-black text-white">Konfirmasi Tolak</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nice Alert — premium mobile, anim slide, auto-close 2.8s untuk sukses, shadow tebal (ganti window.alert localhost:8081 says) */}
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
                <Text style={{ fontSize: 11, color: "#065f46", fontWeight: "700", textAlign: "center" }}>✓ Tersimpan & otomatis masuk chat</Text>
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
    </SafeAreaView>
  );
}
