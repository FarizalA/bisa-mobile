import React, { createContext, useContext, useState, useCallback } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { usePathname } from "expo-router";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle, Trash2 } from "lucide-react-native";

export type PopupType = "success" | "error" | "warning" | "info" | "confirm" | "delete";
export type PopupTheme = "client" | "provider" | "orange" | "green";

export interface PopupOptions {
  title?: string;
  message: string;
  type?: PopupType;
  theme?: PopupTheme;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  autoCloseMs?: number;
}

interface PopupCtx {
  showPopup: (o: PopupOptions) => void;
  hidePopup: () => void;
  showAlert: (title: string, message: string, type?: PopupType, theme?: PopupTheme) => void;
}

const PopupContext = createContext<PopupCtx | undefined>(undefined);

export const usePopup = () => {
  const c = useContext(PopupContext);
  if (!c) throw new Error("usePopup must be within PopupProvider");
  return c;
};

function PopupIcon({ type, themeColor, themeBg }: { type: PopupType; themeColor: string; themeBg: string }) {
  if (type === "success") {
    return (
      <View style={{ backgroundColor: themeBg }} className="w-13 h-13 w-[52px] h-[52px] rounded-2xl items-center justify-center">
        <CheckCircle2 size={26} color={themeColor} />
      </View>
    );
  }
  if (type === "error") {
    return (
      <View className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-red-50 items-center justify-center">
        <AlertCircle size={26} color="#DC2626" />
      </View>
    );
  }
  if (type === "warning") {
    return (
      <View className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-amber-50 items-center justify-center">
        <AlertTriangle size={26} color="#D97706" />
      </View>
    );
  }
  if (type === "delete") {
    return (
      <View className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-red-50 items-center justify-center">
        <Trash2 size={24} color="#DC2626" />
      </View>
    );
  }
  if (type === "confirm") {
    return (
      <View style={{ backgroundColor: themeBg }} className="w-13 h-13 w-[52px] h-[52px] rounded-2xl items-center justify-center">
        <HelpCircle size={26} color={themeColor} />
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: themeBg }} className="w-13 h-13 w-[52px] h-[52px] rounded-2xl items-center justify-center">
      <Info size={26} color={themeColor} />
    </View>
  );
}

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [popup, setPopup] = useState<(PopupOptions & { id: number }) | null>(null);
  const pathname = usePathname() || "";

  const showPopup = useCallback((o: PopupOptions) => {
    setPopup({ ...o, id: Date.now() });
    if (!o.onConfirm) {
      const ms = o.autoCloseMs || (o.type === "error" || o.type === "warning" ? 3500 : 2800);
      setTimeout(() => setPopup(null), ms);
    }
  }, []);

  const hidePopup = useCallback(() => setPopup(null), []);

  const showAlert = useCallback(
    (title: string, message: string, type: PopupType = "info", theme?: PopupTheme) => {
      showPopup({ title, message, type, theme });
    },
    [showPopup]
  );

  // Auto detect route context (/p/ = Provider (Green), /c/ = Client (Orange))
  const isProviderRoute = pathname.startsWith("/p/");
  const isProvider = popup?.theme === "provider" || popup?.theme === "green" || (!popup?.theme && isProviderRoute);

  const themeColor = isProvider ? "#059669" : "#FF6B00";
  const themeBg = isProvider ? "#ECFDF5" : "#FFF7ED";

  const t = (popup?.type || "info") as PopupType;

  const titleFallback =
    t === "error"
      ? "Terjadi Kesalahan"
      : t === "success"
      ? "Berhasil"
      : t === "warning"
      ? "Perhatian"
      : t === "delete"
      ? "Hapus Data?"
      : t === "confirm"
      ? "Konfirmasi"
      : "Informasi";

  const btnColor =
    t === "error" || t === "delete"
      ? "#DC2626"
      : t === "warning"
      ? "#D97706"
      : themeColor;

  return (
    <PopupContext.Provider value={{ showPopup, hidePopup, showAlert }}>
      {children}
      <Modal visible={!!popup} transparent animationType="fade" onRequestClose={hidePopup}>
        <View className="flex-1 bg-black/45 items-center justify-center p-5">
          <View className="w-full max-w-[340px] bg-white rounded-[26px] overflow-hidden border border-gray-100 shadow-2xl">
            {/* Top Indicator Accent Bar */}
            <View style={{ backgroundColor: btnColor }} className="h-1.5 w-full" />

            <View className="px-6 pt-5 pb-6 items-center">
              <PopupIcon type={t} themeColor={themeColor} themeBg={themeBg} />

              <Text className="text-[16px] font-black text-gray-900 text-center leading-tight mt-3">
                {popup?.title || titleFallback}
              </Text>

              <Text className="text-[13px] font-medium text-gray-600 text-center leading-relaxed mt-2 px-1">
                {popup?.message}
              </Text>

              <View className="w-full mt-6 gap-2.5">
                {popup?.onConfirm ? (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        const cb = popup?.onConfirm;
                        hidePopup();
                        cb?.();
                      }}
                      activeOpacity={0.88}
                      style={{ backgroundColor: btnColor }}
                      className="w-full h-11 rounded-xl items-center justify-center shadow-md shadow-gray-200"
                    >
                      <Text className="text-white font-extrabold text-[13px]">
                        {popup.confirmText || "Ya, Lanjutkan"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={hidePopup}
                      activeOpacity={0.85}
                      className="w-full h-11 rounded-xl bg-gray-100 items-center justify-center border border-gray-200"
                    >
                      <Text className="text-gray-700 font-bold text-[13px]">
                        {popup.cancelText || "Batal"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={hidePopup}
                    activeOpacity={0.88}
                    style={{ backgroundColor: btnColor }}
                    className="w-full h-11 rounded-xl items-center justify-center shadow-md shadow-gray-200"
                  >
                    <Text className="text-white font-extrabold text-[13px]">Oke, Mengerti</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </PopupContext.Provider>
  );
}
