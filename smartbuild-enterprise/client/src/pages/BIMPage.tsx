import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

const MESES = ["Ago 24","Sep 24","Oct 24","Nov 24","Dic 24","Ene 25","Feb 25","Mar 25","Abr 25","May 25","Jun 25","Jul 25","Ago 25","Sep 25","Oct 25"];

function getEstado(p: any) {
  const ej = parseFloat(p.ejecutado ?? 0), pre = parseFloat(p.presupuesto ?? 0);
  const d = pre > 0 ? ((ej - pre) / pre * 100) : 0;
  const pg = pre > 0 ? (ej / pre * 100) : 0;
  if (p.avance === 0 && ej === 0) return "pend";
  if (d > 8 || (pg > 90 && p.avance < 80)) return "danger";
  if (d > 3 || (pg > 80 && p.avance < 60)) return "warn";
  return "ok";
}

function getBimColor(p: any, mode: string) {
  if (mode === "avance") {
    if (p.avance === 0) return 0x2A3A4A;
    if (p.avance >= 100) return 0x1A7A40;
    return p.avance > 60 ? 0x1A5A80 : 0x2A6A30;
  }
  if (mode === "alerta") {
    const e = getEstado(p);
    if (e === "danger") return 0xA02020;
    if (e === "warn") return 0x8A5010;
    if (e === "pend") return 0x2A3A4A;
    return 0x1A7A40;
  }
  return 0x3A5060;
}

