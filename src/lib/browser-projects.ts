import { copyName } from "@/lib/db/types";
import { createEmptyDocument } from "@/lib/document";
import { newId } from "@/lib/id";
import type { ProjectRecord, ProjectSummary, SceneDocument } from "@/types/scene";

const STORAGE_KEY = "planta.projects";

type StoredProject = ProjectRecord & { clientRevision: number };

export type ProjectPatch = {
  name?: string;
  thumbnail?: string | null;
  document?: SceneDocument;
  isTemplate?: boolean;
  revision?: number;
};

function readAll(): StoredProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredProject[]) : [];
  } catch {
    return [];
  }
}

function writeAll(projects: StoredProject[]): void {
  const payload = JSON.stringify(projects);
  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    const withoutThumbnails = projects.map((project) => ({ ...project, thumbnail: null }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutThumbnails));
  }
}

function toRecord(project: StoredProject): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    thumbnail: project.thumbnail,
    document: project.document,
    isTemplate: project.isTemplate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function listBrowserProjects(): ProjectSummary[] {
  return readAll()
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toRecord);
}

export function mergeProjectLists(server: ProjectSummary[], local: ProjectSummary[]): ProjectSummary[] {
  const serverIds = new Set(server.map((project) => project.id));
  return [...server, ...local.filter((project) => !serverIds.has(project.id))].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getBrowserProject(id: string): ProjectRecord | null {
  const project = readAll().find((entry) => entry.id === id);
  return project ? toRecord(project) : null;
}

export function createBrowserProject(name: string): ProjectRecord {
  const now = new Date().toISOString();
  const project: StoredProject = {
    id: newId(),
    name,
    thumbnail: null,
    document: createEmptyDocument(),
    isTemplate: false,
    clientRevision: 0,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([project, ...readAll()]);
  return toRecord(project);
}

export function updateBrowserProject(id: string, patch: ProjectPatch): ProjectRecord | null {
  const projects = readAll();
  const project = projects.find((entry) => entry.id === id);
  if (!project) return null;
  if (patch.document && typeof patch.revision === "number" && patch.revision < project.clientRevision) {
    return toRecord(project);
  }
  if (patch.name) project.name = patch.name;
  if (patch.isTemplate !== undefined) project.isTemplate = patch.isTemplate;
  if (patch.thumbnail !== undefined) project.thumbnail = patch.thumbnail;
  if (patch.document) {
    project.document = patch.document;
    if (typeof patch.revision === "number") project.clientRevision = patch.revision;
  }
  project.updatedAt = new Date().toISOString();
  writeAll(projects);
  return toRecord(project);
}

export function deleteBrowserProject(id: string): boolean {
  const projects = readAll();
  const next = projects.filter((entry) => entry.id !== id);
  if (next.length === projects.length) return false;
  writeAll(next);
  return true;
}

export function duplicateBrowserProject(id: string): ProjectRecord | null {
  const projects = readAll();
  const source = projects.find((entry) => entry.id === id);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: StoredProject = {
    id: newId(),
    name: copyName(source.name, projects.map((entry) => entry.name)),
    thumbnail: source.thumbnail,
    document: structuredClone(source.document),
    isTemplate: false,
    clientRevision: 0,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([copy, ...projects]);
  return toRecord(copy);
}
