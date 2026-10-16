#!/usr/bin/env bash
# Despliega el commit actual (HEAD) en el EC2 del frontend: sube el código con git archive, compila allá
# (el EC2 tiene swap de 1.5 GB) y reinicia el servicio systemd cometranqui-frontend detrás de Nginx.
# Conserva .env.local y node_modules del servidor. Deja un respaldo de .next para volver atrás.
#
# Uso: FRONTEND_HOST=18.204.236.209 SSH_KEY=../.ssh/cometranqui-key.pem bash scripts/deploy-ec2.sh
set -euo pipefail

HOST="${FRONTEND_HOST:-18.204.236.209}"
KEY="${SSH_KEY:-$(dirname "$0")/../../.ssh/cometranqui-key.pem}"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR)
REMOTO=/home/ec2-user/cometranqui-frontend
PAQUETE="$(mktemp -u).tar.gz"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Hay cambios sin commit: se despliega solo lo que está en HEAD ($(git rev-parse --short HEAD))."
fi

echo "==> Actualizando respaldo de datos (no se versiona: es generado)"
node "$(dirname "$0")/actualizar-respaldo.mjs" || echo "    API no disponible: se mantiene el respaldo local existente"
RESPALDO="$(dirname "$0")/../public/datos/respaldo.json"

echo "==> Empaquetando $(git rev-parse --short HEAD)"
git archive --format=tar.gz -o "$PAQUETE" HEAD

echo "==> Subiendo a $HOST"
scp "${SSH_OPTS[@]}" "$PAQUETE" "ec2-user@$HOST:/tmp/frontend.tar.gz"
rm -f "$PAQUETE"
if [[ -f "$RESPALDO" ]]; then
  scp "${SSH_OPTS[@]}" "$RESPALDO" "ec2-user@$HOST:/tmp/respaldo.json"
fi

ssh "${SSH_OPTS[@]}" "ec2-user@$HOST" "set -euo pipefail
  cd $REMOTO
  rm -rf .next.anterior && { [ -d .next ] && cp -a .next .next.anterior || true; }
  tar -xzf /tmp/frontend.tar.gz -C $REMOTO && rm -f /tmp/frontend.tar.gz
  if [ -f /tmp/respaldo.json ]; then mkdir -p public/datos && mv /tmp/respaldo.json public/datos/respaldo.json; fi
  npm install --no-audit --no-fund
  NODE_OPTIONS=--max-old-space-size=1024 npm run build
  sudo systemctl restart cometranqui-frontend
  for i in \$(seq 1 20); do curl -sf -o /dev/null localhost:3000 && echo 'Frontend arriba' && exit 0; sleep 2; done
  echo 'El frontend no respondió; para volver atrás: mv .next.anterior .next && sudo systemctl restart cometranqui-frontend'
  exit 1"
