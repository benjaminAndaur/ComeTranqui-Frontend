"use client";

import { type Catalogo } from "@/lib/admin";
import { Insignia, Tarjeta } from "./ui";

/** "PT168H" -> "7 días", "PT1S" -> "1 s" (duraciones ISO-8601 del catálogo). */
export function duracion(iso?: string) {
  if (!iso) return "por defecto";
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/);
  if (!m) return iso;
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2] ?? 0), Number(m[3] ?? 0)];
  if (h && h % 24 === 0) return `${h / 24} día${h / 24 === 1 ? "" : "s"}`;
  if (h) return `${h} h`;
  if (min) return `${min} min`;
  return s < 1 ? `${s * 1000} ms` : `${s} s`;
}

/** Configuración vigente de canales y rutas (solo lectura): lo que declara app.mensajeria en application.yml. */
export default function CatalogoTab({ catalogo }: { catalogo: Catalogo }) {
  return (
    <div className="flex flex-col gap-6">
      <Tarjeta
        titulo="Destinos del catálogo"
        descripcion="Única fuente de verdad de los canales. Los topics se crean desde aquí al arrancar; cambiar un nombre o una retención se hace solo en application.yml."
      >
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(catalogo.destinos).map(([clave, d]) => (
            <div key={clave} className="border border-[#D1C9C5]/60 rounded-xl p-4">
              <p className="font-semibold text-[#563B2D]">
                {clave} {d.prefijo ? <Insignia color="verde">familia</Insignia> : <Insignia color="ambar">fijo</Insignia>}
              </p>
              <p className="text-sm font-mono text-[#A46C54]">{d.topic ?? `${d.prefijo}*`}</p>
              <p className="text-xs text-[#563B2D]/60 mt-1">
                {d.particiones ?? 1} partición(es) · {d.limpieza === "COMPACT" ? "compactado" : `retención ${duracion(d.retencion)}`}
              </p>
              {d.iniciales && d.iniciales.length > 0 && <p className="text-xs text-[#563B2D]/60">Iniciales: {d.iniciales.join(", ")}</p>}
              {d.descripcion && <p className="text-sm text-[#563B2D]/70 mt-1">{d.descripcion}</p>}
            </div>
          ))}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Rutas (quién consume qué)" descripcion={`Reintentos: ${catalogo.reintentos.intentos}, backoff inicial ${duracion(catalogo.reintentos.backoffInicial)} ×${catalogo.reintentos.multiplicador}. Luego, a la DLT.`}>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-wider text-[#563B2D]/50">
            <tr>
              <th className="pb-2">Ruta</th>
              <th className="pb-2">Origen</th>
              <th className="pb-2">Consumer group</th>
              <th className="pb-2">Hilos</th>
              <th className="pb-2">Qué hace</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(catalogo.rutas).map(([clave, r]) => (
              <tr key={clave} className="border-t border-[#D1C9C5]/50 align-top">
                <td className="py-2 font-semibold text-[#563B2D]">{clave}</td>
                <td className="py-2 font-mono text-xs">{r.origen}</td>
                <td className="py-2 font-mono text-xs">{r.grupo}</td>
                <td className="py-2">{r.concurrencia ?? 1}</td>
                <td className="py-2 text-[#563B2D]/70">{r.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  );
}
