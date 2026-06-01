export type CategoryDef = {
  id: string;
  label: string;
  keywords: string[];
};

export const CATEGORIES: CategoryDef[] = [
  {
    id: "bicicletas",
    label: "Bicicletas",
    keywords: ["bicicleta", "bike", "mtb", "ruta", "urbana", "fixie", "bici"],
  },
  {
    id: "componentes",
    label: "Componentes",
    keywords: ["cuadro", "cassette", "pedal", "cadena", "cambio", "biela", "horquilla", "manubrio", "transmisión"],
  },
  {
    id: "accesorios",
    label: "Accesorios",
    keywords: ["casco", "candado", "luz", "bolso", "cubierta", "cámara"],
  },
  {
    id: "indumentaria",
    label: "Indumentaria",
    keywords: ["jersey", "remera", "calza", "guante", "zapatilla", "indumentaria", "ropa", "ciclista"],
  },
];

export const HEADER_CATEGORIES = [
  { id: "bicicletas", label: "Bicicletas" },
  { id: "componentes", label: "Componentes" },
  { id: "accesorios", label: "Accesorios" },
  { id: "indumentaria", label: "Indumentaria" },
];

export type BikeTypeDef = {
  id: string;
  label: string;
  keywords: string[];
};

export const BIKE_TYPES: BikeTypeDef[] = [
  { id: "mtb", label: "MTB", keywords: ["mtb", "mountain", "montaña", "trail", "enduro", "xc"] },
  { id: "road", label: "Road / Gravel", keywords: ["road", "ruta", "roubaix", "carretera", "gravel"] },
  { id: "urban", label: "Urban", keywords: ["urban", "urbana", "city", "ciudad", "fixie", "commuter"] },
  { id: "kids", label: "Kids", keywords: ["kids", "niño", "niña", "infantil", "junior", "rodado 12", "rodado 16", "rodado 20"] },
  { id: "bmx", label: "BMX", keywords: ["bmx", "freestyle", "dirt", "flatland", "pump track"] },
  { id: "electric", label: "Eléctrica", keywords: ["eléctrica", "electrica", "ebike", "e-bike", "e bike", "motor", "batería", "pedelec"] },
];

export function matchesBikeType(
  product: { title: string; description?: string | null },
  bikeTypeId: string,
): boolean {
  const bt = BIKE_TYPES.find((t) => t.id === bikeTypeId);
  if (!bt) return true;
  const text = `${product.title} ${product.description ?? ""}`.toLowerCase();
  return bt.keywords.some((kw) => text.includes(kw));
}

export function matchesCategory(
  product: { title: string; description?: string | null; category?: string | null },
  categoryId: string,
): boolean {
  if (product.category) return product.category === categoryId;
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return true;
  const text = `${product.title} ${product.description ?? ""}`.toLowerCase();
  return cat.keywords.some((kw) => text.includes(kw));
}
