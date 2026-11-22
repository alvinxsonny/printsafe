/**
 * Shared in-memory and local-storage state manager for merchant shop information.
 * Ensures the storefront live status and shop name stay synchronized across:
 * - MerchantDashboardClient hero card and sidebar
 * - Navigation between /merchant, /merchant/queue, /merchant/notifications, etc.
 * - Multiple tabs and hot reloads
 */

export interface MerchantShopState {
  name: string;
  isLive: boolean;
  manualLive: boolean;
  isLoaded: boolean;
}

const STORAGE_KEY = "printsafe_merchant_shop_state";
const EVENT_NAME = "printsafe:merchant-shop-update";

const PLACEHOLDER_NAMES = new Set([
  "print shop",
  "your print shop",
  "print queue",
  "notifications",
  "job detail",
  "job inspection",
  "shop settings",
  "billing & plans",
]);

export function isPlaceholderShopName(name?: string | null): boolean {
  if (!name || !name.trim()) return true;
  return PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}

let memoryShopState: MerchantShopState | null = null;
const listeners = new Set<(state: MerchantShopState) => void>();

export function getCachedMerchantShopState(): MerchantShopState | null {
  if (memoryShopState) return memoryShopState;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        memoryShopState = JSON.parse(stored);
        return memoryShopState;
      }
    } catch {
      // Ignore localStorage access failures in restricted environments
    }
  }
  return null;
}

export function updateMerchantShopState(
  partial: Partial<MerchantShopState>
): MerchantShopState {
  const current = getCachedMerchantShopState() || {
    name: "Print Shop",
    isLive: false,
    manualLive: false,
    isLoaded: false,
  };

  const nextName =
    partial.name && !isPlaceholderShopName(partial.name)
      ? partial.name
      : current.name;

  const updated: MerchantShopState = {
    ...current,
    ...partial,
    name: nextName,
    isLoaded: true,
  };

  memoryShopState = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    } catch {
      // Ignore localStorage write failures
    }
  }

  listeners.forEach((listener) => {
    try {
      listener(updated);
    } catch {
      // Ignore listener error
    }
  });

  return updated;
}

export function subscribeMerchantShopState(
  listener: (state: MerchantShopState) => void
): () => void {
  listeners.add(listener);

  let handleStorage: ((e: StorageEvent) => void) | null = null;
  let handleCustom: ((e: Event) => void) | null = null;

  if (typeof window !== "undefined") {
    handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          memoryShopState = parsed;
          listener(parsed);
        } catch {
          // Ignore
        }
      }
    };

    handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<MerchantShopState>;
      if (customEvent.detail) {
        listener(customEvent.detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      if (handleStorage) window.removeEventListener("storage", handleStorage);
      if (handleCustom) window.removeEventListener(EVENT_NAME, handleCustom);
    }
  };
}

let inFlightFetch: Promise<MerchantShopState | null> | null = null;

export async function fetchMerchantShopStatus(
  force = false
): Promise<MerchantShopState | null> {
  if (inFlightFetch && !force) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const res = await fetch("/api/merchant/shop", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.shop) {
        const nextState: MerchantShopState = {
          name: data.shop.name || "Print Shop",
          isLive: Boolean(data.isLive),
          manualLive: Boolean(data.shop.manualLive),
          isLoaded: true,
        };
        return updateMerchantShopState(nextState);
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

export function resetMerchantShopState(): void {
  memoryShopState = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
