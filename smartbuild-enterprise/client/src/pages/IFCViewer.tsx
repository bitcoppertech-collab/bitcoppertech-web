// client/src/pages/IFCViewer.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Upload, AlertTriangle, CheckCircle, ChevronRight, Eye, EyeOff } from "lucide-react";
import * as THREE from "three";

const IFC_CATEGORY_MAP: Record<string, { categoria: string; color: number; height: number; width: number }> = {
  IFCWALL:             { categoria: "Muros",              color: 0x8B9DC3, height: 3.0, width: 0.25 },
  IFCWALLSTANDARDCASE: { categoria: "Muros",              color: 0x8B9DC3, height: 3.0, width: 0.25 },
  IFCSLAB:             { categoria: "Losas",              color: 0xB0B0B0, height: 0.3,  width: 6.0  },
  IFCBEAM:             { categoria: "Vigas",              color: 0xC17F3A, height: 0.5,  width: 0.3  },
  IFCCOLUMN:           { categoria: "Pilares",            color: 0xD4A05A, height: 3.0,  width: 0.4  },
  IFCROOF:             { categoria: "Techumbre",          color: 0x6B4F3A, height: 0.4,  width: 7.0  },
  IFCDOOR:             { categoria: "Puertas",            color: 0x4A9EDB, height: 2.1,  width: 0.9  },
  IFCWINDOW:           { categoria: "Ventanas",           color: 0x7EC8E3, height: 1.2,  width: 1.2  },
  IFCSTAIR:            { categoria: "Escaleras",          color: 0x9B8EA0, height: 1.5,  width: 1.0  },
  IFCFURNISHINGELEMENT:{ categoria: "Mobiliario",         color: 0x7A9E7E, height: 0.9,  width: 1.0  },
  IFCPIPESEGMENT:      { categoria: "Inst. Sanitaria",    color: 0x4A7ADB, height: 0.1,  width: 0.1  },
  IFCFLOWSEGMENT:      { categoria: "Inst. Sanitaria",    color: 0x4A7ADB, height: 0.1,  width: 0.1  },
  IFCLIGHTFIXTURE:     { categoria: "Inst. Eléctrica",    color: 0xDBDB4A, height: 0.1,  width: 0.3  },
  IFCSPACE:            { categoria: "Espacios",           color: 0x3A5A3A, height: 2.8,  width: 4.0  },
};

interface IfcStats {
  tipo: string;
  categoria: string;
  count: number;
  color: number;
  visible: boolean;
}

function parseIFC(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const lines = text.split("\n");
  for (const line of lines) {
    const upper = line.toUpperCase().trim();
    for (const tipo of Object.keys(IFC_CATEGORY_MAP)) {
      if (upper.includes(`= ${tipo}(`) || upper.includes(`=${tipo}(`)) {
        counts[tipo] = (counts[tipo] ?? 0) + 1;
      }
    }
  }
  return counts;
}

function extractProjectName(text: string): string {
  const match = text.match(/IFCPROJECT\([^,]*,[^,]*,'([^']+)'/i);
  return match?.[1] ?? "Modelo IFC";
}

function buildScene(
  scene: THREE.Scene,
  counts: Record<string, number>,
  camera: THREE.PerspectiveCamera
): THREE.Mesh[] {
  // Remove existing IFC meshes
  scene.children.filter((c: any) => c.userData.ifc).forEach((c: any) => scene.remove(c));

  const meshes: THREE.Mesh[] = [];
  const tipos = Object.entries(counts);
  const total = tipos.reduce((s, [, n]) => s + n, 0);

  // Build a representative 3D model — stack elements by category
  let yOffset = 0;
  const gridSize = Math.ceil(Math.sqrt(total));
  let placed = 0;

  // Group by categoria
  const catGroups: Record<string, { tipo: string; count: number; def: typeof IFC_CATEGORY_MAP[string] }[]> = {};
  for (const [tipo, count] of tipos) {
    const def = IFC_CATEGORY_MAP[tipo];
    if (!def || count === 0) continue;
    if (!catGroups[def.categoria]) catGroups[def.categoria] = [];
    catGroups[def.categoria].push({ tipo, count, def });
  }

  const categories = Object.entries(catGroups);
  const cols = Math.ceil(Math.sqrt(categories.length));

  categories.forEach(([, items], catIdx) => {
    const col = catIdx % cols;
    const row = Math.floor(catIdx / cols);
    const baseX = (col - cols / 2) * 8;
    const baseZ = (row - Math.ceil(categories.length / cols) / 2) * 8;

    items.forEach(({ count, def }) => {
      const n = Math.min(count, 12);
      for (let i = 0; i < n; i++) {
        const ix = i % 4;
        const iz = Math.floor(i / 4);
        const x = baseX + ix * (def.width + 0.3);
        const z = baseZ + iz * (def.width + 0.3);
        const y = def.height / 2;

        const geo = new THREE.BoxGeometry(def.width, def.height, def.width);
        const mat = new THREE.MeshPhongMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.82,
          shininess: 20,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.userData.ifc = true;
        mesh.userData.tipo = def.categoria;

        // Edge lines
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xC17F3A, transparent: true, opacity: 0.15 }));
        mesh.add(line);

        scene.add(mesh);
        meshes.push(mesh);
      }
    });
  });

  // Center camera
  if (meshes.length > 0) {
    const box = new THREE.Box3();
    meshes.forEach(m => box.expandByObject(m));
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(maxDim * 0.9, maxDim * 0.7, maxDim * 0.9);
    camera.lookAt(0, size.y / 2, 0);
  }

  return meshes;
}

