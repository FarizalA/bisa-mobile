import { View, Text, Image } from "react-native";

export function WelcomeCard() {
  return (
    <View className="relative bg-white rounded-2xl p-4 shadow-sm mb-4 border border-gray-100 overflow-hidden">
      <View
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-orange-100/50 opacity-50"
        style={{ transform: [{ scale: 2 }] }}
      />
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="bg-orange-100 self-start px-3 py-1 rounded-full mb-2">
            <Text className="text-orange-800 text-[10px] font-bold">👋 Halo, Mitra & Pelanggan!</Text>
          </View>
          <Text className="text-2xl font-black text-gray-900 tracking-tight">Masuk atau Daftar</Text>
          <Text className="text-[13px] text-gray-500 mt-1 leading-4">
            Masukkan email dan kata sandi aktif untuk mulai menggunakan layanan{" "}
            <Text className="font-bold text-orange-600">BISA</Text>.
          </Text>
        </View>

        <View className="items-center">
          <View className="w-16 h-16 relative items-center justify-center">
            <Image
              source={require("../../../assets/maskot-jempol.png")}
              style={{ width: 64, height: 64 }}
              resizeMode="contain"
            />
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
          </View>
          <Text className="text-[9px] text-orange-600 font-bold mt-1">Siap Bantu!</Text>
        </View>
      </View>
    </View>
  );
}
