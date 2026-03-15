// client/src/pages/IFCViewer.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Upload, Layers, Box, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import * as THREE from "three";

// IFC type categories → partida mapping
const IFC_CATEGORY_MAP: Record<string, { categoria: string; color: number }> = {
  IFCWALL:            { categoria: "Albañilería y muros",     color: 0x8B9DC3 },
  IFCWALLSTANDARDCASE:{ categoria: "Albañilería y muros",     color: 0x8B9DC3 },
  IFCSLAB:            { categoria: "Obra Gruesa - Losas",     color: 0xB0B0B0 },
  IFCBEAM:            { categoria: "Estructura - Vigas",      color: 0xC17F3A },
  IFCCOLUMN:          { categoria: "Estructura - Pilares",    color: 0xD4A05A },
  IFCROOF:            { categoria: "Techumbre",               color: 0x6B4F3A },
  IFCDOOR:            { categoria: "Puertas y ventanas",      color: 0x4A9EDB },
  IFCWINDOW:          { categoria: "Puertas y ventanas",      color: 0x7EC8E3 },
  IFCSTAIR:           { categoria: "Escaleras",               color: 0x9B8EA0 },
  IFCFURNISHINGELEMENT:{ categoria: "Mobiliario",             color: 0x7A9E7E },
  IFCFLOWSEGMENT:     { categoria: "Inst. Sanitaria",         color: 0x4A7ADB },
  IFCPIPESEGMENT:     { categoria: "Inst. Sanitaria",         color: 0x4A7ADB },
  IFCDUCT:            { categoria: "Climatización",           color: 0x7ADBB0 },
  IFCCABLEFITTING:    { categoria: "Inst. Eléctrica",         color: 0xDBDB4A },
  IFCLIGHTFIXTURE:    { categoria: "Inst. Eléctrica",         color: 0xDBDB4A },
};

const CATEGORY_COLORS: Record<string, number> = {};
Object.values(IFC_CATEGORY_MAP).forEach(v => { CATEGORY_COLORS[v.categoria] = v.color; });

interface IfcElement {
  expressID: number;
  type: string;
  name: string;
  categoria: string;
  color: number;
}

interface CategoryGroup {
  categoria: string;
  count: number;
  color: number;
  visible: boolean;
}

