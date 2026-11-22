import { authClient } from "@/lib/auth/client";

/**
 * Performs a complete, leak-proof logout across Customer, Merchant, and Admin roles.
 * - Invalids session on the server via Better Auth
 * - Purges all client-side cached data (localStorage & sessionStorage)
 * - Navigates directly to the landing page with location.replace to purge authenticated history
 */
export async function performLogout(): Promise<void> {
  try {
    await authClient.signOut();
  } catch (err) {
    console.warn("Sign out request error:", err);
  } finally {
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch {}

    // Hard redirect replacing browser history so Back button cannot leak cached state
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }
}
