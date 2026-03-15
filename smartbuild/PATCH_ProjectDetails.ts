// ════════════════════════════════════════════════════════════════════════════
// PATCH — ProjectDetails.tsx
// Agregar tabs "control" y "bim" al componente existente
// ════════════════════════════════════════════════════════════════════════════

// ── PASO 1: Agregar imports al inicio del archivo (después de los imports existentes) ──

import { ControlObra } from "@/components/ControlObra";
import { BIM4D } from "@/components/BIM4D";

// ── PASO 2: Agregar TabsTriggers (después del trigger de "gantt") ──
// Busca:
//   <TabsTrigger value="gantt" ...>
//     ...Gantt...
//   </TabsTrigger>
//
// Agrega DESPUÉS:

/*
<TabsTrigger value="control" className="px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
  <span className="flex items-center gap-2">
    <CheckSquare className="w-4 h-4" />
    Control de Obra
  </span>
</TabsTrigger>
<TabsTrigger value="bim" className="px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
  <span className="flex items-center gap-2">
    <Layers className="w-4 h-4" />
    BIM 4D
  </span>
</TabsTrigger>
*/

// ── PASO 3: Agregar TabsContent (antes del </Tabs> de cierre) ──
// Busca:
//   </TabsContent>
//   </Tabs>           ← el último cierre de Tabs
//
// Agrega ANTES del </Tabs>:

/*
<TabsContent value="control" className="space-y-6">
  <ControlObra
    items={budgetItemsData?.items || []}
    projectName={project?.name || "Proyecto"}
  />
</TabsContent>

<TabsContent value="bim" className="space-y-6">
  <BIM4D
    items={budgetItemsData?.items || []}
    projectName={project?.name || "Proyecto"}
  />
</TabsContent>
*/

// ── PASO 4: Agregar iconos al import de lucide-react ──
// Busca la línea de import de lucide-react y agrega:
//   CheckSquare, Layers
// Ejemplo:
//   import { ..., CheckSquare, Layers } from "lucide-react";

// ── PASO 5: Copiar archivos ──
// cp ControlObra.tsx ~/bitcoppertech-web/smartbuild/client/src/components/
// cp BIM4D.tsx       ~/bitcoppertech-web/smartbuild/client/src/components/
