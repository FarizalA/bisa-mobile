import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "bisa_user";

export async function getStoredUser<T = any>(): Promise<T | null> {
  try {
    if (Platform.OS === "web") {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("user") : null;
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: any) {
  const raw = JSON.stringify(user);
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem("user", raw);
    return;
  }
  await SecureStore.setItemAsync(KEY, raw);
}

export async function removeStoredUser() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.removeItem("user");
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
