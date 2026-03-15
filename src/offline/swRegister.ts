// Service-Worker-Registrierung für PWA-Funktionalität

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // Neuer SW bereit – sofort aktivieren
          newWorker.postMessage("SKIP_WAITING");
        }
      });
    });

    return registration;
  } catch (err) {
    console.warn("Service Worker Registrierung fehlgeschlagen:", err);
    return null;
  }
}
