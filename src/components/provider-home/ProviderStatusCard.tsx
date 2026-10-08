import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle, X } from "lucide-react-native";

interface ProviderStatusCardProps {
  isActive: boolean;
  isToggling: boolean;
  onToggle: () => void;
}

export default function ProviderStatusCard({
  isActive,
  isToggling,
  onToggle,
}: ProviderStatusCardProps) {
  return (
    <View className="bg-white rounded-xl p-4 shadow-xs relative overflow-hidden border border-gray-100">
      <View
        className={`absolute top-0 left-0 w-1.5 h-full ${
          isActive ? "bg-emerald-500" : "bg-gray-400"
        }`}
      />

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="w-6 h-6 items-center justify-center">
            <View
              className={`w-3 h-3 rounded-full ${
                isActive ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
          </View>

          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1">
              <Text className="text-xs text-gray-900 font-bold">
                Status Penerimaan:
              </Text>
              <Text
                className={`text-xs font-black uppercase ${
                  isActive ? "text-emerald-600" : "text-gray-500"
                }`}
              >
                {isActive ? "Aktif" : "Istirahat"}
              </Text>
            </View>
            <Text
              className="text-[11px] text-gray-500 mt-0.5"
              numberOfLines={1}
            >
              {isActive
                ? "Terlihat oleh calon klien di sekitarmu"
                : "Profil tidak dimunculkan ke klien"}
            </Text>
          </View>
        </View>

        {/* Toggle Button */}
        <TouchableOpacity
          onPress={onToggle}
          disabled={isToggling}
          activeOpacity={0.88}
          className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full shadow-xs ${
            isActive ? "bg-emerald-600" : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isActive ? "text-white" : "text-gray-600"
            }`}
          >
            {isActive ? "Tersedia" : "Istirahat"}
          </Text>
          <View
            className={`w-4 h-4 rounded-full items-center justify-center ${
              isActive ? "bg-white" : "bg-gray-300"
            }`}
          >
            {isActive ? (
              <CheckCircle size={10} color="#059669" />
            ) : (
              <X size={10} color="#ffffff" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
