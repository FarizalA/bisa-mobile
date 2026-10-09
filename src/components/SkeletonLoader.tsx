import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

export function SkeletonBox({ className = "", style }: { className?: string; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={`bg-gray-200 rounded-xl ${className}`}
    />
  );
}

export function AktivitasSkeleton() {
  return (
    <View className="gap-3 px-4 pt-3">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm gap-3">
          <View className="flex-row items-center justify-between">
            <SkeletonBox className="w-24 h-4 rounded-md" />
            <SkeletonBox className="w-20 h-5 rounded-full" />
          </View>
          <SkeletonBox className="w-3/4 h-5 rounded-md mt-1" />
          <SkeletonBox className="w-1/2 h-4 rounded-md" />
          <View className="flex-row items-center justify-between border-t border-gray-100 pt-3 mt-1">
            <SkeletonBox className="w-28 h-6 rounded-lg" />
            <SkeletonBox className="w-24 h-9 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function JobCardSkeleton() {
  return (
    <View className="gap-3 px-4 pt-3">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm gap-3">
          <View className="flex-row items-center gap-3">
            <SkeletonBox className="w-12 h-12 rounded-2xl" />
            <View className="flex-1 gap-1.5">
              <SkeletonBox className="w-3/4 h-4 rounded-md" />
              <SkeletonBox className="w-1/2 h-3 rounded-md" />
            </View>
          </View>
          <SkeletonBox className="w-full h-10 rounded-xl" />
          <View className="flex-row justify-between items-center border-t border-gray-100 pt-2.5">
            <SkeletonBox className="w-24 h-5 rounded-md" />
            <SkeletonBox className="w-20 h-8 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}
