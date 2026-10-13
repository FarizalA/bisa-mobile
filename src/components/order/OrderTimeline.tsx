import React from "react";
import { View, Text } from "react-native";
import { Check, Clock, X } from "lucide-react-native";
import type { TimelineStep } from "../../lib/invoice";

// Timeline histori pesanan (Fase 5). Render vertikal dengan indikator status per langkah.
export function OrderTimeline({ steps, compact = false }: { steps: TimelineStep[]; compact?: boolean }) {
  if (!steps || steps.length === 0) return null;

  const dotStyle = (state: TimelineStep["state"]) => {
    switch (state) {
      case "done": return { bg: "#10B981", border: "#10B981", icon: "check" as const };
      case "active": return { bg: "#FFF7ED", border: "#FF6B00", icon: "clock" as const };
      case "cancelled": return { bg: "#FEE2E2", border: "#EF4444", icon: "x" as const };
      default: return { bg: "#F3F4F6", border: "#E5E7EB", icon: null };
    }
  };

  const labelColor = (state: TimelineStep["state"]) => {
    if (state === "pending") return "#9CA3AF";
    if (state === "cancelled") return "#B91C1C";
    if (state === "active") return "#C2410C";
    return "#111827";
  };

  return (
    <View>
      {steps.map((step, idx) => {
        const d = dotStyle(step.state);
        const isLast = idx === steps.length - 1;
        const lineColor = step.state === "done" ? "#A7F3D0" : "#E5E7EB";
        return (
          <View key={step.key} className="flex-row">
            <View className="items-center" style={{ width: 26 }}>
              <View
                className="items-center justify-center"
                style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: d.bg, borderWidth: 2, borderColor: d.border }}
              >
                {d.icon === "check" && <Check size={12} color="#fff" strokeWidth={3} />}
                {d.icon === "clock" && <Clock size={12} color="#FF6B00" strokeWidth={2.5} />}
                {d.icon === "x" && <X size={12} color="#EF4444" strokeWidth={3} />}
              </View>
              {!isLast && <View style={{ flex: 1, width: 2, backgroundColor: lineColor, minHeight: compact ? 18 : 26 }} />}
            </View>
            <View className="flex-1 pb-3 pl-1">
              <Text className="text-[13px] font-bold" style={{ color: labelColor(step.state) }}>{step.label}</Text>
              {!!step.description && step.state !== "pending" && (
                <Text className="text-[11px] text-gray-500 mt-0.5">{step.description}</Text>
              )}
              {!!step.timestamp && step.state !== "pending" && (
                <Text className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(step.timestamp).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
