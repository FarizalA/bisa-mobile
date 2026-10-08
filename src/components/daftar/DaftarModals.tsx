import React from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, Alert } from "react-native";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";

export interface DaftarPopup { visible: boolean; title: string; message: string; type: "warning" | "error" | "success" | "info"; actionText?: string; onAction?: () => void; }

export function DaftarImageSourceModal({ visible, pickerType, onClose, onPick }: { visible: boolean; pickerType: "ktp" | "face" | null; onClose: () => void; onPick: (s: "camera" | "gallery") => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-black text-gray-900">Pilih Sumber Foto {pickerType === "ktp" ? "KTP" : "Swafoto"}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color="#6b7280" /></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => onPick("camera")} className="flex-row items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl mb-3">
            <View className="w-10 h-10 rounded-full bg-[#ff6b00] items-center justify-center"><Camera size={20} color="#ffffff" /></View>
            <View className="flex-1"><Text className="text-[14px] font-bold text-gray-900">Ambil Foto dengan Kamera</Text><Text className="text-[11px] text-gray-500">Potret dokumen/wajah langsung saat ini</Text></View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPick("gallery")} className="flex-row items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"><ImageIcon size={20} color="#374151" /></View>
            <View className="flex-1"><Text className="text-[14px] font-bold text-gray-900">Pilih dari Galeri HP</Text><Text className="text-[11px] text-gray-500">Pilih berkas foto yang tersimpan di HP</Text></View>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function DaftarBirthDateModal({ visible, day, month, year, setDay, setMonth, setYear, onClose }: { visible: boolean; day: string; month: string; year: string; setDay: (v: string) => void; setMonth: (v: string) => void; setYear: (v: string) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[16px] font-black text-gray-900">Pilih Tanggal Lahir (Min. 18 Tahun)</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color="#6b7280" /></TouchableOpacity>
          </View>
          <View className="flex-row gap-2 mb-5">
            <View className="flex-1"><Text className="text-[11px] font-bold text-gray-500 mb-1">Hari (1-31)</Text><TextInput placeholder="DD" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-center text-[16px] font-bold text-gray-900" /></View>
            <View className="flex-1"><Text className="text-[11px] font-bold text-gray-500 mb-1">Bulan (1-12)</Text><TextInput placeholder="MM" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-center text-[16px] font-bold text-gray-900" /></View>
            <View className="flex-1"><Text className="text-[11px] font-bold text-gray-500 mb-1">Tahun (cth. 1998)</Text><TextInput placeholder="YYYY" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-center text-[16px] font-bold text-gray-900" /></View>
          </View>
          <TouchableOpacity onPress={() => { if (year && month && day) onClose(); else Alert.alert("Lengkapi Tanggal", "Harap isi hari, bulan, dan tahun lahir."); }} className="w-full h-12 bg-[#ff6b00] rounded-xl items-center justify-center">
            <Text className="text-white text-[14px] font-black">Simpan Tanggal</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function DaftarPopupModal({ popup, onClose }: { popup: DaftarPopup; onClose: () => void }) {
  return (
    <Modal visible={popup.visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/60 items-center justify-center p-5">
        <TouchableOpacity activeOpacity={1} className="w-full max-w-[340px] bg-white rounded-[24px] p-6 items-center shadow-2xl border border-gray-100">
          <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${popup.type === "error" ? "bg-red-100" : popup.type === "success" ? "bg-green-100" : "bg-amber-100"}`}>
            <Text className="text-[28px]">{popup.type === "error" ? "❌" : popup.type === "success" ? "✅" : "⚠️"}</Text>
          </View>
          <Text className="text-[17px] font-black text-gray-900 text-center mb-2 leading-tight">{popup.title}</Text>
          <Text className="text-[13px] text-gray-600 text-center leading-relaxed mb-6">{popup.message}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.88} className={`w-full h-12 rounded-full items-center justify-center shadow-md ${popup.type === "error" ? "bg-red-600" : popup.type === "success" ? "bg-green-600" : "bg-[#ff6b00]"}`}>
            <Text className="text-white text-[14px] font-black">{popup.actionText || "Oke, Mengerti"}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
