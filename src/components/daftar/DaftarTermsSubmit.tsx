import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";

export default function DaftarTermsSubmit({
  terms, setTerms, loading, handleDaftar,
}: { terms: boolean; setTerms: (v: boolean | ((v: boolean) => boolean)) => void; loading: boolean; handleDaftar: () => void }) {
  return (
    <View className="px-4 mt-5">
      <TouchableOpacity onPress={() => setTerms((v: boolean) => !v)} activeOpacity={0.8} className="flex-row items-start gap-3 mb-4">
        <View className={`w-5 h-5 rounded-md border items-center justify-center mt-0.5 ${terms ? "bg-[#ff6b00] border-[#ff6b00]" : "bg-gray-100 border-gray-300"}`}>{terms ? <Text className="text-white text-[11px] font-black">✓</Text> : null}</View>
        <Text className="flex-1 text-[11px] text-gray-700 leading-4">Saya menyatakan bahwa data yang diisi benar serta menyetujui <Text className="font-black text-[#ff6b00]">Syarat & Ketentuan</Text> dan <Text className="font-black text-[#ff6b00]">Kebijakan Privasi</Text> BISA Partner.</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleDaftar(); }}
        disabled={loading || !terms}
        activeOpacity={0.9}
        className={`w-full h-14 rounded-full items-center justify-center flex-row ${loading || !terms ? "bg-orange-200" : "bg-[#ff6b00]"}`}
        style={!loading && terms ? { shadowColor: "#ff6b00", shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 } : {}}
      >
        {loading ? (
          <View className="flex-row items-center gap-2"><ActivityIndicator size="small" color="#ffffff" /><Text className="text-white text-[15px] font-black">Memproses & Mengunggah Data...</Text></View>
        ) : (
          <><Text className="text-white text-[15px] font-black">Daftar & Kirim Verifikasi</Text><ArrowRight size={18} color="white" style={{ marginLeft: 8 }} /></>
        )}
      </TouchableOpacity>
      <Text className="text-[10px] text-gray-400 mt-3 text-center">🔒 Data Anda dilindungi enkripsi SSL dan akan ditinjau oleh admin</Text>
    </View>
  );
}