export default function IFCViewer() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animRef = useRef<number>(0);
  const meshesRef = useRef<THREE.Mesh[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IfcStats[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => apiRequest("GET", `/projects/${id}`) });
  const { data: partidas = [] } = useQuery({ queryKey: ["partidas", id], queryFn: () => apiRequest("GET", `/projects/${id}/partidas`) });

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.offsetWidth || 700;
    const H = 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D1820);
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 3, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffd090, 0.9);
    dir.position.set(10, 20, 10);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x3060a0, 0.3);
    dir2.position.set(-10, 5, -10);
    scene.add(dir2);

    const grid = new THREE.GridHelper(60, 60, 0x334455, 0x223344);
    (grid.material as any).opacity = 0.2;
    (grid.material as any).transparent = true;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(3));

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    let rotY = 0.5, rotX = 0.3, dist = 25;
    const updateCam = () => {
      camera.position.set(
        dist * Math.sin(rotY) * Math.cos(rotX),
        dist * Math.sin(rotX) + 4,
        dist * Math.cos(rotY) * Math.cos(rotX)
      );
      camera.lookAt(0, 4, 0);
    };
    updateCam();

    canvas.addEventListener("mousedown", e => { prev = { x: e.clientX, y: e.clientY }; });
    let prev = { x: 0, y: 0 };
    canvas.addEventListener("mousemove", e => {
      if (e.buttons !== 1) return;
      rotY += (e.clientX - prev.x) * 0.006;
      rotX = Math.max(-0.3, Math.min(0.7, rotX + (e.clientY - prev.y) * 0.006));
      prev = { x: e.clientX, y: e.clientY };
      updateCam();
    });
    canvas.addEventListener("wheel", e => {
      dist = Math.max(3, Math.min(100, dist + e.deltaY * 0.05));
      updateCam();
    }, { passive: true });

    const animate = () => { animRef.current = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();
    return () => { cancelAnimationFrame(animRef.current); renderer.dispose(); };
  }, []);

  const loadIFC = useCallback(async (file: File) => {
    if (!sceneRef.current || !cameraRef.current) return;
    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const counts = parseIFC(text);
      const name = extractProjectName(text);
      setModelName(name);

      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      if (total === 0) {
        setError("No se encontraron elementos IFC reconocidos en el archivo.");
        setLoading(false);
        return;
      }

      const meshes = buildScene(sceneRef.current, counts, cameraRef.current);
      meshesRef.current = meshes;

      // Build stats
      const newStats: IfcStats[] = [];
      const seen = new Set<string>();
      for (const [tipo, count] of Object.entries(counts)) {
        if (count === 0) continue;
        const def = IFC_CATEGORY_MAP[tipo];
        if (!def) continue;
        if (!seen.has(def.categoria)) {
          seen.add(def.categoria);
          newStats.push({ tipo, categoria: def.categoria, count, color: def.color, visible: true });
        } else {
          const existing = newStats.find(s => s.categoria === def.categoria);
          if (existing) existing.count += count;
        }
      }
      setStats(newStats);
    } catch (e: any) {
      setError("Error al leer el archivo: " + (e.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCategory = (categoria: string) => {
    setStats(prev => prev.map(s => {
      if (s.categoria !== categoria) return s;
      const newVis = !s.visible;
      meshesRef.current.filter(m => m.userData.tipo === categoria).forEach(m => { m.visible = newVis; });
      return { ...s, visible: newVis };
    }));
  };

  const totalElements = stats.reduce((s, st) => s + st.count, 0);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Visor IFC</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
          {project?.name ?? "Cargando..."}
        </h1>
        {modelName && <div style={{ fontSize: 12, color: "#6A7A8A", marginTop: 4 }}>Modelo: {modelName}</div>}
      </div>

      {!fileName && !loading && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadIFC(f); }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? "#C17F3A" : "rgba(193,127,58,0.3)"}`, borderRadius: 12, padding: "3rem 2rem", textAlign: "center", cursor: "pointer", background: dragging ? "rgba(193,127,58,0.05)" : "rgba(255,255,255,0.02)", marginBottom: "1rem" }}
        >
          <input ref={inputRef} type="file" accept=".ifc" onChange={e => { const f = e.target.files?.[0]; if (f) loadIFC(f); }} style={{ display: "none" }} />
          <Upload size={36} color="#C17F3A" style={{ margin: "0 auto 1rem" }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: "#E0E8F0", marginBottom: 6 }}>Arrastra tu modelo IFC aquí</div>
          <div style={{ fontSize: 13, color: "#6A7A8A" }}>Acepta archivos <code>.ifc</code> — IFC2x3 e IFC4</div>
        </div>
      )}

      {loading && (
        <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(193,127,58,0.3)", borderTopColor: "#C17F3A", borderRadius: "50%", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#C17F3A", fontFamily: "monospace" }}>Procesando archivo IFC...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(232,69,69,0.1)", border: "1px solid rgba(232,69,69,0.3)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <AlertTriangle size={16} color="#E84545" />
          <span style={{ fontSize: 13, color: "#E84545" }}>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "1rem" }}>
        <div style={{ border: "1px solid rgba(193,127,58,0.15)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: 420, cursor: "grab" }} />
          {fileName && (
            <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(13,24,32,0.85)", borderRadius: 4, padding: "3px 8px", fontSize: 10, color: "#C17F3A", fontFamily: "monospace" }}>{fileName}</div>
          )}
          {!fileName && !loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span style={{ fontSize: 12, color: "#3A4A5A", fontFamily: "monospace" }}>Sin modelo cargado</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {stats.length > 0 && (
            <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "0.875rem 1rem" }}>
              <div style={{ fontSize: 10, color: "#C17F3A", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>RESUMEN</div>
              {[
                { label: "Total elementos", value: totalElements },
                { label: "Categorías", value: stats.length },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "#6A7A8A" }}>{s.label}</span>
                  <span style={{ color: "#E0E8F0", fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {stats.length > 0 && (
            <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "0.875rem 1rem", flex: 1, overflowY: "auto", maxHeight: 300 }}>
              <div style={{ fontSize: 10, color: "#C17F3A", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>CATEGORÍAS</div>
              {stats.map(st => (
                <div key={st.categoria} onClick={() => toggleCategory(st.categoria)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "5px 0", cursor: "pointer", opacity: st.visible ? 1 : 0.4, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: `#${st.color.toString(16).padStart(6, "0")}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#C0CDD8", flex: 1 }}>{st.categoria}</span>
                  <span style={{ fontSize: 10, color: "#4A5A6A", fontFamily: "monospace" }}>{st.count}</span>
                  {st.visible ? <Eye size={10} color="#4A5A6A" /> : <EyeOff size={10} color="#4A5A6A" />}
                </div>
              ))}
            </div>
          )}

          {fileName && !loading && (
            <button onClick={() => inputRef.current?.click()}
              style={{ background: "rgba(193,127,58,0.1)", border: "1px solid rgba(193,127,58,0.3)", borderRadius: 6, padding: "0.5rem", cursor: "pointer", color: "#C17F3A", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <Upload size={13} /> Cargar otro IFC
            </button>
          )}
          <input ref={inputRef} type="file" accept=".ifc" onChange={e => { const f = e.target.files?.[0]; if (f) loadIFC(f); }} style={{ display: "none" }} />
        </div>
      </div>

      {stats.length > 0 && partidas.length > 0 && (
        <div style={{ marginTop: "1rem", background: "#1C2B3A", borderRadius: 8, padding: "0.875rem 1rem" }}>
          <div style={{ fontSize: 10, color: "#C17F3A", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>VINCULACIÓN CON PARTIDAS DEL PROYECTO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            {stats.map(st => {
              const linked = (partidas as any[]).find(p =>
                p.categoria?.toLowerCase().includes(st.categoria.toLowerCase().split(" ")[0].toLowerCase()) ||
                st.categoria.toLowerCase().includes((p.categoria ?? "").toLowerCase().split(" ")[0].toLowerCase())
              );
              return (
                <div key={st.categoria} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  {linked ? <CheckCircle size={11} color="#2ECC71" /> : <ChevronRight size={11} color="#3A4A5A" />}
                  <span style={{ color: linked ? "#C0CDD8" : "#4A5A6A", flex: 1 }}>{st.categoria}</span>
                  {linked && <span style={{ fontSize: 10, color: "#2ECC71", fontFamily: "monospace" }}>↔ {linked.nombre?.slice(0, 14)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
