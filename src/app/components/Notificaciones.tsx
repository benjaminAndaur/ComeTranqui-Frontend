"use client";

import { useEffect, useState } from "react";
import { notificaciones, type Notificacion } from "@/lib/notificaciones";

const RESTRICCIONES = [
  { codigo: "SIN_GLUTEN", etiqueta: "Sin Gluten" },
  { codigo: "SIN_LACTOSA", etiqueta: "Sin Lactosa" },
  { codigo: "APLV", etiqueta: "APLV" },
  { codigo: "VEGANO", etiqueta: "Vegano" },
];

/**
 * Campana del usuario autenticado: notificaciones de bajas de precio de las restricciones que sigue.
 * Son el destino final del flujo ofertas.alertas -> reglas de distribución -> notificaciones.* -> consumidor.
 */
export default function Notificaciones() {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [suscritas, setSuscritas] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const [sinServidor, setSinServidor] = useState(false);

  useEffect(() => {
    let vigente = true;
    const cargar = () =>
      notificaciones
        .listar()
        .then((r) => {
          if (!vigente) return;
          setLista(r.notificaciones);
          setNoLeidas(r.noLeidas);
          setSinServidor(false);
        })
        .catch(() => vigente && setSinServidor(true));
    cargar();
    notificaciones.suscripciones().then((s) => vigente && setSuscritas(s.restricciones)).catch(() => {});
    const t = setInterval(cargar, 30000);
    return () => {
      vigente = false;
      clearInterval(t);
    };
  }, [version]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    document.addEventListener("click", cerrar);
    return () => document.removeEventListener("click", cerrar);
  }, [abierto]);

  const alternarSuscripcion = (codigo: string) => {
    const nuevas = suscritas.includes(codigo) ? suscritas.filter((c) => c !== codigo) : [...suscritas, codigo];
    setSuscritas(nuevas);
    notificaciones.suscribir(nuevas).catch(() => setVersion((v) => v + 1));
  };

  const abrir = (n: Notificacion) => {
    if (!n.leida) notificaciones.marcarLeida(n.id).then(() => setVersion((v) => v + 1)).catch(() => {});
    if (n.url) window.open(n.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        id="btn-notificaciones"
        onClick={() => setAbierto((a) => !a)}
        aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ""}`}
        className="relative w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#C3A69A] hover:border-[#A46C54] bg-white text-lg"
      >
        🔔
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#A46C54] text-white text-[10px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#D1C9C5]/60 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#D1C9C5]/40">
            <p className="text-sm font-semibold text-[#563B2D]">Avísame cuando bajen de precio productos:</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {RESTRICCIONES.map((r) => (
                <button
                  key={r.codigo}
                  onClick={() => alternarSuscripcion(r.codigo)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    suscritas.includes(r.codigo) ? "bg-[#A46C54] text-white" : "bg-[#C3A69A]/20 text-[#563B2D]"
                  }`}
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {sinServidor && <p className="px-4 py-3 text-xs text-[#8B6914]">El servidor está en pausa; las notificaciones vuelven cuando se encienda.</p>}
            {!sinServidor && lista.length === 0 && (
              <p className="px-4 py-6 text-sm text-[#563B2D]/50 text-center">
                {suscritas.length ? "Aún no hay bajas de precio para tus restricciones." : "Elige tus restricciones para recibir avisos."}
              </p>
            )}
            {lista.map((n) => (
              <button
                key={n.id}
                onClick={() => abrir(n)}
                className={`w-full text-left px-4 py-3 border-b border-[#D1C9C5]/30 hover:bg-[#FAF8F5] ${n.leida ? "opacity-60" : ""}`}
              >
                <p className="text-sm font-semibold text-[#563B2D]">{n.titulo}</p>
                {n.detalle && <p className="text-xs text-[#563B2D]/60">{n.detalle}</p>}
              </button>
            ))}
          </div>
          {noLeidas > 0 && (
            <button
              onClick={() => notificaciones.marcarTodas().then(() => setVersion((v) => v + 1))}
              className="w-full px-4 py-2 text-xs font-semibold text-[#A46C54] hover:bg-[#FAF8F5]"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
