/**
 * Safe back helper — mencegah error / no-op ketika stack kosong
 * dan mencegah loop antar layar yang di-replace.
 *
 * Usage:
 *   import { safeBack } from "../../src/lib/navigation";
 *   onPress={() => safeBack(router, "/c/home")}
 */
export function safeBack(router: any, fallback: string = "/") {
  try {
    if (router.canGoBack && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {}
  // fallback: replace agar tidak menambah stack lagi
  try {
    router.replace(fallback as any);
  } catch {
    // last resort
    try { router.replace("/" as any); } catch {}
  }
}
