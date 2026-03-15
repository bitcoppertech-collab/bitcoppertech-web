# SmartBuild — Orquestador Multi-Tenant
## Despliegue en Hetzner CX21

### Arquitectura
```
Internet
    │
    ▼
Hetzner CX21 (Ubuntu 22.04)
    │
    ├── sb-gateway (nginx-proxy)      :80 / :443
    ├── sb-acme (Let's Encrypt SSL)
    ├── sb-provisioner (API)          api.smartbuild.cl
    ├── sb-admin (Dashboard)          admin.smartbuild.cl
    │
    └── Por cada cliente:
        ├── sb-client-{id}            obra.{cliente}.cl
        └── sb-db-{id}                (interno)
```

### Setup inicial en Hetzner

```bash
# 1. Crear servidor Hetzner CX21 con Ubuntu 22.04
# 2. SSH al servidor
ssh root@YOUR_HETZNER_IP

# 3. Instalar Docker
curl -fsSL https://get.docker.com | sh

# 4. Clonar el orquestador
git clone https://github.com/bitcoppertech-collab/smartbuild-orchestrator
cd smartbuild-orchestrator

# 5. Configurar variables
cp .env.example .env
nano .env  # editar IP, secretos

# 6. Levantar stack
docker compose up -d

# 7. Verificar
curl https://api.smartbuild.cl/health
```

### Crear contenedor para nuevo cliente

```bash
curl -X POST https://api.smartbuild.cl/provision \
  -H "Content-Type: application/json" \
  -H "x-provisioner-secret: TU_SECRET" \
  -d '{
    "clientId": "constructora-norte",
    "clientName": "Constructora Norte SpA",
    "email": "admin@constructoranorte.cl",
    "plan": "pro"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "clientId": "constructora-norte",
  "url": "https://obra.constructora-norte.cl",
  "message": "Configura CNAME obra.constructora-norte.cl → YOUR_IP"
}
```

### El cliente configura su DNS

```
# En el DNS del cliente:
obra    CNAME    YOUR_HETZNER_IP
```

SSL se provisiona automáticamente vía Let's Encrypt en ~60 segundos.

### Listar clientes activos

```bash
curl https://api.smartbuild.cl/containers \
  -H "x-provisioner-secret: TU_SECRET"
```

### Eliminar cliente

```bash
curl -X DELETE https://api.smartbuild.cl/provision/constructora-norte \
  -H "x-provisioner-secret: TU_SECRET"
```

### Capacidad estimada Hetzner CX21

| Clientes | RAM usada | Estado |
|----------|-----------|--------|
| 5        | ~2GB      | ✅ holgado |
| 10       | ~3.5GB    | ✅ ok |
| 15       | ~5GB      | ⚠️ upgrade a CX31 |

**Upgrade a CX31 (~€9/mes) para 20+ clientes.**

### Precios sugeridos SmartBuild por contenedor

| Plan     | Precio CLP/mes | Incluye |
|----------|---------------|---------|
| Starter  | $49.000       | 1 proyecto, 3 usuarios |
| Pro      | $89.000       | 5 proyectos, usuarios ilimitados |
| Enterprise | $149.000    | Proyectos ilimitados + BIM 4D + soporte |

**Margen neto estimado a 10 clientes Pro: ~$840.000 CLP/mes**

### Integración con BITCU (futuro)

Pago en BITCU activará descuento del 15% automáticamente
vía el hook TAL de Bitcopper. El contrato SmartBuild
registrará el pago on-chain con ThermalProof.
