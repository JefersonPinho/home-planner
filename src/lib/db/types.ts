import type { CustomFurniture, ProjectRecord, ProjectSummary, SceneDocument } from "@/types/scene";

export type ProjectPatch = {
  name?: string;
  thumbnail?: string | null;
  document?: SceneDocument;
  isTemplate?: boolean;
  revision?: number;
};

export type Repository = {
  listProjects: () => Promise<ProjectSummary[]>;
  getProject: (id: string) => Promise<ProjectRecord | null>;
  createProject: (name: string) => Promise<ProjectRecord>;
  updateProject: (id: string, patch: ProjectPatch) => Promise<ProjectRecord | null>;
  deleteProject: (id: string) => Promise<boolean>;
  duplicateProject: (id: string) => Promise<ProjectRecord | null>;
  listCustom: () => Promise<CustomFurniture[]>;
  createCustom: (item: CustomFurniture) => Promise<CustomFurniture>;
  deleteCustom: (id: string) => Promise<boolean>;
};

export function storageMode(): "postgres" | "file" {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://") ? "postgres" : "file";
}

export function copyName(name: string, existing: string[]): string {
  const base = `${name} - Cópia`;
  if (!existing.includes(base)) return base;
  let index = 2;
  while (existing.includes(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}
