
export interface StoreProduct {
  name: string;
  brand: string;
  sku: string;
  price: number;
  unit: string;
  stock: boolean;
  url: string;
}

export interface PriceSearchResult {
  query: string;
  sodimac: StoreProduct | null;
  easy: StoreProduct | null;
  bestPrice: number;
  bestSupplier: 'Sodimac' | 'Easy' | null;
  bestProduct: StoreProduct | null;
}

interface CatalogEntry {
  keywords: string[];
  category: string;
  sodimac: {
    name: string;
    brand: string;
    sku: string;
    basePrice: number;
    unit: string;
  };
  easy: {
    name: string;
    brand: string;
    sku: string;
    basePrice: number;
    unit: string;
  };
}

const CATALOG: CatalogEntry[] = [
  {
    keywords: ['fierro', 'fierro estriado', 'barra', 'acero', 'armadura', 'fe', 'barras de refuerzo'],
    category: 'acero',
    sodimac: { name: 'Fierro Estriado 12mm x 6m A630-420H', brand: 'CAP Acero', sku: 'SOD-AC-001', basePrice: 7490, unit: 'barra' },
    easy: { name: 'Fierro Estriado 12mm 6m Grado 420', brand: 'Gerdau AZA', sku: 'EAS-AC-001', basePrice: 7290, unit: 'barra' },
  },
  {
    keywords: ['fierro 8mm', 'fierro estriado 8', 'barra 8', 'acero 8'],
    category: 'acero_8',
    sodimac: { name: 'Fierro Estriado 8mm x 6m A630-420H', brand: 'CAP Acero', sku: 'SOD-AC-002', basePrice: 3390, unit: 'barra' },
    easy: { name: 'Fierro Estriado 8mm 6m', brand: 'Gerdau AZA', sku: 'EAS-AC-002', basePrice: 3190, unit: 'barra' },
  },
  {
    keywords: ['fierro 10mm', 'fierro estriado 10', 'barra 10'],
    category: 'acero_10',
    sodimac: { name: 'Fierro Estriado 10mm x 6m A630-420H', brand: 'CAP Acero', sku: 'SOD-AC-003', basePrice: 5290, unit: 'barra' },
    easy: { name: 'Fierro Estriado 10mm 6m', brand: 'Gerdau AZA', sku: 'EAS-AC-003', basePrice: 5490, unit: 'barra' },
  },
  {
    keywords: ['fierro 16mm', 'fierro estriado 16', 'barra 16'],
    category: 'acero_16',
    sodimac: { name: 'Fierro Estriado 16mm x 6m A630-420H', brand: 'CAP Acero', sku: 'SOD-AC-004', basePrice: 13290, unit: 'barra' },
    easy: { name: 'Fierro Estriado 16mm 6m', brand: 'Gerdau AZA', sku: 'EAS-AC-004', basePrice: 12990, unit: 'barra' },
  },
  {
    keywords: ['fierro 6mm', 'alambre', 'fierro liso', 'estribos'],
    category: 'acero_6',
    sodimac: { name: 'Fierro Liso 6mm x 6m', brand: 'CAP Acero', sku: 'SOD-AC-005', basePrice: 1990, unit: 'barra' },
    easy: { name: 'Fierro Liso 6mm 6m', brand: 'Gerdau AZA', sku: 'EAS-AC-005', basePrice: 2090, unit: 'barra' },
  },
  {
    keywords: ['cemento', 'melon', 'portland', 'saco cemento', 'cemento especial'],
    category: 'cemento',
    sodimac: { name: 'Cemento Especial 25kg', brand: 'Melón', sku: 'SOD-CM-001', basePrice: 4990, unit: 'saco' },
    easy: { name: 'Cemento Especial Saco 25kg', brand: 'Melón', sku: 'EAS-CM-001', basePrice: 4790, unit: 'saco' },
  },
  {
    keywords: ['cemento alta resistencia', 'cemento estructural', 'alta resistencia'],
    category: 'cemento_ar',
    sodimac: { name: 'Cemento Alta Resistencia 25kg', brand: 'Melón', sku: 'SOD-CM-002', basePrice: 5990, unit: 'saco' },
    easy: { name: 'Cemento Alta Resistencia 25kg', brand: 'Bío Bío', sku: 'EAS-CM-002', basePrice: 5690, unit: 'saco' },
  },
  {
    keywords: ['hormigon', 'premezclado', 'hormigon preparado', 'concreto'],
    category: 'hormigon',
    sodimac: { name: 'Hormigón Preparado H-20 40kg', brand: 'Melón', sku: 'SOD-CM-003', basePrice: 3990, unit: 'saco' },
    easy: { name: 'Hormigón Preparado 40kg', brand: 'Bío Bío', sku: 'EAS-CM-003', basePrice: 3790, unit: 'saco' },
  },
  {
    keywords: ['plancha', 'zinc', 'zinc-alum', 'cubierta', 'techo', 'pv4', 'techumbre'],
    category: 'plancha',
    sodimac: { name: 'Plancha Zinc Alum PV4 0.35mm x 3.6m', brand: 'Cintac', sku: 'SOD-TC-001', basePrice: 12990, unit: 'un' },
    easy: { name: 'Plancha PV4 Zinc Alum 0.35mm 3.6m', brand: 'Instapanel', sku: 'EAS-TC-001', basePrice: 11990, unit: 'un' },
  },
  {
    keywords: ['plancha acanalada', 'zinc acanalada', 'ondulada'],
    category: 'plancha_ac',
    sodimac: { name: 'Plancha Zinc Alum Acanalada 0.35mm x 3m', brand: 'Cintac', sku: 'SOD-TC-002', basePrice: 9990, unit: 'un' },
    easy: { name: 'Plancha Acanalada Zinc Alum 3m', brand: 'Instapanel', sku: 'EAS-TC-002', basePrice: 10490, unit: 'un' },
  },
  {
    keywords: ['ladrillo', 'ladrillo princesa', 'ladrillo fiscal'],
    category: 'ladrillo',
    sodimac: { name: 'Ladrillo Princesa 29x14x9.4cm', brand: 'Cerámica Santiago', sku: 'SOD-LR-001', basePrice: 249, unit: 'un' },
    easy: { name: 'Ladrillo Princesa Fiscal', brand: 'Cerámicas Nacional', sku: 'EAS-LR-001', basePrice: 239, unit: 'un' },
  },
  {
    keywords: ['bloque', 'bloque hormigon', 'block'],
    category: 'bloque',
    sodimac: { name: 'Bloque Hormigón 39x19x14cm', brand: 'Grau', sku: 'SOD-BL-001', basePrice: 890, unit: 'un' },
    easy: { name: 'Bloque Hormigón 14cm', brand: 'Hormisur', sku: 'EAS-BL-001', basePrice: 850, unit: 'un' },
  },
  {
    keywords: ['arena', 'arena gruesa', 'arido'],
    category: 'arena',
    sodimac: { name: 'Arena Gruesa 40kg', brand: 'Arenex', sku: 'SOD-AR-001', basePrice: 2990, unit: 'saco' },
    easy: { name: 'Arena Gruesa Saco 40kg', brand: 'Arenex', sku: 'EAS-AR-001', basePrice: 2890, unit: 'saco' },
  },
  {
    keywords: ['gravilla', 'grava', 'ripio'],
    category: 'gravilla',
    sodimac: { name: 'Gravilla 40kg', brand: 'Arenex', sku: 'SOD-AR-002', basePrice: 2790, unit: 'saco' },
    easy: { name: 'Gravilla 40kg', brand: 'Arenex', sku: 'EAS-AR-002', basePrice: 2690, unit: 'saco' },
  },
  {
    keywords: ['madera', 'pino', 'tabla', 'tablon', 'pilar', 'viga madera'],
    category: 'madera',
    sodimac: { name: 'Pino Cepillado Seco 2x4" x 3.2m', brand: 'Arauco', sku: 'SOD-MD-001', basePrice: 4590, unit: 'un' },
    easy: { name: 'Pino Cep. Seco 2x4 3.2m', brand: 'CMPC', sku: 'EAS-MD-001', basePrice: 4390, unit: 'un' },
  },
  {
    keywords: ['terciado', 'terciado estructural', 'plywood', 'panel estructural'],
    category: 'terciado',
    sodimac: { name: 'Terciado Estructural 18mm 1.22x2.44m', brand: 'Arauco', sku: 'SOD-MD-002', basePrice: 24990, unit: 'plancha' },
    easy: { name: 'Terciado Estructural 18mm', brand: 'CMPC', sku: 'EAS-MD-002', basePrice: 23990, unit: 'plancha' },
  },
  {
    keywords: ['osb', 'panel osb', 'tablero osb'],
    category: 'osb',
    sodimac: { name: 'Tablero OSB 11.1mm 1.22x2.44m', brand: 'Arauco', sku: 'SOD-MD-003', basePrice: 13990, unit: 'plancha' },
    easy: { name: 'Panel OSB 11mm 1.22x2.44m', brand: 'Louisiana Pacific', sku: 'EAS-MD-003', basePrice: 14290, unit: 'plancha' },
  },
  {
    keywords: ['volcanita', 'yeso carton', 'placa yeso', 'drywall', 'tabique'],
    category: 'volcanita',
    sodimac: { name: 'Placa Volcanita ST 12.5mm 1.2x2.4m', brand: 'Volcán', sku: 'SOD-VC-001', basePrice: 5990, unit: 'plancha' },
    easy: { name: 'Volcanita Standard 12.5mm', brand: 'Volcán', sku: 'EAS-VC-001', basePrice: 5790, unit: 'plancha' },
  },
  {
    keywords: ['aislacion', 'lana vidrio', 'lana mineral', 'fibra vidrio', 'aislante'],
    category: 'aislacion',
    sodimac: { name: 'Lana Mineral 50mm Rollo 1.2x5m', brand: 'Volcán', sku: 'SOD-AI-001', basePrice: 14990, unit: 'rollo' },
    easy: { name: 'Lana de Vidrio 50mm Rollo', brand: 'Isover', sku: 'EAS-AI-001', basePrice: 13990, unit: 'rollo' },
  },
  {
    keywords: ['membrana', 'fieltro', 'barrera humedad', 'membrana asfaltica'],
    category: 'membrana',
    sodimac: { name: 'Membrana Asfáltica 1x10m', brand: 'Sika', sku: 'SOD-MB-001', basePrice: 18990, unit: 'rollo' },
    easy: { name: 'Membrana Asfáltica 10m²', brand: 'Ormiflex', sku: 'EAS-MB-001', basePrice: 17990, unit: 'rollo' },
  },
  {
    keywords: ['pintura', 'latex', 'esmalte', 'pintura interior', 'pintura exterior'],
    category: 'pintura',
    sodimac: { name: 'Látex Interior/Exterior 4GL Blanco', brand: 'Sipa', sku: 'SOD-PT-001', basePrice: 32990, unit: 'tineta' },
    easy: { name: 'Pintura Látex 4GL Blanco Mate', brand: 'Tricolor', sku: 'EAS-PT-001', basePrice: 29990, unit: 'tineta' },
  },
  {
    keywords: ['ceramica', 'ceramico', 'piso ceramico', 'baldosa', 'porcelanato'],
    category: 'ceramica',
    sodimac: { name: 'Cerámico Piso 45x45cm Beige', brand: 'Cordillera', sku: 'SOD-CR-001', basePrice: 7990, unit: 'm2' },
    easy: { name: 'Cerámica Piso 45x45 Beige', brand: 'Murano', sku: 'EAS-CR-001', basePrice: 6990, unit: 'm2' },
  },
  {
    keywords: ['tubo', 'tuberia', 'pvc', 'cañeria', 'sanitario', 'alcantarillado'],
    category: 'tubo_pvc',
    sodimac: { name: 'Tubo PVC Sanitario 110mm x 3m', brand: 'Tigre', sku: 'SOD-TB-001', basePrice: 6990, unit: 'un' },
    easy: { name: 'Tubo PVC 110mm 3m', brand: 'Vinilit', sku: 'EAS-TB-001', basePrice: 6490, unit: 'un' },
  },
  {
    keywords: ['cañeria agua', 'tubo hidraulico', 'cobre', 'ppr', 'agua potable', 'fitting'],
    category: 'tubo_agua',
    sodimac: { name: 'Tubo PPR 25mm x 4m PN20', brand: 'Tigre', sku: 'SOD-TB-002', basePrice: 4990, unit: 'un' },
    easy: { name: 'Tubo PPR 25mm 4m', brand: 'Vinilit', sku: 'EAS-TB-002', basePrice: 4790, unit: 'un' },
  },
  {
    keywords: ['cable', 'electrico', 'conductor', 'thhn', 'cableado'],
    category: 'cable',
    sodimac: { name: 'Cable THHN 2.5mm² Rollo 100m', brand: 'Madeco', sku: 'SOD-EL-001', basePrice: 34990, unit: 'rollo' },
    easy: { name: 'Cable THHN 2.5mm² 100m', brand: 'Covisa', sku: 'EAS-EL-001', basePrice: 32990, unit: 'rollo' },
  },
  {
    keywords: ['ventana', 'aluminio', 'marco aluminio', 'ventana corredera'],
    category: 'ventana',
    sodimac: { name: 'Ventana Corredera Aluminio 120x120cm DVH', brand: 'Alumsur', sku: 'SOD-VN-001', basePrice: 89990, unit: 'un' },
    easy: { name: 'Ventana Corredera Aluminio DVH 120x120', brand: 'Ventanas Chile', sku: 'EAS-VN-001', basePrice: 84990, unit: 'un' },
  },
  {
    keywords: ['puerta', 'puerta interior', 'puerta terciado'],
    category: 'puerta',
    sodimac: { name: 'Puerta Interior HDF 70x200cm', brand: 'Kolbe', sku: 'SOD-PR-001', basePrice: 29990, unit: 'un' },
    easy: { name: 'Puerta Interior HDF Lisa 70x200', brand: 'Masonite', sku: 'EAS-PR-001', basePrice: 27990, unit: 'un' },
  },
  {
    keywords: ['clavo', 'tornillo', 'fijacion', 'perno'],
    category: 'fijacion',
    sodimac: { name: 'Clavos 2½" 5kg', brand: 'Gunnebo', sku: 'SOD-FJ-001', basePrice: 7990, unit: 'caja' },
    easy: { name: 'Clavos 2.5" 5kg', brand: 'Permanit', sku: 'EAS-FJ-001', basePrice: 7490, unit: 'caja' },
  },
  {
    keywords: ['sika', 'impermeabilizante', 'aditivo', 'hidrofugo'],
    category: 'quimico',
    sodimac: { name: 'Sika 1 Impermeabilizante 5kg', brand: 'Sika', sku: 'SOD-QM-001', basePrice: 11990, unit: 'bidón' },
    easy: { name: 'Impermeabilizante Sika 1 5L', brand: 'Sika', sku: 'EAS-QM-001', basePrice: 11490, unit: 'bidón' },
  },
  {
    keywords: ['moldaje', 'encofrado', 'placa moldaje', 'panel moldaje'],
    category: 'moldaje',
    sodimac: { name: 'Madera Moldaje Pino Bruto 1x4" x 3.2m', brand: 'Arauco', sku: 'SOD-MJ-001', basePrice: 1990, unit: 'un' },
    easy: { name: 'Pino Bruto Moldaje 1x4 3.2m', brand: 'CMPC', sku: 'EAS-MJ-001', basePrice: 1890, unit: 'un' },
  },
  {
    keywords: ['malla', 'malla acma', 'malla electrosoldada', 'acma'],
    category: 'malla',
    sodimac: { name: 'Malla Acma C-139 2.0x5.0m', brand: 'CAP Acero', sku: 'SOD-ML-001', basePrice: 18990, unit: 'paño' },
    easy: { name: 'Malla Electrosoldada C-139 2x5m', brand: 'Gerdau AZA', sku: 'EAS-ML-001', basePrice: 17990, unit: 'paño' },
  },
  {
    keywords: ['perfil', 'perfil metalcon', 'metalcon', 'canal metalcon', 'montante'],
    category: 'metalcon',
    sodimac: { name: 'Perfil Montante Metalcon 60x38x0.85mm 3m', brand: 'Cintac', sku: 'SOD-MC-001', basePrice: 3490, unit: 'un' },
    easy: { name: 'Montante Metalcon 60mm 3m', brand: 'Volcán', sku: 'EAS-MC-001', basePrice: 3290, unit: 'un' },
  },
  {
    keywords: ['pegamento', 'adhesivo', 'adhesivo ceramico', 'bekron'],
    category: 'adhesivo',
    sodimac: { name: 'Adhesivo Cerámico Bekron DA 25kg', brand: 'Bekron', sku: 'SOD-AD-001', basePrice: 8990, unit: 'saco' },
    easy: { name: 'Pegamento Cerámico 25kg', brand: 'Topex', sku: 'EAS-AD-001', basePrice: 7990, unit: 'saco' },
  },
  {
    keywords: ['fragüe', 'frague', 'junta ceramica'],
    category: 'frague',
    sodimac: { name: 'Fragüe Premium 5kg Gris', brand: 'Bekron', sku: 'SOD-AD-002', basePrice: 5490, unit: 'saco' },
    easy: { name: 'Fragüe 5kg Gris', brand: 'Topex', sku: 'EAS-AD-002', basePrice: 4990, unit: 'saco' },
  },
];

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeScore(queryNorm: string, keywords: string[]): number {
  let bestScore = 0;
  const queryTokens = queryNorm.split(" ");

  for (const kw of keywords) {
    const kwNorm = normalize(kw);
    if (queryNorm.includes(kwNorm)) {
      const lengthRatio = kwNorm.length / Math.max(queryNorm.length, 1);
      bestScore = Math.max(bestScore, 0.5 + lengthRatio * 0.5);
    }
  }

  if (bestScore === 0) {
    const kwTokensAll = keywords.flatMap(k => normalize(k).split(" "));
    const unique = Array.from(new Set(kwTokensAll));
    let matched = 0;
    for (const qt of queryTokens) {
      if (qt.length < 2) continue;
      if (unique.some(kt => kt.includes(qt) || qt.includes(kt))) {
        matched++;
      }
    }
    if (matched > 0) {
      bestScore = matched / Math.max(queryTokens.length, 1) * 0.5;
    }
  }

  return bestScore;
}

