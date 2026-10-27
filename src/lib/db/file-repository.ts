import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createEmptyDocument } from "@/lib/document";
import { newId } from "@/lib/id";
import { sceneDocumentSchema } from "@/lib/validation/scene";
import type { CustomFurniture, ProjectRecord, ProjectSummary } from "@/types/scene";
import { copyName, type ProjectPatch, type Repository } from "@/lib/db/types";

type StoredProject = ProjectRecord & { clientRevision: number };

type FileDb = {
  projects: StoredProject[];
  customFurniture: CustomFurniture[];
};

const filePath = path.join(process.cwd(), ".data", "db.json");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDb(): Promise<FileDb> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<FileDb>;
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      customFurniture: Array.isArray(parsed.customFurniture) ? parsed.customFurniture : [],
    };
  } catch {
    return { projects: [], customFurniture: [] };
  }
}

async function writeDb(db: FileDb): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(db), "utf8");
}

function summary(project: StoredProject): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    thumbnail: project.thumbnail,
    isTemplate: project.isTemplate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function acceptThumbnail(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!value.startsWith("data:image/") || value.length > 400_000) return undefined;
  return value;
}

export const fileRepository: Repository = {
  async listProjects() {
    return withLock(async () => {
      const db = await readDb();
      return db.projects
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(summary);
    });
  },
  async getProject(id) {
    return withLock(async () => {
      const db = await readDb();
      const project = db.projects.find((entry) => entry.id === id);
      if (!project) return null;
      return {
        ...project,
        document: sceneDocumentSchema.parse(project.document),
      };
    });
  },
  async createProject(name) {
    return withLock(async () => {
      const db = await readDb();
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
      db.projects.unshift(project);
      await writeDb(db);
      return project;
    });
  },
  async updateProject(id, patch: ProjectPatch) {
    return withLock(async () => {
      const db = await readDb();
      const project = db.projects.find((entry) => entry.id === id);
      if (!project) return null;
      if (patch.document && typeof patch.revision === "number" && patch.revision < project.clientRevision) {
        return project;
      }
      if (patch.name) project.name = patch.name;
      if (patch.isTemplate !== undefined) project.isTemplate = patch.isTemplate;
      const thumbnail = acceptThumbnail(patch.thumbnail);
      if (thumbnail !== undefined) project.thumbnail = thumbnail;
      if (patch.document) {
        project.document = sceneDocumentSchema.parse(patch.document);
        if (typeof patch.revision === "number") project.clientRevision = patch.revision;
      }
      project.updatedAt = new Date().toISOString();
      await writeDb(db);
      return project;
    });
  },
  async deleteProject(id) {
    return withLock(async () => {
      const db = await readDb();
      const next = db.projects.filter((entry) => entry.id !== id);
      const removed = next.length !== db.projects.length;
      db.projects = next;
      if (removed) await writeDb(db);
      return removed;
    });
  },
  async duplicateProject(id) {
    return withLock(async () => {
      const db = await readDb();
      const source = db.projects.find((entry) => entry.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy: StoredProject = {
        id: newId(),
        name: copyName(source.name, db.projects.map((entry) => entry.name)),
        thumbnail: source.thumbnail,
        document: structuredClone(sceneDocumentSchema.parse(source.document)),
        isTemplate: false,
        clientRevision: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.projects.unshift(copy);
      await writeDb(db);
      return copy;
    });
  },
  async listCustom() {
    return withLock(async () => {
      const db = await readDb();
      return db.customFurniture;
    });
  },
  async createCustom(item) {
    return withLock(async () => {
      const db = await readDb();
      db.customFurniture = [item, ...db.customFurniture.filter((entry) => entry.id !== item.id)];
      await writeDb(db);
      return item;
    });
  },
  async deleteCustom(id) {
    return withLock(async () => {
      const db = await readDb();
      const next = db.customFurniture.filter((entry) => entry.id !== id);
      const removed = next.length !== db.customFurniture.length;
      db.customFurniture = next;
      if (removed) await writeDb(db);
      return removed;
    });
  },
};
