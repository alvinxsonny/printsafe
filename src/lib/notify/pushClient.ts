export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return reg;
  } catch (err) {
    console.warn("Service worker registration failed:", err);
    return null;
  }
}

export async function subscribeToPush(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: "Push notifications are not supported in this browser.",
    };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return {
        success: false,
        error: "Notification permission was denied or dismissed.",
      };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return {
        success: false,
        error: "Service worker could not be registered.",
      };
    }

    const resStatus = await fetch("/api/push/status");
    if (!resStatus.ok) {
      return { success: false, error: "Failed to fetch push public key." };
    }

    const { vapidPublicKey } = await resStatus.json();
    if (!vapidPublicKey) {
      return { success: false, error: "No VAPID public key configured." };
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidPublicKey
      ) as unknown as BufferSource,
    });

    const subJson = sub.toJSON();

    const resSub = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      }),
    });

    if (!resSub.ok) {
      return {
        success: false,
        error: "Failed to save push subscription on server.",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Push subscription failed";
    return { success: false, error: msg };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean }> {
  if (!isPushNotificationSupported()) {
    return { success: false };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    }
    return { success: true };
  } catch (err) {
    console.warn("Failed to unsubscribe:", err);
    return { success: false };
  }
}
