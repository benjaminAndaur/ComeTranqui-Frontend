"use client";

import { useState } from "react";
import { admin, ErrorApi, type Fallido } from "@/lib/admin";
import { Aviso, AvisoError, Boton, Insignia, Tarjeta, aError, fecha, useRecurso } from "./ui";

const colorEstado = { PENDIENTE: "ambar", REPROCESADO: "verde", DESCARTADO: "neutro" } as const;

function DetalleFallido({ f, alCambiar }: { f: Fallido; alCambiar: (m: string, e?: ErrorApi) => void }) {
  const [abierto, setAbierto] = useState(false);
  const accion = (p: Promise<unknown>, mensaje: string) => p.then(() => alCambiar(mensaje)).catch((e) => alCambiar("", aError(e)));

  return (
    <div className="border border-[#D1C9C5]/60 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[#563B2D]">
            #{f.id} <Insignia color={colorEstado[f.estado]}>{f.estado}</Insignia>{" "}
            <span className="text-xs text-[#563B2D]/50">{fecha(f.recibidoEn)}</span>
          </p>
          <p className="text-sm text-[#563B2D]/80 mt-1 break-words">
            <span className="font-mono text-red-700">{f.excepcion ?? "—"}</span>
          </p>
          <p className="text-sm text-[#563B2D]/70 break-words">{f.mensajeError}</p>
          <p className="text-xs font-mono text-[#563B2D]/50 mt-1">
            {f.topicOrigen}-{f.particion}@{f.offset} · grupo {f.grupo ?? "—"} · clave {f.clave ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Boton tipo="secundario" onClick={() => setAbierto((a) => !a)}>
            {abierto ? "Ocultar" : "Ver mensaje"}
          </Boton>
          {f.estado === "PENDIENTE" && (
            <>
              <Boton onClick={() => accion(admin.reprocesar(f.id), `Mensaje #${f.id} republicado en ${f.topicOrigen}`)}>Reprocesar</Boton>
              <Boton tipo="peligro" onClick={() => accion(admin.descartar(f.id), `Mensaje #${f.id} descartado`)}>
                Descartar
              </Boton>
            </>
          )}
        </div>
      </div>
      {abierto && (
        <div className="mt-3 grid gap-2">
          <pre className="text-xs bg-[#FAF8F5] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{f.contenido ?? "(vacío)"}</pre>
          {f.traza && (
            <details>
              <summary className="text-xs text-[#563B2D]/60 cursor-pointer">Stack trace</summary>
              <pre className="text-[10px] bg-[#FAF8F5] rounded-lg p-3 overflow-x-auto max-h-64">{f.traza}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function FallidosTab() {
  const [estado, setEstado] = useState("PENDIENTE");
  const { datos, error, cargando, recargar } = useRecurso(admin.fallidos, estado);
  const [aviso, setAviso] = useState<{ mensaje: string; error?: ErrorApi } | null>(null);

  return (
    <Tarjeta
      titulo="Mensajes fallidos (DLT)"
      descripcion="Mensajes que un consumidor no pudo procesar: errores definitivos (JSON inválido, datos inválidos) o reintentos agotados. Se guardan con su diagnóstico; al reprocesar se republican en su topic de origen con la misma clave."
      acciones={
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded-xl bg-white border border-[#D1C9C5] text-sm" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="PENDIENTE">Pendientes</option>
            <option value="REPROCESADO">Reprocesados</option>
            <option value="DESCARTADO">Descartados</option>
            <option value="">Todos</option>
          </select>
          <Boton tipo="secundario" onClick={recargar}>
            Actualizar
          </Boton>
        </div>
      }
    >
      {aviso && <div className="mb-4">{aviso.error ? <AvisoError error={aviso.error} /> : <Aviso tipo="exito">{aviso.mensaje}</Aviso>}</div>}
      <AvisoError error={error} />
      {datos && <p className="text-sm text-[#563B2D]/60 mb-3">{datos.pendientes} pendiente(s) de revisión · {datos.totalElementos} en este filtro</p>}
      {cargando && !datos && <p className="text-sm text-[#563B2D]/50">Cargando…</p>}
      {datos?.contenido.length === 0 && <p className="text-sm text-[#563B2D]/50">No hay mensajes en este estado.</p>}
      <div className="flex flex-col gap-3">
        {datos?.contenido.map((f) => (
          <DetalleFallido
            key={f.id}
            f={f}
            alCambiar={(mensaje, err) => {
              setAviso({ mensaje, error: err });
              if (!err) recargar();
            }}
          />
        ))}
      </div>
    </Tarjeta>
  );
}
