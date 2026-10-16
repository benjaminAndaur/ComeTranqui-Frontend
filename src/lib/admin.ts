// Cliente de la API de administración de mensajería (/api/admin/mensajeria, rol admin de Cognito).
// Usa apiFetch (adjunta el token) y traduce las respuestas Problem Details (RFC 9457) a ErrorApi.
import { apiFetch } from "./api";

const BASE = "/admin/mensajeria";

export type ErrorCampo = { campo: string; mensaje: string };

export class ErrorApi extends Error {
  constructor(
    public status: number,
    public titulo: string,
    public detalle: string,
    public errores: ErrorCampo[] = []
  ) {
    super(detalle || titulo);
  }

  /** Mensaje del campo indicado, para mostrarlo bajo el input. */
  campo(nombre: string) {
    return this.errores.find((e) => e.campo === nombre)?.mensaje;
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(`${BASE}${ruta}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ErrorApi(0, "Sin conexión", "No se pudo contactar al servidor. ¿Está encendido el backend?");
  }
  if (res.status === 204) return undefined as T;
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new ErrorApi(401, "Sesión expirada", "Vuelve a iniciar sesión.");
    if (res.status === 403) throw new ErrorApi(403, "Sin permisos", "Tu cuenta no pertenece al grupo admin.");
    throw new ErrorApi(res.status, cuerpo?.title ?? `Error ${res.status}`, cuerpo?.detail ?? "", cuerpo?.errores ?? []);
  }
  return cuerpo as T;
}

const json = (metodo: string, cuerpo: unknown): RequestInit => ({ method: metodo, body: JSON.stringify(cuerpo) });

// ── Tipos (espejo de los DTOs del backend) ─────────────────────────────────
export type Destino = {
  nombre: string;
  claveCatalogo: string | null;
  descripcion: string | null;
  particiones: number;
  retencionHoras: number | null;
  limpieza: string | null;
  mensajes: number;
  protegido: boolean;
  reglas: string[];
};

export type Regla = {
  id: number;
  nombre: string;
  destinoOrigen: string;
  restriccion: string | null;
  restriccionEtiqueta: string | null;
  descuentoMinimo: number | null;
  tienda: string | null;
  topicDestino: string;
  activa: boolean;
  prioridad: number;
  actualizadaEn: string | null;
};

export type SolicitudRegla = Omit<Regla, "id" | "restriccionEtiqueta" | "actualizadaEn">;

export type Grupo = {
  ruta: string;
  grupo: string;
  descripcion: string | null;
  topic: string;
  estado: string;
  miembros: number;
  lag: number;
  particiones: { topic: string; particion: number; confirmado: number; fin: number; lag: number }[];
};

export type Fallido = {
  id: number;
  topicOrigen: string | null;
  particion: number | null;
  offset: number | null;
  grupo: string | null;
  clave: string | null;
  contenido: string | null;
  excepcion: string | null;
  mensajeError: string | null;
  traza: string | null;
  estado: "PENDIENTE" | "REPROCESADO" | "DESCARTADO";
  recibidoEn: string;
};

export type Evaluacion = { regla: string; topicDestino: string; restriccion: string | null; coincide: boolean; motivo: string };
export type ResultadoPrueba = { eventoId: string; topicOrigen: string; evaluaciones: Evaluacion[]; destinosEsperados: string[] };
export type Llegada = {
  regla: string;
  topicDestino: string | null;
  recibida: boolean;
  consumidor: string;
  destinatarios: number | null;
  recibidaEn: string | null;
};

export type Catalogo = {
  destinos: Record<string, { topic?: string; prefijo?: string; particiones?: number; retencion?: string; limpieza?: string; iniciales?: string[]; descripcion?: string }>;
  rutas: Record<string, { origen: string; grupo: string; concurrencia?: number; descripcion?: string }>;
  reintentos: { intentos: number; backoffInicial: string; multiplicador: number };
  prefijosPermitidos: string[];
};

// ── Operaciones ────────────────────────────────────────────────────────────
export const admin = {
  catalogo: () => pedir<Catalogo>("/catalogo"),

  destinos: () => pedir<Destino[]>("/destinos"),
  crearDestino: (d: { nombre: string; particiones: number; retencionHoras?: number; limpieza: string }) =>
    pedir<Destino>("/destinos", json("POST", d)),
  modificarDestino: (nombre: string, c: { retencionHoras?: number; particiones?: number }) =>
    pedir<Destino>(`/destinos/${encodeURIComponent(nombre)}`, json("PATCH", c)),
  eliminarDestino: (nombre: string) => pedir<void>(`/destinos/${encodeURIComponent(nombre)}`, { method: "DELETE" }),

  reglas: () => pedir<Regla[]>("/reglas"),
  crearRegla: (r: SolicitudRegla) => pedir<Regla>("/reglas", json("POST", r)),
  modificarRegla: (id: number, r: SolicitudRegla) => pedir<Regla>(`/reglas/${id}`, json("PUT", r)),
  activarRegla: (id: number, activa: boolean) => pedir<Regla>(`/reglas/${id}/estado`, json("PATCH", { activa })),
  eliminarRegla: (id: number) => pedir<void>(`/reglas/${id}`, { method: "DELETE" }),

  grupos: () => pedir<Grupo[]>("/grupos"),

  fallidos: (estado?: string) =>
    pedir<{ contenido: Fallido[]; totalElementos: number; pendientes: number }>(
      `/fallidos${estado ? `?estado=${estado}` : ""}`
    ),
  reprocesar: (id: number) => pedir<Fallido>(`/fallidos/${id}/reprocesar`, { method: "POST" }),
  descartar: (id: number) => pedir<Fallido>(`/fallidos/${id}`, { method: "DELETE" }),

  enviarPrueba: (p: { producto: string; tienda: string; restricciones: string[]; bajaPorcentaje: number }) =>
    pedir<ResultadoPrueba>("/pruebas", json("POST", p)),
  seguirPrueba: (eventoId: string, reglas: string[]) =>
    pedir<Llegada[]>(`/pruebas/${encodeURIComponent(eventoId)}?${reglas.map((r) => `reglas=${encodeURIComponent(r)}`).join("&")}`),
};
