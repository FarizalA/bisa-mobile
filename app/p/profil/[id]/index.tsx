import React, { useRef, useState } from "react";

// Link/gambar QRIS donasi dari imgur 4dEhfTK
const QRIS_DONASI_URL: string = "https://i.imgur.com/4dEhfTK.png";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Share,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Share2,
  Bookmark,
  BookmarkCheck,
  Star,
  MapPin,
  Clock,
  Zap,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  MessageSquare,
  ShoppingBag,
  Heart,
  QrCode,
  Banknote,
  Camera,
  AlertTriangle,
  Lock,
  Crown,
  Medal,
  Award,
  Stars,
  Trophy,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useProfilPublicLogic } from "../../../../src/hooks/useProfilPublicLogic";
import { safeBack } from "@/lib/navigation";



const RankIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  // 1:1 web: Basic=military_tech(Medal), Intermediate=workspace_premium(Award), Advanced=stars(Stars), Expert=emoji_events(Trophy), Legend=crown(Crown)
  if (name === "Crown") return <Crown size={size} color={color} fill={color} />;
  if (name === "Award") return <Award size={size} color={color} fill={color} />;
  if (name === "Trophy") return <Trophy size={size} color={color} fill={color} />;
  if (name === "Stars") return <Stars size={size} color={color} fill={color} />;
  if (name === "Zap") return <Zap size={size} color={color} fill={color} />;
  return <Medal size={size} color={color} fill={color} />;
};

