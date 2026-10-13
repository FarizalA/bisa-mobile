import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Star, MapPin, Trash2, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTersimpanLogic, FavoriteMitra } from "../../src/hooks/useTersimpanLogic";
import { safeBack } from "@/lib/navigation";

export default function TersimpanPage() {
  const router = useRouter();
  const { user, favorites, loading, removingId, handleRemove } = useTersimpanLogic();

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text className="text-sm text-gray-500 mt-2">Memuat mitra tersimpan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* Header */}
      <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.replace("/c/profil" as any)} className="w-9 h-9 rounded-full items-center justify-center">
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Mitra Tersimpan</Text>
        </View>
        <View className="flex-row items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
          <Bookmark size={14} color="#FF6B00" />
          <Text className="text-xs font-bold text-[#FF6B00]">{favorites.length} Mitra</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center">
          {favorites.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center border border-gray-100 shadow-sm mt-8">
              <Image
                source={require("../../assets/maskot/maskot sedang bermain ponsel.png")}
                style={{ width: 100, height: 100 }}
                resizeMode="contain"
              />
              <Text className="text-base font-extrabold text-gray-900 mt-4">Belum Ada Mitra Tersimpan</Text>
              <Text className="text-xs text-gray-500 text-center mt-2 leading-5">
                Simpan mitra terpercaya Anda dengan menekan ikon simpan di halaman radar atau profil mitra.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/c/radar" as any)}
                className="mt-6 px-6 py-3 bg-[#FF6B00] rounded-2xl"
              >
                <Text className="text-white font-bold text-sm">Cari Mitra Sekarang</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3.5">
              {favorites.map((item: FavoriteMitra) => (
                <View
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center justify-between"
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/p/profil/${item.mitra_id}` as any)}
                    className="flex-row items-center gap-3.5 flex-1"
                    activeOpacity={0.8}
                  >
                    {item.mitra_avatar ? (
                      <Image
                        source={{ uri: item.mitra_avatar }}
                        className="w-14 h-14 rounded-2xl bg-gray-100"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-14 h-14 rounded-2xl bg-orange-50 items-center justify-center">
                        <User size={26} color="#FF6B00" />
                      </View>
                    )}

                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                        {item.mitra_name}
                      </Text>

                      <View className="flex-row items-center gap-1 mt-1">
                        <Star size={13} color="#F59E0B" fill="#F59E0B" />
                        <Text className="text-xs font-bold text-gray-800">
                          {Number(item.mitra_rating || 5).toFixed(1)}
                        </Text>
                        <Text className="text-gray-300 mx-1">•</Text>
                        <MapPin size={12} color="#6B7280" />
                        <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
                          {item.mitra_location}
                        </Text>
                      </View>

                      {item.mitra_keahlian ? (
                        <View className="mt-1.5 self-start bg-orange-50 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-[#FF6B00]" numberOfLines={1}>
                            {item.mitra_keahlian}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleRemove(item.id);
                    }}
                    disabled={removingId === item.id}
                    className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    {removingId === item.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Trash2 size={18} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
