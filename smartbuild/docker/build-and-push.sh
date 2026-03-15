#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# build-and-push.sh
# Buildea SmartBuild PRO y publica a Docker Hub (imagen privada)
# Uso: ./build-and-push.sh [version]
# Ejemplo: ./build-and-push.sh 1.0.0
# ══════════════════════════════════════════════════════════════════

set -e

VERSION=${1:-"latest"}
IMAGE="bitcopper/smartbuild-pro"
SMARTBUILD_DIR="$(cd "$(dirname "$0")/../../smartbuild" && pwd)"
DOCKERFILE="$(cd "$(dirname "$0")" && pwd)/Dockerfile"

echo "🔨 SmartBuild PRO — Build & Push"
echo "   Versión:    $VERSION"
echo "   Directorio: $SMARTBUILD_DIR"
echo ""

# Verificar que existe el directorio
if [ ! -d "$SMARTBUILD_DIR" ]; then
  echo "❌ No se encontró el directorio de SmartBuild: $SMARTBUILD_DIR"
  exit 1
fi

# Build
echo "📦 Buildeando imagen..."
docker build \
  -f "$DOCKERFILE" \
  -t "$IMAGE:$VERSION" \
  -t "$IMAGE:latest" \
  "$SMARTBUILD_DIR"

echo "✅ Build completado: $IMAGE:$VERSION"

# Login a Docker Hub (si no está autenticado)
echo ""
echo "🔐 Verificando autenticación Docker Hub..."
docker login --username bitcopper 2>/dev/null || docker login

# Push
echo ""
echo "🚀 Subiendo imagen..."
docker push "$IMAGE:$VERSION"
docker push "$IMAGE:latest"

echo ""
echo "✅ Imagen publicada:"
echo "   docker pull $IMAGE:$VERSION"
echo ""
echo "📋 Próximo paso:"
echo "   En Hetzner: docker compose pull && docker compose up -d"
