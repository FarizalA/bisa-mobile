import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Switch } from "react-native";
import { X, MapPin, Check, Flame, Banknote, ShieldCheck } from "lucide-react-native";

interface HomeFilterModalProps {
  visible: boolean;
  onClose: () => void;
  minRating: number;
  setMinRating: (r: number) => void;
  sortBy: "terdekat" | "populer" | "harga";
  setSortBy: (s: "terdekat" | "populer" | "harga") => void;
  onlyTrusted: boolean;
  setOnlyTrusted: (t: boolean) => void;
  onReset: () => void;
}

export default function HomeFilterModal({
  visible,
  onClose,
  minRating,
  setMinRating,
  sortBy,
  setSortBy,
  onlyTrusted,
  setOnlyTrusted,
  onReset,
}: HomeFilterModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1 bg-black/60 justify-end">
        <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-5 max-h-[85%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[18px] font-black text-gray-900">Filter Pencarian</Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <X size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Section 1: Pilihan Bintang */}
            <View className="mb-5">
              <Text className="text-[13px] font-bold text-gray-900 mb-2">Pilihan Bintang</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { label: "Semua", val: 0 },
                  { label: "★ 4 ke atas", val: 4.0 },
                  { label: "★ 4.5 ke atas", val: 4.5 },
                  { label: "★ 4.8 ke atas", val: 4.8 },
                ].map((r) => {
                  const sel = minRating === r.val;
                  return (
                    <TouchableOpacity
                      key={r.val}
                      onPress={() => setMinRating(r.val)}
                      className={`px-4 py-2 rounded-full border ${
                        sel ? "bg-orange-50 border-[#ff6b00]" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`text-[12px] ${sel ? "font-black text-[#ff6b00]" : "font-medium text-gray-700"}`}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Urutkan Berdasarkan */}
            <View className="mb-5">
              <Text className="text-[13px] font-bold text-gray-900 mb-2">Urutkan Berdasarkan</Text>
              <View className="gap-2">
                <TouchableOpacity
                  onPress={() => setSortBy("terdekat")}
                  className={`p-3.5 rounded-2xl flex-row items-center justify-between border ${
                    sortBy === "terdekat" ? "bg-orange-50/60 border-[#ff6b00]" : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <MapPin size={18} color="#ff6b00" />
                    <Text className="text-[14px] font-bold text-gray-900">Terdekat</Text>
                  </View>
                  {sortBy === "terdekat" ? (
                    <View className="w-5 h-5 rounded-full bg-[#ff6b00] items-center justify-center">
                      <Check size={12} color="white" />
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSortBy("populer")}
                  className={`p-3.5 rounded-2xl flex-row items-center justify-between border ${
                    sortBy === "populer" ? "bg-orange-50/60 border-[#ff6b00]" : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <Flame size={18} color="#ea580c" />
                    <Text className="text-[14px] font-bold text-gray-900">Paling Banyak Diorder (Populer)</Text>
                  </View>
                  {sortBy === "populer" ? (
                    <View className="w-5 h-5 rounded-full bg-[#ff6b00] items-center justify-center">
                      <Check size={12} color="white" />
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSortBy("harga")}
                  className={`p-3.5 rounded-2xl flex-row items-center justify-between border ${
                    sortBy === "harga" ? "bg-orange-50/60 border-[#ff6b00]" : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <Banknote size={18} color="#16a34a" />
                    <Text className="text-[14px] font-bold text-gray-900">Harga Termurah</Text>
                  </View>
                  {sortBy === "harga" ? (
                    <View className="w-5 h-5 rounded-full bg-[#ff6b00] items-center justify-center">
                      <Check size={12} color="white" />
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 3: Hanya Mitra Unggulan */}
            <View className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex-row items-center justify-between mb-5">
              <View className="flex-row items-center gap-2.5 flex-1">
                <View className="w-8 h-8 rounded-full bg-[#ffedd5] border border-[#fed7aa] items-center justify-center">
                  <Text className="text-[11px]">🏅</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-black text-gray-900">Hanya Mitra Unggulan</Text>
                  <Text className="text-[11px] text-orange-700">Mitra terverifikasi & berperforma tinggi</Text>
                </View>
              </View>
              <Switch
                value={onlyTrusted}
                onValueChange={setOnlyTrusted}
                trackColor={{ false: "#cbd5e1", true: "#ea580c" }}
              />
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View className="flex-row gap-3 pt-3 border-t border-gray-100">
            <TouchableOpacity onPress={onReset} className="w-24 h-12 bg-gray-100 rounded-2xl items-center justify-center">
              <Text className="text-[13px] font-bold text-gray-700">Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="flex-1 h-12 bg-[#ff6b00] rounded-2xl items-center justify-center shadow-sm">
              <Text className="text-white text-[14px] font-black">Terapkan Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
