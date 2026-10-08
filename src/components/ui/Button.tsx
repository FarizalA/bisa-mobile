import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import * as Haptics from "expo-haptics";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  children: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  iconRight?: React.ReactNode;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  haptic = true,
  iconRight,
}: Props) {
  const isDisabled = disabled || loading;

  const base = "w-full h-12 rounded-full items-center justify-center flex-row";
  const variants: Record<Variant, string> = {
    primary: "bg-[#ff6b00] active:bg-[#a04100]",
    secondary: "bg-white border border-gray-200 active:bg-gray-50",
    ghost: "bg-transparent active:bg-gray-100",
  };

  const textColor = variant === "primary" ? "text-white" : "text-[#131b2e]";

  return (
    <TouchableOpacity
      onPress={() => {
        if (isDisabled) return;
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      disabled={isDisabled}
      activeOpacity={0.88}
      className={`${base} ${variants[variant]} ${isDisabled ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "white" : "#131b2e"} />
      ) : (
        <View className="flex-row items-center justify-center">
          <Text className={`${textColor} text-[16px] font-bold`}>{children}</Text>
          {iconRight ? <View className="ml-2">{iconRight}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
