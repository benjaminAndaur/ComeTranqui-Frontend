"use client";

import { useState, type FormEvent } from "react";
import { admin, ErrorApi, type Destino } from "@/lib/admin";
import { Aviso, AvisoError, Boton, Campo, Insignia, Tarjeta, aError, claseInput, useRecurso } from "./ui";

/** Mismo formato que valida el backend (Solicitudes.FORMATO_TOPIC). */
const FORMATO = /^[a-z0-9]+(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;

function validarEnVivo(nombre: string, particiones: string, retencion: string, prefijos: string[]) {
  const errores: Record<string, string> = {};
  if (!nombre) errores.nombre = "El nombre es obligatorio";
  else if (!FORMATO.test(nombre)) errores.nombre = "Solo minúsculas, números, puntos y guiones (ej. notificaciones.sin-gluten)";
  else if (prefijos.length && !prefijos.some((p) => nombre.startsWith(p) && nombre.length > p.length))
    errores.nombre = `Debe comenzar con: ${prefijos.join(", ")}`;
  const p = Number(particiones);
  if (!Number.isInteger(p) || p < 1 || p > 6) errores.particiones = "Debe estar entre 1 y 6";
  if (retencion) {
    const r = Number(retencion);
    if (!Number.isInteger(r) || r < 1 || r > 720) errores.retencionHoras = "Entre 1 y 720 horas (30 días)";
  }
  return errores;
}

function FormularioDestino({ prefijos, alCrear }: { prefijos: string[]; alCrear: (d: Destino) => void }) {
  const [nombre, setNombre] = useState(prefijos[0] ?? "");
  const [particiones, setParticiones] = useState("1");
  const [retencion, setRetencion] = useState("168");
  const [limpieza, setLimpieza] = useState("delete");
  const [error, setError] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [tocado, setTocado] = useState(false);

  const enVivo = validarEnVivo(nombre, particiones, limpieza === "compact" ? "" : retencion, prefijos);
  const campo = (c: string) => error?.campo(c) ?? (tocado ? enVivo[c] : undefined);

  const hayErroresLocales = Object.keys(enVivo).length > 0;

  /** forzar = saltar la validación del navegador para demostrar que el servidor también valida. */
  const enviar = (e: FormEvent | null, forzar = false) => {
    e?.preventDefault();
    setTocado(true);
    if (hayErroresLocales && !forzar) return;
    setEnviando(true);
    setError(null);
    admin
      .crearDestino({
        nombre: nombre.trim(),
        particiones: Number(particiones),
        retencionHoras: limpieza === "compact" || !retencion ? undefined : Number(retencion),
        limpieza,
      })
      .then((d) => {
        alCrear(d);
        setNombre(prefijos[0] ?? "");
        setTocado(false);
      })
      .catch((err) => setError(aError(err)))
      .finally(() => setEnviando(false));
  };

  return (
    <form onSubmit={enviar} className="grid md:grid-cols-5 gap-3 items-start" noValidate>
      <div className="md:col-span-2">
        <Campo etiqueta="Nombre del destino" error={campo("nombre")} ayuda="Ej. notificaciones.ofertas-jumbo">
          <input id="destino-nombre" className={claseInput} value={nombre} onChange={(e) => setNombre(e.target.value)} onBlur={() => setTocado(true)} />
        </Campo>
      </div>
      <Campo etiqueta="Particiones" error={campo("particiones")}>
        <input id="destino-particiones" className={claseInput} type="number" min={1} max={6} value={particiones} onChange={(e) => setParticiones(e.target.value)} />
      </Campo>
      <Campo etiqueta="Limpieza" error={campo("limpieza")}>
        <select id="destino-limpieza" className={claseInput} value={limpieza} onChange={(e) => setLimpieza(e.target.value)}>
          <option value="delete">Por tiempo (delete)</option>
          <option value="compact">Compactado (último por clave)</option>
        </select>
      </Campo>
      <Campo etiqueta="Retención (horas)" error={campo("retencionHoras")} ayuda={limpieza === "compact" ? "No aplica a compactados" : "168 = 7 días"}>
        <input id="destino-retencion" className={claseInput} type="number" min={1} max={720} value={limpieza === "compact" ? "" : retencion} disabled={limpieza === "compact"} onChange={(e) => setRetencion(e.target.value)} />
      </Campo>
      <div className="md:col-span-5 flex flex-wrap items-center gap-3">
        <Boton id="btn-crear-destino" submit disabled={enviando}>
          {enviando ? "Creando…" : "Crear destino"}
        </Boton>
        {tocado && hayErroresLocales ? (
          <Boton id="btn-forzar-destino" tipo="secundario" onClick={() => enviar(null, true)} disabled={enviando}>
            Enviar igual al servidor
          </Boton>
        ) : (
          <span className="text-xs text-[#563B2D]/50">
            La validación del navegador es una ayuda; el backend vuelve a validar y responde con el motivo exacto.
          </span>
        )}
      </div>
      {error && (
        <div className="md:col-span-5">
          <AvisoError error={error} />
        </div>
      )}
    </form>
  );
}

function FilaDestino({ d, alCambiar, alAviso }: { d: Destino; alCambiar: () => void; alAviso: (m: string, e?: ErrorApi) => void }) {
  const [editando, setEditando] = useState(false);
  const [retencion, setRetencion] = useState(String(d.retencionHoras ?? ""));
  const [particiones, setParticiones] = useState(String(d.particiones));

  const guardar = () =>
    admin
      .modificarDestino(d.nombre, {
        retencionHoras: retencion && Number(retencion) !== d.retencionHoras ? Number(retencion) : undefined,
        particiones: Number(particiones) !== d.particiones ? Number(particiones) : undefined,
      })
      .then(() => {
        setEditando(false);
        alAviso(`Destino ${d.nombre} actualizado`);
        alCambiar();
      })
      .catch((e) => alAviso("", aError(e)));

  const eliminar = () => {
    if (!window.confirm(`¿Eliminar el destino ${d.nombre}? Se pierden sus mensajes.`)) return;
    admin
      .eliminarDestino(d.nombre)
      .then(() => {
        alAviso(`Destino ${d.nombre} eliminado`);
        alCambiar();
      })
      .catch((e) => alAviso("", aError(e)));
  };

  return (
    <tr className="border-t border-[#D1C9C5]/50 align-top">
      <td className="py-3 pr-3">
        <p className="font-mono text-sm text-[#563B2D]">{d.nombre}</p>
        {d.descripcion && <p className="text-xs text-[#563B2D]/50 mt-0.5 max-w-xs">{d.descripcion}</p>}
      </td>
      <td className="py-3 pr-3">{d.protegido ? <Insignia color="ambar">Protegido</Insignia> : <Insignia color="verde">Gestionable</Insignia>}</td>
      <td className="py-3 pr-3 text-sm">
        {editando ? <input className={`${claseInput} w-20`} type="number" min={d.particiones} max={6} value={particiones} onChange={(e) => setParticiones(e.target.value)} /> : d.particiones}
      </td>
      <td className="py-3 pr-3 text-sm">
        {d.limpieza?.includes("compact") ? (
          <Insignia>compactado</Insignia>
        ) : editando ? (
          <input className={`${claseInput} w-24`} type="number" min={1} max={720} value={retencion} onChange={(e) => setRetencion(e.target.value)} />
        ) : d.retencionHoras !== null ? (
          `${d.retencionHoras} h`
        ) : (
          "—"
        )}
      </td>
      <td className="py-3 pr-3 text-sm">{d.mensajes}</td>
      <td className="py-3 pr-3 text-xs">{d.reglas.length ? d.reglas.join(", ") : <span className="text-[#563B2D]/40">—</span>}</td>
      <td className="py-3 text-right whitespace-nowrap">
        {!d.protegido &&
          (editando ? (
            <span className="inline-flex gap-2">
              <Boton onClick={guardar}>Guardar</Boton>
              <Boton tipo="secundario" onClick={() => setEditando(false)}>
                Cancelar
              </Boton>
            </span>
          ) : (
            <span className="inline-flex gap-2">
              <Boton tipo="secundario" onClick={() => setEditando(true)}>
                Editar
              </Boton>
              <Boton tipo="peligro" onClick={eliminar}>
                Eliminar
              </Boton>
            </span>
          ))}
      </td>
    </tr>
  );
}

export default function DestinosTab({ prefijos }: { prefijos: string[] }) {
  const { datos, error, cargando, recargar } = useRecurso(admin.destinos);
  const [aviso, setAviso] = useState<{ mensaje: string; error?: ErrorApi } | null>(null);
  const mostrar = (mensaje: string, err?: ErrorApi) => setAviso({ mensaje, error: err });

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta
        titulo="Crear destino"
        descripcion="Los destinos nuevos se crean dentro de una familia del catálogo (hoy notificaciones.), para que siempre haya un consumidor que los atienda. Luego asígnale una regla en «Reglas»."
      >
        <FormularioDestino
          prefijos={prefijos}
          alCrear={(d) => {
            mostrar(`Destino ${d.nombre} creado (${d.particiones} partición(es))`);
            recargar();
          }}
        />
      </Tarjeta>

      <Tarjeta
        titulo="Destinos (topics de Kafka)"
        descripcion="Los protegidos pertenecen al catálogo base (application.yml): la aplicación depende de ellos. Un destino en uso por una regla no se puede eliminar."
        acciones={<Boton tipo="secundario" onClick={recargar}>Actualizar</Boton>}
      >
        {aviso && <div className="mb-4">{aviso.error ? <AvisoError error={aviso.error} /> : <Aviso tipo="exito">{aviso.mensaje}</Aviso>}</div>}
        <AvisoError error={error} />
        {cargando && !datos && <p className="text-sm text-[#563B2D]/50">Cargando destinos…</p>}
        {datos && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-[#563B2D]/50">
                <tr>
                  <th className="pb-2 pr-3">Destino</th>
                  <th className="pb-2 pr-3">Estado</th>
                  <th className="pb-2 pr-3">Particiones</th>
                  <th className="pb-2 pr-3">Retención</th>
                  <th className="pb-2 pr-3">Mensajes</th>
                  <th className="pb-2 pr-3">Reglas que lo usan</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {datos.map((d) => (
                  <FilaDestino key={d.nombre} d={d} alCambiar={recargar} alAviso={mostrar} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