export default function BIMPage() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeRef = useRef<any>(null);
  const [colorMode, setColorMode] = useState("avance");
  const [timeVal, setTimeVal] = useState(58);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [bimReady, setBimReady] = useState(false);

  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => apiRequest("GET", `/projects/${id}`) });
  const { data: partidas = [] } = useQuery({ queryKey: ["partidas", id], queryFn: () => apiRequest("GET", `/projects/${id}/partidas`) });

  // Use real partidas or fallback demo data
  const bimPartidas = partidas.length > 0 ? partidas : [
    { id: 0, nombre: "Obras preliminares", presupuesto: "850", ejecutado: "870", avance: 100, inicio: 0, fin: 10 },
    { id: 1, nombre: "Fundaciones", presupuesto: "2200", ejecutado: "2380", avance: 100, inicio: 5, fin: 22 },
    { id: 2, nombre: "Estructura H.A.", presupuesto: "4500", ejecutado: "3100", avance: 68, inicio: 18, fin: 75 },
    { id: 3, nombre: "Albañilería", presupuesto: "1800", ejecutado: "820", avance: 45, inicio: 35, fin: 80 },
    { id: 4, nombre: "Inst. eléctrica", presupuesto: "980", ejecutado: "520", avance: 50, inicio: 40, fin: 85 },
    { id: 5, nombre: "Inst. sanitaria", presupuesto: "760", ejecutado: "190", avance: 24, inicio: 45, fin: 88 },
    { id: 6, nombre: "Techumbre", presupuesto: "620", ejecutado: "0", avance: 0, inicio: 70, fin: 90 },
    { id: 7, nombre: "Revestimientos", presupuesto: "1100", ejecutado: "0", avance: 0, inicio: 75, fin: 100 },
  ];

  useEffect(() => {
    if (!canvasRef.current) return;
    let THREE: any;
    let animId: number;

    import("three").then((mod) => {
      THREE = mod;
      const canvas = canvasRef.current!;
      const W = canvas.offsetWidth || 600, H = 340;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dir = new THREE.DirectionalLight(0xffd090, 0.9);
      dir.position.set(8, 16, 10);
      scene.add(dir);
      const dir2 = new THREE.DirectionalLight(0x3060a0, 0.3);
dir2.position.set(-8, 5, -10);
scene.add(dir2);

      const grid = new THREE.GridHelper(20, 20, 0x334455, 0x223344);
      (grid.material as any).opacity = 0.2;
      (grid.material as any).transparent = true;
      scene.add(grid);

      const floors = [
        { y: -0.15, w: 6, h: 0.3, d: 5, pidx: 0 },
        { y: 0.4, w: 5.6, h: 0.8, d: 4.6, pidx: 1 },
        { y: 1.25, w: 5.4, h: 1.5, d: 4.4, pidx: 2 },
        { y: 1.3, w: 5.0, h: 1.4, d: 4.0, pidx: 3 },
        { y: 3.0, w: 5.4, h: 1.5, d: 4.4, pidx: 2 },
        { y: 3.0, w: 4.8, h: 1.3, d: 3.8, pidx: 4 },
        { y: 4.75, w: 5.4, h: 1.5, d: 4.4, pidx: 2 },
        { y: 4.8, w: 4.6, h: 1.2, d: 3.6, pidx: 5 },
        { y: 6.4, w: 5.8, h: 0.4, d: 4.8, pidx: 6 },
        { y: 6.3, w: 5.4, h: 0.25, d: 4.4, pidx: 7 },
      ];

      const meshes: any[] = [];
      floors.forEach(f => {
        const pidx = Math.min(f.pidx, bimPartidas.length - 1);
        const p = bimPartidas[pidx];
        const geo = new THREE.BoxGeometry(f.w, f.h, f.d);
        const mat = new THREE.MeshPhongMaterial({ color: getBimColor(p, "avance"), transparent: true, opacity: 0.85, shininess: 25 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, f.y, 0);
        mesh.userData = { pidx };
        scene.add(mesh);
        const edges = new THREE.EdgesGeometry(geo);
        mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xC17F3A, transparent: true, opacity: 0.2 })));
        meshes.push({ mesh, pidx });
      });

      let rotY = 0.4, rotX = 0.22, dist = 13;
      let isDrag = false, prev = { x: 0, y: 0 };

      const updateCam = () => {
        camera.position.set(dist * Math.sin(rotY) * Math.cos(rotX), dist * Math.sin(rotX) + 4, dist * Math.cos(rotY) * Math.cos(rotX));
        camera.lookAt(0, 3, 0);
      };
      updateCam();

      canvas.addEventListener("mousedown", e => { isDrag = false; prev = { x: e.clientX, y: e.clientY }; });
      canvas.addEventListener("mousemove", e => {
        if (e.buttons !== 1) return;
        isDrag = true;
        rotY += (e.clientX - prev.x) * 0.008;
        rotX = Math.max(-0.4, Math.min(0.8, rotX + (e.clientY - prev.y) * 0.008));
        prev = { x: e.clientX, y: e.clientY };
        updateCam();
      });
      canvas.addEventListener("wheel", e => { dist = Math.max(5, Math.min(24, dist + e.deltaY * 0.02)); updateCam(); }, { passive: true });

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      canvas.addEventListener("click", e => {
        if (isDrag) return;
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(meshes.map(m => m.mesh));
        if (hits.length > 0) {
          const pidx = hits[0].object.userData.pidx;
          setSelIdx(pidx);
          meshes.forEach(({ mesh, pidx: mp }) => {
            mesh.material.emissive = new THREE.Color(mp === pidx ? 0x6A4010 : 0x000000);
            mesh.material.emissiveIntensity = mp === pidx ? 0.3 : 0;
          });
        }
      });

      threeRef.current = { meshes, updateCam, THREE };
      setBimReady(true);

      const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
      animate();

      return () => { cancelAnimationFrame(animId); renderer.dispose(); };
    });

    return () => { if (animId) cancelAnimationFrame(animId); };
  }, []);

  // Update colors when mode changes
  useEffect(() => {
    if (!threeRef.current || !bimReady) return;
    const { meshes } = threeRef.current;
    meshes.forEach(({ mesh, pidx }: any) => {
      const p = bimPartidas[Math.min(pidx, bimPartidas.length - 1)];
      mesh.material.color.setHex(getBimColor(p, colorMode));
    });
  }, [colorMode, bimReady, partidas]);

  // Update for timeline
  useEffect(() => {
    if (!threeRef.current || !bimReady) return;
    const { meshes } = threeRef.current;
    meshes.forEach(({ mesh, pidx }: any) => {
      const p = bimPartidas[Math.min(pidx, bimPartidas.length - 1)];
      const inicio = p.inicio ?? 0, fin = p.fin ?? 100;
      const vis = timeVal >= inicio;
      const prog = vis ? Math.min(1, (timeVal - inicio) / Math.max(1, fin - inicio)) : 0;
      mesh.material.opacity = vis ? 0.4 + prog * 0.5 : 0.06;
      if (colorMode === "avance") {
        const col = prog >= 1 ? 0x1A7A40 : prog > 0.6 ? 0x1A5A80 : prog > 0 ? 0x2A6A30 : 0x2A3A4A;
        mesh.material.color.setHex(col);
      }
    });
  }, [timeVal, bimReady]);

  const fUF = (n: number) => `UF ${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
  const selP = selIdx !== null ? bimPartidas[selIdx] : null;
  const timeIdx = Math.round(timeVal / 100 * (MESES.length - 1));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">Modelamiento BIM 4D</div>
        <h1 className="text-4xl font-black text-white" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{project?.name ?? "Proyecto"}</h1>
      </div>

      {/* 3D Viewer */}
      <div className="border border-[rgba(193,127,58,0.15)] mb-6 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(193,127,58,0.06)] border-b border-[rgba(193,127,58,0.1)] flex-wrap">
          <span className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mr-2">Visor 3D</span>
          {[
            { k: "avance", l: "Por avance" },
            { k: "alerta", l: "Alertas" },
            { k: "partida", l: "Por partida" },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setColorMode(k)}
              className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1 border rounded-sm transition-all
                ${colorMode === k ? "bg-[#C17F3A] border-[#C17F3A] text-[#0D1820] font-bold" : "border-[rgba(193,127,58,0.25)] text-[#6A7A8A] hover:border-[#C17F3A] hover:text-white"}`}>
              {l}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-mono text-[#3A4A5A]">Arrastrar · rotar · scroll · zoom</span>
        </div>

        <div className="grid" style={{gridTemplateColumns: "1fr 200px"}}>
          <canvas ref={canvasRef} style={{display:"block",width:"100%",height:"340px",cursor:"grab",background:"transparent"}} />
          <div className="border-l border-[rgba(193,127,58,0.12)] bg-[rgba(255,255,255,0.01)] p-3 overflow-y-auto" style={{maxHeight:"340px"}}>
            <div className="text-[9px] font-mono text-[#C17F3A] uppercase tracking-widest mb-2">Partidas</div>
            {bimPartidas.map((p: any, i: number) => {
              const e = getEstado(p);
              const col = colorMode === "alerta"
                ? e === "danger" ? "#A02020" : e === "warn" ? "#8A5010" : e === "pend" ? "#2A3A4A" : "#1A7A40"
                : p.avance >= 100 ? "#1A7A40" : p.avance > 60 ? "#1A5A80" : p.avance > 0 ? "#2A6A30" : "#2A3A4A";
              return (
                <div key={i} onClick={() => setSelIdx(i)}
                  className={`p-2 rounded-sm cursor-pointer mb-1 border transition-all
                    ${selIdx === i ? "border-[#C17F3A] bg-[rgba(193,127,58,0.1)]" : "border-transparent hover:bg-[rgba(193,127,58,0.07)]"}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{background: col}} />
                    <span className="text-[11px] font-bold text-white leading-tight">{p.nombre}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#6A7A8A] mb-1">{p.avance}%</div>
                  <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${p.avance}%`, background: col}} />
                  </div>
                </div>
              );
            })}
            {selP && (
              <div className="border-t border-[rgba(193,127,58,0.15)] mt-3 pt-3 space-y-1.5">
                <div className="text-[9px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1.5">Detalle</div>
                {[
                  ["Avance", `${selP.avance}%`],
                  ["Presup.", fUF(parseFloat(selP.presupuesto ?? 0))],
                  ["Ejecut.", selP.ejecutado > 0 ? fUF(parseFloat(selP.ejecutado ?? 0)) : "—"],
                  ["Estado", {ok:"Al día",warn:"Riesgo",danger:"Desviada",pend:"Pendiente"}[getEstado(selP)] ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px] font-mono border-b border-[rgba(255,255,255,0.04)] pb-1">
                    <span className="text-[#6A7A8A]">{k}</span>
                    <span className="text-white font-bold">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 bg-[rgba(193,127,58,0.04)] border-t border-[rgba(193,127,58,0.1)] flex-wrap">
          {[
            { col: "#2ECC71", label: "Completado" },
            { col: "#C17F3A", label: "En ejecución" },
            { col: "#E84545", label: "Desviada" },
            { col: "#2A3A4A", label: "Pendiente" },
          ].map(({ col, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest">
              <div className="w-2.5 h-2.5 rounded-sm" style={{background: col}} />{label}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt 4D */}
      <div className="border border-[rgba(193,127,58,0.15)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[rgba(193,127,58,0.06)] border-b border-[rgba(193,127,58,0.1)] flex-wrap gap-3">
          <span className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Timeline 4D — Cronograma</span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[#6A7A8A] uppercase">Simular tiempo</span>
            <input type="range" min={0} max={100} value={timeVal}
              onChange={e => setTimeVal(parseInt(e.target.value))}
              className="w-36 accent-[#C17F3A]" />
            <span className="text-base font-black text-[#C17F3A] min-w-[65px]" style={{fontFamily:"'Bebas Neue',sans-serif"}}>
              {MESES[Math.min(timeIdx, MESES.length - 1)]}
            </span>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          {/* Month labels */}
          <div className="flex min-w-[600px] mb-2" style={{paddingLeft: "165px"}}>
            {MESES.map(m => (
              <div key={m} className="flex-1 text-[9px] font-mono text-[#6A7A8A] uppercase text-center pb-1 border-r border-[rgba(255,255,255,0.04)]">{m}</div>
            ))}
          </div>

          {/* Gantt rows */}
          {bimPartidas.map((p: any, i: number) => {
            const e = getEstado(p);
            const inicio = p.inicio ?? 0, fin = p.fin ?? 100;
            const started = timeVal >= inicio;
            const actualEnd = started ? Math.min(timeVal, fin) : inicio;
            const actualW = started ? `${actualEnd - inicio}%` : "0%";
            const barCol = e === "danger" ? "#E84545" : e === "warn" ? "#C17F3A" : p.avance >= 100 ? "#2ECC71" : "#3A8ABB";
            const alertCol = e === "danger" ? "#E84545" : e === "warn" ? "#C17F3A" : "transparent";
            return (
              <div key={i} className="flex items-center min-w-[600px] mb-1 cursor-pointer hover:opacity-80" onClick={() => setSelIdx(i)}>
                <div className="text-[11px] text-[#8A9AAA] font-mono overflow-hidden text-ellipsis whitespace-nowrap pr-3" style={{width:"165px",flexShrink:0}}>{p.nombre}</div>
                <div className="flex-1 h-4 bg-[rgba(255,255,255,0.03)] rounded-sm relative overflow-hidden">
                  {/* Planned bar */}
                  <div className="absolute top-0.5 h-3 rounded-sm bg-[rgba(193,127,58,0.15)] border border-[rgba(193,127,58,0.3)]"
                    style={{left:`${inicio}%`, width:`${fin - inicio}%`}} />
                  {/* Actual bar */}
                  <div className="absolute top-0.5 h-3 rounded-sm transition-all duration-300"
                    style={{left:`${inicio}%`, width: actualW, background: barCol, opacity: 0.9}} />
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{left:`${timeVal}%`}} />
                </div>
                <div className="w-3.5 h-3.5 rounded-full ml-2 flex items-center justify-center text-[8px] font-black text-[#0D1820] flex-shrink-0"
                  style={{background: alertCol}}>
                  {e === "danger" ? "!" : e === "warn" ? "~" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
