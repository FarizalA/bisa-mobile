import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ProfilRedirectPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (id) {
      router.replace(`/p/profil/${id}` as any);
    }
  }, [id, router]);

  return (
    <View className="flex-1 bg-[#faf8ff] items-center justify-center">
      <ActivityIndicator size="large" color="#FF6B00" />
    </View>
  );
}
