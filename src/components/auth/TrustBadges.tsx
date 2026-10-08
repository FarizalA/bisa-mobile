import { View, Text } from "react-native";
import { Lock, Zap, ShieldCheck } from "lucide-react-native";

export function TrustBadges() {
  return (
    <View className="flex-row gap-2 mb-6">
      <View className="flex-1 bg-gray-100/60 p-2.5 rounded-xl items-center">
        <Lock size={16} color="#ea580c" />
        <Text className="text-[10px] font-bold text-gray-800 mt-1">Data Terenkripsi</Text>
        <Text className="text-[8px] text-gray-500">Standar Keamanan</Text>
      </View>
      <View className="flex-1 bg-gray-100/60 p-2.5 rounded-xl items-center">
        <Zap size={16} color="#16a34a" />
        <Text className="text-[10px] font-bold text-gray-800 mt-1">Masuk Cepat</Text>
        <Text className="text-[8px] text-gray-500">Tanpa Ribet</Text>
      </View>
      <View className="flex-1 bg-gray-100/60 p-2.5 rounded-xl items-center">
        <ShieldCheck size={16} color="#2563eb" />
        <Text className="text-[10px] font-bold text-gray-800 mt-1">Resmi & Aman</Text>
        <Text className="text-[8px] text-gray-500">Terpercaya</Text>
      </View>
    </View>
  );
}
