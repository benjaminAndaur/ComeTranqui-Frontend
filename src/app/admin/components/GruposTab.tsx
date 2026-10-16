"use client";

import { useEffect, useState } from "react";
import { admin } from "@/lib/admin";
import { AvisoError, Boton, Insignia, Tarjeta, useRecurso } from "./ui";

export default function GruposTab() {
  const { datos, error, cargando, recargar } = useRecurso(admin.grupos);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(recargar, 3000);
    return () => clearInterval(t);
  }, [auto, recargar]);

  return (
    <Tarjeta
      titulo="Consumidores (consumer groups)"
      descripcion="Cada ruta del catálogo es un consumer group. El lag es cuántos mensajes le faltan por procesar: sube al ejecutar el scraper y vuelve a 0 cuando los consumidores terminan."
      acciones={
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#563B2D]">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[#A46C54]" />
            Actualizar cada 3 s
          </label>
          <Boton tipo="secundario" onClick={recargar}>
            Actualizar
          </Boton>
        </div>
      }
    >
      <AvisoError error={error} />
      {cargando && !datos && <p className="text-sm text-[#563B2D]/50">Cargando grupos…</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {datos?.map((g) => (
          <div key={g.grupo} className="border border-[#D1C9C5]/60 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[#563B2D]">{g.ruta}</p>
                <p className="text-xs font-mono text-[#563B2D]/60">
                  {g.grupo} ← {g.topic}
                </p>
              </div>
              <Insignia color={g.lag > 0 ? "ambar" : "verde"}>lag {g.lag}</Insignia>
            </div>
            {g.descripcion && <p className="text-sm text-[#563B2D]/70 mt-2">{g.descripcion}</p>}
            <p className="text-xs text-[#563B2D]/50 mt-2">
              Estado {g.estado} · {g.miembros} consumidor(es) activo(s)
            </p>
            {g.particiones.length > 0 && (
              <table className="w-full text-xs mt-3">
                <thead className="text-[#563B2D]/50">
                  <tr>
                    <th className="text-left">Topic-partición</th>
                    <th className="text-right">Confirmado</th>
                    <th className="text-right">Fin</th>
                    <th className="text-right">Lag</th>
                  </tr>
                </thead>
                <tbody>
                  {g.particiones.map((p) => (
                    <tr key={`${p.topic}-${p.particion}`} className="border-t border-[#D1C9C5]/40">
                      <td className="font-mono py-1">
                        {p.topic}-{p.particion}
                      </td>
                      <td className="text-right">{p.confirmado}</td>
                      <td className="text-right">{p.fin}</td>
                      <td className={`text-right font-semibold ${p.lag > 0 ? "text-[#8B6914]" : "text-[#2D7A4A]"}`}>{p.lag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}
