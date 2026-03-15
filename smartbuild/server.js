// ══════════════════════════════════════════════════════════════════
// SmartBuild Provisioner API
// Crea contenedores Docker aislados por cliente
// POST /provision   → nuevo cliente
// GET  /containers  → lista activa
// DELETE /provision → eliminar cliente
// ══════════════════════════════════════════════════════════════════

const express = require('express');
const Docker = require('dockerode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(express.json());

const SECRET = process.env.PROVISIONER_SECRET || 'change-me';
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'smartbuild.cl';
const POSTGRES_ROOT = process.env.POSTGRES_ROOT_PASSWORD || 'sb-root-2026';
const NETWORK = process.env.NETWORK_NAME || 'smartbuild-net';
const DATA_FILE = '/data/clients.json';

// ── Persistencia simple ──────────────────────────────────────────
function loadClients() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveClients(clients) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2));
}

// ── Auth middleware ──────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['x-provisioner-secret'];
  if (token !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ══════════════════════════════════════════════════════════════════
// POST /provision — crear contenedor para nuevo cliente
// Body: { clientId, clientName, email, plan }
// ══════════════════════════════════════════════════════════════════
app.post('/provision', auth, async (req, res) => {
  const { clientId, clientName, email, plan = 'starter' } = req.body;

  if (!clientId || !clientName || !email) {
    return res.status(400).json({ error: 'clientId, clientName y email son requeridos' });
  }

  const clients = loadClients();
  if (clients[clientId]) {
    return res.status(409).json({ error: 'Cliente ya existe', url: clients[clientId].url });
  }

  // Generar credenciales únicas
  const dbPassword = crypto.randomBytes(16).toString('hex');
  const appSecret = crypto.randomBytes(32).toString('hex');
  const dbName = `sb_${clientId.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  const containerName = `sb-client-${clientId}`;
  const dbContainerName = `sb-db-${clientId}`;
  // URL: el cliente configura obra.suempresa.cl → CNAME a este servidor
  const virtualHost = `obra.${clientId}.cl`;

  try {
    // 1. Crear contenedor PostgreSQL dedicado
    const dbContainer = await docker.createContainer({
      Image: 'postgres:15-alpine',
      name: dbContainerName,
      Env: [
        `POSTGRES_DB=${dbName}`,
        `POSTGRES_USER=sb_${clientId}`,
        `POSTGRES_PASSWORD=${dbPassword}`,
      ],
      HostConfig: {
        NetworkMode: NETWORK,
        RestartPolicy: { Name: 'unless-stopped' },
        Binds: [`sb-vol-db-${clientId}:/var/lib/postgresql/data`],
      },
      Labels: {
        'smartbuild.client': clientId,
        'smartbuild.type': 'db',
      },
    });
    await dbContainer.start();

    // Esperar que PostgreSQL inicie
    await new Promise(r => setTimeout(r, 3000));

    // 2. Crear contenedor SmartBuild App
    const appContainer = await docker.createContainer({
      Image: 'bitcopper/smartbuild-pro:latest',
      name: containerName,
      Env: [
        `DATABASE_URL=postgresql://sb_${clientId}:${dbPassword}@${dbContainerName}:5432/${dbName}`,
        `SESSION_SECRET=${appSecret}`,
        `CLIENT_ID=${clientId}`,
        `CLIENT_NAME=${clientName}`,
        `CLIENT_EMAIL=${email}`,
        `PLAN=${plan}`,
        `NODE_ENV=production`,
        // nginx-proxy vars para SSL automático
        `VIRTUAL_HOST=${virtualHost}`,
        `VIRTUAL_PORT=5000`,
        `LETSENCRYPT_HOST=${virtualHost}`,
        `LETSENCRYPT_EMAIL=${email}`,
      ],
      HostConfig: {
        NetworkMode: NETWORK,
        RestartPolicy: { Name: 'unless-stopped' },
      },
      Labels: {
        'smartbuild.client': clientId,
        'smartbuild.type': 'app',
        'smartbuild.plan': plan,
      },
    });
    await appContainer.start();

    // 3. Registrar cliente
    const clientData = {
      clientId,
      clientName,
      email,
      plan,
      url: `https://${virtualHost}`,
      containerName,
      dbContainerName,
      dbName,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    clients[clientId] = clientData;
    saveClients(clients);

    console.log(`[PROVISION] ✅ Cliente ${clientId} — ${virtualHost}`);

    res.json({
      success: true,
      clientId,
      url: `https://${virtualHost}`,
      message: `Configura CNAME obra.${clientId}.cl → ${process.env.HETZNER_SERVER_IP}`,
      credentials: {
        url: `https://${virtualHost}`,
        note: 'Las credenciales de acceso se envían al email del cliente',
      },
    });

  } catch (err) {
    console.error(`[PROVISION] ❌ Error: ${err.message}`);
    // Limpiar contenedores parcialmente creados
    try { await docker.getContainer(containerName).remove({ force: true }); } catch {}
    try { await docker.getContainer(dbContainerName).remove({ force: true }); } catch {}
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /containers — listar clientes activos
// ══════════════════════════════════════════════════════════════════
app.get('/containers', auth, (req, res) => {
  const clients = loadClients();
  res.json({
    total: Object.keys(clients).length,
    clients: Object.values(clients),
  });
});

// ══════════════════════════════════════════════════════════════════
// GET /containers/:clientId — estado de un cliente
// ══════════════════════════════════════════════════════════════════
app.get('/containers/:clientId', auth, async (req, res) => {
  const clients = loadClients();
  const client = clients[req.params.clientId];
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  try {
    const container = docker.getContainer(client.containerName);
    const info = await container.inspect();
    res.json({
      ...client,
      running: info.State.Running,
      startedAt: info.State.StartedAt,
      image: info.Config.Image,
    });
  } catch {
    res.json({ ...client, running: false });
  }
});

// ══════════════════════════════════════════════════════════════════
// DELETE /provision/:clientId — eliminar cliente
// ══════════════════════════════════════════════════════════════════
app.delete('/provision/:clientId', auth, async (req, res) => {
  const clients = loadClients();
  const client = clients[req.params.clientId];
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  try {
    // Detener y eliminar contenedores
    for (const name of [client.containerName, client.dbContainerName]) {
      try {
        const c = docker.getContainer(name);
        await c.stop();
        await c.remove();
      } catch {}
    }

    // Marcar como eliminado (no borrar datos por seguridad)
    clients[req.params.clientId].status = 'deleted';
    clients[req.params.clientId].deletedAt = new Date().toISOString();
    saveClients(clients);

    console.log(`[DEPROVISION] 🗑 Cliente ${req.params.clientId} eliminado`);
    res.json({ success: true, message: 'Contenedores eliminados. Datos preservados por 30 días.' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// POST /provision/:clientId/restart — reiniciar contenedor
// ══════════════════════════════════════════════════════════════════
app.post('/provision/:clientId/restart', auth, async (req, res) => {
  const clients = loadClients();
  const client = clients[req.params.clientId];
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

  try {
    await docker.getContainer(client.containerName).restart();
    res.json({ success: true, message: `${client.clientName} reiniciado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /health
// ══════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  const clients = loadClients();
  const active = Object.values(clients).filter(c => c.status === 'active').length;
  res.json({
    status: 'ok',
    clients_active: active,
    timestamp: new Date().toISOString(),
  });
});

app.listen(3099, () => {
  console.log('🔧 SmartBuild Provisioner corriendo en :3099');
});
