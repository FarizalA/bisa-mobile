import { View, Text } from "react-native";

export function AuthHeader() {
  return (
    <View className="h-14 px-4 flex-row items-center bg-white border-b border-gray-100 shadow-sm">
      <Text className="text-xl font-bold text-gray-800">Login Register</Text>
    </View>
  );
}
