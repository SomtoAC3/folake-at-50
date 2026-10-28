import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[push] service worker registration failed:", err);
    });
  }
}

/**
 * Push works only in a secure context with SW + Push + Notification APIs.
 * On iOS that additionally means iOS 16.4+ AND the site opened from the
 * home screen — plain Safari tabs report no PushManager, so this check
 * doubles as the "install first" signal on iPhones.
 */
export function isPushSupported() {
  return (
    Boolean(VAPID_PUBLIC_KEY) &&
    Boolean(supabase) &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPermissionState() {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  // Treat a subscription under an old VAPID key as absent so the UI offers to re-subscribe.
  return sub && sameKey(sub.options?.applicationServerKey, urlBase64ToUint8Array(VAPID_PUBLIC_KEY)) ? sub : null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}

function sameKey(buffer, expected) {
  if (!buffer) return true; // browser doesn't expose it; keep the subscription
  const actual = new Uint8Array(buffer);
  return actual.length === expected.length && actual.every((b, i) => b === expected[i]);
}

export async function subscribeToPush(userId = null) {
  if (!isPushSupported()) throw new Error("Notifications aren't supported here.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were not allowed.");

  const reg = await navigator.serviceWorker.ready;
  const serverKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let sub = await reg.pushManager.getSubscription();
  // A subscription made under an older VAPID key can't receive our pushes;
  // drop it and subscribe again with the current key.
  if (sub && !sameKey(sub.options?.applicationServerKey, serverKey)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
  }

  const json = sub.toJSON();
  const row = {
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_id: userId,
  };
  // No upsert: ON CONFLICT DO UPDATE needs a SELECT policy to read the
  // conflicting row, and this table deliberately has none. Insert, and on a
  // duplicate endpoint fall back to updating that row.
  const { error } = await supabase.from("push_subscriptions").insert(row);
  if (error?.code === "23505") {
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update(row)
      .eq("endpoint", sub.endpoint);
    if (updateError) throw updateError;
  } else if (error) {
    throw error;
  }
  return sub;
}

// Links this device's existing subscription to the signed-in guest, so
// notifications meant for them (like comments on their photos) reach it.
// Subscriptions made before signing in are stored without a user.
export async function claimPushSubscription(userId) {
  if (!userId || getPermissionState() !== "granted") return;
  const sub = await getExistingSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").update({ user_id: userId }).eq("endpoint", sub.endpoint);
}

export async function unsubscribeFromPush() {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
