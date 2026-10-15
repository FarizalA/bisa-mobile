import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { KATEGORI_JASA } from '../../lib/categories';

interface RadarFilterModalsProps {
  activeDropdown: 'kategori' | 'radius' | 'harga' | 'rating' | null;
  setActiveDropdown: (val: any) => void;
  radius: number;
  setRadius: (r: number) => void;
  maxAllowedRadius: number;
  filterKategori: string;
  setFilterKategori: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  filterRating: number;
  setFilterRating: (v: number) => void;
  onlyTrusted: boolean;
  setOnlyTrusted: (v: boolean) => void;
}

export const RadarFilterModals: React.FC<RadarFilterModalsProps> = ({
  activeDropdown,
  setActiveDropdown,
  radius,
  setRadius,
  maxAllowedRadius,
  filterKategori,
  setFilterKategori,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  filterRating,
  setFilterRating,
  onlyTrusted,
  setOnlyTrusted,
}) => {
  return (
    <>
      {/* Kategori Modal */}
      <Modal visible={activeDropdown === 'kategori'} transparent animationType="fade" onRequestClose={() => setActiveDropdown(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActiveDropdown(null)} className="flex-1 bg-black/30 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full max-w-[320px] max-h-[70%] p-4 shadow-xl">
            <Text className="text-sm font-bold text-gray-900 mb-3 px-2">Pilih Kategori</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {KATEGORI_JASA.map((cat) => (
                <TouchableOpacity key={cat} onPress={() => { setFilterKategori(cat); setActiveDropdown(null); }} className={`px-3 py-2.5 rounded-xl mb-1 ${filterKategori === cat ? 'bg-orange-50' : ''}`}>
                  <Text className={`text-xs font-bold ${filterKategori === cat ? 'text-orange-600' : 'text-gray-700'}`}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Radius Modal */}
      <Modal visible={activeDropdown === 'radius'} transparent animationType="fade" onRequestClose={() => setActiveDropdown(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActiveDropdown(null)} className="flex-1 bg-black/30 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full max-w-[280px] p-5 shadow-2xl gap-3">
            <Text className="text-[10px] font-extrabold text-gray-400 tracking-wider">RADIUS MAKSIMAL</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-gray-800">1 km</Text>
              <Text className="text-sm font-extrabold text-[#ff6b00]">{radius} km</Text>
            </View>
            {/* Slider Bar — HTML input di web, Touch step di native */}
            {Platform.OS === 'web' ? (
              <input
                type="range"
                min="1"
                max={maxAllowedRadius}
                value={radius > maxAllowedRadius ? maxAllowedRadius : radius}
                onChange={(e: any) => setRadius(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#ff6b00', cursor: 'pointer' }}
              />
            ) : (
              <View className="flex-row items-center gap-2 py-1">
                {[1, 5, 10, 20, 30, maxAllowedRadius].map((r) => (
                  <TouchableOpacity key={r} onPress={() => setRadius(r)} className={`flex-1 py-1.5 rounded-lg items-center ${radius === r ? 'bg-[#ff6b00]' : 'bg-gray-100'}`}>
                    <Text className={`text-[10px] font-bold ${radius === r ? 'text-white' : 'text-gray-700'}`}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity onPress={() => setActiveDropdown(null)} className="w-full py-2.5 bg-[#ff6b00] rounded-2xl items-center mt-1 shadow-sm active:opacity-90">
              <Text className="text-xs font-bold text-white">Terapkan Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Harga Modal */}
      <Modal visible={activeDropdown === 'harga'} transparent animationType="fade" onRequestClose={() => setActiveDropdown(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setActiveDropdown(null)} className="flex-1 bg-black/30 justify-center items-center px-6">
            <View className="bg-white rounded-3xl w-full max-w-[320px] p-5 shadow-xl gap-3" style={Platform.OS === 'web' ? ({ width: '100%', maxWidth: 320 } as any) : undefined}>
              <Text className="text-sm font-bold text-gray-900">Rentang Harga (Rp)</Text>
              <View className="flex-row items-center gap-2 w-full">
                <TextInput placeholder="Min" placeholderTextColor="#9ca3af" value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs text-gray-900 min-w-0" style={{ flex: 1 }} />
                <Text className="text-gray-400 font-bold">-</Text>
                <TextInput placeholder="Max" placeholderTextColor="#9ca3af" value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs text-gray-900 min-w-0" style={{ flex: 1 }} />
              </View>
              <TouchableOpacity onPress={() => setActiveDropdown(null)} className="bg-[#ff6b00] py-2.5 rounded-xl items-center mt-2">
                <Text className="text-xs font-bold text-white">Terapkan Filter</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={activeDropdown === 'rating'} transparent animationType="fade" onRequestClose={() => setActiveDropdown(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setActiveDropdown(null)} className="flex-1 bg-black/30 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full max-w-[280px] p-4 shadow-xl">
            <Text className="text-sm font-bold text-gray-900 mb-2 px-2">Filter Rating</Text>
            {[{ label: 'Semua Rating', val: 0 }, { label: '★ 4.0 ke atas', val: 4.0 }, { label: '★ 4.5 ke atas', val: 4.5 }, { label: '★ 4.8 ke atas', val: 4.8 }].map((opt) => (
              <TouchableOpacity key={opt.val} onPress={() => { setFilterRating(opt.val); setActiveDropdown(null); }} className={`px-3 py-2.5 rounded-xl mb-1 ${filterRating === opt.val ? 'bg-orange-50' : ''}`}>
                <Text className={`text-xs font-bold ${filterRating === opt.val ? 'text-orange-600' : 'text-gray-700'}`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <View className="h-px bg-gray-200 my-2" />
            <TouchableOpacity onPress={() => setOnlyTrusted(!onlyTrusted)} className={`px-3 py-2.5 rounded-xl flex-row items-center justify-between ${onlyTrusted ? 'bg-[#ff6b00]' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-bold ${onlyTrusted ? 'text-white' : 'text-gray-700'}`}>Hanya Mitra Unggulan</Text>
              {(onlyTrusted) ? <Text className="text-white text-xs font-bold">✓</Text> : null}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};
