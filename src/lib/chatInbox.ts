import { supabase } from "./supabase";
import { getStoredUser } from "./user-storage";

export interface ChatInboxItem {
  id: string;
  type: 'direct';
  conversation_id?: string;
  judul: string;
  name: string;
  face_url: string;
  status: string;
  last_message: string;
  last_message_time: string;
}

async function buildUserHeader(): Promise<string | null> {
  const u = await getStoredUser<any>();
  if (!u) return null;
  return JSON.stringify(u);
}

export async function fetchInboxChats(isMitra: boolean, archivedOnly = false): Promise<ChatInboxItem[]> {
  const userStr = await buildUserHeader();
  if (!userStr) return [];
  const user = JSON.parse(userStr);

  const filterCol = isMitra ? "mitra_id" : "pelanggan_id";
  const targetCol = isMitra ? "pelanggan_id" : "mitra_id";

  const { data: jobs } = await supabase
    .from("pekerjaan_bisa")
    .select(`id, judul, status, ${targetCol}`)
    .eq(filterCol, user.id)
    .not(targetCol, "is", null)
    .order("created_at", { ascending: false });

  // Fetch conversations via Supabase directly to avoid CORS/API gap — mirror web's GET
  let convs: any[] = [];
  try {
    const { data } = await supabase
      .from("conversations")
      .select(
        `id, client_id, mitra_id, type, job_id, last_message, last_message_at, is_active, deleted_by_client, deleted_by_mitra, archived_by_client, archived_by_mitra, client:client_id(id,name,face_url), mitra:mitra_id(id,name,face_url)`
      )
      .or(`client_id.eq.${user.id},mitra_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    const uid = String(user.id);
    convs = (data || []).filter((c: any) => {
      if (String(c.client_id) === uid && c.deleted_by_client) return false;
      if (String(c.mitra_id) === uid && c.deleted_by_mitra) return false;
      // Filter arsip: tab "Semua" hanya non-arsip, tab "Arsip" hanya arsip milik role ini
      const isArchived = isMitra ? !!c.archived_by_mitra : !!c.archived_by_client;
      if (archivedOnly !== isArchived) return false;
      return true;
    });
  } catch {}

  // Fallback via API disabled on Expo Web localhost to avoid CORS (Image 1 ERR_FAILED)
  // Rely purely on Supabase direct query — web and mobile share same `conversations` table
  // If needed, enable only when API_BASE is not vercel.app

  const latestStatusByOther = new Map<string, string>();
  if (jobs) {
    for (const j of jobs as any[]) {
      const oid = String(j[targetCol]);
      if (!latestStatusByOther.has(oid)) latestStatusByOther.set(oid, j.status);
    }
  }

  // Ghost-filter: jangan tampilkan room yang belum pernah ada pesan real (hanya placeholder "Percakapan baru dibuat" tanpa 1 pun row di `messages`)
  // Cek sekali query: semua conversation_id yang punya minimal 1 message
  let withRealMessage = new Set<string>();
  try {
    const ids = convs.map((c: any) => c.id);
    if (ids.length) {
      const { data: msgRows } = await supabase.from("messages").select("conversation_id").in("conversation_id", ids);
      if (msgRows) msgRows.forEach((r: any) => withRealMessage.add(String(r.conversation_id)));
    }
  } catch {}

  const grouped = new Map<string, any>();
  for (const c of convs as any[]) {
    // Room chat hanya boleh muncul di inbox jika sudah ada pesan yang terkirim (tidak kosong)
    if (!withRealMessage.has(String(c.id))) continue;

    // Filter ketat role:
    // isMitra = true  (Inbox Mitra /p/chat) -> Hanya tampilkan chat di mana user = mitra_id (lawan bicara adalah Klien)
    // isMitra = false (Inbox Klien /c/chat) -> Hanya tampilkan chat di mana user = client_id (lawan bicara adalah Mitra)
    const isClientUser = String(c.client_id) === String(user.id);
    if (isMitra && isClientUser) continue;
    if (!isMitra && !isClientUser) continue;

    const pairKey = `${String(c.client_id)}_${String(c.mitra_id)}`;
    if (!grouped.has(pairKey)) grouped.set(pairKey, c);
  }

  const merged: ChatInboxItem[] = Array.from(grouped.values()).map((c: any) => {
    const isClientUser = String(c.client_id) === String(user.id);
    const other = isClientUser
      ? Array.isArray(c.mitra) ? c.mitra[0] : c.mitra
      : Array.isArray(c.client) ? c.client[0] : c.client;
    const otherId = String(other?.id ?? (isClientUser ? c.mitra_id : c.client_id));
    const latestOrderStatus = latestStatusByOther.get(otherId);
    return {
      id: c.id,
      type: "direct",
      conversation_id: c.id,
      judul: isMitra ? "Pertanyaan Klien" : "Tanya Jasa",
      name: other?.name || (isMitra ? "Klien" : "Mitra"),
      face_url: other?.face_url || "",
      status: latestOrderStatus ?? "direct",
      last_message: c.last_message || "Mulai percakapan...",
      last_message_time: c.last_message_at || "",
    };
  });

  return merged.sort((a, b) => {
    const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
    const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
    return tb - ta;
  });
}

export async function ensureConversationAndNavigate(
  targetId: string,
  jobId?: string | number,
  isMitraView?: boolean
): Promise<string | null> {
  const userStr = await buildUserHeader();
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  try {
    const clientId = Number(isMitraView ? targetId : user.id);
    const mitraId = Number(isMitraView ? user.id : targetId);
    const jId = jobId ? Number(jobId) : null;

    // 1. Cari exact triple (client+mitra+job) dulu — karena DB punya UNIQUE(client_id, mitra_id, job_id)
    if (jId) {
      const { data: byJob } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("mitra_id", mitraId)
        .eq("job_id", jId)
        .maybeSingle();
      if (byJob?.id) {
        const col = String(user.id) === String(clientId) ? "deleted_by_client" : "deleted_by_mitra";
        await supabase.from("conversations").update({ [col]: false } as any).eq("id", byJob.id);
        return String(byJob.id);
      }
    }

    // 2. Fallback hanya jika tanpa jobId — chat umum tanpa job
    // Jika jId ada, JANGAN reuse room job_id=null (bikin kartu [DELIVERY] nyasar). Langsung buat room baru dengan job_id.
    if (!jId) {
      const { data: pairRows } = await supabase
        .from("conversations")
        .select("id, job_id")
        .eq("client_id", clientId)
        .eq("mitra_id", mitraId)
        .order("last_message_at", { ascending: false })
        .limit(1);
      const pairExisting = pairRows?.[0] as any;
      if (pairExisting?.id) {
        const col = String(user.id) === String(clientId) ? "deleted_by_client" : "deleted_by_mitra";
        await supabase.from("conversations").update({ [col]: false } as any).eq("id", pairExisting.id);
        return String(pairExisting.id);
      }
    }

    // 3. Buat baru (last_message tetap null sampai ada pesan pertama yang terkirim)
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        client_id: clientId,
        mitra_id: mitraId,
        job_id: jId,
        type: "direct",
        is_active: true,
        deleted_by_client: false,
        deleted_by_mitra: false,
        last_message: null,
        last_message_at: null,
      })
      .select("id")
      .single();

    if (!error) return created?.id ? String(created.id) : null;

    // 4. Jika duplicate (23505) — room sudah ada tapi lolos cek karena race/maybeSingle miss — fetch lagi
    if ((error as any)?.code === "23505") {
      console.warn("Duplicate conversations key, fallback fetch:", error.message);
      if (jId) {
        const { data: dupByJob } = await supabase
          .from("conversations")
          .select("id")
          .eq("client_id", clientId)
          .eq("mitra_id", mitraId)
          .eq("job_id", jId)
          .maybeSingle();
        if (dupByJob?.id) return String(dupByJob.id);
      }
      const { data: dupPair } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("mitra_id", mitraId)
        .order("last_message_at", { ascending: false })
        .limit(1);
      if (dupPair?.[0]?.id) return String((dupPair[0] as any).id);
    }

    console.error("Gagal membuat conversation di Supabase:", error);
    return null;
  } catch (err) {
    console.error("ensureConversationAndNavigate catch:", err);
    return null;
  }
}

/**
 * Toggle arsip chat (arsipkan / batal arsip) untuk user saat ini.
 * Hanya mengubah kolom milik role user (archived_by_client atau archived_by_mitra).
 */
export async function toggleArchiveConversation(
  conversationId: string,
  isMitra: boolean
): Promise<{ success: boolean; isArchived: boolean }> {
  const userStr = await buildUserHeader();
  if (!userStr) return { success: false, isArchived: false };

  // Cek status arsip sekarang
  const { data: conv } = await supabase
    .from("conversations")
    .select("archived_by_client, archived_by_mitra")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { success: false, isArchived: false };

  const currentArchived = isMitra ? !!(conv as any).archived_by_mitra : !!(conv as any).archived_by_client;
  const newArchived = !currentArchived;

  const col = isMitra ? "archived_by_mitra" : "archived_by_client";
  const { error } = await supabase
    .from("conversations")
    .update({ [col]: newArchived } as any)
    .eq("id", conversationId);

  if (error) {
    console.error("[toggleArchiveConversation] Error:", error.message);
    return { success: false, isArchived: currentArchived };
  }

  return { success: true, isArchived: newArchived };
}
