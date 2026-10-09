import { useState, useCallback } from "react";
import { getStoredUser } from "../lib/user-storage";
import { supabase } from "../lib/supabase";

export type ActionContext = 
  | "POST_JOB"
  | "BID_JOB"
  | "CHAT"
  | "WITHDRAW"
  | "DEFAULT";

export function useKycGate() {
  const [modalVisible, setModalVisible] = useState(false);
  const [actionContext, setActionContext] = useState<ActionContext>("DEFAULT");
  const [userStatus, setUserStatus] = useState<string>("Belum Verifikasi");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [pendingSuccessCallback, setPendingSuccessCallback] = useState<(() => void) | null>(null);

  const checkUserStatus = useCallback(async () => {
    try {
      const user = await getStoredUser();
      if (!user || !user.id) {
        setIsLoggedIn(false);
        return { loggedIn: false, kycStatus: "Belum Verifikasi", isVerified: false };
      }

      setIsLoggedIn(true);

      // Fetch fresh status from database
      const { data } = await supabase
        .from("users_bisa")
        .select("kyc_status")
        .eq("id", user.id)
        .single();

      const freshStatus = data?.kyc_status || user.kyc_status || "Belum Verifikasi";
      setUserStatus(freshStatus);

      const isVerified = 
        freshStatus === "Disetujui" || 
        freshStatus === "Terverifikasi" || 
        freshStatus === "approved";

      return { loggedIn: true, kycStatus: freshStatus, isVerified };
    } catch {
      return { loggedIn: false, kycStatus: "Belum Verifikasi", isVerified: false };
    }
  }, []);

  const triggerKycGate = useCallback(
    async (context: ActionContext, onSuccess: () => void): Promise<boolean> => {
      const { loggedIn, isVerified } = await checkUserStatus();

      if (!loggedIn) {
        setActionContext(context);
        setPendingSuccessCallback(() => onSuccess);
        setModalVisible(true);
        return false;
      }

      if (!isVerified) {
        setActionContext(context);
        setPendingSuccessCallback(() => onSuccess);
        setModalVisible(true);
        return false;
      }

      // If verified, proceed immediately
      onSuccess();
      return true;
    },
    [checkUserStatus]
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setPendingSuccessCallback(null);
  }, []);

  const isVerified =
    userStatus === "Disetujui" ||
    userStatus === "Terverifikasi" ||
    userStatus === "approved";

  return {
    isLoggedIn,
    kycStatus: userStatus,
    isVerified,
    modalVisible,
    actionContext,
    triggerKycGate,
    closeModal,
    checkUserStatus,
  };
}
