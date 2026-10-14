// src/components/provider-order/OrderModals.tsx
// Kumpulan modal untuk halaman detail pesanan Mitra.
// Dipisah dari route file supaya route tetap tipis & modal bisa dipakai ulang.
import React from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { FileText, X, Camera, CheckCircle2, Clock, Handshake } from "lucide-react-native";

export type ConfirmConfig = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export type OrderModalProps = {
  show?: boolean;
  onClose?: () => void;
  // Kirim Hasil Kerja
  imageUri?: string | null;
  onPickImage?: () => void;
  onRemoveImage?: () => void;
  link?: string;
  onChangeLink?: (v: string) => void;
  note?: string;
  onChangeNote?: (v: string) => void;
  sending?: boolean;
  onSendDelivery?: () => void;
  // Reject
  rejectReason?: string;
  onChangeRejectReason?: (v: string) => void;
  acting?: boolean;
  onReject?: () => void;
  // Mutual Cancel
  isCOD?: boolean;
  mutualReason?: string;
  onChangeMutualReason?: (v: string) => void;
  mutualActing?: boolean;
  onMutualCancel?: () => void;
  // Reject Cancel (client request)
  rejectCancelReason?: string;
  onChangeRejectCancelReason?: (v: string) => void;
  cancelResponding?: boolean;
  onRejectCancel?: () => void;
  onOpenHelp?: () => void;
  // Dispute
  disputeReason?: string;
  onChangeDisputeReason?: (v: string) => void;
  disputeActing?: boolean;
  onSubmitDispute?: () => void;
  // Nice Alert
  alert?: { show: boolean; title: string; message: string; variant: "success" | "error" | "info" };
  onCloseAlert?: () => void;
};

/* AlertState shape kept local agar OrderModals tidak perlu import dari hook */

