// ── EXPORTADOR DE PRESUPUESTO ─────────────────────────────────────
// Pegar en SmartBuild 1 como utils/exportPresupuesto.js (o .ts)
// Llama a esta función con los datos del presupuesto y descarga el archivo.

export function exportarPresupuesto(data: {
  proyecto: { nombre: string; cliente?: string; moneda?: string };
  capitulos: Array<{
    codigo: string;
    nombre: string;
    partidas: Array<{
      codigo: string;
      nombre: string;
      unidad: string;
      cantidad: number;
      precioUnitarioUF: number;
      inicioTimeline?: number; // 0-100 %
      finTimeline?: number;    // 0-100 %
      apu?: Array<{
        tipo: "mano_obra" | "material" | "maquinaria" | "subcontrato";
        descripcion: string;
        unidad: string;
        cantidad: number;
        precioUF: number;
      }>;
      subcontratos?: Array<{
        proveedor: string;
        descripcion?: string;
        montoUF: number;
      }>;
    }>;
  }>;
}) {
  const payload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    generador: "SmartBuild 1",
    ...data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `presupuesto-${data.proyecto.nombre.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.smartbuild`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── EJEMPLO DE USO ────────────────────────────────────────────────
// exportarPresupuesto({
//   proyecto: { nombre: "Torre Calama", cliente: "SERVIU", moneda: "UF" },
//   capitulos: [
//     {
//       codigo: "01",
//       nombre: "Obra Gruesa",
//       partidas: [
//         {
//           codigo: "01.001",
//           nombre: "Excavación",
//           unidad: "m3",
//           cantidad: 500,
//           precioUnitarioUF: 0.12,
//           inicioTimeline: 0,
//           finTimeline: 20,
//           apu: [
//             { tipo: "mano_obra", descripcion: "Operador retroexcavadora", unidad: "hr", cantidad: 40, precioUF: 0.08 },
//             { tipo: "maquinaria", descripcion: "Retroexcavadora", unidad: "hr", cantidad: 40, precioUF: 0.04 },
//           ],
//           subcontratos: [
//             { proveedor: "Excavaciones Ltda.", descripcion: "Excavación general", montoUF: 45 },
//           ],
//         },
//       ],
//     },
//   ],
// });
