# SmartBuild Enterprise

**Stack:** React 18 + Vite · Express · Drizzle ORM · PostgreSQL · Tailwind CSS · Three.js

---

## Setup local (primeros pasos)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL de Supabase
```

### 3. Crear DB en Supabase
- Ir a https://supabase.com → New project
- Copiar la **connection string** (Session pooler, port 5432)
- Pegarla en `.env.local` como `DATABASE_URL`

### 4. Crear las tablas
```bash
npx drizzle-kit push
```

### 5. Crear cuenta admin (Pedro)
```bash
# Con el servidor corriendo:
curl -X POST http://localhost:3001/api/seed-admin
```
Esto crea:
- **Email:** bitcoppertech@gmail.com  
- **Password:** SmartBuild2026!

### 6. Correr en desarrollo
```bash
npm run dev
```
- Frontend: http://localhost:5173
- API: http://localhost:3001

---

## Estructura del proyecto

```
smartbuild-enterprise/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.tsx       ← Login con roles
│       │   ├── Dashboard.tsx       ← KPIs globales
│       │   ├── ProjectsPage.tsx    ← Lista + crear proyectos
│       │   ├── ProjectDetailPage.tsx
│       │   ├── ControlObraPage.tsx ← Partidas + pagos + alertas
│       │   ├── BIMPage.tsx         ← Visor 3D + Gantt 4D
│       │   └── AdminPage.tsx       ← Gestión de usuarios y demos
│       ├── components/
│       │   └── Layout.tsx          ← Sidebar con nav contextual
│       └── hooks/
│           └── use-auth.tsx        ← Auth context
├── server/
│   └── index.ts                    ← Express API completa
├── shared/
│   └── schema.ts                   ← Tablas Drizzle
└── vercel.json                     ← Deploy config
```

---

## Deploy en Vercel

### Opción A — GitHub (recomendado)
```bash
git init
git add .
git commit -m "SmartBuild Enterprise v1.0"
git remote add origin https://github.com/tuuser/smartbuild-enterprise.git
git push -u origin main
```
Luego conectar el repo en vercel.com → New Project.

### Variables de entorno en Vercel
```
DATABASE_URL     = tu connection string de Supabase
SESSION_SECRET   = string largo y aleatorio
NODE_ENV         = production
CLIENT_URL       = https://tu-dominio.vercel.app
```

---

## Módulos

| Módulo | Ruta | Estado |
|--------|------|--------|
| Dashboard | `/dashboard` | ✅ |
| Proyectos | `/projects` | ✅ |
| Control de Obra | `/projects/:id/obra` | ✅ |
| BIM 4D | `/projects/:id/bim` | ✅ |
| Admin | `/admin` | ✅ Admin only |

---

## Flujo Enterprise

```
Presupuesto (SmartBuild APU)
    ↓
Control de Obra ← partidas, % avance, alertas desviación, pagos
    ↓
BIM 4D ← visor 3D Three.js + Timeline 4D con slider de tiempo
```

Cada cliente tiene su propio contenedor de proyectos aislado.
