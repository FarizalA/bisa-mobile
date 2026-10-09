import React from "react";
import { View, Text } from "react-native";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";
import { KycGateModal } from "../KycGateModal.native";

export default function CariKerjaModals({ logic }: { logic: CariKerjaLogic }) {
  const { toast, kycGate } = logic;

  return (
    <>
      {/* Custom Toast Bar */}
      {toast.show && (
        <View className="absolute top-12 left-4 right-4 z-50">
          <View
            className={`px-4 py-3 rounded-2xl shadow-xl flex-row items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-600"
                : toast.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }`}
          >
            <Text className="text-sm">
              {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}
            </Text>
            <Text className="text-xs font-bold text-white flex-1">{toast.message}</Text>
          </View>
        </View>
      )}

      {/* KYC Soft-Gate Modal */}
      {kycGate && (
        <KycGateModal
          visible={kycGate.modalVisible}
          onClose={kycGate.closeModal}
          actionContext={kycGate.actionContext}
          isLoggedIn={kycGate.isLoggedIn}
          kycStatus={kycGate.kycStatus}
        />
      )}
    </>
  );
}
