// Notificaciones y suscripciones del usuario autenticado (/api/user/..., requiere token).
import { apiFetch } from "./api";

export type Notificacion = {
  id: number;
  titulo: string;
  detalle: string | null;
  url: string | null;
  regla: string | null;
  leida: boolean;
  creadaEn: string;
};

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(ruta, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const notificaciones = {
  listar: () => pedir<{ noLeidas: number; notificaciones: Notificacion[] }>("/user/notificaciones"),
  marcarLeida: (id: number) => pedir<void>(`/user/notificaciones/${id}/leida`, { method: "POST" }),
  marcarTodas: () => pedir<{ marcadas: number }>("/user/notificaciones/leidas", { method: "POST" }),
  suscripciones: () => pedir<{ restricciones: string[]; etiquetas: string[] }>("/user/suscripciones"),
  suscribir: (restricciones: string[]) =>
    pedir<{ restricciones: string[]; etiquetas: string[] }>("/user/suscripciones", {
      method: "PUT",
      body: JSON.stringify({ restricciones }),
    }),
};