export default function IFCViewer() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animRef = useRef<number>(0);

  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elements, setElements] = useState<IfcElement[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [meshMap, setMeshMap] = useState<Record<string, THREE.Mesh[]>>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiRequest("GET", `/projects/${id}`),
  });
  const { data: partidas = [] } = useQuery({
    queryKey: ["partidas", id],
    queryFn: () => apiRequest("GET", `/projects/${id}/partidas`),
  });

  // Init Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.offsetWidth || 700;
    const H = 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D1820);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
    camera.position.set(10, 8, 12);
    camera.lookAt(0, 3, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffd090, 0.9);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x3060a0, 0.3);
    dir2.position.set(-10, 5, -10);
    scene.add(dir2);

    // Grid
    const grid = new THREE.GridHelper(40, 40, 0x334455, 0x223344);
    (grid.material as any).opacity = 0.3;
    (grid.material as any).transparent = true;
    scene.add(grid);

    // Axes helper
    scene.add(new THREE.AxesHelper(2));

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Orbit controls (manual)
    let rotY = 0.5, rotX = 0.3, dist = 20;
    let isDrag = false, prev = { x: 0, y: 0 };
    const updateCam = () => {
      camera.position.set(
        dist * Math.sin(rotY) * Math.cos(rotX),
        dist * Math.sin(rotX) + 3,
        dist * Math.cos(rotY) * Math.cos(rotX)
      );
      camera.lookAt(0, 3, 0);
    };
    updateCam();

    canvas.addEventListener("mousedown", e => { isDrag = false; prev = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener("mousemove", e => {
      if (e.buttons !== 1) return;
      isDrag = true;
      rotY += (e.clientX - prev.x) * 0.006;
      rotX = Math.max(-0.4, Math.min(0.8, rotX + (e.clientY - prev.y) * 0.006));
      prev = { x: e.clientX, y: e.clientY };
      updateCam();
    });
    canvas.addEventListener("wheel", e => {
      dist = Math.max(2, Math.min(80, dist + e.deltaY * 0.03));
      updateCam();
    }, { passive: true });

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
    };
  }, []);

  const loadIFC = useCallback(async (file: File) => {
    if (!sceneRef.current) return;
    setLoading(true);
    setError(null);
    setLoadProgress(5);
    setFileName(file.name);

    try {
      const WebIFC = await import("web-ifc");
      const ifcApi = new WebIFC.IfcAPI();
      ifcApi.SetWasmPath("/");
      await ifcApi.Init();
      (ifcApi as any).SetOptimizeProfiles(false);
      setLoadProgress(20);

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const modelID = ifcApi.OpenModel(data);
      setLoadProgress(35);

      const scene = sceneRef.current;
      scene.children.filter((c: any) => c.userData.ifc).forEach((c: any) => scene.remove(c));

      const newElements: IfcElement[] = [];
      const newMeshMap: Record<string, THREE.Mesh[]> = {};
      const catCounts: Record<string, number> = {};

      setLoadProgress(45);

      // Get geometry using StreamAllMeshes
      const allMeshes: THREE.Mesh[] = [];

      ifcApi.StreamAllMeshes(modelID, (mesh: any) => {
        const placedGeometries = mesh.geometries;
        for (let i = 0; i < placedGeometries.size(); i++) {
          const placedGeom = placedGeometries.get(i);
          const geomData = ifcApi.GetGeometry(modelID, placedGeom.geometryExpressID);
          const verts = ifcApi.GetVertexArray(geomData.GetVertexData(), geomData.GetVertexDataSize());
          const indices = ifcApi.GetIndexArray(geomData.GetIndexData(), geomData.GetIndexDataSize());

          if (!verts || verts.length === 0) return;

          const positions = new Float32Array(verts.length / 2);
          const normals = new Float32Array(verts.length / 2);
          for (let j = 0; j < verts.length / 6; j++) {
            positions[j * 3]     = verts[j * 6];
            positions[j * 3 + 1] = verts[j * 6 + 1];
            positions[j * 3 + 2] = verts[j * 6 + 2];
            normals[j * 3]       = verts[j * 6 + 3];
            normals[j * 3 + 1]   = verts[j * 6 + 4];
            normals[j * 3 + 2]   = verts[j * 6 + 5];
          }

          const threeGeom = new THREE.BufferGeometry();
          threeGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          threeGeom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
          threeGeom.setIndex(new THREE.BufferAttribute(indices, 1));

          const c = placedGeom.color;
          const mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(c.x, c.y, c.z),
            opacity: c.w,
            transparent: c.w < 1,
            side: THREE.DoubleSide,
            shininess: 20,
          });

          const threeMesh = new THREE.Mesh(threeGeom, mat);

          const m = placedGeom.flatTransformation;
          const matrix = new THREE.Matrix4();
          matrix.set(
            m.get(0), m.get(4), m.get(8),  m.get(12),
            m.get(1), m.get(5), m.get(9),  m.get(13),
            m.get(2), m.get(6), m.get(10), m.get(14),
            m.get(3), m.get(7), m.get(11), m.get(15)
          );
          threeMesh.applyMatrix4(matrix);
          threeMesh.userData.ifc = true;
          threeMesh.userData.expressID = mesh.expressID;
          scene.add(threeMesh);
          allMeshes.push(threeMesh);

          geomData.delete();
        }
      });

      setLoadProgress(75);

      // Get element types
      const targetTypes = Object.keys(IFC_CATEGORY_MAP);
      for (const typeName of targetTypes) {
        try {
          const typeID = (WebIFC as any)[typeName];
          if (!typeID) continue;
          const ids = ifcApi.GetLineIDsWithType(modelID, typeID);
          if (!ids || ids.size() === 0) continue;
          const mapping = IFC_CATEGORY_MAP[typeName];
          if (!catCounts[mapping.categoria]) catCounts[mapping.categoria] = 0;
          for (let i = 0; i < ids.size(); i++) {
            const expressID = ids.get(i);
            newElements.push({ expressID, type: typeName, name: typeName, categoria: mapping.categoria, color: mapping.color });
            catCounts[mapping.categoria]++;
            if (!newMeshMap[mapping.categoria]) newMeshMap[mapping.categoria] = [];
            const meshes = allMeshes.filter(m => m.userData.expressID === expressID);
            newMeshMap[mapping.categoria].push(...meshes);
          }
        } catch {}
      }

      setLoadProgress(90);

      // Center model
      if (allMeshes.length > 0) {
        const box = new THREE.Box3();
        allMeshes.forEach(m => box.expandByObject(m));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        allMeshes.forEach(m => m.position.sub(center));
        if (cameraRef.current) {
          const maxDim = Math.max(size.x, size.y, size.z);
          cameraRef.current.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 0.8);
          cameraRef.current.lookAt(0, 0, 0);
        }
      }

      const cats: CategoryGroup[] = Object.entries(catCounts).map(([categoria, count]) => ({
        categoria, count, color: CATEGORY_COLORS[categoria] ?? 0x888888, visible: true,
      }));

      ifcApi.CloseModel(modelID);
      setElements(newElements);
      setCategories(cats);
      setMeshMap(newMeshMap);
      setLoadProgress(100);
    } catch (e: any) {
      setError("Error al cargar el IFC: " + (e.message ?? String(e)));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleCategory = (categoria: string) => {
    setCategories(prev => prev.map(c => {
      if (c.categoria !== categoria) return c;
      const newVis = !c.visible;
      (meshMap[categoria] ?? []).forEach(m => { m.visible = newVis; });
      return { ...c, visible: newVis };
    }));
  };

  // Count matched partidas
  const matchedPartidas = categories.filter(c =>
    partidas.some((p: any) => p.categoria?.toLowerCase().includes(c.categoria.toLowerCase().split(" ")[0].toLowerCase()))
  ).length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#C17F3A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Visor IFC
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 2 }}>
          {project?.name ?? "Cargando..."}
        </h1>
      </div>

      {/* Upload zone (shown when no file) */}
      {!fileName && !loading && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadIFC(f); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#C17F3A" : "rgba(193,127,58,0.3)"}`,
            borderRadius: 12, padding: "3rem 2rem", textAlign: "center",
            cursor: "pointer", background: dragging ? "rgba(193,127,58,0.05)" : "rgba(255,255,255,0.02)",
            marginBottom: "1rem", transition: "all 0.15s",
          }}
        >
          <input ref={inputRef} type="file" accept=".ifc" onChange={e => { const f = e.target.files?.[0]; if (f) loadIFC(f); }} style={{ display: "none" }} />
          <Upload size={36} color="#C17F3A" style={{ margin: "0 auto 1rem" }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: "#E0E8F0", marginBottom: 6 }}>Arrastra tu modelo IFC aquí</div>
          <div style={{ fontSize: 13, color: "#6A7A8A" }}>o haz clic para buscar — acepta archivos <code>.ifc</code></div>
        </div>
      )}

      {/* Loading bar */}
      {loading && (
        <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: 12, color: "#C17F3A", fontFamily: "monospace", marginBottom: 8 }}>Cargando modelo IFC... {loadProgress}%</div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${loadProgress}%`, background: "#C17F3A", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(232,69,69,0.1)", border: "1px solid rgba(232,69,69,0.3)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <AlertTriangle size={16} color="#E84545" />
          <span style={{ fontSize: 13, color: "#E84545" }}>{error}</span>
        </div>
      )}

      {/* Main layout: canvas + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "1rem" }}>
        {/* Canvas */}
        <div style={{ border: "1px solid rgba(193,127,58,0.15)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: 420, cursor: "grab" }} />
          {fileName && (
            <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(13,24,32,0.85)", borderRadius: 4, padding: "3px 8px", fontSize: 10, color: "#C17F3A", fontFamily: "monospace" }}>
              {fileName}
            </div>
          )}
          {!fileName && !loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span style={{ fontSize: 12, color: "#3A4A5A", fontFamily: "monospace" }}>Sin modelo cargado</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Stats */}
          {categories.length > 0 && (
            <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "0.875rem 1rem" }}>
              <div style={{ fontSize: 10, color: "#C17F3A", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>RESUMEN</div>
              {[
                { label: "Elementos", value: elements.length },
                { label: "Categorías", value: categories.length },
                { label: "Vinculadas", value: matchedPartidas },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "#6A7A8A" }}>{s.label}</span>
                  <span style={{ color: "#E0E8F0", fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Category toggles */}
          {categories.length > 0 && (
            <div style={{ background: "#1C2B3A", borderRadius: 8, padding: "0.875rem 1rem", flex: 1, overflowY: "auto", maxHeight: 320 }}>
              <div style={{ fontSize: 10, color: "#C17F3A", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>CATEGORÍAS</div>
              {categories.map(cat => (
                <div key={cat.categoria} onClick={() => toggleCategory(cat.categoria)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "5px 0", cursor: "pointer", opacity: cat.visible ? 1 : 0.4, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: `#${cat.color.toString(16).padStart(6, "0")}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#C0CDD8", flex: 1, lineHeight: 1.3 }}>{cat.categoria}</span>
                  <span style={{ fontSize: 10, color: "#4A5A6A", fontFamily: "monospace" }}>{cat.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Load another file button */}
          {fileName && !loading && (
            <button onClick={() => inputRef.current?.click()}
              style={{ background: "rgba(193,127,58,0.1)", border: "1px solid rgba(193,127,58,0.3)", borderRadius: 6, padding: "0.5rem", cursor: "pointer", color: "#C17F3A", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <Upload size={13} /> Cargar otro IFC
            </button>
          )}
        </div>
      </div>

      {/* Partidas vinculadas */}
      {categories.length > 0 && partidas.length > 0 && (
        <div style={{ marginTop: "1rem", background: "#1C2B3A", borderRadius: 8, padding: "0.875rem 1rem" }}>
          <div style={{ fontSize: 10, color: "#C17F3A", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 8 }}>VINCULACIÓN CON PARTIDAS DEL PROYECTO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            {categories.map(cat => {
              const linked = partidas.find((p: any) =>
                p.categoria?.toLowerCase().includes(cat.categoria.toLowerCase().split(" ")[0].toLowerCase()) ||
                cat.categoria.toLowerCase().includes((p.categoria ?? "").toLowerCase().split(" ")[0].toLowerCase())
              );
              return (
                <div key={cat.categoria} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  {linked ? <CheckCircle size={11} color="#2ECC71" /> : <ChevronRight size={11} color="#3A4A5A" />}
                  <span style={{ color: linked ? "#C0CDD8" : "#4A5A6A", flex: 1 }}>{cat.categoria}</span>
                  {linked && <span style={{ fontSize: 10, color: "#2ECC71", fontFamily: "monospace" }}>↔ {linked.nombre.slice(0, 15)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
