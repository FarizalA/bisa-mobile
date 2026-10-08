import React from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Search } from "lucide-react-native";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

export default function CariKerjaSearchBar({ logic }: { logic: CariKerjaLogic }) {
  const { searchQuery, setSearchQuery, fetchNearbyJobs } = logic;

  return (
    <View className="px-4 py-3 bg-white border-b border-gray-100">
      <View className="h-11 bg-gray-50 rounded-full border border-gray-200 flex-row items-center px-3.5">
        <Search size={18} color="#9ca3af" />
        <TextInput
          placeholder="Cari pekerjaan di sekitarmu..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchNearbyJobs}
          returnKeyType="search"
          className="flex-1 ml-3 text-sm text-gray-900 font-medium h-full"
        />
      </View>
    </View>
  );
}
