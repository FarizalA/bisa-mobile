import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { Star, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface AktivitasRatingModalProps {
  visible: boolean;
  job: any | null;
  ratingValue: number;
  setRatingValue: (val: number) => void;
  ratingComment: string;
  setRatingComment: (val: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function AktivitasRatingModal({
  visible,
  job,
  ratingValue,
  setRatingValue,
  ratingComment,
  setRatingComment,
  submitting,
  onClose,
  onSubmit,
}: AktivitasRatingModalProps) {
  if (!visible || !job) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl flex-col gap-4">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
            <View className="flex-row items-center gap-3 flex-1 min-w-0 pr-2">
              <Image
                source={
                  job.mitra?.face_url
                    ? { uri: job.mitra.face_url }
                    : require("../../../assets/mascot.png")
                }
                style={{ width: 44, height: 44, borderRadius: 22 }}
                className="bg-gray-100 border border-gray-200"
              />
              <View className="flex-1 min-w-0">
                <Text className="text-base font-extrabold text-gray-900 leading-tight" numberOfLines={1}>
                  Nilai Pekerjaan
                </Text>
                <Text className="text-xs text-gray-500 font-medium mt-0.5" numberOfLines={1}>
                  Ulasan untuk {job.mitra?.name || "Mitra BISA"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Star Picker */}
          <View className="items-center py-2">
            <Text className="text-xs font-bold text-gray-600 mb-2">Berapa bintang kepuasanmu?</Text>
            <View className="flex-row items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= ratingValue;
                return (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRatingValue(star);
                    }}
                    activeOpacity={0.7}
                    className="p-1"
                  >
                    <Star
                      size={32}
                      color={filled ? "#f59e0b" : "#d1d5db"}
                      fill={filled ? "#f59e0b" : "transparent"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Input Komentar */}
          <View className="flex-col gap-1.5">
            <Text className="text-xs font-bold text-gray-700">Komentar Tambahan</Text>
            <TextInput
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Bagaimana hasil kerja mitra? (Opsional)"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="w-full h-20 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium"
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2 pt-1">
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.85}
              className="flex-1 py-3 rounded-full bg-gray-100 items-center justify-center"
            >
              <Text className="text-xs font-bold text-gray-700">Nanti Saja</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.88}
              className="flex-1 py-3 rounded-full bg-[#ff6b00] items-center justify-center shadow-md flex-row gap-1"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-xs font-black text-white">Kirim Ulasan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
