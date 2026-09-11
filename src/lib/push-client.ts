import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** 브라우저가 웹 푸시를 지원하는지 (iOS는 홈 화면에 추가한 PWA에서만 지원). */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

async function getRegistration() {
  return navigator.serviceWorker.register("/sw.js");
}

/**
 * 현재 이 브라우저(기기)가 알림을 구독 중인지 확인한다.
 * 아직 서비스워커를 한 번도 등록한 적 없으면(=알림을 켠 적 없으면) getRegistration()이
 * 즉시 undefined를 반환한다. (navigator.serviceWorker.ready는 등록된 적이 없으면
 * 영원히 대기하므로 여기서는 쓰면 안 된다.)
 */
export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js").catch(() => undefined);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/** 알림 권한을 요청하고, 허용되면 이 기기를 push_subscriptions에 등록한다. */
export async function subscribeToPush(supabase: Client, userId: string) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("알림 기능이 아직 설정되지 않았어요.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한이 거부됐어요. 브라우저 설정에서 허용해주세요.");
  }

  const registration = await getRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth_key: json.keys?.auth ?? "",
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

/** 이 기기의 알림 구독을 해제한다. */
export async function unsubscribeFromPush(supabase: Client) {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
