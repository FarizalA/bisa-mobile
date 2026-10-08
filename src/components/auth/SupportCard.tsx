import { View, Text, TouchableOpacity } from "react-native";
import { Headset } from "lucide-react-native";

export function SupportCard() {
  return (
    <View className="bg-orange-50 rounded-2xl p-4 flex-row items-center justify-between border border-orange-100 mb-8">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
          <Headset size={20} color="#ea580c" />
        </View>
        <View>
          <Text className="text-sm font-bold text-orange-800">Butuh bantuan?</Text>
          <Text className="text-[11px] text-orange-600">Hubungi Customer Care 24/7 BISA</Text>
        </View>
      </View>
      <TouchableOpacity className="bg-white px-5 py-2 rounded-full border border-orange-200 shadow-sm active:bg-orange-50">
        <Text className="text-orange-700 text-xs font-bold">Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AuthFooter() {
  return (
    <View className="items-center px-6 mb-10">
      <Text className="text-[11px] text-gray-500 text-center leading-4">
        Dengan melanjutkan, kamu menyetujui <Text className="font-bold text-gray-700 underline">Syarat & Ketentuan</Text> serta <Text className="font-bold text-gray-700 underline">Kebijakan Privasi</Text> BISA.
      </Text>
      <Text className="text-[9px] text-gray-400 mt-3 font-bold tracking-widest uppercase">
        VERSI APLIKASI 3.4.0 • BISA INDONESIA
      </Text>
    </View>
  );
}
