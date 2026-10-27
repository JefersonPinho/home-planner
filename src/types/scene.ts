export type Vec2 = {
  x: number;
  y: number;
};

export type Wall = {
  id: string;
  a: Vec2;
  b: Vec2;
  height: number;
  thickness: number;
};

export type Door = {
  id: string;
  kind: "door";
  wallId: string;
  offset: number;
  width: number;
  height: number;
  swing: "left" | "right";
  flip: boolean;
};

export type WindowOpening = {
  id: string;
  kind: "window";
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sill: number;
};

export type Opening = Door | WindowOpening;

export type Room = {
  id: string;
  name: string;
  polygon: Vec2[];
  floor: string;
  color: string;
  height: number;
  area: number;
};

export type FurnitureInstance = {
  id: string;
  catalogId: string;
  name: string;
  model: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  modelWidth: number;
  modelDepth: number;
  modelHeight: number;
};

export type Measurement = {
  id: string;
  a: Vec2;
  b: Vec2;
};

export type WallMode = "solid" | "transparent" | "partial";

export type ProjectSettings = {
  units: "m";
  gridSize: number;
  snapEnabled: boolean;
  wallHeight: number;
  wallThickness: number;
  showRoof: boolean;
  wallMode: WallMode;
};

export type SceneDocument = {
  version: 1;
  settings: ProjectSettings;
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  furniture: FurnitureInstance[];
  measurements: Measurement[];
};

export type FurnitureCategory =
  | "sala"
  | "quarto"
  | "cozinha"
  | "banheiro"
  | "escritorio"
  | "externa";

export type CustomFurniture = {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  model: string;
  color: string;
  modelWidth: number;
  modelDepth: number;
  modelHeight: number;
};

export type ProjectRecord = {
  id: string;
  name: string;
  thumbnail: string | null;
  document: SceneDocument;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  thumbnail: string | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
};
