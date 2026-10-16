"use client";

import { useState, type FormEvent } from "react";
import { admin, ErrorApi, type Regla, type SolicitudRegla } from "@/lib/admin";
import { Aviso, AvisoError, Boton, Campo, Insignia, Tarjeta, aError, claseInput, useRecurso } from "./ui";

const RESTRICCIONES = [
  { codigo: "SIN_GLUTEN", etiqueta: "Sin Gluten" },
  { codigo: "SIN_LACTOSA", etiqueta: "Sin Lactosa" },
  { codigo: "APLV", etiqueta: "APLV" },
  { codigo: "VEGANO", etiqueta: "Vegano" },
];
const TIENDAS = ["JUMBO", "SANTA_ISABEL", "UNIMARC", "DAORO", "LIREKE", "TASTY_FREE", "ARADOS", "GLOBE_ITALIA", "THIS_IS_VEGAN"];

const vacia: SolicitudRegla = {
  nombre: "",
  destinoOrigen: "alertas-precio",
  restriccion: null,
  descuentoMinimo: 20,
  tienda: null,
  topicDestino: "",
  activa: true,
  prioridad: 100,
};

function FormularioRegla({
  inicial,
  idEdicion,
  destinos,
  alGuardar,
  alCancelar,
}: {
  inicial: SolicitudRegla;
  idEdicion: number | null;
  destinos: string[];
  alGuardar: (r: Regla) => void;
  alCancelar?: () => void;
}) {
  const [r, setR] = useState<SolicitudRegla>(inicial);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = <K extends keyof SolicitudRegla>(k: K, v: SolicitudRegla[K]) => setR((x) => ({ ...x, [k]: v }));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    (idEdicion === null ? admin.crearRegla(r) : admin.modificarRegla(idEdicion, r))
      .then((g) => {
        alGuardar(g);
        if (idEdicion === null) setR(vacia);
      })
      .catch((err) => setError(aError(err)))
      .finally(() => setEnviando(false));
  };

  return (
    <form onSubmit={enviar} className="grid md:grid-cols-4 gap-3" noValidate>
      <Campo etiqueta="Nombre" error={error?.campo("nombre")} ayuda="Ej. alertas-celiacos">
        <input id="regla-nombre" className={claseInput} value={r.nombre} onChange={(e) => cambiar("nombre", e.target.value)} />
      </Campo>
      <Campo etiqueta="Restricción" error={error?.campo("restriccion")}>
        <select id="regla-restriccion" className={claseInput} value={r.restriccion ?? ""} onChange={(e) => cambiar("restriccion", e.target.value || null)}>
          <option value="">Cualquiera</option>
          {RESTRICCIONES.map((x) => (
            <option key={x.codigo} value={x.codigo}>
              {x.etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Descuento mínimo (%)" error={error?.campo("descuentoMinimo")}>
        <input id="regla-descuento" className={claseInput} type="number" min={0} max={100} value={r.descuentoMinimo ?? ""}
          onChange={(e) => cambiar("descuentoMinimo", e.target.value === "" ? null : Number(e.target.value))} />
      </Campo>
      <Campo etiqueta="Tienda" error={error?.campo("tienda")}>
        <select id="regla-tienda" className={claseInput} value={r.tienda ?? ""} onChange={(e) => cambiar("tienda", e.target.value || null)}>
          <option value="">Cualquiera</option>
          {TIENDAS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Destino" error={error?.campo("topicDestino")} ayuda="Crea destinos nuevos en «Destinos»">
        <select id="regla-destino" className={claseInput} value={r.topicDestino} onChange={(e) => cambiar("topicDestino", e.target.value)}>
          <option value="">Selecciona…</option>
          {destinos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Prioridad" error={error?.campo("prioridad")} ayuda="Menor = se evalúa antes">
        <input id="regla-prioridad" className={claseInput} type="number" min={0} max={1000} value={r.prioridad} onChange={(e) => cambiar("prioridad", Number(e.target.value))} />
      </Campo>
      <Campo etiqueta="Origen" error={error?.campo("destinoOrigen")} ayuda="El enrutador evalúa las alertas de precio">
        <input className={claseInput} value={r.destinoOrigen} readOnly />
      </Campo>
      <label className="flex items-center gap-2 text-sm font-semibold text-[#563B2D]/80 mt-6">
        <input type="checkbox" checked={r.activa} onChange={(e) => cambiar("activa", e.target.checked)} className="w-4 h-4 accent-[#2D7A4A]" />
        Activa
      </label>
      <div className="md:col-span-4 flex gap-3">
        <Boton id="btn-guardar-regla" submit disabled={enviando}>
          {enviando ? "Guardando…" : idEdicion === null ? "Crear regla" : "Guardar cambios"}
        </Boton>
        {alCancelar && (
          <Boton tipo="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
      </div>
      {error && (
        <div className="md:col-span-4">
          <AvisoError error={error} />
        </div>
      )}
    </form>
  );
}

const condiciones = (r: Regla) =>
  [
    r.restriccionEtiqueta && `es ${r.restriccionEtiqueta}`,
    r.descuentoMinimo !== null && `baja ≥ ${r.descuentoMinimo}%`,
    r.tienda && `tienda ${r.tienda}`,
  ]
    .filter(Boolean)
    .join(" y ");

export default function ReglasTab() {
  const reglas = useRecurso(admin.reglas);
  const destinos = useRecurso(admin.destinos);
  const [editando, setEditando] = useState<Regla | null>(null);
  const [aviso, setAviso] = useState<{ mensaje: string; error?: ErrorApi } | null>(null);
  const familias = (destinos.datos ?? []).filter((d) => !d.protegido).map((d) => d.nombre);

  const accion = (p: Promise<unknown>, mensaje: string) =>
    p.then(() => {
      setAviso({ mensaje });
      reglas.recargar();
      destinos.recargar();
    }).catch((e) => setAviso({ mensaje: "", error: aError(e) }));

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta
        titulo={editando ? `Editar regla ${editando.nombre}` : "Nueva regla de distribución"}
        descripcion="Si una alerta de precio cumple TODAS las condiciones indicadas, se reenvía al destino. Las condiciones vacías no filtran; debe haber al menos una."
      >
        <FormularioRegla
          key={editando?.id ?? "nueva"}
          inicial={editando ? { ...editando } : vacia}
          idEdicion={editando?.id ?? null}
          destinos={familias}
          alGuardar={(g) => {
            setAviso({ mensaje: `Regla ${g.nombre} guardada` });
            setEditando(null);
            reglas.recargar();
            destinos.recargar();
          }}
          alCancelar={editando ? () => setEditando(null) : undefined}
        />
      </Tarjeta>

      <Tarjeta titulo="Reglas" descripcion="Se evalúan por prioridad. Una alerta puede cumplir varias y llegar a varios destinos." acciones={<Boton tipo="secundario" onClick={reglas.recargar}>Actualizar</Boton>}>
        {aviso && <div className="mb-4">{aviso.error ? <AvisoError error={aviso.error} /> : <Aviso tipo="exito">{aviso.mensaje}</Aviso>}</div>}
        <AvisoError error={reglas.error} />
        {reglas.cargando && !reglas.datos && <p className="text-sm text-[#563B2D]/50">Cargando reglas…</p>}
        <div className="flex flex-col gap-3">
          {reglas.datos?.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border border-[#D1C9C5]/60 rounded-xl px-4 py-3">
              <div>
                <p className="font-semibold text-[#563B2D]">
                  {r.nombre} <Insignia color={r.activa ? "verde" : "neutro"}>{r.activa ? "activa" : "inactiva"}</Insignia>{" "}
                  <span className="text-xs text-[#563B2D]/50">prioridad {r.prioridad}</span>
                </p>
                <p className="text-sm text-[#563B2D]/70">
                  Si la alerta {condiciones(r)} → <code className="text-[#A46C54]">{r.topicDestino}</code>
                </p>
              </div>
              <div className="flex gap-2">
                <Boton tipo="secundario" onClick={() => setEditando(r)}>
                  Editar
                </Boton>
                <Boton tipo="secundario" onClick={() => accion(admin.activarRegla(r.id, !r.activa), `Regla ${r.nombre} ${r.activa ? "desactivada" : "activada"}`)}>
                  {r.activa ? "Desactivar" : "Activar"}
                </Boton>
                <Boton
                  tipo="peligro"
                  onClick={() => window.confirm(`¿Eliminar la regla ${r.nombre}?`) && accion(admin.eliminarRegla(r.id), `Regla ${r.nombre} eliminada`)}
                >
                  Eliminar
                </Boton>
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>
    </div>
  );
}
