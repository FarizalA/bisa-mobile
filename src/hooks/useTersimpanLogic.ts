import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";

export interface FavoriteMitra {
  id: number;
  mitra_id: number;
  mitra_name: string;
  mitra_avatar?: string;
  mitra_rating: number;
  mitra_location: string;
  mitra_keahlian?: string;
  created_at: string;
}

export function useTersimpanLogic() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<FavoriteMitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchFavorites = useCallback(async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("id, mitra_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        const mitraIds = data.map((f: any) => f.mitra_id);
        const { data: mitras } = await supabase
          .from("users_bisa")
          .select("id, name, face_url, rating, alamat_singkat, address, keahlian")
          .in("id", mitraIds);
        const mitraMap: Record<number, any> = {};
        (mitras || []).forEach((m: any) => (mitraMap[m.id] = m));
        const formatted: FavoriteMitra[] = (data as any[])
          .map((f) => {
            const mitra = mitraMap[f.mitra_id];
            if (!mitra) return null;
            return {
              id: f.id,
              mitra_id: f.mitra_id,
              mitra_name: mitra.name,
              mitra_avatar: mitra.face_url,
              mitra_rating: mitra.rating || 0,
              mitra_location: mitra.alamat_singkat || mitra.address || "Lokasi tidak diatur",
              mitra_keahlian: mitra.keahlian,
              created_at: f.created_at,
            };
          })
          .filter(Boolean) as FavoriteMitra[];
        setFavorites(formatted);
      } else setFavorites([]);
    } catch (e) {
      console.error("Gagal memuat mitra tersimpan:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      setUser(stored);
      fetchFavorites(stored.id);
    })();
  }, [router, fetchFavorites]);

  const handleRemove = async (favoriteId: number) => {
    if (!user) return;
    setRemovingId(favoriteId);
    try {
      await supabase.from("user_favorites").delete().eq("id", favoriteId);
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  };

  return { user, favorites, loading, removingId, handleRemove, router };
}
