import React from "react";
import { Tabs } from "expo-router";
import ProviderBottomNav from "../../src/components/ProviderBottomNav";

export default function MitraLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => {
        const routeName = props.state.routes[props.state.index]?.name || "home";
        const activeTab = (
          ["home", "cari-kerja", "aktivitas", "chat", "profil"].includes(routeName)
            ? (routeName === "cari-kerja" ? "cari" : routeName)
            : "home"
        ) as any;

        const isSubPage =
          ["direct-chat", "dompet", "langganan", "misi", "ulasan"].some((s) => routeName.startsWith(s)) ||
          (routeName.startsWith("profil") && routeName !== "profil") ||
          (routeName.startsWith("aktivitas") && routeName !== "aktivitas");
        if (isSubPage) return null;

        return <ProviderBottomNav active={activeTab} />;
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Beranda" }} />
      <Tabs.Screen name="cari-kerja" options={{ title: "Cari Job" }} />
      <Tabs.Screen name="aktivitas" options={{ title: "Aktivitas" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />

      <Tabs.Screen name="direct-chat/[conversationId]" options={{ href: null }} />
      <Tabs.Screen name="dompet" options={{ href: null }} />
      <Tabs.Screen name="bantuan" options={{ href: null }} />
      <Tabs.Screen name="langganan" options={{ href: null }} />
      <Tabs.Screen name="misi" options={{ href: null }} />
      <Tabs.Screen name="ulasan" options={{ href: null }} />
    </Tabs>
  );
}
