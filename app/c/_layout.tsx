import React from "react";
import { Tabs } from "expo-router";
import BottomNav from "../../src/components/BottomNav";

export default function ClientLayout() {
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
          ["home", "radar", "posting", "aktivitas", "profil"].includes(routeName)
            ? routeName
            : "home"
        ) as any;

        // Sembunyikan bottom bar di sub-halaman tertentu jika bukan tab utama
        const isSubPage = ["kategori", "chat", "dompet", "tersimpan", "direct-chat", "pekerjaan", "ulasan"].some((s) => routeName.startsWith(s));
        if (isSubPage) return null;

        return <BottomNav active={activeTab} />;
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Beranda" }} />
      <Tabs.Screen name="radar" options={{ title: "Radar" }} />
      <Tabs.Screen name="posting" options={{ title: "Posting" }} />
      <Tabs.Screen name="aktivitas" options={{ title: "Aktivitas" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />

      {/* Sembunyikan route non-tab dari tab bar */}
      <Tabs.Screen name="kategori" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="dompet" options={{ href: null }} />
      <Tabs.Screen name="bantuan" options={{ href: null }} />
      <Tabs.Screen name="tersimpan" options={{ href: null }} />
      <Tabs.Screen name="direct-chat/[conversationId]" options={{ href: null }} />
      <Tabs.Screen name="pekerjaan/[id]/kandidat" options={{ href: null }} />
      <Tabs.Screen name="ulasan/index" options={{ href: null }} />
      <Tabs.Screen name="ulasan/[jobId]/index" options={{ href: null }} />
      <Tabs.Screen name="ulasan/[jobId]/sukses" options={{ href: null }} />
    </Tabs>
  );
}
