import { z } from "zod";

const vec2Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const wallSchema = z.object({
  id: z.string().min(1),
  a: vec2Schema,
  b: vec2Schema,
  height: z.number().positive().max(12),
  thickness: z.number().positive().max(2),
});

const doorSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("door"),
  wallId: z.string().min(1),
  offset: z.number().finite(),
  width: z.number().positive().max(6),
  height: z.number().positive().max(6),
  swing: z.enum(["left", "right"]),
  flip: z.boolean(),
});

const windowSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("window"),
  wallId: z.string().min(1),
  offset: z.number().finite(),
  width: z.number().positive().max(8),
  height: z.number().positive().max(6),
  sill: z.number().min(0).max(4),
});

const openingSchema = z.discriminatedUnion("kind", [doorSchema, windowSchema]);

const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(80),
  polygon: z.array(vec2Schema),
  floor: z.string().max(40),
  color: z.string().max(20),
  height: z.number().positive().max(12),
  area: z.number().finite(),
});

const furnitureSchema = z.object({
  id: z.string().min(1),
  catalogId: z.string().min(1),
  name: z.string().min(1).max(80),
  model: z.string().min(1).max(200),
  color: z.string().max(20),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
  width: z.number().positive().max(30),
  depth: z.number().positive().max(30),
  height: z.number().positive().max(12),
  modelWidth: z.number().positive().max(30),
  modelDepth: z.number().positive().max(30),
  modelHeight: z.number().positive().max(12),
});

const measurementSchema = z.object({
  id: z.string().min(1),
  a: vec2Schema,
  b: vec2Schema,
});

export const sceneDocumentSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    units: z.literal("m"),
    gridSize: z.number().positive().max(5),
    snapEnabled: z.boolean(),
    wallHeight: z.number().positive().max(12),
    wallThickness: z.number().positive().max(1),
    showRoof: z.boolean(),
    wallMode: z.enum(["solid", "transparent", "partial"]),
  }),
  walls: z.array(wallSchema).max(400),
  openings: z.array(openingSchema).max(400),
  rooms: z.array(roomSchema).max(200),
  furniture: z.array(furnitureSchema).max(400),
  measurements: z.array(measurementSchema).max(200),
});

export const customFurnitureSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  category: z.enum(["sala", "quarto", "cozinha", "banheiro", "escritorio", "externa"]),
  width: z.number().positive().max(30),
  depth: z.number().positive().max(30),
  height: z.number().positive().max(12),
  model: z.string().min(1).max(200),
  color: z.string().max(20),
  modelWidth: z.number().positive().max(30),
  modelDepth: z.number().positive().max(30),
  modelHeight: z.number().positive().max(12),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80),
});

export const renameProjectSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80),
});

export const projectPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  thumbnail: z.string().max(400_000).nullable().optional(),
  document: sceneDocumentSchema.optional(),
  isTemplate: z.boolean().optional(),
  revision: z.number().int().nonnegative().optional(),
});

export const customFurnitureFormSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(80),
  category: z.enum(["sala", "quarto", "cozinha", "banheiro", "escritorio", "externa"]),
  width: z.number().positive().max(30),
  depth: z.number().positive().max(30),
  height: z.number().positive().max(12),
});
