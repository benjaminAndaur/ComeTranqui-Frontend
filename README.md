# Come Tranqui — Frontend

Interfaz web de **Come Tranqui** (DSY1107 — Desarrollo Cloud Native I, Duoc UC): ofertas de productos aptos, mapa de
locales seguros y administración de la mensajería para personas con restricciones alimentarias.

- Producción: https://cometranqui.vercel.app (y EC2 + Nginx en `https://18.204.236.209`)
- Backend: [cometranqui_back](https://github.com/benjaminAndaur/cometranqui_back)

## Funcionalidades

| Vista | Archivos | Detalle |
|---|---|---|
| Inicio, ofertas y mapa | `src/app/page.tsx`, `src/app/components/OfertasSection.tsx`, `MapaSection.tsx` | Ofertas con filtros, mapa Leaflet de locales por nivel de seguridad |
| Login con Google | `src/lib/auth.ts`, `src/lib/sesion.ts`, `src/app/callback/page.tsx` | Cognito Hosted UI (código de autorización); token en `sessionStorage` |
| Notificaciones | `src/app/components/Notificaciones.tsx`, `src/lib/notificaciones.ts` | Campana con bajas de precio y suscripción por restricción |
| **Administración de mensajería** | `src/app/admin/**`, `src/lib/admin.ts` | Solo grupo `admin`: destinos, reglas, consumidores (lag), fallidos, mensajes de prueba y catálogo |

Las solicitudes protegidas usan `apiFetch` (`src/lib/api.ts`), que adjunta el token de Cognito. La API de
administración responde errores Problem Details; `src/lib/admin.ts` los convierte en mensajes por campo.

**Modo respaldo:** si el backend (AWS Learner Lab) está apagado, la web muestra los últimos datos publicados
(`public/datos/respaldo.json`, generado por `npm run respaldo` al desplegar; no se versiona).

## Desarrollo

```bash
cp .env.example .env.local    # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_COGNITO_DOMAIN, NEXT_PUBLIC_COGNITO_CLIENT_ID
npm install
npm run dev                   # http://localhost:3000
npm run lint && npm run build
```

## Despliegue

```bash
npm run respaldo && vercel deploy --prod      # Vercel
bash scripts/deploy-ec2.sh                     # EC2 (compila allá y reinicia el servicio)
```
