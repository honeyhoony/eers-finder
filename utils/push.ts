const PUBLIC_VAPID_KEY = "BJGKK53pqPRVZ4dvNuyXKTlucHihBkzQNstds5u8MWT7B3rPm2ghtpMOdq19gW-0pZ7jQ8mKbIVw4KMUgQ6a7aQ";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn("Push notifications are not supported in this browser.");
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log("Service Worker registered");

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      };

      subscription = await registration.pushManager.subscribe(subscribeOptions);
    }

    // Save to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error("Failed to subscribe user to push");
    }

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}
