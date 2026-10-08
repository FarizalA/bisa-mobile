import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";

export function useDompetLogic() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [riwayatTransaksi, setRiwayatTransaksi] = useState<any[]>([]);
  const [showTopupModal, setShowTopupModal] = useState(false);

  useEffect(() => {
    const fetchDompetData = async () => {
      const storedUser = await getStoredUser();
      if (!storedUser || !storedUser.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      setUser(storedUser);

      // Fetch fresh balance from Supabase
      const { data: userData } = await supabase
        .from("users_bisa")
        .select("saldo")
        .eq("id", storedUser.id)
        .single();
      if (userData?.saldo !== undefined) {
        setSaldo(userData.saldo);
      } else {
        setSaldo(storedUser.saldo || 0);
      }

      // Fetch transactions
      const { data: trxData, error: trxError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", storedUser.id)
        .order("created_at", { ascending: false });
      
      if (!trxError && trxData) {
        setRiwayatTransaksi(trxData);
      }

      setLoading(false);
    };
    fetchDompetData();
  }, []);

  return {
    user,
    loading,
    saldo,
    riwayatTransaksi,
    showTopupModal,
    setShowTopupModal,
    router,
  };
}