/* ------------------------------------------------------------------ */
/* Modal Kirim Hasil Kerja                                            */
/* ------------------------------------------------------------------ */
export function DeliveryModal({
  show,
  onClose,
  imageUri,
  onPickImage,
  onRemoveImage,
  link = "",
  onChangeLink,
  note = "",
  onChangeNote,
  sending,
  onSendDelivery,
}: OrderModalProps) {
  return (
    <Modal visible={show} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-5 gap-3.5 max-h-[85%]">
          <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center">
                <FileText size={18} color="#059669" />
              </View>
              <View>
                <Text className="font-black text-gray-900 text-sm">Kirim Hasil Kerja</Text>
                <Text className="text-[10px] text-gray-500">Foto bukti atau link pengerjaan</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {imageUri ? (
            <View className="w-full rounded-xl overflow-hidden border-2 border-emerald-300 bg-emerald-50">
              <Image source={{ uri: imageUri }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
              <View className="flex-row gap-2 p-2">
                <TouchableOpacity onPress={onPickImage} className="flex-1 py-2 rounded-full bg-white border border-emerald-200 items-center">
                  <Text className="text-xs font-bold text-emerald-700">Ganti Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onRemoveImage} className="px-4 py-2 rounded-full bg-red-50 border border-red-200 items-center">
                  <Text className="text-xs font-bold text-red-600">Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onPickImage}
              className="w-full py-8 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center gap-1.5"
            >
              <Camera size={22} color="#9ca3af" />
              <Text className="text-xs font-bold text-gray-600">Tap untuk pilih Foto Bukti</Text>
              <Text className="text-[10px] text-gray-400">JPG/PNG max 5MB</Text>
            </TouchableOpacity>
          )}

          <View className="flex-col gap-1">
            <Text className="text-[11px] font-bold text-gray-700">Link Dokumen (Opsional)</Text>
            <TextInput
              value={link}
              onChangeText={onChangeLink}
              placeholder="https://drive.google.com/..."
              placeholderTextColor="#9ca3af"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900"
            />
          </View>

          <View className="flex-col gap-1">
            <Text className="text-[11px] font-bold text-gray-700">Pesan untuk Klien (Opsional)</Text>
            <TextInput
              value={note}
              onChangeText={onChangeNote}
              placeholder="Pekerjaan sudah diselesaikan sesuai instruksi..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 min-h-[60px]"
            />
          </View>

          <TouchableOpacity
            onPress={onSendDelivery}
            disabled={sending}
            className="w-full py-3.5 rounded-full bg-emerald-600 items-center justify-center shadow-md"
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-xs font-black text-white">Kirim Hasil Kerja</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Modal Tolak Pesanan                                                 */
/* ------------------------------------------------------------------ */
export function RejectModal({
  show,
  onClose,
  rejectReason = "",
  onChangeRejectReason,
  acting,
  onReject,
}: OrderModalProps) {
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3">
          <Text className="text-sm font-black text-gray-900">Tolak Pesanan Ini?</Text>
          <TextInput
            value={rejectReason}
            onChangeText={onChangeRejectReason}
            placeholder="Alasan penolakan..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs min-h-[80px]"
          />
          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-full border border-gray-200 items-center">
              <Text className="text-xs font-bold text-gray-700">Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onReject} disabled={acting} className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center">
              {acting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-black text-white">Konfirmasi Tolak</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Nice Alert — premium, auto-close 3s untuk sukses                   */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Confirm Modal — pengganti Alert.alert button (no-op di web)         */
/* ------------------------------------------------------------------ */
export function ConfirmModal({
  show,
  onClose,
  config,
}: {
  show: boolean;
  onClose: () => void;
  config: ConfirmConfig | null;
}) {
  if (!config) return null;
  const { title, message, confirmText = "Ya, Lanjutkan", cancelText = "Batal", destructive, onConfirm } = config;

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3.5">
          <View className="flex-row items-center gap-2">
            <View className={`w-9 h-9 rounded-full items-center justify-center ${destructive ? "bg-red-100" : "bg-emerald-100"}`}>
              {destructive ? <X size={18} color="#dc2626" /> : <CheckCircle2 size={18} color="#059669" />}
            </View>
            <Text className="font-black text-gray-900 text-sm flex-1">{title}</Text>
          </View>

          <Text className="text-xs text-gray-600 leading-relaxed">{message}</Text>

          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-full border border-gray-200 items-center justify-center">
              <Text className="text-xs font-bold text-gray-700">{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={!onConfirm}
              className={`flex-1 py-3 rounded-full items-center justify-center shadow-md ${destructive ? "bg-red-600" : "bg-emerald-600"}`}
            >
              <Text className="text-xs font-black text-white">{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function NiceAlertModal({ alert, onCloseAlert }: OrderModalProps) {
  if (!alert) return null;
  const bg =
    alert.variant === "success" ? "#ECFDF5" : alert.variant === "error" ? "#FEF2F2" : "#EFF6FF";
  const border =
    alert.variant === "success" ? "#A7F3D0" : alert.variant === "error" ? "#FECACA" : "#BFDBFE";
  const iconColor =
    alert.variant === "success" ? "#059669" : alert.variant === "error" ? "#dc2626" : "#2563eb";

  return (
    <Modal visible={alert.show} transparent animationType="slide" onRequestClose={onCloseAlert}>
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
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            {alert.variant === "success" ? (
              <CheckCircle2 size={26} color={iconColor} />
            ) : alert.variant === "error" ? (
              <X size={26} color={iconColor} />
            ) : (
              <FileText size={26} color={iconColor} />
            )}
          </View>

          <View style={{ gap: 6, alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827", textAlign: "center" }}>{alert.title}</Text>
            <Text style={{ fontSize: 12, color: "#4b5563", textAlign: "center", lineHeight: 18 }}>{alert.message}</Text>
          </View>

          {alert.variant === "success" && (
            <View style={{ backgroundColor: "#F0FDF4", borderColor: "#A7F3D0", borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 11, color: "#065f46", fontWeight: "700", textAlign: "center" }}>
                ✓ Tersimpan & otomatis masuk chat Klien
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onCloseAlert}
            activeOpacity={0.9}
            style={{
              width: "100%",
              paddingVertical: 13,
              borderRadius: 999,
              backgroundColor: "#059669",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 4,
              shadowColor: "#059669",
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.2 }}>OK, Mengerti</Text>
          </TouchableOpacity>

          {alert.variant === "success" && (
            <Text style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 2 }}>Tertutup otomatis dalam 3 detik…</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Modal Batal Sepakat Bersama                                        */
/* ------------------------------------------------------------------ */
export function MutualCancelModal({
  show,
  onClose,
  isCOD,
  mutualReason = "",
  onChangeMutualReason,
  mutualActing,
  onMutualCancel,
}: OrderModalProps) {
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
              <Handshake size={16} color="#dc2626" />
            </View>
            <View>
              <Text className="font-black text-gray-900 text-sm">Batal Sepakat Bersama</Text>
              <Text className="text-[10px] text-gray-500">Refund instan ke Klien</Text>
            </View>
          </View>
          <Text className="text-xs text-gray-600 leading-relaxed">
            {isCOD ? "Pesanan COD akan dibatalkan secara langsung." : "Dana akan langsung dikembalikan ke Klien."}
          </Text>
          <TextInput
            value={mutualReason}
            onChangeText={onChangeMutualReason}
            placeholder="Alasan pembatalan..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs min-h-[60px]"
          />
          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-full border border-gray-200 items-center">
              <Text className="text-xs font-bold text-gray-700">Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onMutualCancel} disabled={mutualActing} className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center">
              {mutualActing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-black text-white">Batalkan Bersama</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Modal Tolak Pembatalan (progres > 80%)                              */
/* ------------------------------------------------------------------ */
export function RejectCancelModal({
  show,
  onClose,
  rejectCancelReason = "",
  onChangeRejectCancelReason,
  cancelResponding,
  onRejectCancel,
  onOpenHelp,
}: OrderModalProps) {
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3.5">
          <View className="flex-row items-center justify-between border-b border-gray-100 pb-2.5">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                <Clock size={16} color="#b45309" />
              </View>
              <View>
                <Text className="font-black text-gray-900 text-sm">Tolak Pembatalan</Text>
                <Text className="text-[10px] text-gray-500">Pekerjaan sudah berjalan / &gt; 80%</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
              <X size={15} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-gray-600 leading-relaxed">
            Jika pekerjaan telah dikerjakan atau hampir selesai (&gt; 80%), Anda berhak menolak pembatalan. Pesanan akan tetap berjalan. Anda juga dapat mengajukan komplain ke Pusat Bantuan jika terjadi perselisihan.
          </Text>

          <TextInput
            value={rejectCancelReason}
            onChangeText={onChangeRejectCancelReason}
            placeholder="Alasan penolakan (misal: pengerjaan sudah 85%)..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 min-h-[75px]"
          />

          <TouchableOpacity
            onPress={onOpenHelp}
            className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 items-center justify-center flex-row gap-1.5"
          >
            <Text className="text-xs font-bold text-amber-800">Butuh Bantuan? Buka Pusat Bantuan</Text>
          </TouchableOpacity>

          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-full border border-gray-200 items-center justify-center">
              <Text className="text-xs font-bold text-gray-700">Tutup</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRejectCancel} disabled={cancelResponding} className="flex-1 py-3 rounded-full bg-red-600 items-center justify-center shadow-md">
              {cancelResponding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-black text-white">Tolak Pengajuan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Modal Ajukan Sengketa (Fase 4)                                     */
/* ------------------------------------------------------------------ */
export function DisputeModal({
  show,
  onClose,
  disputeReason = "",
  onChangeDisputeReason,
  disputeActing,
  onSubmitDispute,
}: OrderModalProps) {
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white rounded-[24px] w-full max-w-sm p-5 gap-3.5">
          <View className="flex-row items-center justify-between border-b border-gray-100 pb-2.5">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                <FileText size={16} color="#b45309" />
              </View>
              <View>
                <Text className="font-black text-gray-900 text-sm">Ajukan Sengketa</Text>
                <Text className="text-[10px] text-gray-500">Ditinjau Admin BISA</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center">
              <X size={15} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-gray-600 leading-relaxed">
            Sengketa diajukan ke tim Admin. Dana pesanan akan <Text className="font-bold">ditahan</Text> sampai Admin memutuskan: released untuk Mitra atau refund untuk Pelanggan. Pastikan chat & bukti sudah lengkap.
          </Text>

          <View className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex-row gap-2">
            <FileText size={14} color="#b45309" />
            <Text className="text-[10px] text-amber-800 flex-1 leading-relaxed">
              Diskusikan dulu lewat Chat atau ajukan Batal Sepakat bila masih bisa. Sengketa dipakai saat tidak ada kesepakatan.
            </Text>
          </View>

          <TextInput
            value={disputeReason}
            onChangeText={onChangeDisputeReason}
            placeholder="Jelaskan kronologi & alasan sengketa (min. 10 karakter)..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 min-h-[95px]"
          />

          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 rounded-full border border-gray-200 items-center justify-center">
              <Text className="text-xs font-bold text-gray-700">Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSubmitDispute} disabled={disputeActing} className="flex-1 py-3 rounded-full bg-amber-600 items-center justify-center shadow-md">
              {disputeActing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-black text-white">Ajukan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}