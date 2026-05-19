'use client';

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

interface Props {
  vapidPublicKey: string;
}

// VAPID public key uses URL-safe base64 (RFC 4648 §5). The browser's
// PushManager requires an ArrayBufferView backed by a plain ArrayBuffer,
// so we decode to a fixed-typed Uint8Array<ArrayBuffer>.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function PushPermissionButton({ vapidPublicKey }: Props) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<
    "idle" | "subscribed" | "denied" | "loading"
  >("idle");

  useEffect(() => {
    setMounted(true);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setState("subscribed");
      }),
    );
  }, []);

  async function subscribe() {
    if (!vapidPublicKey) return;
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setState("subscribed");
    } catch {
      setState("idle");
    }
  }

  async function unsubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), action: "unsubscribe" }),
        });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("idle");
    }
  }

  if (!mounted) return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (state === "denied") return null;

  return (
    <button
      type="button"
      onClick={state === "subscribed" ? unsubscribe : subscribe}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-all disabled:opacity-50 bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20"
      title={
        state === "subscribed"
          ? "Disable push notifications"
          : "Enable push notifications"
      }
    >
      {state === "subscribed" ? (
        <>
          <BellOff className="w-3 h-3" />
          Notifications On
        </>
      ) : (
        <>
          <Bell className="w-3 h-3" />
          {state === "loading" ? "…" : "Notifications"}
        </>
      )}
    </button>
  );
}
