import type { FurnitureCategory } from "@/types/scene";

export type FurnitureShape =
  | "sofa"
  | "sofa-l"
  | "bed"
  | "table"
  | "chair"
  | "wardrobe"
  | "fridge"
  | "tv"
  | "toilet"
  | "sink"
  | "shower"
  | "stove"
  | "cooktop"
  | "counter"
  | "cabinet"
  | "plant"
  | "desk"
  | "shelf"
  | "grill"
  | "nightstand"
  | "rack"
  | "monitor"
  | "office-chair";

export type CatalogItem = {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  color: string;
  shape: FurnitureShape;
  model: string;
};

export const CATEGORIES: { id: FurnitureCategory; label: string }[] = [
  { id: "sala", label: "Sala" },
  { id: "quarto", label: "Quarto" },
  { id: "cozinha", label: "Cozinha" },
  { id: "banheiro", label: "Banheiro" },
  { id: "escritorio", label: "Escritório" },
  { id: "externa", label: "Área externa" },
];

function item(
  id: string,
  name: string,
  category: FurnitureCategory,
  width: number,
  depth: number,
  height: number,
  color: string,
  shape: FurnitureShape,
): CatalogItem {
  return { id, name, category, width, depth, height, color, shape, model: `/models/${id}.glb` };
}

export const FURNITURE_CATALOG: CatalogItem[] = [
  item("sofa", "Sofá", "sala", 2.2, 0.9, 0.85, "#8d8a84", "sofa"),
  item("sofa-l", "Sofá em L", "sala", 2.6, 1.7, 0.85, "#6f7d73", "sofa-l"),
  item("rack", "Rack", "sala", 1.8, 0.42, 0.48, "#c4a574", "rack"),
  item("tv", "TV", "sala", 1.4, 0.35, 0.9, "#1f2937", "tv"),
  item("mesa-centro", "Mesa de centro", "sala", 1.1, 0.6, 0.4, "#d6d3d1", "table"),
  item("poltrona", "Poltrona", "sala", 0.85, 0.85, 0.85, "#a8a29e", "sofa"),
  item("mesa-jantar", "Mesa de jantar", "sala", 1.6, 0.9, 0.75, "#c4a574", "table"),
  item("cadeira-jantar", "Cadeira", "sala", 0.45, 0.5, 0.9, "#a8a29e", "chair"),

  item("cama-solteiro", "Cama solteiro", "quarto", 0.88, 1.88, 0.5, "#e7e5e4", "bed"),
  item("cama-casal", "Cama casal", "quarto", 1.38, 1.88, 0.6, "#f5f5f4", "bed"),
  item("cama-queen", "Cama queen", "quarto", 1.58, 1.98, 0.6, "#f5f5f4", "bed"),
  item("cama-king", "Cama king", "quarto", 1.86, 1.98, 0.6, "#fafaf9", "bed"),
  item("guarda-roupa", "Guarda-roupa", "quarto", 1.8, 0.6, 2.2, "#d6d3d1", "wardrobe"),
  item("comoda", "Cômoda", "quarto", 1.2, 0.48, 0.85, "#c4a574", "cabinet"),
  item("criado-mudo", "Criado-mudo", "quarto", 0.45, 0.4, 0.5, "#d6d3d1", "nightstand"),
  item("escrivaninha", "Escrivaninha", "quarto", 1.2, 0.6, 0.75, "#c4a574", "desk"),

  item("geladeira", "Geladeira", "cozinha", 0.7, 0.7, 1.8, "#f4f4f5", "fridge"),
  item("fogao", "Fogão", "cozinha", 0.6, 0.6, 0.85, "#e5e7eb", "stove"),
  item("cooktop", "Cooktop", "cozinha", 0.76, 0.52, 0.12, "#111827", "cooktop"),
  item("pia-cozinha", "Pia", "cozinha", 1.2, 0.6, 0.85, "#e7e5e4", "sink"),
  item("bancada", "Bancada", "cozinha", 2, 0.6, 0.9, "#d6d3d1", "counter"),
  item("armario-cozinha", "Armário", "cozinha", 0.8, 0.6, 2.1, "#e7e5e4", "wardrobe"),
  item("mesa-cozinha", "Mesa", "cozinha", 1.2, 0.7, 0.75, "#c4a574", "table"),
  item("cadeira-cozinha", "Cadeira", "cozinha", 0.45, 0.5, 0.9, "#a8a29e", "chair"),

  item("vaso-sanitario", "Vaso", "banheiro", 0.38, 0.68, 0.42, "#f8fafc", "toilet"),
  item("pia-banheiro", "Pia", "banheiro", 0.6, 0.45, 0.85, "#f4f4f5", "sink"),
  item("box", "Box", "banheiro", 0.9, 0.9, 2, "#dbeafe", "shower"),
  item("armario-banheiro", "Armário", "banheiro", 0.6, 0.35, 0.7, "#e7e5e4", "cabinet"),

  item("mesa-escritorio", "Mesa", "escritorio", 1.4, 0.7, 0.75, "#d6d3d1", "desk"),
  item("cadeira-escritorio", "Cadeira", "escritorio", 0.65, 0.65, 1.1, "#374151", "office-chair"),
  item("estante", "Estante", "escritorio", 0.8, 0.35, 1.8, "#c4a574", "shelf"),
  item("monitor", "Monitor", "escritorio", 0.62, 0.22, 0.48, "#111827", "monitor"),

  item("mesa-externa", "Mesa", "externa", 1.5, 0.8, 0.75, "#a16207", "table"),
  item("cadeira-externa", "Cadeira", "externa", 0.55, 0.55, 0.8, "#78716c", "chair"),
  item("churrasqueira", "Churrasqueira", "externa", 1.2, 0.6, 1, "#44403c", "grill"),
  item("vaso-planta", "Vaso", "externa", 0.4, 0.4, 0.55, "#4d7c0f", "plant"),
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((entry) => entry.id === id);
}

export function catalogByCategory(category: FurnitureCategory): CatalogItem[] {
  return FURNITURE_CATALOG.filter((entry) => entry.category === category);
}
