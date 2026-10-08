import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Calendar as CalendarIcon, Navigation, Eye, EyeOff } from "lucide-react-native";
import DynamicMapPicker from "./DynamicMapPicker";

interface Props {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  birthDate: string; setShowDatePickerModal: (v: boolean) => void;
  latitude: number | null; longitude: number | null;
  setLatitude: (v: number | null) => void; setLongitude: (v: number | null) => void;
  alamatSingkat: string; setAlamatSingkat: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  isGeocoding: boolean; handleUseCurrentLocation: () => void;
}

export default function DaftarBiodataSection(p: Props) {
  return (
    <View className="px-4 mt-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-orange-100 items-center justify-center"><Text className="text-[12px]">👤</Text></View>
          <View><Text className="text-[15px] font-black text-gray-900">Data Pribadi</Text><Text className="text-[11px] text-gray-500">Sesuai kartu identitas resmi Anda</Text></View>
        </View>
        <View className="bg-gray-100 px-2.5 py-1 rounded-full"><Text className="text-[10px] font-semibold text-gray-600">Wajib Isi</Text></View>
      </View>
      <View className="bg-white rounded-2xl p-4 border border-gray-100 gap-3 shadow-sm">
        <View><View className="flex-row justify-between mb-1"><Text className="text-[13px] font-bold text-gray-900">Nama Lengkap (sesuai KTP)</Text><Text className="text-[#ff6b00] font-black">*</Text></View><View className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 justify-center"><TextInput placeholder="cth. Budi Setiawan" placeholderTextColor="#9ca3af" value={p.name} onChangeText={p.setName} className="text-[14px] text-gray-900 h-full" /></View></View>
        <View><View className="flex-row justify-between mb-1"><Text className="text-[13px] font-bold text-gray-900">Nomor WhatsApp / HP Aktif</Text><Text className="text-[#ff6b00] font-black">*</Text></View><View className="h-12 bg-gray-50 border border-gray-200 rounded-xl flex-row items-center px-2"><View className="bg-gray-200 px-2.5 py-1.5 rounded-lg flex-row items-center gap-1 mr-2"><Text className="text-[13px]">🇮🇩</Text><Text className="text-[12px] font-bold text-gray-900">+62</Text></View><TextInput placeholder="812 3456 7890" placeholderTextColor="#9ca3af" value={p.phone} onChangeText={p.setPhone} keyboardType="phone-pad" className="flex-1 text-[14px] text-gray-900 h-full" /></View></View>
        <View><View className="flex-row justify-between mb-1"><Text className="text-[13px] font-bold text-gray-900">Alamat Email</Text><Text className="text-[#ff6b00] font-black">*</Text></View><View className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 justify-center"><TextInput placeholder="budi.setiawan@gmail.com" placeholderTextColor="#9ca3af" value={p.email} onChangeText={p.setEmail} keyboardType="email-address" autoCapitalize="none" className="text-[14px] text-gray-900 h-full" /></View></View>
        <View><View className="flex-row justify-between mb-1"><Text className="text-[13px] font-bold text-gray-900">Kata Sandi</Text><Text className="text-[#ff6b00] font-black">*</Text></View><View className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 flex-row items-center justify-between"><TextInput placeholder="••••••••" placeholderTextColor="#9ca3af" value={p.password} onChangeText={p.setPassword} secureTextEntry={!p.showPassword} className="flex-1 text-[14px] text-gray-900 h-full pr-2" /><TouchableOpacity onPress={() => p.setShowPassword(!p.showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>{p.showPassword ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}</TouchableOpacity></View><Text className="text-[11px] text-gray-500 mt-1">Minimal 6 karakter kombinasi yang aman</Text></View>
        <View><View className="flex-row justify-between mb-1"><Text className="text-[13px] font-bold text-gray-900">Tanggal Lahir</Text><Text className="text-[10px] font-semibold text-[#ff6b00]">Min. 18 tahun</Text></View><TouchableOpacity onPress={() => p.setShowDatePickerModal(true)} activeOpacity={0.8} className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 flex-row items-center justify-between"><Text className={`text-[14px] ${p.birthDate ? "text-gray-900 font-semibold" : "text-gray-400"}`}>{p.birthDate ? p.birthDate : "Pilih Tanggal Lahir (YYYY-MM-DD)"}</Text><CalendarIcon size={18} color="#ff6b00" /></TouchableOpacity></View>
        <View className="mt-1"><View className="flex-row justify-between items-center mb-1"><Text className="text-[13px] font-bold text-gray-900">Titik Lokasi (GPS)</Text><TouchableOpacity onPress={p.handleUseCurrentLocation} className="flex-row items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200"><Navigation size={11} color="#ff6b00" /><Text className="text-[10px] font-bold text-[#ff6b00]">Gunakan GPS Saya</Text></TouchableOpacity></View><Text className="text-[11px] text-gray-500 mb-2">Geser atau ketuk peta untuk menentukan lokasi domisili Anda.</Text><DynamicMapPicker position={p.latitude && p.longitude ? { lat: p.latitude, lng: p.longitude } : null} setPosition={(pos: any) => { p.setLatitude(pos.lat); p.setLongitude(pos.lng); }} />{!p.latitude ? <Text className="text-[11px] text-red-500 mt-1">⚠️ Titik lokasi wajib diisi — pilih di peta atau tekan &apos;Gunakan GPS Saya&apos;</Text> : null}</View>
        <View><View className="flex-row justify-between mb-1 items-center"><Text className="text-[13px] font-bold text-gray-900">Alamat Singkat</Text>{p.isGeocoding ? <View className="flex-row items-center gap-1"><ActivityIndicator size="small" color="#ff6b00" /><Text className="text-[10px] text-gray-400">Mencari...</Text></View> : <Text className="text-[#ff6b00] font-black">*</Text>}</View><View className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 justify-center"><TextInput placeholder="Kecamatan (Terisi otomatis dari GPS)" placeholderTextColor="#9ca3af" value={p.alamatSingkat} onChangeText={p.setAlamatSingkat} className="text-[14px] text-gray-900 h-full" /></View></View>
        <View><View className="flex-row justify-between mb-1"><Text className="text-[13px] font-bold text-gray-900">Alamat Lengkap Domisili</Text><Text className="text-[#ff6b00] font-black">*</Text></View><View className="min-h-[84px] bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"><TextInput placeholder="Jl. Kebon Jeruk No. 12, RT 04/RW 02" placeholderTextColor="#9ca3af" value={p.address} onChangeText={p.setAddress} multiline numberOfLines={3} textAlignVertical="top" className="text-[14px] text-gray-900" /></View></View>
      </View>
    </View>
  );
}
