import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PekerjaanRedirect() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/p/cari-kerja?jobId=${id}` as any);
    } else {
      router.replace("/p/cari-kerja" as any);
    }
  }, [id]);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator size="large" color="#059669" />
    </View>
  );
}
