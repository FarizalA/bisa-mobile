import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthForm } from "../../src/hooks/useAuth";
import { AuthHeader } from "../../src/components/auth/AuthHeader";
import { WelcomeCard } from "../../src/components/auth/WelcomeCard";
import { TrustBadges } from "../../src/components/auth/TrustBadges";
import { SupportCard, AuthFooter } from "../../src/components/auth/SupportCard";
import { GoogleIcon } from "../../src/components/ui/GoogleIcon";

export default function LoginPage() {
  const router = useRouter();
  const { email, setEmail, password, setPassword, loading, fieldErrors, serverError, submit } =
    useAuthForm("login");

  return (
    <SafeAreaView className="flex-1 bg-[#fafafa]">
      <AuthHeader />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4 max-w-[420px] w-full self-center">
          <WelcomeCard />

          {/* Form Box */}
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            {/* Email Field */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-[13px] font-bold text-gray-700">Email atau Nomor WhatsApp/HP</Text>
                <Text className="text-[11px] text-green-600 font-medium">✓ Aman & Cepat</Text>
              </View>
              <View
                className={`h-14 bg-gray-50 rounded-xl px-4 border ${
                  fieldErrors.email ? "border-red-300" : "border-gray-200"
                } justify-center`}
              >
                <TextInput
                  placeholder="email@contoh.com atau 0812..."
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  className="text-[16px] text-gray-900 h-full"
                  style={{ outlineStyle: "none" } as any}
                />
              </View>
              {fieldErrors.email && (
                <Text className="text-[11px] text-red-500 mt-1 ml-1">{fieldErrors.email}</Text>
              )}
            </View>

            {serverError ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-[13px]">{serverError}</Text>
              </View>
            ) : null}

            {/* Password Field */}
            <View className="mb-6">
              <Text className="text-[13px] font-bold text-gray-700 mb-1.5">Kata Sandi</Text>
              <View
                className={`h-14 bg-gray-50 rounded-xl px-4 border ${
                  fieldErrors.password ? "border-red-300" : "border-gray-200"
                } justify-center`}
              >
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  className="text-[16px] text-gray-900 h-full"
                  style={{ outlineStyle: "none" } as any}
                />
              </View>
              {fieldErrors.password && (
                <Text className="text-[11px] text-red-500 mt-1 ml-1">{fieldErrors.password}</Text>
              )}
            </View>

            {/* Tombol Lanjutkan */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                submit();
              }}
              disabled={loading}
              activeOpacity={0.9}
              className={`w-full h-14 rounded-full items-center justify-center flex-row shadow-lg shadow-orange-300 ${
                loading ? "bg-orange-300" : "bg-[#ff6b00]"
              }`}
            >
              <Text className="text-white text-lg font-bold mr-2">
                {loading ? "Memproses..." : "Lanjutkan"}
              </Text>
              {!loading && <ArrowRight size={20} color="white" />}
            </TouchableOpacity>

            {/* Switch ke Daftar */}
            <View className="mt-4 items-center">
              <Text className="text-[13px] text-gray-600">
                Belum punya akun?{" "}
                <Link href="/(auth)/daftar" asChild>
                  <Text className="font-bold text-orange-600">Daftar Sekarang</Text>
                </Link>
              </Text>
            </View>

            {/* OR Separator */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <View className="bg-white px-3 py-1 rounded-full border border-gray-100 mx-2">
                <Text className="text-[10px] text-gray-400 font-bold uppercase">ATAU</Text>
              </View>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {/* Tombol Google */}
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full h-12 bg-white border border-gray-300 rounded-full flex-row items-center justify-center gap-3 mb-3"
            >
              <GoogleIcon size={18} />
              <Text className="text-gray-700 font-bold text-base">Lanjutkan dengan Google</Text>
            </TouchableOpacity>

            {/* Tombol Masuk Tanpa Login (Exploration Mode) */}
            <TouchableOpacity
              onPress={() => router.push("/c/home" as any)}
              activeOpacity={0.7}
              className="items-center py-2 mt-2"
            >
              <Text className="text-[13px] font-semibold text-gray-600 text-center">
                Jelajahi Aplikasi →
              </Text>
            </TouchableOpacity>
          </View>

          <TrustBadges />
          <SupportCard />
          <AuthFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
