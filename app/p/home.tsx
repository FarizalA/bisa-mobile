import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  MapPin,
  Search,
  Briefcase,
  Plus,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser, setStoredUser } from "../../src/lib/user-storage";
import ProviderBottomNav from "../../src/components/ProviderBottomNav";
import NotificationSheet from "../../src/components/home/NotificationSheet";
import ProviderStatusCard from "../../src/components/provider-home/ProviderStatusCard";
import ProviderKpiGrid from "../../src/components/provider-home/ProviderKpiGrid";
import ProviderActiveJobs from "../../src/components/provider-home/ProviderActiveJobs";
import ProviderNearbyJobs from "../../src/components/provider-home/ProviderNearbyJobs";

export default function PartnerHomePage() {
  const router = useRouter();

  // User & State
  const [user, setUser] = useState<any>(null);
  const [isActive, setIsActive] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState({
    rating: 0,
    pendapatan: 0,
    orderSelesai: 0,
    pendingOffers: 0,
  });

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // 1. Load Session & User Profile
  useEffect(() => {
    const initSession = async () => {
      try {
        const stored: any = await getStoredUser();
        if (!stored || !stored.id) {
          router.replace("/(auth)/login" as any);
          return;
        }

        // Cek KYC Status seperti web
        if (
          stored.kyc_status &&
          stored.kyc_status !== "Terverifikasi" &&
          stored.kyc_status !== "approved"
        ) {
          router.replace("/waiting" as any);
          return;
        }

        setUser(stored);
        setIsActive(stored.is_active !== false && stored.is_available !== false);
      } catch (err) {
        console.error("Session init error:", err);
      }
    };
    initSession();
  }, []);

  // 2. Fetch Provider Data (Stats, Active Jobs, Nearby Feed, Notifikasi)
  const fetchProviderData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userId = user.id;

      // A. Ambil profil terupdate mitra
      const { data: userData } = await supabase
        .from("users_bisa")
        .select("rating, latitude, longitude, is_active, is_available, address, saldo")
        .eq("id", userId)
        .single();

      if (userData) {
        if (typeof userData.is_active === "boolean") {
          setIsActive(userData.is_active);
        }
      }

      // B. Ambil pendapatan & order selesai (status = 'selesai')
      const { data: completedJobs } = await supabase
        .from("pekerjaan_bisa")
        .select("budget, payment_method, payment_status, mitra_earnings")
        .eq("mitra_id", userId)
        .eq("status", "selesai");

      let pendapatan = 0;
      if (completedJobs) {
        completedJobs.forEach((job: any) => {
          if (job.payment_method === "COD") return;
          const amount =
            Number(job.mitra_earnings) ||
            parseInt(String(job.budget || "").replace(/[^0-9]/g, ""), 10) ||
            0;
          pendapatan += amount;
        });
      }

      // C. Ambil Job Aktif mitra (sedang berjalan)
      const { data: aJobs } = await supabase
        .from("pekerjaan_bisa")
        .select("*, pelanggan:users_bisa!pelanggan_id(name, phone, face_url)")
        .eq("mitra_id", userId)
        .in("status", [
          "mitra_ditemukan",
          "sedang_dikerjakan",
          "menunggu_konfirmasi_selesai",
        ]);

      if (aJobs) {
        setActiveJobs(aJobs);
      }

      // D. Ambil Permintaan Klien di Sekitar (Radius 25 km via RPC `get_nearby_jobs`)
      let feedJobs: any[] = [];
      let pendingOffersCount = 0;

      const lat = userData?.latitude || user?.latitude;
      const lon = userData?.longitude || user?.longitude;

      if (lat && lon) {
        const { data: nearbyData } = await supabase.rpc("get_nearby_jobs", {
          provider_lat: lat,
          provider_lon: lon,
          search_radius_km: 25,
          search_query: "",
          filter_kategori: "Semua Jasa",
        });

        if (nearbyData && Array.isArray(nearbyData)) {
          const now = Date.now();
          const filtered = nearbyData.filter((job: any) => {
            if (job.pelanggan_id === userId) return false;
            const expMatch = job.deskripsi?.match(/\[EXPIRES_AT\]:\s*(\d+)/);
            if (expMatch && now > parseInt(expMatch[1], 10)) return false;
            return true;
          });
          feedJobs = filtered.slice(0, 10);
          pendingOffersCount = filtered.length;
        }
      }

      // Fallback jika GPS belum tercatat di DB
      if (feedJobs.length === 0) {
        const { data: fallbackJobs } = await supabase
          .from("pekerjaan_bisa")
          .select("*, pelanggan:users_bisa!pelanggan_id(name, phone, face_url)")
          .eq("status", "mencari_mitra")
          .neq("pelanggan_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (fallbackJobs) {
          feedJobs = fallbackJobs;
          pendingOffersCount = fallbackJobs.length;
        }
      }

      setJobs(feedJobs);

      setStats({
        rating: userData?.rating || user?.rating || 0,
        pendapatan,
        orderSelesai: completedJobs?.length || 0,
        pendingOffers: pendingOffersCount,
      });

      // E. Fetch Notifikasi
      const { data: notifData } = await supabase
        .from("notifikasi_bisa")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (notifData) {
        setNotifications(notifData);
        setUnreadCount(notifData.filter((n: any) => !n.is_read).length);
      }
    } catch (err) {
      console.error("fetchProviderData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchProviderData();
  }, [user?.id, fetchProviderData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviderData();
  };

  // 3. Handle Toggle Ketersediaan (Aktif / Istirahat)
  const handleToggleActive = async () => {
    if (!user?.id || isToggling) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsToggling(true);
    const newStatus = !isActive;

    try {
      const { error } = await supabase
        .from("users_bisa")
        .update({ is_active: newStatus, is_available: newStatus })
        .eq("id", user.id);

      if (!error) {
        setIsActive(newStatus);
        const updated = { ...user, is_active: newStatus, is_available: newStatus };
        setUser(updated);
        await setStoredUser(updated);
      }
    } catch (e) {
      console.error("Toggle active err:", e);
    } finally {
      setIsToggling(false);
    }
  };

  // 4. Mark Notifikasi Dibaca
  const markAsRead = async (id: number) => {
    try {
      await supabase.from("notifikasi_bisa").update({ is_read: true }).eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("notifikasi_bisa")
        .update({ is_read: true })
        .eq("user_id", user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  // Filter Jobs berdasarkan input search jika diketik
  const displayJobs = searchQuery.trim()
    ? jobs.filter(
        (j) =>
          j.judul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.kategori?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* 1. Header: Logo BISA & Lonceng Notifikasi */}
      <View className="h-16 px-4 bg-white/95 border-b border-gray-100 flex-row items-center justify-between shadow-xs">
        <View className="flex-row items-center">
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 95, height: 32 }}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowNotifications(true);
          }}
          activeOpacity={0.7}
          className="relative w-11 h-11 rounded-full items-center justify-center"
        >
          <Bell size={22} color="#4b5563" />
          {unreadCount > 0 && (
            <View className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 rounded-full items-center justify-center">
              <Text className="text-white text-[10px] font-black">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#059669"]}
          />
        }
      >
        <View className="max-w-[440px] w-full self-center pb-6">
          {/* 2. User Bar */}
          <View className="px-4 pt-3 pb-2 flex-col gap-3.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View className="relative w-11 h-11">
                  {user?.face_url ? (
                    <Image
                      source={{ uri: user.face_url }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      className="bg-gray-100 shadow-sm"
                    />
                  ) : (
                    <Image
                      source={require("../../assets/mascot.png")}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      className="bg-emerald-100"
                    />
                  )}
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                </View>

                <View className="flex-col">
                  <Text className="text-[20px] font-bold text-gray-900 leading-tight">
                    Halo, {user?.name ? user.name.split(" ")[0] : "Mitra"} 👋
                  </Text>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <MapPin size={13} color="#059669" />
                    <Text
                      className="text-xs font-semibold text-gray-500 max-w-[240px]"
                      numberOfLines={1}
                    >
                      {user?.alamat_singkat || user?.address || "Lokasi Aktif"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Search Input Bar */}
            <View className="relative w-full">
              <View className="flex-row items-center bg-white h-11 px-3.5 rounded-full shadow-xs border border-gray-100">
                <Search size={18} color="#9ca3af" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Cari permintaan klien di sekitarmu..."
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-2.5 text-sm text-gray-900 font-medium"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Pill Switcher Mode — animasi halus slide */}
            <View className="bg-gray-100 p-1 rounded-full flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.replace("/c/home" as any);
                }}
                activeOpacity={0.8}
                className="flex-1 py-2 rounded-full flex-row items-center justify-center gap-1.5 z-10"
              >
                <Search size={15} color="#4b5563" />
                <Text className="text-sm font-semibold text-gray-600">
                  Cari Jasa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={1}
                className="flex-1 py-2 rounded-full bg-emerald-600 shadow-sm flex-row items-center justify-center gap-1.5 z-10"
              >
                <Briefcase size={15} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">
                  Tawarkan Jasa
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Section Container */}
          <View className="px-4 flex-col gap-4 mt-2">
            <ProviderStatusCard
              isActive={isActive}
              isToggling={isToggling}
              onToggle={handleToggleActive}
            />

            <ProviderKpiGrid
              stats={stats}
              activeJobsCount={activeJobs.length}
              onTarikDana={() => router.push("/p/dompet" as any)}
            />

            <ProviderActiveJobs
              activeJobs={activeJobs}
              onViewAll={() => router.push("/p/aktivitas" as any)}
              onJobDetail={(id) => router.push(`/p/aktivitas/${id}` as any)}
              onCall={(phone) => phone && Linking.openURL(`tel:${phone}`)}
            />

            <ProviderNearbyJobs
              loading={loading}
              refreshing={refreshing}
              jobs={displayJobs}
              onViewAll={() => router.push("/p/cari-kerja" as any)}
              onJobDetail={(id) => router.push(`/p/cari-kerja?jobId=${id}` as any)}
            />

            {/* Banner Maskot */}
            <View className="bg-white rounded-xl p-4 shadow-xs border border-emerald-100 flex-row items-center gap-3">
              <View className="w-16 h-16 items-center justify-center overflow-hidden">
                <Image
                  source={require("../../assets/mascot.png")}
                  style={{ width: 64, height: 64, borderRadius: 12 }}
                  resizeMode="contain"
                />
              </View>

              <View className="flex-1 flex-col gap-1">
                <Text className="text-sm font-extrabold text-gray-900 leading-tight">
                  Mau orderan lebih?
                </Text>
                <Text className="text-[11px] text-gray-600 leading-snug">
                  Buat service listing pertamamu agar klien bisa langsung memesan jasamu!
                </Text>

                <TouchableOpacity
                  onPress={() => router.push("/p/profil" as any)}
                  className="mt-1.5 self-start h-8 px-3 rounded-full bg-slate-900 flex-row items-center gap-1 shadow-xs"
                >
                  <Plus size={13} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">
                    Buat Listing
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Shared Notification Sheet */}
      <NotificationSheet
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        badgeCount={unreadCount}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        variant="provider"
        onOpenFullPage={() => {
          setShowNotifications(false);
          router.push("/p/notifikasi" as any);
        }}
      />

      <ProviderBottomNav active="home" />
    </SafeAreaView>
  );
}
