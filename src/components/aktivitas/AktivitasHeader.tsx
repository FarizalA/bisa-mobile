import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MessageSquare } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface AktivitasHeaderProps {
  activeJobsCount: number;
}

export default function AktivitasHeader({ activeJobsCount }: AktivitasHeaderProps) {
  const router = useRouter();

  return (
    <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 flex-row items-center justify-between shadow-xs">
      <View>
        <Text className="text-xl font-black text-gray-900 tracking-tight">Pantau Pesanan</Text>
        <Text className="text-[11px] font-semibold text-gray-500">Kelola status dan progres pekerjaanmu</Text>
      </View>

      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/c/chat" as any);
        }}
        activeOpacity={0.85}
        className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 items-center justify-center relative shadow-xs"
      >
        <MessageSquare size={19} color="#ea580c" />
        {activeJobsCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-600 min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center border-2 border-white">
            <Text className="text-white text-[9px] font-black">{activeJobsCount > 9 ? "9+" : activeJobsCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
