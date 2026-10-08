import React, { useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import {
  ArrowLeft, MoreVertical, Send, Plus, Image as ImageIcon, MapPin, DollarSign,
  Trash2, X, AlertCircle, FileText, UploadCloud, Package,
} from "lucide-react-native";
import { useChatLogic } from "../../../src/hooks/useChatLogic";
import { formatBudget } from "../../../src/lib/chatHelpers";
import {
  TextBubble, ImageBubble, LocationBubble, OfferBubble,
  OrderCardBubbleRN, DeliveryBubbleRN, RevisionCardBubbleRN,
} from "../../../src/components/chat/MessageList";
import { safeBack } from "@/lib/navigation";
import {
  MobileOfferModal, MobileInvoiceModal, MobileOrderDetailModal,
} from "../../../src/components/chat/ChatModalsNative";

export default function ProviderDirectChatPage() {
  const { conversationId } = useLocalSearchParams();
  const chat: any = useChatLogic(String(conversationId));
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50); }, [chat.messages]);

  if (chat.loading) {
    return <View className="flex-1 items-center justify-center bg-gray-50"><ActivityIndicator size="large" color="#059669" /><Text className="text-sm text-gray-500 mt-2">Memuat percakapan mitra...</Text></View>;
  }
  if (!chat.conversation || !chat.otherUser) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 p-6">
        <AlertCircle size={48} color="#059669" />
        <Text className="text-lg font-bold text-gray-900 mt-3">Percakapan Tidak Ditemukan</Text>
        <TouchableOpacity onPress={() => safeBack(chat.router, "/p/chat")} className="mt-4 px-6 py-2.5 bg-[#059669] rounded-xl"><Text className="text-white font-bold">Kembali</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const onActionOffer = (amount: string, action: "accepted" | "rejected") => chat.actionOffer(amount, action);

  return (
    <SafeAreaView className="flex-1 bg-[#F0FDF4]" edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        {/* HEADER MITRA - HIJAU EMERALD */}
        <View className="h-[64px] px-3 flex-row items-center justify-between bg-white border-b border-gray-100">
          <View className="flex-row items-center gap-2 flex-1 pr-2">
            <TouchableOpacity onPress={() => safeBack(chat.router, "/p/chat")} className="w-9 h-9 items-center justify-center"><ArrowLeft size={22} color="#1F2937" /></TouchableOpacity>
            <View className="flex-row items-center gap-2.5 flex-1">
              {chat.otherUser.face_url ? <Image source={{ uri: chat.otherUser.face_url }} className="w-10 h-10 rounded-full bg-gray-100" /> : <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center border border-emerald-100"><Text className="text-sm font-bold text-[#059669]">{chat.otherUser.name.charAt(0)}</Text></View>}
              <View className="flex-1">
                <Text className="font-bold text-gray-900 text-sm" numberOfLines={1}>{chat.otherUser.name}</Text>
                <Text className="text-[11px] text-gray-500 font-medium">Pelanggan • Direct Chat</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => chat.setShowMenu(!chat.showMenu)} className="w-9 h-9 rounded-full items-center justify-center"><MoreVertical size={20} color="#6B7280" /></TouchableOpacity>
        </View>
        {chat.showMenu && (
          <View className="absolute top-[64px] right-3 z-50 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden w-44">
            <TouchableOpacity onPress={() => { chat.setShowMenu(false); chat.setShowDeleteModal(true); }} className="px-4 py-3 flex-row items-center gap-2"><Trash2 size={16} color="#EF4444" /><Text className="text-sm font-bold text-red-600">Hapus Chat</Text></TouchableOpacity>
          </View>
        )}

        {/* JOB BANNER MITRA 1:1 — Hilang saat Selesai/Dibatalkan (1:1 selesai) */}
        {(() => {
          const jid = String(chat.jobInfo?.id || "");
          const st = String(chat.jobInfo?.status || "").toLowerCase();
          const ps = String(chat.jobInfo?.payment_status || "").toLowerCase();
          const live = String(chat.jobStatusMap[jid] || "").toLowerCase();
          const isDone = st === "selesai" || ps === "selesai" || ps === "cod_completed" || ps === "released" || live === "selesai";
          const isCancelled = st === "dibatalkan" || st === "expired" || st === "ditolak" || ps === "cancelled" || ps === "cod_cancelled" || ps === "expired" || live === "dibatalkan" || live === "expired" || live === "ditolak";
          if (!chat.jobInfo || !chat.showJobBanner || isDone || isCancelled) return null;

          return (
            <View className="bg-white border-b border-emerald-100 px-3.5 py-2.5 flex-row items-center justify-between gap-3 shadow-xs">
              <TouchableOpacity
                onPress={() =>
                  chat.openOrderDetail({
                    jobId: chat.jobInfo.id,
                    judul: chat.jobInfo.judul,
                    budget: chat.jobInfo.budget,
                    status: chat.jobStatusMap[jid] || chat.jobInfo.status,
                  })
                }
                activeOpacity={0.8}
                className="flex-row items-center gap-2.5 flex-1 min-w-0"
              >
                <View className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center">
                  <Package size={20} color="#059669" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[13px] font-extrabold text-gray-900 leading-tight" numberOfLines={1}>
                    {chat.jobInfo.judul || "Pesanan"}
                  </Text>
                  <Text className="text-[11px] font-medium text-gray-400 mt-0.5" numberOfLines={1}>
                    {formatBudget(chat.jobInfo.budget)} (Total)
                  </Text>
                </View>
              </TouchableOpacity>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() =>
                    chat.openOrderDetail({
                      jobId: chat.jobInfo.id,
                      judul: chat.jobInfo.judul,
                      budget: chat.jobInfo.budget,
                      status: chat.jobStatusMap[jid] || chat.jobInfo.status,
                    })
                  }
                  activeOpacity={0.8}
                  className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 flex-row items-center gap-1.5"
                >
                  <FileText size={13} color="#059669" />
                  <Text className="text-[11px] font-bold text-[#059669]">Invoice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => chat.setShowJobBanner(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="w-7 h-7 rounded-full items-center justify-center"
                >
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* MESSAGES - isMitraView=true */}
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16, gap: 12 }} className="flex-1" showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          <View className="self-center bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full"><Text className="text-[10px] font-bold text-emerald-700">Chat Mitra — Dana Rekber BISA 🔒</Text></View>

          {chat.messages.map((msg: any) => {
            const isMe = String(msg.sender_id) === String(chat.myUserId);
            const time = new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            const type = msg.message_type;

        if (type === "order" || msg.content.startsWith("[ORDER]:")) {
          return (
            <OrderCardBubbleRN
              key={msg.id}
              content={msg.content}
              time={time}
              isMe={isMe}
              isMitraView={true}
              jobStatusMap={chat.jobStatusMap}
              paymentMethod={chat.jobInfo?.payment_method}
              onAction={chat.orderAction}
              onViewDetail={chat.openOrderDetail}
            />
          );
        }
            if (type === "delivery" || msg.content.startsWith("[DELIVERY]:")) {
              const rawCont = msg.content.startsWith("[DELIVERY]:") ? msg.content.slice(11) : msg.content;
              const jid = rawCont.split("|")[0];
              const st = chat.jobStatusMap[jid] || "";
              const finished = st === "selesai";
              return <DeliveryBubbleRN key={msg.id} content={msg.content} isMe={isMe} time={time} jobId={jid} isMitraView={true} isFinished={finished} jobStatus={st} onPreview={(u: string) => chat.setPreviewImage(u)} />;
            }
            if (type === "revision" || msg.content.startsWith("[REVISION]:")) {
              return <RevisionCardBubbleRN key={msg.id} content={msg.content} isMe={isMe} time={time} />;
            }
            if (type === "offer" || msg.content.startsWith("[OFFER]:")) {
              return <OfferBubble key={msg.id} content={msg.content} isMe={isMe} time={time} onAction={onActionOffer} />;
            }
            if (type === "image" || /^https?:\/\//.test(msg.content) && /\.(jpg|jpeg|png|webp|gif)/i.test(msg.content)) {
              return <ImageBubble key={msg.id} url={msg.content} isMe={isMe} time={time} onPreview={(u) => chat.setPreviewImage(u)} />;
            }
            if (type === "location" || msg.content.includes("google.com/maps")) {
              return <LocationBubble key={msg.id} content={msg.content} isMe={isMe} time={time} />;
            }
            return <TextBubble key={msg.id} content={msg.content} isMe={isMe} time={time} isMitraView={true} />;
          })}
        </ScrollView>
        {/* QUICK REPLIES MITRA */}
        <View className="px-3 py-1.5 bg-white border-t border-gray-50">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {chat.mitraQuickReplies.map((qr: string, i: number) => (
              <TouchableOpacity key={i} onPress={() => chat.setNewMessage(qr)} className="bg-gray-100 px-3 py-1.5 rounded-full"><Text className="text-xs text-gray-700 font-medium">{qr}</Text></TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* INPUT BAR MITRA */}
        <View className="px-3 py-2.5 bg-white border-t border-gray-100 flex-row items-end gap-2">
          <TouchableOpacity onPress={() => chat.setShowAttachments(!chat.showAttachments)} className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center"><Plus size={20} color="#059669" /></TouchableOpacity>
          <View className="flex-1 bg-gray-100 rounded-[22px] px-4 py-2 min-h-[42px] justify-center border border-gray-100">
            <TextInput value={chat.newMessage} onChangeText={chat.setNewMessage} placeholder="Balas pesan klien..." placeholderTextColor="#9CA3AF" multiline className="text-[14px] text-gray-900 leading-5 p-0" style={{ maxHeight: 90 } as any} />
          </View>
          <TouchableOpacity onPress={chat.sendMessage} disabled={!chat.newMessage.trim()} className={`w-10 h-10 rounded-full items-center justify-center ${chat.newMessage.trim() ? "bg-[#059669]" : "bg-gray-200"}`}><Send size={18} color="#fff" /></TouchableOpacity>
        </View>

        {/* ATTACHMENT TRAY MITRA + INVOICE */}
        {chat.showAttachments && (
          <View className="bg-white p-4 border-t border-gray-100 flex-row justify-around">
            <TouchableOpacity onPress={() => chat.pickImage(false)} className="items-center gap-1.5"><View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center"><ImageIcon size={22} color="#2563EB" /></View><Text className="text-[11px] font-bold text-gray-700">Galeri</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => chat.pickImage(true)} className="items-center gap-1.5"><View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center"><ImageIcon size={22} color="#059669" /></View><Text className="text-[11px] font-bold text-gray-700">Kamera</Text></TouchableOpacity>
            <TouchableOpacity onPress={chat.sendLocation} className="items-center gap-1.5"><View className="w-12 h-12 rounded-2xl bg-red-50 items-center justify-center"><MapPin size={22} color="#DC2626" /></View><Text className="text-[11px] font-bold text-gray-700">Lokasi</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { chat.setShowAttachments(false); chat.setShowInvoiceModal(true); }} className="items-center gap-1.5"><View className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center"><FileText size={22} color="#059669" /></View><Text className="text-[11px] font-bold text-gray-700">Invoice</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { chat.setShowAttachments(false); chat.setShowOfferModal(true); }} className="items-center gap-1.5"><View className="w-12 h-12 rounded-2xl bg-amber-50 items-center justify-center"><DollarSign size={22} color="#D97706" /></View><Text className="text-[11px] font-bold text-gray-700">Tawar</Text></TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* MODALS 1:1 WEB + UPGRADE */}
      <MobileOfferModal visible={chat.showOfferModal} onClose={() => chat.setShowOfferModal(false)} onSubmit={(amt: string) => chat.createOffer(amt)} />
      <MobileInvoiceModal visible={chat.showInvoiceModal} onClose={() => chat.setShowInvoiceModal(false)} onSubmit={(judul: string, harga: number) => chat.createInvoice(judul, harga)} loading={chat.sendingInvoice} />
      <MobileOrderDetailModal visible={chat.showOrderDetailModal} order={chat.selectedOrderDetail} isMitraView={true} myUserId={chat.myUserId} onClose={() => chat.setShowOrderDetailModal(false)} />
      {chat.previewImage && (
        <Modal visible={!!chat.previewImage} transparent animationType="fade" onRequestClose={() => chat.setPreviewImage(null)}>
          <View className="flex-1 bg-black/90 items-center justify-center p-4"><TouchableOpacity onPress={() => chat.setPreviewImage(null)} className="absolute top-10 right-4 z-10 w-9 h-9 rounded-full bg-white/20 items-center justify-center"><X size={20} color="#fff" /></TouchableOpacity><Image source={{ uri: chat.previewImage }} className="w-full h-[70%]" resizeMode="contain" /></View>
        </Modal>
      )}
      {/* DELIVERY MODAL MITRA */}
      <Modal visible={chat.showDeliveryModal} transparent animationType="slide" onRequestClose={() => chat.setShowDeliveryModal(false)}>
        <View className="flex-1 bg-black/50 justify-end"><View className="bg-white rounded-t-[28px] p-6">
          <View className="flex-row items-center gap-2 mb-3"><View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center"><UploadCloud size={18} color="#059669" /></View><Text className="font-extrabold text-base text-gray-900">Kirim Hasil Kerja</Text></View>
          <Text className="text-xs font-bold text-gray-600 mb-1">Link Hasil (Drive / URL)</Text>
          <TextInput value={chat.deliveryLink} onChangeText={chat.setDeliveryLink} placeholder="https://..." className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 mb-3" placeholderTextColor="#9CA3AF" />
          <Text className="text-xs font-bold text-gray-600 mb-1">Catatan untuk Klien</Text>
          <TextInput value={chat.deliveryNote} onChangeText={chat.setDeliveryNote} placeholder="Hasil sudah siap, silakan cek..." multiline className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 min-h-[80px] mb-4" placeholderTextColor="#9CA3AF" textAlignVertical="top" />
          <TouchableOpacity disabled={chat.sendingDelivery} onPress={chat.sendDelivery} className="bg-[#059669] py-3.5 rounded-full items-center disabled:opacity-50">{chat.sendingDelivery ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Kirim ke Klien</Text>}</TouchableOpacity>
          <TouchableOpacity onPress={() => chat.setShowDeliveryModal(false)} className="mt-2 py-2 items-center"><Text className="text-gray-500 font-bold text-sm">Batal</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal visible={chat.showDeleteModal} transparent animationType="fade" onRequestClose={() => chat.setShowDeleteModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-6"><View className="bg-white rounded-[24px] p-6 w-full max-w-sm">
          <Text className="font-extrabold text-base text-gray-900 text-center">Hapus Percakapan?</Text><Text className="text-sm text-gray-500 text-center mt-2">Chat akan hilang dari inbox kamu saja.</Text>
          <View className="flex-row gap-3 mt-6"><TouchableOpacity onPress={() => chat.setShowDeleteModal(false)} className="flex-1 py-3 rounded-full border border-gray-200 items-center"><Text className="font-bold text-gray-700">Batal</Text></TouchableOpacity><TouchableOpacity onPress={chat.deleteChat} className="flex-1 py-3 rounded-full bg-red-600 items-center"><Text className="font-bold text-white">Hapus</Text></TouchableOpacity></View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}