function applyDailyVariation(basePrice: number, sku: string): number {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 5) - hash) + sku.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash + dayOfYear * 37);
  const variation = ((seed % 100) - 50) / 1000;
  return Math.round(basePrice * (1 + variation));
}

function simulateStock(sku: string): boolean {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 5) - hash) + sku.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash + dayOfYear) % 10) > 1;
}

export function searchPrice(query: string): PriceSearchResult {
  const qNorm = normalize(query);
  if (!qNorm || qNorm.length < 2) {
    return { query, sodimac: null, easy: null, bestPrice: 0, bestSupplier: null, bestProduct: null };
  }

  let bestEntry: CatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of CATALOG) {
    const score = computeScore(qNorm, entry.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry || bestScore < 0.15) {
    return { query, sodimac: null, easy: null, bestPrice: 0, bestSupplier: null, bestProduct: null };
  }

  const sodimacPrice = applyDailyVariation(bestEntry.sodimac.basePrice, bestEntry.sodimac.sku);
  const easyPrice = applyDailyVariation(bestEntry.easy.basePrice, bestEntry.easy.sku);

  const sodimac: StoreProduct = {
    name: bestEntry.sodimac.name,
    brand: bestEntry.sodimac.brand,
    sku: bestEntry.sodimac.sku,
    price: sodimacPrice,
    unit: bestEntry.sodimac.unit,
    stock: simulateStock(bestEntry.sodimac.sku),
    url: `https://sodimac.falabella.com/sodimac-cl/search?Ntt=${encodeURIComponent(bestEntry.sodimac.name)}`,
  };

  const easy: StoreProduct = {
    name: bestEntry.easy.name,
    brand: bestEntry.easy.brand,
    sku: bestEntry.easy.sku,
    price: easyPrice,
    unit: bestEntry.easy.unit,
    stock: simulateStock(bestEntry.easy.sku),
    url: `https://www.easy.cl/buscar?q=${encodeURIComponent(bestEntry.easy.name)}`,
  };

  const bestIsSodimac = sodimacPrice <= easyPrice;
  const bestProduct = bestIsSodimac ? sodimac : easy;

  return {
    query,
    sodimac,
    easy,
    bestPrice: bestProduct.price,
    bestSupplier: bestIsSodimac ? 'Sodimac' : 'Easy',
    bestProduct,
  };
}

