import React from "react";
import { View } from "react-native";

export function Skeleton({ style, className }: { style?: any; className?: string }) {
  return <View className={`bg-gray-200 animate-pulse ${className || ""}`} style={style} />;
}

export function ProviderCardSkeleton({ variant = "grid" }: { variant?: "carousel" | "grid" }) {
  if (variant === "carousel") {
    return (
      <View className="w-[170px] bg-white border border-gray-100 rounded-2xl overflow-hidden mr-3 p-3 gap-3">
        <View className="flex-row items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <View className="flex-1 gap-1.5">
            <Skeleton className="h-3 rounded w-3/4" />
            <Skeleton className="h-2.5 rounded w-1/2" />
          </View>
        </View>
        <View className="gap-1.5">
          <Skeleton className="h-2.5 rounded" />
          <Skeleton className="h-2.5 rounded w-5/6" />
        </View>
        <View className="flex-row items-center justify-between pt-1">
          <View className="gap-1">
            <Skeleton className="h-2 w-12 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </View>
          <Skeleton className="w-7 h-7 rounded-full" />
        </View>
      </View>
    );
  }
  return (
    <View className="w-[48%] bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
      <Skeleton style={{ width: "100%", height: 128 }} />
      <View className="p-3.5 gap-2">
        <Skeleton className="h-3.5 rounded" />
        <Skeleton className="h-3 rounded w-2/3" />
        <View className="flex-row justify-between mt-1">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-10 rounded" />
        </View>
        <View className="flex-row justify-between items-center mt-1">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="w-7 h-7 rounded-full" />
        </View>
      </View>
    </View>
  );
}
