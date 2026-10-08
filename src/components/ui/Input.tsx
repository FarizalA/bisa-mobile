import { TextInput, Text, View, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";

type Props = {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  editable?: boolean;
};

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
  editable = true,
}: Props) {
  const [show, setShow] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View className="w-full mb-3">
      {label ? <Text className="text-[13px] font-bold text-[#131b2e] mb-1.5 ml-1">{label}</Text> : null}
      <View
        className={`flex-row items-center w-full h-12 bg-white rounded-2xl border px-4 ${
          error ? "border-red-400" : "border-gray-200"
        } ${!editable ? "opacity-60" : ""}`}
      >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !show}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          className="flex-1 text-[15px] text-[#131b2e] h-full"
          style={{ outlineStyle: "none" } as any}
        />
        {isPassword ? (
          <TouchableOpacity onPress={() => setShow((s) => !s)} hitSlop={12} className="ml-2 p-1">
            {show ? <EyeOff size={18} color="#6b7280" /> : <Eye size={18} color="#6b7280" />}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text className="text-[12px] text-red-600 mt-1 ml-1">{error}</Text> : null}
    </View>
  );
}
