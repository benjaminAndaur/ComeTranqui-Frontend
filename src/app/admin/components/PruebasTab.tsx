"use client";

import { useEffect, useState, type FormEvent } from "react";
import { admin, ErrorApi, type Llegada, type ResultadoPrueba } from "@/lib/admin";
import { AvisoError, Boton, Campo, Insignia, Tarjeta, aError, claseInput, fecha } from "./ui";

const RESTRICCIONES = ["Sin Gluten", "Sin Lactosa", "APLV", "Vegano"];

export default function PruebasTab() {
  const [producto, setProducto] = useState("Pan de molde sin gluten");
  const [tienda, setTienda] = useState("JUMBO");
  const [restricciones, setRestricciones] = useState<string[]>(["Sin Gluten"]);
  const [baja, setBaja] = useState("30");
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null);
  const [llegadas, setLlegadas] = useState<Llegada[]>([]);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Sigue el mensaje hasta que el consumidor de notificaciones lo recibe en cada destino (máx. ~20 s)
  useEffect(() => {
    if (!resultado || resultado.destinosEsperados.length === 0) return;
    const reglas = resultado.evaluaciones.filter((e) => e.coincide).map((e) => e.regla);
    let intentos = 0;
    const t = setInterval(() => {
      intentos++;
      admin
        .seguirPrueba(resultado.eventoId, reglas)
        .then((l) => {
          setLlegadas(l);
          if (l.every((x) => x.recibida) || intentos > 20) clearInterval(t);
        })
        .catch(() => intentos > 20 && clearInterval(t));
    }, 1000);
    return () => clearInterval(t);
  }, [resultado]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setLlegadas([]);
    admin
      .enviarPrueba({ producto, tienda, restricciones, bajaPorcentaje: Number(baja) })
      .then(setResultado)
      .catch((err) => setError(aError(err)))
      .finally(() => setEnviando(false));
  };

  const alternar = (r: string) => setRestricciones((xs) => (xs.includes(r) ? xs.filter((x) => x !== r) : [...xs, r]));

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta
        titulo="Enviar mensaje de prueba"
        descripcion="Publica una alerta de baja de precio real en ofertas.alertas. Recorre el mismo camino que una alerta del scraper: el enrutador aplica las reglas y la reenvía a los destinos que correspondan."
      >
        <form onSubmit={enviar} className="grid md:grid-cols-4 gap-3" noValidate>
          <div className="md:col-span-2">
            <Campo etiqueta="Producto" error={error?.campo("producto")}>
              <input id="prueba-producto" className={claseInput} value={producto} onChange={(e) => setProducto(e.target.value)} />
            </Campo>
          </div>
          <Campo etiqueta="Tienda" error={error?.campo("tienda")}>
            <input id="prueba-tienda" className={claseInput} value={tienda} onChange={(e) => setTienda(e.target.value.toUpperCase())} />
          </Campo>
          <Campo etiqueta="Baja de precio (%)" error={error?.campo("bajaPorcentaje")}>
            <input id="prueba-baja" className={claseInput} type="number" min={1} max={99} value={baja} onChange={(e) => setBaja(e.target.value)} />
          </Campo>
          <div className="md:col-span-4">
            <span className="text-sm font-semibold text-[#563B2D]/80">Restricciones del producto</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {RESTRICCIONES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => alternar(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold ${restricciones.includes(r) ? "bg-[#A46C54] text-white" : "bg-white border border-[#D1C9C5] text-[#563B2D]"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {error?.campo("restricciones") && <span className="text-xs text-red-700">{error.campo("restricciones")}</span>}
          </div>
          <div className="md:col-span-4">
            <Boton id="btn-enviar-prueba" submit disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar mensaje de prueba"}
            </Boton>
          </div>
        </form>
        {error && (
          <div className="mt-4">
            <AvisoError error={error} />
          </div>
        )}
      </Tarjeta>

      {resultado && (
        <Tarjeta titulo="Recorrido del mensaje" descripcion={`Evento ${resultado.eventoId} publicado en ${resultado.topicOrigen}.`}>
          <ol className="flex flex-col gap-2">
            {resultado.evaluaciones.map((e) => {
              const llegada = llegadas.find((l) => l.regla === e.regla);
              return (
                <li key={e.regla} className="flex flex-wrap items-center gap-2 text-sm border border-[#D1C9C5]/60 rounded-xl px-4 py-2">
                  <Insignia color={e.coincide ? "verde" : "neutro"}>{e.coincide ? "coincide" : "no coincide"}</Insignia>
                  <span className="font-semibold text-[#563B2D]">{e.regla}</span>
                  <span className="text-[#563B2D]/60">— {e.motivo}</span>
                  {e.coincide && (
                    <span className="ml-auto text-xs">
                      → <code className="text-[#A46C54]">{e.topicDestino}</code>{" "}
                      {llegada?.recibida ? (
                        <Insignia color="verde">
                          recibido por {llegada.consumidor} · {llegada.destinatarios} suscrito(s) · {fecha(llegada.recibidaEn)}
                        </Insignia>
                      ) : (
                        <Insignia color="ambar">esperando al consumidor…</Insignia>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {resultado.destinosEsperados.length === 0 && (
            <p className="text-sm text-[#8B6914] mt-3">Ninguna regla coincide: la alerta queda «sin ruta» y no se notifica a nadie.</p>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
