"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens, saveAccessToken, saveIdToken } from "@/lib/auth";
import { notificarCambioSesion } from "@/lib/sesion";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [errorIntercambio, setErrorIntercambio] = useState<string | null>(null);
  const error = code ? errorIntercambio : "No se recibió código de autorización.";

  useEffect(() => {
    if (!code) return;
    exchangeCodeForTokens(code)
      .then(({ access_token, id_token }) => {
        saveAccessToken(access_token);
        saveIdToken(id_token);
        notificarCambioSesion();
        router.replace("/");
      })
      .catch(() => {
        setErrorIntercambio("No se pudo completar el inicio de sesión.");
      });
  }, [code, router]);

  return (
    <p className="text-[#563B2D] font-medium">
      {error ?? "Completando inicio de sesión…"}
    </p>
  );
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <Suspense fallback={<p className="text-[#563B2D] font-medium">Cargando…</p>}>
        <CallbackInner />
      </Suspense>
    </div>
  );
}
