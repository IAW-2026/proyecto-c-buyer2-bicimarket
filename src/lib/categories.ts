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
    keywords: ["casco", "candado", "luz", "bolso", "cubierta", "cámara", "rodado"],
  },
  {
    id: "indumentaria",
    label: "Indumentaria",
    keywords: ["jersey", "remera", "calza", "guante", "zapatilla", "indumentaria", "ropa", "ciclista"],
  },
];

export const HEADER_CATEGORIES = [
  { id: "bicicletas", label: "Bicicletas" },
  { id: "cuadros", label: "Cuadros" },
  { id: "ruedas", label: "Ruedas y cubiertas" },
  { id: "transmision", label: "Transmisión" },
  { id: "frenos", label: "Frenos" },
  { id: "cascos", label: "Cascos" },
  { id: "indumentaria", label: "Indumentaria" },
  { id: "herramientas", label: "Herramientas" },
  { id: "accesorios", label: "Accesorios" },
];

export function matchesCategory(
  product: { title: string; description?: string | null },
  categoryId: string,
): boolean {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return true;
  const text = `${product.title} ${product.description ?? ""}`.toLowerCase();
  return cat.keywords.some((kw) => text.includes(kw));
}
