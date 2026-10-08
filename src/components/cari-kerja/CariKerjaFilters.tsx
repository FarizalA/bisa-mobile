import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from "react-native";
import { ChevronDown, MapPin, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { KATEGORI_JASA } from "../../lib/categories";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

const RADIUS_STEPS = [1, 3, 5, 10, 25, 100] as const;
function formatRadius(v: number) {
  if (v >= 100) return "Tanpa Batas";
  return `${v} km`;
}

type DropKey = "radius" | "distance" | "price" | "kategori" | null;

export default function CariKerjaFilters({ logic }: { logic: CariKerjaLogic }) {
  const {
    viewMode,
    radius,
    setRadius,
    sortPrice,
    setSortPrice,
    sortDistance,
    setSortDistance,
    activeCategory,
    setActiveCategory,
  } = logic;

  const [activeDropdown, setActiveDropdown] = useState<DropKey>(null);
  const [tempRadius, setTempRadius] = useState(radius);

  useEffect(() => {
    setTempRadius(radius);
  }, [radius]);

  if (viewMode !== "list") return null;

  const close = () => setActiveDropdown(null);

  return (
    <>
      <View className="bg-white border-b border-gray-100 px-4 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTempRadius(radius);
              setActiveDropdown(activeDropdown === "radius" ? null : "radius");
            }}
            activeOpacity={0.85}
            className={`shrink-0 h-9 px-3.5 rounded-full border-2 flex-row items-center gap-1.5 ${
              activeDropdown === "radius" || radius !== 100
                ? "bg-white border-emerald-500"
                : "bg-white border-gray-200"
            }`}
          >
            <MapPin size={13} color="#059669" />
            <Text className="text-xs font-extrabold text-gray-900">{formatRadius(radius)}</Text>
            <ChevronDown size={15} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveDropdown(activeDropdown === "distance" ? null : "distance")}
            activeOpacity={0.85}
            className={`shrink-0 h-9 px-3.5 rounded-full border flex-row items-center gap-1.5 ${
              sortDistance !== "terdekat" || activeDropdown === "distance"
                ? "bg-emerald-600 border-emerald-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-xs font-bold ${sortDistance !== "terdekat" || activeDropdown === "distance" ? "text-white" : "text-gray-700"}`}>
              {sortDistance === "terdekat" ? "Terdekat" : "Terjauh"}
            </Text>
            <ChevronDown size={14} color={sortDistance !== "terdekat" || activeDropdown === "distance" ? "#ffffff" : "#9ca3af"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveDropdown(activeDropdown === "price" ? null : "price")}
            activeOpacity={0.85}
            className={`shrink-0 h-9 px-3.5 rounded-full border flex-row items-center gap-1.5 ${
              sortPrice !== "normal" || activeDropdown === "price"
                ? "bg-emerald-600 border-emerald-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-xs font-bold ${sortPrice !== "normal" || activeDropdown === "price" ? "text-white" : "text-gray-700"}`}>
              {sortPrice === "normal" ? "Bayaran" : sortPrice === "tertinggi" ? "Tertinggi" : "Terendah"}
            </Text>
            <ChevronDown size={14} color={sortPrice !== "normal" || activeDropdown === "price" ? "#ffffff" : "#9ca3af"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveDropdown(activeDropdown === "kategori" ? null : "kategori")}
            activeOpacity={0.85}
            className={`shrink-0 h-9 px-3.5 rounded-full border flex-row items-center gap-1.5 ${
              activeCategory !== "Semua Jasa" || activeDropdown === "kategori"
                ? "bg-emerald-600 border-emerald-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-xs font-bold max-w-[110px] ${activeCategory !== "Semua Jasa" || activeDropdown === "kategori" ? "text-white" : "text-gray-700"}`} numberOfLines={1}>
              {activeCategory}
            </Text>
            <ChevronDown size={14} color={activeCategory !== "Semua Jasa" || activeDropdown === "kategori" ? "#ffffff" : "#9ca3af"} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal visible={activeDropdown !== null} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity activeOpacity={1} onPress={close} className="flex-1 bg-black/10 justify-start pt-36 px-4">
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-5">
            {activeDropdown === "radius" && (
              <View className="flex-col gap-3">
                <Text className="text-[11px] font-extrabold tracking-widest text-gray-400 uppercase">
                  Radius Maksimal
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-gray-500">1 km</Text>
                  <View className="bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                    <Text className="text-[15px] font-black text-emerald-600">{formatRadius(tempRadius)}</Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {RADIUS_STEPS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setTempRadius(s)}
                      className={`px-3 py-1.5 rounded-full border ${s === tempRadius ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}
                    >
                      <Text className={`text-xs font-bold ${s === tempRadius ? "text-emerald-700" : "text-gray-400"}`}>
                        {s >= 100 ? "∞" : s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setRadius(tempRadius);
                    close();
                  }}
                  className="w-full py-3 bg-emerald-600 rounded-full items-center"
                >
                  <Text className="text-sm font-extrabold text-white">Terapkan Filter</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeDropdown === "distance" && (
              <View className="flex-col gap-1">
                {(["terdekat", "terjauh"] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setSortDistance(opt);
                      close();
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex-row items-center justify-between ${sortDistance === opt ? "bg-emerald-50" : ""}`}
                  >
                    <Text className={`text-sm font-bold capitalize ${sortDistance === opt ? "text-emerald-700" : "text-gray-700"}`}>
                      {opt}
                    </Text>
                    {sortDistance === opt && <Check size={18} color="#059669" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeDropdown === "price" && (
              <View className="flex-col gap-1">
                {(
                  [
                    ["normal", "Bayaran"],
                    ["tertinggi", "Tertinggi"],
                    ["terendah", "Terendah"],
                  ] as const
                ).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      setSortPrice(val);
                      close();
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex-row items-center justify-between ${sortPrice === val ? "bg-emerald-50" : ""}`}
                  >
                    <Text className={`text-sm font-bold ${sortPrice === val ? "text-emerald-700" : "text-gray-700"}`}>
                      {label}
                    </Text>
                    {sortPrice === val && <Check size={18} color="#059669" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeDropdown === "kategori" && (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {KATEGORI_JASA.map((catName) => (
                  <TouchableOpacity
                    key={catName}
                    onPress={() => {
                      setActiveCategory(catName);
                      close();
                    }}
                    className={`px-3 py-2.5 rounded-xl flex-row items-center justify-between ${activeCategory === catName ? "bg-emerald-50" : ""}`}
                  >
                    <Text className={`text-sm font-semibold flex-1 ${activeCategory === catName ? "text-emerald-700" : "text-gray-700"}`} numberOfLines={1}>
                      {catName}
                    </Text>
                    {activeCategory === catName && <Check size={18} color="#059669" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
