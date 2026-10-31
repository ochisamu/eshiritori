// LAN HTTP remains playable; service workers require a secure origin.
export function registerAppWorker() {
  if (
    !import.meta.env.PROD ||
    !isSecureContext ||
    !("serviceWorker" in navigator)
  )
    return;
  const register = () => {
    void navigator.serviceWorker
      .register(new URL("./sw.js", document.baseURI), {
        scope: "./",
        updateViaCache: "none",
      })
      .catch(() => {
        /* The online game still works if installation storage is unavailable. */
      });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
