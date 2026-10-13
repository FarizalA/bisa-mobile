import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "bisa_token";

export async function getBisaToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    }
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setBisaToken(token: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearBisaToken() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
