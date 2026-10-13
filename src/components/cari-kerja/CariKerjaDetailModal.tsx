import React from "react";
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
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

export default function CariKerjaDetailModal({ logic }: { logic: CariKerjaLogic }) {
  const {
    selectedJob,
    setSelectedJob,
    isApplying,
    setIsApplying,
    applyHarga,
    setApplyHarga,
    applyPesan,
    setApplyPesan,
    appliedJobs,
    cancelConfirm,
    setCancelConfirm,
    handleCancelApplication,
    handleApplyJob,
    openApplyForm,
    parseDeskripsi,
    getCountdown,
    timeAgo,
    setFullScreenImage,
  } = logic;

  const insets = useSafeAreaInsets();
  if (!selectedJob) return null;

  const parsedDeskripsi = parseDeskripsi(selectedJob.deskripsi);
  const countdown = getCountdown(selectedJob.deskripsi);

  return (
    <Modal
      visible={Boolean(selectedJob)}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (isApplying) setIsApplying(false);
        else setSelectedJob(null);
      }}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl flex-col overflow-hidden" style={{ height: "85%", maxHeight: "92%" }}>
          {/* Header */}
          <View className="p-4 border-b border-gray-100 flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-gray-900">Detail Pekerjaan</Text>
            <TouchableOpacity
              onPress={() => {
                if (isApplying) setIsApplying(false);
                else setSelectedJob(null);
              }}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView className="p-4 flex-1" showsVerticalScrollIndicator={false}>
            {!isApplying ? (
              <View className="flex-col gap-4 pb-6">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center overflow-hidden border border-emerald-100">
                    {selectedJob.pelanggan_face_url ? (
                      <Image
                        source={{ uri: selectedJob.pelanggan_face_url }}
                        style={{ width: 48, height: 48 }}
                      />
                    ) : (
                      <Text className="text-emerald-700 font-extrabold text-xl">
                        {selectedJob.pelanggan_name?.charAt(0) || "P"}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-extrabold text-gray-900 text-base leading-snug">
                      {selectedJob.judul}
                    </Text>
                    <Text className="text-xs text-gray-500 font-bold mt-0.5">
                      {selectedJob.pelanggan_name}
                    </Text>
                  </View>
                </View>

                {/* 4 Info Boxes */}
                <View className="flex-row flex-wrap gap-2">
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Kategori</Text>
                    <Text className="font-bold text-gray-800 text-xs mt-0.5" numberOfLines={1}>
                      {selectedJob.kategori}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Budget</Text>
                    <Text className="font-black text-emerald-600 text-xs mt-0.5" numberOfLines={1}>
                      {selectedJob.budget}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Lokasi</Text>
                    <Text className="font-bold text-gray-800 text-xs mt-0.5">
                      {selectedJob.is_online ? "🌐 Online" : `${selectedJob.distance_km.toFixed(1)} km`}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase">Batas Waktu</Text>
                    <Text className="font-bold text-gray-800 text-xs mt-0.5">
                      {countdown && !countdown.expired ? countdown.text : timeAgo(selectedJob.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Deskripsi */}
                <View className="flex-col gap-1.5">
                  <Text className="text-xs font-extrabold text-gray-900">Deskripsi Pekerjaan</Text>
                  <View className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100/60">
                    <Text className="text-xs text-gray-700 leading-relaxed">
                      {parsedDeskripsi.textDesc}
                    </Text>
                  </View>
                </View>

                {!selectedJob.is_online && (
                  <View className="flex-col gap-1.5">
                    <Text className="text-xs font-extrabold text-gray-900">Alamat Pekerjaan</Text>
                    <View className="flex-row items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <MapPin size={16} color="#dc2626" />
                      <Text className="text-xs text-gray-700 flex-1">{selectedJob.lokasi}</Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-col gap-3 pb-6">
                <Text className="text-sm font-black text-gray-900">Lamar Pekerjaan Ini</Text>

                <View className="flex-col gap-1">
                  <Text className="text-xs font-bold text-gray-700">Harga Penawaran Anda</Text>
                  <TextInput
                    value={applyHarga}
                    onChangeText={setApplyHarga}
                    placeholder="Misal: Rp 150.000"
                    placeholderTextColor="#9ca3af"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-900"
                  />
                  <Text className="text-[10px] text-gray-400 font-medium">Budget klien: {selectedJob.budget}</Text>
                </View>

                <View className="flex-col gap-1">
                  <Text className="text-xs font-bold text-gray-700">Pesan ke Klien</Text>
                  <TextInput
                    value={applyPesan}
                    onChangeText={setApplyPesan}
                    placeholder="Jelaskan keahlian Anda untuk order ini..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="w-full h-24 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View
            className="p-4 border-t border-gray-100 bg-white"
            style={{ paddingBottom: Math.max(16, insets.bottom + 12) }}
          >
            {appliedJobs[selectedJob.id] ? (
              <View className="flex-col gap-2">
                <View className="w-full py-3 bg-gray-100 rounded-full flex-row items-center justify-center gap-1.5">
                  <CheckCircle size={16} color="#059669" />
                  <Text className="text-xs font-bold text-gray-600">Sudah Melamar</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCancelConfirm({ show: true, jobId: selectedJob.id })}
                  className="w-full py-2.5 bg-white border border-red-200 rounded-full items-center justify-center"
                >
                  <Text className="text-xs font-bold text-red-600">Batalkan Lamaran</Text>
                </TouchableOpacity>
              </View>
            ) : !isApplying ? (
              <TouchableOpacity
                onPress={() => openApplyForm(selectedJob)}
                className="w-full py-3.5 bg-emerald-600 rounded-full items-center justify-center shadow-md"
              >
                <Text className="text-xs font-black text-white">Ajukan Diri / Lamar Pekerjaan</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleApplyJob(selectedJob.id)}
                className="w-full py-3.5 bg-emerald-600 rounded-full items-center justify-center shadow-md"
              >
                <Text className="text-xs font-black text-white">Kirim Lamaran Sekarang</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Overlay Konfirmasi Batalkan Lamaran (Pasti di layer paling atas modal) */}
          {cancelConfirm?.show && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.55)",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 20,
                zIndex: 9999,
                elevation: 9999,
              }}
            >
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  width: "100%",
                  maxWidth: 320,
                  borderRadius: 28,
                  padding: 24,
                  alignItems: "center",
                  gap: 12,
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 25,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#FEE2E2",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={28} color="#dc2626" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" }}>
                  Batalkan Lamaran?
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 18 }}>
                  Apakah Anda yakin ingin membatalkan lamaran pekerjaan ini?
                </Text>
                <View style={{ width: "100%", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      if (cancelConfirm.jobId) await handleCancelApplication(cancelConfirm.jobId);
                      setCancelConfirm({ show: false, jobId: null });
                    }}
                    activeOpacity={0.9}
                    style={{
                      width: "100%",
                      paddingVertical: 12,
                      backgroundColor: "#dc2626",
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF" }}>
                      Ya, Batalkan Lamaran
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCancelConfirm({ show: false, jobId: null })}
                    activeOpacity={0.8}
                    style={{
                      width: "100%",
                      paddingVertical: 12,
                      backgroundColor: "#F3F4F6",
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>
                      Tidak, Kembali
                    </Text>
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
