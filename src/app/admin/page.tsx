"use client";

import { useState } from "react";
import Link from "next/link";
import { admin } from "@/lib/admin";
import { esAdmin, loginUrl } from "@/lib/auth";
import { useSesion } from "@/lib/sesion";
import CatalogoTab from "./components/CatalogoTab";
import DestinosTab from "./components/DestinosTab";
import FallidosTab from "./components/FallidosTab";
import GruposTab from "./components/GruposTab";
import PruebasTab from "./components/PruebasTab";
import ReglasTab from "./components/ReglasTab";
import { AvisoError, Boton, useRecurso } from "./components/ui";

const PESTANAS = [
  { id: "destinos", titulo: "Destinos", ayuda: "Topics: crear, modificar y eliminar" },
  { id: "reglas", titulo: "Reglas", ayuda: "Qué alertas van a qué destino" },
  { id: "grupos", titulo: "Consumidores", ayuda: "Consumer groups y lag" },
  { id: "fallidos", titulo: "Fallidos", ayuda: "DLT: revisar y reprocesar" },
  { id: "pruebas", titulo: "Probar", ayuda: "Mensaje de prueba y su recorrido" },
  { id: "catalogo", titulo: "Catálogo", ayuda: "Configuración vigente" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

function Panel() {
  const [pestana, setPestana] = useState<Pestana>("destinos");
  const catalogo = useRecurso(admin.catalogo);

  return (
    <>
      <nav className="flex flex-wrap gap-2 mb-6" aria-label="Secciones de administración">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            id={`tab-${p.id}`}
            onClick={() => setPestana(p.id)}
            aria-current={pestana === p.id ? "page" : undefined}
            title={p.ayuda}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              pestana === p.id ? "bg-[#A46C54] text-white shadow" : "bg-white text-[#563B2D] border border-[#D1C9C5] hover:border-[#A46C54]"
            }`}
          >
            {p.titulo}
          </button>
        ))}
      </nav>
      <AvisoError error={catalogo.error} />
      {pestana === "destinos" && <DestinosTab prefijos={catalogo.datos?.prefijosPermitidos ?? []} />}
      {pestana === "reglas" && <ReglasTab />}
      {pestana === "grupos" && <GruposTab />}
      {pestana === "fallidos" && <FallidosTab />}
      {pestana === "pruebas" && <PruebasTab />}
      {pestana === "catalogo" && catalogo.datos && <CatalogoTab catalogo={catalogo.datos} />}
    </>
  );
}

export default function AdminPage() {
  const { loggedIn, profile } = useSesion();

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="border-b border-[#D1C9C5]/60 bg-white/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-[#563B2D] font-bold">
            ← Come Tranqui
          </Link>
          <span className="text-sm text-[#563B2D]/60">{profile?.email}</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#563B2D]">Administración de mensajería</h1>
        <p className="text-[#563B2D]/60 mt-2 mb-8 max-w-3xl">
          Destinos (topics de Kafka), reglas de distribución, consumidores y mensajes fallidos. Cada acción se valida en
          el servidor y responde con el motivo si no se puede aplicar.
        </p>
        {!loggedIn ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[#563B2D]">Inicia sesión con una cuenta del grupo administrador.</p>
            <Boton onClick={() => window.location.assign(loginUrl())}>Iniciar sesión con Google</Boton>
          </div>
        ) : !esAdmin(profile) ? (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Tu cuenta no pertenece al grupo <code>admin</code> de Cognito. Pide acceso a un administrador y vuelve a iniciar sesión.
          </p>
        ) : (
          <Panel />
        )}
      </main>
    </div>
  );
}
