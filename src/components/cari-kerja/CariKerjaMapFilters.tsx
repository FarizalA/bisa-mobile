import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { ChevronDown, Check, SlidersHorizontal } from "lucide-react-native";
import { KATEGORI_JASA } from "../../lib/categories";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

const RADIUS_STEPS = [1, 3, 5, 10, 25, 100] as const;

function formatRadius(v: number) {
  return v >= 100 ? "Tanpa Batas" : `${v} km`;
}

type DropKey = "kategori" | "radius" | null;

/**
 * Filter ringkas untuk tampilan PETA (p/cari-kerja).
 * Ditambah karena filter lengkap hanya dirender saat viewMode "list" →
 * user di peta harus pindah ke list dulu untuk atur kategori/radius.
 */
export default function CariKerjaMapFilters({ logic }: { logic: CariKerjaLogic }) {
  const { activeCategory, setActiveCategory, radius, setRadius, loading } = logic;
  const [open, setOpen] = useState<DropKey>(null);

  const close = () => setOpen(null);

  return (
    <>
      <View className="flex-row items-center gap-2" style={{ flexWrap: "nowrap" }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setOpen("kategori")}
          className="bg-white flex-row items-center gap-1.5 px-3 py-2 rounded-full"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
            maxWidth: "62%",
          }}
        >
          <Text numberOfLines={1} className="text-xs font-extrabold text-gray-800" style={{ flexShrink: 1 }}>
            {activeCategory}
          </Text>
          <ChevronDown size={13} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setOpen("radius")}
          className="bg-white flex-row items-center gap-1.5 px-3 py-2 rounded-full"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <SlidersHorizontal size={13} color="#059669" />
          <Text className="text-xs font-extrabold text-gray-800">{formatRadius(radius)}</Text>
          <ChevronDown size={13} color="#374151" />
        </TouchableOpacity>

        {loading ? (
          <View className="bg-white flex-row items-center gap-1.5 px-3 py-2 rounded-full" style={{ elevation: 2 }}>
            <Text className="text-xs font-bold text-emerald-600">Memuat…</Text>
          </View>
        ) : null}
      </View>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity activeOpacity={1} onPress={close} className="flex-1 bg-black/30 justify-start pt-28 px-4">
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-3xl p-4 border border-gray-100">
            <Text className="text-[11px] font-extrabold tracking-widest text-gray-400 uppercase mb-3">
              {open === "kategori" ? "Kategori Jasa" : "Radius Maksimal"}
            </Text>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {open === "kategori"
                ? KATEGORI_JASA.map((cat) => {
                    const sel = cat === activeCategory;
                    return (
                      <TouchableOpacity
                        key={cat}
                        activeOpacity={0.8}
                        onPress={() => {
                          setActiveCategory(cat);
                          close();
                        }}
                        className={`flex-row items-center justify-between px-3 py-3 rounded-2xl mb-1 ${sel ? "bg-emerald-50" : ""}`}
                      >
                        <Text className={`text-sm font-bold ${sel ? "text-emerald-700" : "text-gray-700"}`}>{cat}</Text>
                        {sel ? <Check size={16} color="#059669" /> : null}
                      </TouchableOpacity>
                    );
                  })
                : RADIUS_STEPS.map((s) => {
                    const sel = s === radius;
                    return (
                      <TouchableOpacity
                        key={s}
                        activeOpacity={0.8}
                        onPress={() => {
                          setRadius(s);
                          close();
                        }}
                        className={`flex-row items-center justify-between px-3 py-3 rounded-2xl mb-1 ${sel ? "bg-emerald-50" : ""}`}
                      >
                        <Text className={`text-sm font-bold ${sel ? "text-emerald-700" : "text-gray-700"}`}>
                          {formatRadius(s)}
                        </Text>
                        {sel ? <Check size={16} color="#059669" /> : null}
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
