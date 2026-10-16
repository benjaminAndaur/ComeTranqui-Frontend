import { useMemo, useSyncExternalStore } from "react";
import { getAccessToken, getUserProfile, type UserProfile } from "./auth";

// La sesión vive en sessionStorage. useSyncExternalStore la lee sin setState dentro de efectos y entrega null en el
// render del servidor (la página se prerenderiza), evitando diferencias de hidratación.
const EVENTO_SESION = "cometranqui:sesion";

function suscribir(aviso: () => void) {
  window.addEventListener("storage", aviso);
  window.addEventListener(EVENTO_SESION, aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener(EVENTO_SESION, aviso);
  };
}

/** Avisa a los componentes que la sesión cambió en esta pestaña (login/logout). */
export function notificarCambioSesion() {
  window.dispatchEvent(new Event(EVENTO_SESION));
}

export function useSesion(): { loggedIn: boolean; profile: UserProfile | null } {
  const token = useSyncExternalStore(suscribir, getAccessToken, () => null);
  const profile = useMemo(() => (token ? getUserProfile() : null), [token]);
  return { loggedIn: token !== null, profile };
}