export default function MitraPublicProfilePage() {
  const { id } = useLocalSearchParams();
  const [showQrisDonasi, setShowQrisDonasi] = useState(false);
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const logic = useProfilPublicLogic(String(id));
  const {
    userProfile,
    reviews,
    services,
    portfolio,
    gallery,
    galleryIndex,
    setGalleryIndex,
    selectedServiceId,
    setSelectedServiceId,
    loading,
    isOwnProfile,
    isFavorite,
    favLoading,
    portfolioModal,
    setPortfolioModal,
    showAllServices,
    setShowAllServices,
    isDescExpanded,
    setIsDescExpanded,
    isOrdering,
    showCheckoutModal,
    setShowCheckoutModal,
    showReviewsSheet,
    setShowReviewsSheet,
    reviewsFilterRating,
    setReviewsFilterRating,
    paymentMethod,
    setPaymentMethod,
    donationAmount,
    setDonationAmount,
    codDonationEnabled,
    codPaymentEnabled,
    keahlianList,
    rank,
    avgRating,
    ratingCount,
    fiveStarPct,
    onTimeVal,
    responseVal,
    warrantyVal,
    availabilityText,
    isAvailableGreen,
    selectedService,
    isFeaturedActive,
    toggleFavorite,
    handleShare,
    openCheckout,
    handleStartDirectChat,
    handleCheckoutOrder,
    router,
  } = logic;

  const galleryScrollRef = useRef<ScrollView>(null);

  if (loading) {
    return (
      <View className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator color="#FF6B00" size="large" />
        <Text className="text-xs text-gray-400 font-bold mt-2">Memuat Profil Penyedia...</Text>
      </View>
    );
  }

  if (userProfile?.is_banned || userProfile?.status === "Dibekukan") {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Lock size={48} color="#DC2626" />
        <Text className="text-lg font-black text-gray-900 mt-4">Profil Ditangguhkan</Text>
        <Text className="text-xs text-gray-500 text-center mt-2">Mohon maaf, profil ini sedang ditangguhkan Administrator.</Text>
        <TouchableOpacity onPress={() => safeBack(router, "/c/home")} className="mt-6 px-8 py-3 bg-gray-900 rounded-2xl"><Text className="text-white font-bold">Kembali</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-[#faf8ff]">
      <SafeAreaView edges={["top"]} className="bg-[#faf8ff] border-b border-gray-100 z-30">
        <View className="h-14 px-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => safeBack(router, "/c/home")} className="w-9 h-9 rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm"><ArrowLeft size={18} color="#131B2E" /></TouchableOpacity>
          <Text className="text-[15px] font-extrabold text-[#131B2E]">Profil Penyedia Jasa</Text>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={handleShare} className="w-9 h-9 rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm"><Share2 size={16} color="#131B2E" /></TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} disabled={favLoading} className="w-9 h-9 rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm">{isFavorite ? <BookmarkCheck size={18} color="#FF6B00" /> : <Bookmark size={18} color="#131B2E" />}</TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View className="relative w-full h-72 bg-gray-100 overflow-hidden">
          <ScrollView
            ref={galleryScrollRef}
            horizontal
            pagingEnabled
            onScroll={(e) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / screenW))}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 0 }}
          >
            {gallery.map((g, idx) => (
              <View key={idx} style={{ width: screenW }} className="h-full overflow-hidden bg-gray-100">
                {g.image_url ? <Image source={{ uri: g.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Image source={require("../../../../assets/maskot/maskot mengacungkan jempol.png")} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
              </View>
            ))}
          </ScrollView>
          <View className="absolute bottom-6 right-4 px-2 py-1 bg-[#131B2E] rounded-full flex-row items-center gap-1">
            <Camera size={12} color="#fff" />
            <Text className="text-[11px] font-bold text-white">{galleryIndex + 1}/{gallery.length}</Text>
          </View>
        </View>

        <View className="px-3 -mt-8 z-10 w-full">
          <View
            className="bg-white rounded-[24px] p-5"
            style={{
              elevation: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-start gap-4">
              <View>
                {isFeaturedActive ? (
                  <LinearGradient colors={["#8B5CF6", "#D946EF", "#FBBF24"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 2, borderRadius: 999 }}>
                    <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-white">{userProfile.face_url ? <Image source={{ uri: userProfile.face_url }} className="w-full h-full" /> : <Image source={require("../../../../assets/maskot/maskot mengacungkan jempol.png")} className="w-full h-full" />}</View>
                  </LinearGradient>
                ) : (
                  <View className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm">{userProfile.face_url ? <Image source={{ uri: userProfile.face_url }} className="w-full h-full" /> : <Image source={require("../../../../assets/maskot/maskot mengacungkan jempol.png")} className="w-full h-full" />}</View>
                )}
                {userProfile.is_trusted && <View style={{ position: "absolute", bottom: -2, right: -2 }} className="w-5 h-5 rounded-full bg-[#10B981] items-center justify-center border-2 border-white"><Check size={11} color="#fff" strokeWidth={3} /></View>}
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-[17px] font-extrabold text-[#131B2E] leading-snug" numberOfLines={2}>{userProfile.name}</Text>
                <View className="flex-row items-center mt-1 flex-wrap">
                  <View
                    className="rounded-full flex-row items-center"
                    style={{
                      backgroundColor: (rank as any).bg || "rgb(243, 244, 246)",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      gap: 4,
                    }}
                  >
                    <RankIcon name={(rank as any).icon || "Medal"} size={12} color={(rank as any).color || "rgb(156, 163, 175)"} />
                    <Text
                      className="text-[12px] font-semibold"
                      style={{ color: (rank as any).color || "rgb(156, 163, 175)" }}
                    >
                      Mitra {(rank as any).label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View className="flex-col gap-1 mt-1">
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1">
                  <MapPin size={16} color="#ff6b00" />
                  <Text className="text-[12px] text-[#5a4136] truncate" numberOfLines={1}>{userProfile.alamat_singkat || userProfile.address || "Lokasi belum diatur"}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Star size={16} color="#feb700" fill="#feb700" />
                  <Text className="text-[12px] font-bold text-[#131b2e]">{avgRating}</Text>
                  <Text className="text-[12px] text-[#5a4136]">({ratingCount})</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <View className={`w-2 h-2 rounded-full ${isAvailableGreen ? "bg-[#10B981]" : "bg-gray-400"}`} />
                <Text className={`text-[12px] font-semibold ${isAvailableGreen ? "text-[#10B981]" : "text-gray-600"}`}>{availabilityText}</Text>
              </View>
            </View>
            <View className="pt-3 border-t border-gray-100 mt-1 flex-col" style={{ gap: 8 }}>
              <Text className="text-[14px] font-bold text-[#131b2e]">Ringkasan Profil</Text>
              <Text
                className="text-[13px] text-gray-500 font-medium"
                style={{ textAlign: "left", lineHeight: 21 }}
                numberOfLines={isDescExpanded ? undefined : 3}
              >
                {userProfile.mitra_description || (userProfile as any).bio || "Mitra profesional yang siap membantu kebutuhan Anda dengan kualitas terbaik."}
              </Text>
              {((userProfile.mitra_description || (userProfile as any).bio || "").length > 100) && (
                <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)}>
                  <Text className="text-[13px] font-bold text-[#ff6b00]">{isDescExpanded ? "Lebih Sedikit" : "Baca Selengkapnya"}</Text>
                </TouchableOpacity>
              )}
              <View className="flex-row flex-wrap gap-2 mt-1">
                {(keahlianList.length > 0 ? keahlianList : ["Servis AC & Elektronik"]).map((svc: string, idx: number) => (
                  <View
                    key={idx}
                    className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl"
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  >
                    <Text className="text-[12px] font-bold text-[#A04100]">{svc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View className="px-4 mt-3 flex-row gap-2">
          <View className="flex-1 bg-white rounded-2xl p-3 items-center" style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}><Clock size={18} color="#FF6B00" /><Text className="text-sm font-extrabold text-[#131B2E] mt-1">{onTimeVal}</Text><Text className="text-[10px] text-gray-400 font-medium">Tepat Waktu</Text></View>
          <View className="flex-1 bg-white rounded-2xl p-3 items-center" style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}><Zap size={18} color="#10B981" /><Text className="text-sm font-extrabold text-[#131B2E] mt-1">{responseVal}</Text><Text className="text-[10px] text-gray-400 font-medium">Respon Cepat</Text></View>
          <View className="flex-1 bg-white rounded-2xl p-3 items-center" style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }}><ShieldCheck size={18} color="#B45309" /><Text className="text-sm font-extrabold text-[#131B2E] mt-1">{warrantyVal}</Text><Text className="text-[10px] text-gray-400 font-medium">Garansi Aman</Text></View>
        </View>

        {services.length > 0 && (
          <View className="px-4 mt-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[18px] font-bold text-[#131b2e]">Pilihan Layanan</Text>
              <Text className="text-[12px] font-semibold text-[#ff6b00]">Pilih 1 Paket</Text>
            </View>
            <View className="gap-2">
              {(showAllServices ? services : services.slice(0, 3)).map((pkg) => {
                const isSelected = selectedServiceId === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    onPress={() => setSelectedServiceId(pkg.id)}
                    className="rounded-2xl p-4 flex-col gap-1"
                    style={{
                      backgroundColor: isSelected ? "rgba(255, 219, 204, 0.4)" : "#f2f3ff",
                    }}
                    activeOpacity={0.9}
                  >
                    <View className="flex-row items-start gap-2.5">
                      <View
                        className={`w-5 h-5 rounded-full items-center justify-center mt-0.5 ${
                          isSelected ? "bg-[#ff6b00]" : "bg-white border border-gray-200"
                        }`}
                      >
                        {isSelected ? <View className="w-2 h-2 rounded-full bg-white" /> : null}
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-[14px] font-bold text-[#131b2e]">{pkg.title}</Text>
                          {pkg.is_popular ? (
                            <View className="px-2 py-0.5 rounded-full bg-[#ff6b00]">
                              <Text className="text-[11px] font-bold text-white">Populer</Text>
                            </View>
                          ) : null}
                        </View>
                        {pkg.description ? (
                          <Text className="text-[12px] text-[#5a4136] mt-0.5 leading-relaxed">{pkg.description}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="flex-row items-baseline justify-end gap-1 pt-1">
                      <Text className="text-[18px] font-bold text-[#ff6b00]">Rp{Number(pkg.price).toLocaleString("id-ID")}</Text>
                      <Text className="text-[12px] text-[#5a4136]">/{pkg.unit || "unit"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {services.length > 3 && (
                <TouchableOpacity
                  onPress={() => setShowAllServices(!showAllServices)}
                  className="mt-1 w-full py-2 items-center justify-center flex-row gap-1"
                  activeOpacity={0.8}
                >
                  <Text className="text-[13px] font-bold text-[#ff6b00]">
                    {showAllServices ? "Sembunyikan" : `Lihat ${services.length - 3} Layanan Lainnya`}
                  </Text>
                  {showAllServices ? <ChevronUp size={18} color="#ff6b00" /> : <ChevronDown size={18} color="#ff6b00" />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {portfolio.length > 0 && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between px-4 mb-3">
              <Text className="text-sm font-extrabold text-[#131B2E]">Portofolio Pekerjaan</Text>
              <Text className="text-[12px] font-semibold text-[#10B981]">Terverifikasi</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {portfolio.slice(0, 6).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPortfolioModal({ project: p, imgIdx: 0 })}
                  activeOpacity={0.85}
                  style={{ width: 108 }}
                  className="flex-col items-center"
                >
                  <View
                    style={{ width: 108, height: 108 }}
                    className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-100"
                  >
                    <Image
                      source={{ uri: p.image_urls?.[0] || "" }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    className="text-[12px] font-bold text-[#131B2E] text-center mt-2 leading-tight"
                    numberOfLines={2}
                  >
                    {p.project_title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="px-4 mt-8 mb-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-[18px] font-extrabold text-[#131b2e]">Ulasan Pelanggan</Text>
            {reviews.length > 0 ? (
              <TouchableOpacity onPress={() => setShowReviewsSheet(true)}>
                <Text className="text-sm font-bold text-[#ff6b00]">Lihat {reviews.length} Ulasan</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {reviews.length > 0 ? (
            <>
              <View className="flex-row items-center justify-between mb-6 gap-4">
                <View className="flex-col">
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-[44px] font-extrabold text-[#131b2e] leading-none tracking-tight">{avgRating}</Text>
                    <Text className="text-sm font-semibold text-gray-400">/5.0</Text>
                  </View>
                  <View className="flex-row items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={24} color="#ffb020" fill="#ffb020" />
                    ))}
                  </View>
                </View>
                <View className="flex-1 max-w-[200px] flex-col">
                  <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                    <View className="h-full bg-[#ff6b00] rounded-full" style={{ width: `${fiveStarPct}%` }} />
                  </View>
                  <Text className="text-[12px] text-gray-500 font-medium">{fiveStarPct}% ulasan bintang 5</Text>
                </View>
              </View>

              {reviews.slice(0, 1).map((rev, idx) => (
                <View key={idx} className="bg-white rounded-[24px] p-5" style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 overflow-hidden items-center justify-center shrink-0">
                        {rev.reviewer_avatar ? (
                          <Image source={{ uri: rev.reviewer_avatar }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <Text className="text-xs font-extrabold text-orange-600">{(rev.reviewer_name || "U").charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <View className="flex-col">
                        <Text className="text-sm font-bold text-gray-900 leading-tight" numberOfLines={1}>{rev.reviewer_name}</Text>
                        <Text className="text-[11px] text-gray-400 font-semibold mt-1">{new Date(rev.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={18} color="#ffb020" fill={s <= rev.rating ? "#ffb020" : "transparent"} />
                      ))}
                    </View>
                  </View>
                  <Text className="text-sm text-gray-500 font-medium italic">"{rev.komentar || "Tanpa komentar"}"</Text>
                </View>
              ))}
            </>
          ) : (
            <View className="bg-white rounded-[24px] p-5 items-center" style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
              <MessageSquare size={28} color="#D1D5DB" />
              <Text className="text-xs font-bold text-gray-800 mt-2">Belum Ada Ulasan</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 pt-3 z-40"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[11px] text-gray-400 font-medium">Total Estimasi</Text>
            <Text className="text-lg font-black text-[#131B2E]">Rp{selectedService ? Number(selectedService.price).toLocaleString("id-ID") : "—"}</Text>
          </View>
          {isOwnProfile ? (
            <TouchableOpacity onPress={() => router.push("/profil/edit" as any)} className="px-6 py-3 rounded-full bg-[#FF6B00] shadow-md"><Text className="text-white font-bold text-xs">Edit Profil</Text></TouchableOpacity>
          ) : (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={handleStartDirectChat} className="w-12 h-12 rounded-full bg-[#eaedff] items-center justify-center shadow-sm"><MessageSquare size={20} color="#131B2E" /></TouchableOpacity>
              <TouchableOpacity onPress={openCheckout} disabled={!userProfile.is_active || isOrdering} className={`px-5 py-3 rounded-full flex-row items-center gap-1 shadow-md ${userProfile.is_active ? "bg-[#FF6B00]" : "bg-gray-300"}`}><ShoppingBag size={16} color="#fff" /><Text className="text-white font-extrabold text-xs">Pesan Jasa</Text></TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Modal visible={showCheckoutModal} transparent animationType="slide">
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View className="bg-white rounded-t-[32px] p-5 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
              <View><Text className="font-extrabold text-base text-gray-900">Konfirmasi Pesanan</Text><Text className="text-[11px] text-gray-500">Pilih metode pembayaran</Text></View>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"><X size={16} color="#6B7280" /></TouchableOpacity>
            </View>
            <ScrollView className="py-3">
              {selectedService && <View className="bg-orange-50 p-3 rounded-2xl border border-orange-100 mb-3"><Text className="text-[10px] font-extrabold text-[#FF6B00] uppercase">Layanan Dipilih</Text><Text className="text-sm font-bold text-gray-900 mt-1">{selectedService.title}</Text><Text className="text-xs text-gray-500 mt-1">{userProfile.name}</Text><Text className="text-base font-extrabold text-gray-900 text-right mt-1">Rp{Number(selectedService.price).toLocaleString("id-ID")}</Text></View>}
              <View className="flex-row gap-2 mb-3">
                <TouchableOpacity onPress={() => setPaymentMethod("MIDTRANS")} className={`flex-1 p-3 rounded-2xl border-2 ${paymentMethod === "MIDTRANS" ? "border-[#FF6B00] bg-orange-50" : "border-gray-200 bg-white"}`}><QrCode size={20} color="#FF6B00" /><Text className="text-xs font-bold mt-2">QRIS / VA</Text></TouchableOpacity>
                {codPaymentEnabled ? (
                  <TouchableOpacity onPress={() => setPaymentMethod("COD")} className={`flex-1 p-3 rounded-2xl border-2 ${paymentMethod === "COD" ? "border-[#FF6B00] bg-orange-50" : "border-gray-200 bg-white"}`}><Banknote size={20} color="#059669" /><Text className="text-xs font-bold mt-2">COD (Tunai)</Text></TouchableOpacity>
                ) : null}
              </View>
              {paymentMethod === "COD" && codDonationEnabled && (
                <View className="bg-amber-50 border border-amber-200 p-3 rounded-2xl mb-3" style={{ gap: 10 }}>
                  <View className="flex-row gap-2.5 items-start">
                    <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center shrink-0"><Heart size={16} color="#D97706" /></View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-amber-900">Donasi Pengembangan Sistem</Text>
                      <Text className="text-[10px] text-amber-800 leading-relaxed mt-0.5">Dukung agar sistem BISA terus berjalan. Bebas memberi berapapun (minimal Rp 3.000) atau pilih Tanpa Donasi.</Text>
                    </View>
                  </View>

                  <View className="flex-row gap-1.5 pt-1 flex-wrap">
                    <TouchableOpacity onPress={() => setDonationAmount("")} className={`px-3 py-1.5 rounded-xl border items-center ${!donationAmount || donationAmount === "0" ? "bg-gray-900 border-gray-900" : "bg-white border-amber-200"}`}>
                      <Text className={`text-[11px] font-bold ${!donationAmount || donationAmount === "0" ? "text-white" : "text-amber-900"}`}>Tanpa Donasi</Text>
                    </TouchableOpacity>
                    {["3000", "5000", "10000", "20000"].map((amt) => (
                      <TouchableOpacity key={amt} onPress={() => setDonationAmount(amt)} className={`flex-1 py-1.5 rounded-xl items-center border ${donationAmount === amt ? "bg-amber-500 border-amber-600" : "bg-white border-amber-200"}`}>
                        <Text className={`text-[11px] font-bold ${donationAmount === amt ? "text-white" : "text-amber-900"}`}>Rp{Number(amt).toLocaleString("id-ID")}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View className="bg-white border border-amber-300 rounded-xl px-3 py-2.5 flex-row items-center">
                    <Text className="text-[12px] font-bold text-amber-900 mr-1">Rp</Text>
                    <TextInput
                      value={donationAmount ? Number(donationAmount.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                      onChangeText={(v) => setDonationAmount(v.replace(/\D/g, ""))}
                      placeholder="Nominal lain (min 3.000)..."
                      placeholderTextColor="#D97706"
                      keyboardType="numeric"
                      className="flex-1 text-[13px] font-bold text-amber-900 p-0"
                      style={{ paddingVertical: 0 }}
                    />
                    {donationAmount ? (
                      <TouchableOpacity onPress={() => setDonationAmount("")} className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center ml-2"><X size={12} color="#6B7280" /></TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity onPress={() => setShowQrisDonasi(true)} className="w-full py-2.5 rounded-xl bg-white border border-amber-300 items-center flex-row justify-center gap-1.5" activeOpacity={0.9}>
                    <QrCode size={16} color="#92400E" />
                    <Text className="text-amber-900 font-bold text-[12px]">Lihat QRIS Donasi</Text>
                  </TouchableOpacity>

                  {(!donationAmount || Number(donationAmount.replace(/\D/g, "")) === 0) && (
                    <View className="p-2.5 bg-amber-100/60 rounded-xl flex-row items-center gap-1.5">
                      <Text className="text-[11px] text-amber-900 font-medium leading-relaxed flex-1">Catatan: Anda memilih tidak berdonasi. Sistem tetap dapat digunakan, dukungan Anda sangat berarti.</Text>
                    </View>
                  )}
                  {donationAmount && Number(donationAmount.replace(/\D/g, "")) > 0 && Number(donationAmount.replace(/\D/g, "")) < 3000 && (
                    <View className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex-row items-center gap-1.5">
                      <AlertTriangle size={14} color="#DC2626" />
                      <Text className="text-[11px] text-red-800 font-semibold flex-1">Minimal Rp 3.000 jika ingin berdonasi.</Text>
                    </View>
                  )}
                  {donationAmount && Number(donationAmount.replace(/\D/g, "")) >= 3000 && (
                    <View className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex-row items-center gap-1.5">
                      <Check size={14} color="#059669" />
                      <Text className="text-[11px] text-emerald-900 font-semibold flex-1">Donasi Rp{Number(donationAmount.replace(/\D/g, "")).toLocaleString("id-ID")} akan diproses via QR Midtrans otomatis.</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
            <View className="pt-3 border-t border-gray-100 flex-row items-center justify-between gap-3 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
              <View className="flex-1"><Text className="text-[10px] text-gray-400 font-medium">Total Tagihan</Text><Text className="text-base font-black text-gray-900">Rp{Number(selectedService?.price || 0).toLocaleString("id-ID")}</Text>{paymentMethod === "COD" && donationAmount && Number(donationAmount.replace(/\D/g, "")) >= 3000 ? <Text className="text-[10px] text-amber-700 font-bold mt-0.5">+ Donasi Rp{Number(donationAmount.replace(/\D/g, "")).toLocaleString("id-ID")} via QR terpisah</Text> : null}</View>
              <TouchableOpacity onPress={handleCheckoutOrder} disabled={isOrdering} className="flex-[2] py-3 bg-[#FF6B00] rounded-full items-center shadow-md">{isOrdering ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-extrabold text-xs">Lanjutkan Pesanan</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QRIS DONASI POPUP - 1:1 web */}
      <Modal visible={showQrisDonasi} transparent animationType="fade" onRequestClose={() => setShowQrisDonasi(false)}>
        <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View className="w-full max-w-sm bg-white rounded-[24px] overflow-hidden">
            <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100 bg-amber-50">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-white border border-amber-200 items-center justify-center"><QrCode size={16} color="#D97706" /></View>
                <View>
                  <Text className="font-extrabold text-sm text-gray-900">QRIS Donasi BISA</Text>
                  <Text className="text-[11px] text-amber-800">Scan untuk donasi</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowQrisDonasi(false)} className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center"><X size={16} color="#6B7280" /></TouchableOpacity>
            </View>
            <View className="p-5 items-center gap-3">
              <View className="w-full aspect-square max-w-[260px] rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 items-center justify-center overflow-hidden">
                {QRIS_DONASI_URL ? (
                  <Image source={{ uri: QRIS_DONASI_URL }} className="w-full h-full" resizeMode="contain" />
                ) : (
                  <View className="items-center px-6 py-8">
                    <QrCode size={40} color="#F59E0B" />
                    <Text className="text-xs font-bold text-amber-800 mt-2 text-center">QRIS belum diatur</Text>
                    <Text className="text-[11px] text-amber-700/60 mt-1 text-center">Isi QRIS_DONASI_URL di app/p/profil/[id]/index.tsx</Text>
                  </View>
                )}
              </View>
              <Text className="text-[11px] text-gray-400 text-center leading-relaxed">Donasi sukarela (min Rp 3.000). Terima kasih 🙏</Text>
              <TouchableOpacity onPress={() => setShowQrisDonasi(false)} className="w-full py-3 rounded-full bg-gray-900 items-center mt-1"><Text className="text-white font-bold text-sm">Tutup</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {portfolioModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPortfolioModal(null)}>
          <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
            <View className="w-full max-w-sm bg-white rounded-3xl overflow-hidden">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-100"><Text className="font-bold text-sm text-gray-900 flex-1" numberOfLines={1}>{portfolioModal.project.project_title}</Text><TouchableOpacity onPress={() => setPortfolioModal(null)}><X size={20} color="#6B7280" /></TouchableOpacity></View>
              <View className="w-full h-64 bg-black"><Image source={{ uri: portfolioModal.project.image_urls[portfolioModal.imgIdx] }} className="w-full h-full" resizeMode="contain" /></View>
              {portfolioModal.project.project_description && <View className="p-4"><Text className="text-xs text-gray-600">{portfolioModal.project.project_description}</Text></View>}
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={showReviewsSheet} transparent animationType="slide" onRequestClose={() => setShowReviewsSheet(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View className="bg-white w-full rounded-t-3xl overflow-hidden flex-col" style={{ height: "85%" }}>
            {/* Header: title + subtitle + close — 1:1 image */}
            <View className="flex-row items-start justify-between px-5 pt-5 pb-4 bg-white border-b border-gray-100">
              <View className="flex-col">
                <Text className="text-[18px] font-extrabold text-gray-900 leading-none">Ulasan Pelanggan</Text>
                <Text className="text-[13px] text-gray-500 font-medium mt-1">{reviews.length} ulasan</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReviewsSheet(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center ml-3">
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
              {/* Rating summary — 5.0 + bar 1:1 */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                <View className="flex-col">
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-[28px] font-extrabold text-gray-900 leading-none">{avgRating}</Text>
                    <Text className="text-[13px] text-gray-400 font-semibold">/5.0</Text>
                  </View>
                  <View className="flex-row items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={18} color="#f59e0b" fill="#f59e0b" />
                    ))}
                  </View>
                </View>
                <View className="flex-1 ml-6 flex-col gap-1 max-w-[180px]">
                  <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <View className="h-full bg-[#ff6b00] rounded-full" style={{ width: `${fiveStarPct}%` }} />
                  </View>
                  <Text className="text-[12px] text-gray-500 font-medium">{fiveStarPct}% bintang 5</Text>
                </View>
              </View>

              {/* Filter pills — Semua + 5..1 */}
              <View className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => setReviewsFilterRating(null)}
                    className={`rounded-full px-3 py-1 ${reviewsFilterRating === null ? "bg-[#ff6b00]" : "bg-gray-100 border border-gray-200"}`}
                  >
                    <Text className={`text-[12px] font-bold ${reviewsFilterRating === null ? "text-white" : "text-gray-600"}`}>Semua</Text>
                  </TouchableOpacity>
                  {[5, 4, 3, 2, 1].map((s) => {
                    const c = reviews.filter((r) => r.rating === s).length;
                    const active = reviewsFilterRating === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setReviewsFilterRating(active ? null : s)}
                        className={`rounded-full px-3 py-1 flex-row items-center gap-1 ${active ? "bg-[#ff6b00] border border-[#ff6b00]" : "bg-gray-100 border border-gray-200"}`}
                      >
                        <Star size={12} color={active ? "#fff" : "#f59e0b"} fill={active ? "#fff" : "#f59e0b"} />
                        <Text className={`text-[12px] font-bold ${active ? "text-white" : "text-gray-600"}`}>{s} ({c})</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* List ulasan */}
              <View className="px-4 pt-2 pb-4">
                {(reviewsFilterRating !== null ? reviews.filter((r) => r.rating === reviewsFilterRating) : reviews).map((item, idx) => (
                  <View key={idx} className="py-3 border-b border-gray-100">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-2 flex-1">
                        <View className="w-8 h-8 rounded-full bg-orange-50 overflow-hidden items-center justify-center border border-orange-100">
                          {item.reviewer_avatar ? (
                            <Image source={{ uri: item.reviewer_avatar }} className="w-full h-full" resizeMode="cover" />
                          ) : (
                            <Text className="text-[11px] font-extrabold text-orange-600">{(item.reviewer_name || "U").charAt(0).toUpperCase()}</Text>
                          )}
                        </View>
                        <View className="flex-col flex-1">
                          <Text className="text-[13px] font-bold text-gray-900 leading-none" numberOfLines={1}>{item.reviewer_name}</Text>
                          <Text className="text-[11px] text-gray-400 font-medium mt-1">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1 ml-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={16} color="#f59e0b" fill={s <= item.rating ? "#f59e0b" : "transparent"} />
                        ))}
                      </View>
                    </View>
                    <Text className="text-[13px] text-gray-600 italic mt-2">"{item.komentar || "Tanpa komentar"}"</Text>
                  </View>
                ))}
                {(reviewsFilterRating !== null && reviews.filter((r) => r.rating === reviewsFilterRating).length === 0) && (
                  <View className="py-8 items-center">
                    <Text className="text-[12px] text-gray-400 font-medium">Tidak ada ulasan dengan filter ini.</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="px-4 py-3 bg-white border-t border-gray-100">
              <TouchableOpacity
                onPress={() => {
                  setShowReviewsSheet(false);
                  router.push(`/p/profil/${String(id)}/ulasan` as any);
                }}
                className="w-full py-3 rounded-xl bg-[#FF6B00] items-center justify-center flex-row gap-1"
                activeOpacity={0.9}
              >
                <Text className="text-white font-bold text-[14px]">Lihat Halaman Lengkap</Text>
                <ChevronRight size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
