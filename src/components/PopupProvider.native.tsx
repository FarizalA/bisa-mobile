import React, { createContext, useContext, useState, useCallback } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle, Trash2 } from "lucide-react-native";

type PopupType = "success" | "error" | "warning" | "info" | "confirm" | "delete";
interface PopupOptions { title?: string; message: string; type?: PopupType; onConfirm?: () => void; confirmText?: string; cancelText?: string; }
interface PopupCtx { showPopup: (o: PopupOptions) => void; hidePopup: () => void; }
const PopupContext = createContext<PopupCtx | undefined>(undefined);
export const usePopup = () => {
  const c = useContext(PopupContext);
  if (!c) throw new Error("usePopup must be within PopupProvider");
  return c;
};
const iconMap: Record<PopupType, { bg: string; color: string }> = {
  success: { bg: "#ECFDF5", color: "#059669" },
  error: { bg: "#FEF2F2", color: "#DC2626" },
  warning: { bg: "#FFFBEB", color: "#D97706" },
  info: { bg: "#F9FAFB", color: "#374151" },
  confirm: { bg: "#FFF7ED", color: "#FF6B00" },
  delete: { bg: "#FEF2F2", color: "#DC2626" },
};
function PopupIcon({ type }: { type: PopupType }) {
  const m = iconMap[type];
  if (type === "success") return <View style={{ backgroundColor: m.bg }} className="w-11 h-11 rounded-full items-center justify-center"><CheckCircle2 size={22} color={m.color} /></View>;
  if (type === "error") return <View style={{ backgroundColor: m.bg }} className="w-11 h-11 rounded-full items-center justify-center"><AlertCircle size={22} color={m.color} /></View>;
  if (type === "warning") return <View style={{ backgroundColor: m.bg }} className="w-11 h-11 rounded-full items-center justify-center"><AlertTriangle size={22} color={m.color} /></View>;
  if (type === "delete") return <View style={{ backgroundColor: m.bg }} className="w-11 h-11 rounded-full items-center justify-center"><Trash2 size={20} color={m.color} /></View>;
  if (type === "confirm") return <View style={{ backgroundColor: m.bg }} className="w-11 h-11 rounded-full items-center justify-center"><HelpCircle size={22} color={m.color} /></View>;
  return <View style={{ backgroundColor: m.bg }} className="w-11 h-11 rounded-full items-center justify-center"><Info size={22} color={m.color} /></View>;
}
export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [popup, setPopup] = useState<(PopupOptions & { id: number }) | null>(null);
  const showPopup = useCallback((o: PopupOptions) => { setPopup({ ...o, id: Date.now() }); if (!o.onConfirm) setTimeout(() => setPopup(null), 2800); }, []);
  const hidePopup = useCallback(() => setPopup(null), []);
  const t = (popup?.type || "info") as PopupType;
  const titleFallback = t === "error" ? "Terjadi Kesalahan" : t === "success" ? "Berhasil" : t === "warning" ? "Perhatian" : t === "delete" ? "Hapus?" : t === "confirm" ? "Konfirmasi" : "Info";
  const btnColor = t === "success" ? "#059669" : t === "error" || t === "delete" ? "#DC2626" : t === "warning" ? "#D97706" : t === "confirm" ? "#FF6B00" : "#111827";
  return (
    <PopupContext.Provider value={{ showPopup, hidePopup }}>
      {children}
      <Modal visible={!!popup} transparent animationType="fade" onRequestClose={hidePopup}>
        <View className="flex-1 bg-black/30 items-center justify-center p-4">
          <View className="w-full max-w-[360px] bg-white rounded-[20px] overflow-hidden border border-gray-100">
            <View className="px-6 pt-6 pb-5 items-center">
              <PopupIcon type={t} />
              <Text className="text-[15px] font-extrabold text-gray-900 text-center leading-tight mt-3">{popup?.title || titleFallback}</Text>
              <Text className="text-[13px] text-gray-500 text-center leading-relaxed mt-1.5">{popup?.message}</Text>
              <View className="w-full mt-5 gap-2">
                {popup?.onConfirm ? (
                  <>
                    <TouchableOpacity onPress={() => { popup?.onConfirm?.(); hidePopup(); }} activeOpacity={0.9} style={{ backgroundColor: btnColor } as any} className="w-full h-11 rounded-full items-center justify-center"><Text className="text-white font-bold text-sm">{popup.confirmText || "Ya, Lanjutkan"}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={hidePopup} activeOpacity={0.9} className="w-full h-11 rounded-full bg-gray-100 items-center justify-center"><Text className="text-gray-700 font-bold text-sm">{popup.cancelText || "Batal"}</Text></TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={hidePopup} activeOpacity={0.9} style={{ backgroundColor: btnColor } as any} className="w-full h-11 rounded-full items-center justify-center"><Text className="text-white font-bold text-sm">Oke, Mengerti</Text></TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </PopupContext.Provider>
  );
}
