"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ErrorApi } from "@/lib/admin";

// Componentes y hook compartidos por las pestañas de administración (misma paleta del resto del sitio).

/** Carga un recurso; `recargar()` vuelve a pedirlo (por ejemplo, después de crear o eliminar). */
export function useRecurso<T>(cargar: (clave: string) => Promise<T>, clave = "") {
  const [version, setVersion] = useState(0);
  const [estado, setEstado] = useState<{ datos: T | null; error: ErrorApi | null; de: string }>({
    datos: null,
    error: null,
    de: "",
  });
  const id = `${clave}#${version}`;

  useEffect(() => {
    let vigente = true;
    cargar(clave)
      .then((datos) => vigente && setEstado({ datos, error: null, de: id }))
      .catch((e) => vigente && setEstado((s) => ({ ...s, error: aError(e), de: id })));
    return () => {
      vigente = false;
    };
  }, [cargar, clave, id]);

  return {
    datos: estado.datos,
    error: estado.de === id ? estado.error : null,
    cargando: estado.de !== id,
    recargar: () => setVersion((v) => v + 1),
  };
}

export function aError(e: unknown): ErrorApi {
  return e instanceof ErrorApi ? e : new ErrorApi(0, "Error inesperado", String(e));
}

export function Aviso({ tipo, children }: { tipo: "exito" | "error" | "info"; children: ReactNode }) {
  const estilos = {
    exito: "text-[#2D7A4A] bg-[#2D7A4A]/10 border-[#2D7A4A]/30",
    error: "text-red-700 bg-red-50 border-red-200",
    info: "text-[#8B6914] bg-[#8B6914]/10 border-[#8B6914]/30",
  }[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`text-sm rounded-xl border px-4 py-3 ${estilos}`}>
      {children}
    </div>
  );
}

/** Muestra un ErrorApi: título, detalle y la lista de campos inválidos. */
export function AvisoError({ error }: { error: ErrorApi | null }) {
  if (!error) return null;
  return (
    <Aviso tipo="error">
      <p className="font-semibold">
        {error.titulo}
        {error.status ? ` (HTTP ${error.status})` : ""}
      </p>
      {error.detalle && <p>{error.detalle}</p>}
      {error.errores.length > 0 && (
        <ul className="list-disc pl-5 mt-1">
          {error.errores.map((e) => (
            <li key={e.campo + e.mensaje}>
              <code>{e.campo}</code>: {e.mensaje}
            </li>
          ))}
        </ul>
      )}
    </Aviso>
  );
}

export function Boton({
  children,
  onClick,
  tipo = "primario",
  disabled,
  submit,
  id,
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "primario" | "secundario" | "peligro";
  disabled?: boolean;
  submit?: boolean;
  id?: string;
}) {
  const estilos = {
    primario: "bg-[#A46C54] text-white hover:bg-[#563B2D]",
    secundario: "bg-white text-[#563B2D] border border-[#D1C9C5] hover:border-[#A46C54]",
    peligro: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  }[tipo];
  return (
    <button
      id={id}
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${estilos}`}
    >
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  children,
}: {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-[#563B2D]/80">{etiqueta}</span>
      {children}
      {error ? <span className="text-xs text-red-700">{error}</span> : ayuda && <span className="text-xs text-[#563B2D]/50">{ayuda}</span>}
    </label>
  );
}

export const claseInput =
  "px-3 py-2 rounded-xl bg-white border border-[#D1C9C5] text-[#563B2D] focus:outline-none focus:ring-2 focus:ring-[#A46C54]/30 focus:border-[#A46C54]";

export function Insignia({ children, color = "neutro" }: { children: ReactNode; color?: "verde" | "ambar" | "rojo" | "neutro" }) {
  const estilos = {
    verde: "bg-[#2D7A4A]/10 text-[#2D7A4A]",
    ambar: "bg-[#8B6914]/10 text-[#8B6914]",
    rojo: "bg-red-50 text-red-700",
    neutro: "bg-[#C3A69A]/20 text-[#563B2D]",
  }[color];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${estilos}`}>{children}</span>;
}

export function Tarjeta({ titulo, descripcion, acciones, children }: { titulo: string; descripcion?: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white/80 rounded-2xl border border-[#D1C9C5]/60 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#563B2D]">{titulo}</h2>
          {descripcion && <p className="text-sm text-[#563B2D]/60 mt-1 max-w-3xl">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

export const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Santiago" }).format(new Date(iso)) : "—";