export function searchPriceBatch(queries: string[]): PriceSearchResult[] {
  return queries.map(q => searchPrice(q));
}

export interface CatalogItem {
  id: string;
  category: string;
  keywords: string[];
  sodimac: StoreProduct;
  easy: StoreProduct;
  bestPrice: number;
  bestSupplier: 'Sodimac' | 'Easy';
}

export function getFullCatalog(): CatalogItem[] {
  return CATALOG.map((entry) => {
    const sodimacPrice = applyDailyVariation(entry.sodimac.basePrice, entry.sodimac.sku);
    const easyPrice = applyDailyVariation(entry.easy.basePrice, entry.easy.sku);
    const bestIsSodimac = sodimacPrice <= easyPrice;

    return {
      id: entry.category,
      category: entry.category,
      keywords: entry.keywords,
      sodimac: {
        name: entry.sodimac.name,
        brand: entry.sodimac.brand,
        sku: entry.sodimac.sku,
        price: sodimacPrice,
        unit: entry.sodimac.unit,
        stock: simulateStock(entry.sodimac.sku),
        url: `https://sodimac.falabella.com/sodimac-cl/search?Ntt=${encodeURIComponent(entry.sodimac.name)}`,
      },
      easy: {
        name: entry.easy.name,
        brand: entry.easy.brand,
        sku: entry.easy.sku,
        price: easyPrice,
        unit: entry.easy.unit,
        stock: simulateStock(entry.easy.sku),
        url: `https://www.easy.cl/buscar?q=${encodeURIComponent(entry.easy.name)}`,
      },
      bestPrice: bestIsSodimac ? sodimacPrice : easyPrice,
      bestSupplier: bestIsSodimac ? 'Sodimac' : 'Easy',
    };
  });
}
