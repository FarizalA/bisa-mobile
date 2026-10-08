import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Camera, CheckCircle } from "lucide-react-native";

export default function DaftarKycSection({
  ktpUri, faceUri, setActivePickerType,
}: { ktpUri: string | null; faceUri: string | null; setActivePickerType: (v: "ktp" | "face" | null) => void }) {
  return (
    <View className="px-4 mt-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-blue-100 items-center justify-center"><Text className="text-[12px]">🛡️</Text></View>
          <View><Text className="text-[15px] font-black text-gray-900">Verifikasi Identitas (KYC)</Text><Text className="text-[11px] text-gray-500">Menjamin kepercayaan & rasa aman transaksi</Text></View>
        </View>
        <View className="bg-green-100 px-2.5 py-1 rounded-full"><Text className="text-[10px] font-bold text-green-700">Resmi</Text></View>
      </View>
      <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 shadow-sm">
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center gap-2"><Text className="text-[13px]">🪪</Text><Text className="text-[13px] font-black text-gray-900">1. Foto KTP Asli</Text></View>
          <View className="bg-orange-100 px-2 py-0.5 rounded-full"><Text className="text-[10px] font-bold text-orange-700">Wajib</Text></View>
        </View>
        <Text className="text-[11px] text-gray-500 mb-3 leading-4">Pastikan seluruh teks KTP terbaca jelas, tidak terpotong, bebas pantulan sinar, dan bukan fotokopi.</Text>
        <TouchableOpacity onPress={() => setActivePickerType("ktp")} activeOpacity={0.88} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 items-center overflow-hidden">
          {!ktpUri ? (
            <><View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mb-2"><Camera size={22} color="#ff6b00" /></View><Text className="text-[13px] font-black text-[#ff6b00]">Unggah / Ambil Foto KTP</Text><Text className="text-[11px] text-gray-400 mt-0.5">Pilih Kamera atau Galeri HP</Text></>
          ) : (
            <View className="items-center w-full">
              <View className="w-full h-36 rounded-lg overflow-hidden bg-gray-200 relative items-center justify-center">
                <Image source={{ uri: ktpUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View className="absolute inset-0 bg-black/40 items-center justify-center"><View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1"><CheckCircle size={14} color="#16a34a" /><Text className="text-[11px] font-bold text-gray-900">Foto KTP Terpasang</Text></View></View>
              </View><Text className="text-[11px] font-bold text-red-600 mt-2">🔄 Ketuk untuk Ganti Foto KTP</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center gap-2"><Text className="text-[13px]">🤳</Text><Text className="text-[13px] font-black text-gray-900">2. Swafoto (Selfie Wajah)</Text></View>
          <View className="bg-orange-100 px-2 py-0.5 rounded-full"><Text className="text-[10px] font-bold text-orange-700">Wajib</Text></View>
        </View>
        <Text className="text-[11px] text-gray-500 mb-3 leading-4">Ambil foto wajah tegak di tempat terang tanpa kacamata hitam, masker, ataupun topi.</Text>
        <TouchableOpacity onPress={() => setActivePickerType("face")} activeOpacity={0.88} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 items-center overflow-hidden">
          {!faceUri ? (
            <><View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mb-2"><Camera size={22} color="#ff6b00" /></View><Text className="text-[13px] font-black text-[#ff6b00]">Ambil / Unggah Swafoto Wajah</Text><Text className="text-[11px] text-gray-400 mt-0.5">Pilih Kamera atau Galeri HP</Text></>
          ) : (
            <View className="items-center w-full">
              <View className="w-full h-36 rounded-lg overflow-hidden bg-gray-200 relative items-center justify-center">
                <Image source={{ uri: faceUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View className="absolute inset-0 bg-black/40 items-center justify-center"><View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1"><CheckCircle size={14} color="#16a34a" /><Text className="text-[11px] font-bold text-gray-900">Swafoto Terpasang</Text></View></View>
              </View><Text className="text-[11px] font-bold text-red-600 mt-2">🔄 Ketuk untuk Ambil Ulang Swafoto</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
