import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createEmptyDocument } from "@/lib/document";
import { newId } from "@/lib/id";
import { sceneDocumentSchema } from "@/lib/validation/scene";
import type { CustomFurniture, ProjectRecord } from "@/types/scene";
import { copyName, type ProjectPatch, type Repository } from "@/lib/db/types";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function prismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL ausente.");
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }
  return globalForPrisma.prisma;
}

function toRecord(project: {
  id: string;
  name: string;
  thumbnail: string | null;
  document: unknown;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    thumbnail: project.thumbnail,
    document: sceneDocumentSchema.parse(project.document),
    isTemplate: project.isTemplate,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function acceptThumbnail(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!value.startsWith("data:image/") || value.length > 400_000) return undefined;
  return value;
}

export const prismaRepository: Repository = {
  async listProjects() {
    const projects = await prismaClient().project.findMany({ orderBy: { updatedAt: "desc" } });
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail,
      isTemplate: project.isTemplate,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }));
  },
  async getProject(id) {
    const project = await prismaClient().project.findUnique({ where: { id } });
    return project ? toRecord(project) : null;
  },
  async createProject(name) {
    const project = await prismaClient().project.create({
      data: {
        id: newId(),
        name,
        document: createEmptyDocument(),
      },
    });
    return toRecord(project);
  },
  async updateProject(id, patch: ProjectPatch) {
    const current = await prismaClient().project.findUnique({ where: { id } });
    if (!current) return null;
    if (patch.document && typeof patch.revision === "number" && patch.revision < current.clientRevision) {
      return toRecord(current);
    }
    const thumbnail = acceptThumbnail(patch.thumbnail);
    const project = await prismaClient().project.update({
      where: { id },
      data: {
        name: patch.name,
        isTemplate: patch.isTemplate,
        thumbnail,
        document: patch.document,
        clientRevision: patch.document && typeof patch.revision === "number" ? patch.revision : undefined,
      },
    });
    return toRecord(project);
  },
  async deleteProject(id) {
    const existing = await prismaClient().project.findUnique({ where: { id } });
    if (!existing) return false;
    await prismaClient().project.delete({ where: { id } });
    return true;
  },
  async duplicateProject(id) {
    const source = await prismaClient().project.findUnique({ where: { id } });
    if (!source) return null;
    const names = await prismaClient().project.findMany({ select: { name: true } });
    const document = structuredClone(sceneDocumentSchema.parse(source.document));
    const project = await prismaClient().project.create({
      data: {
        id: newId(),
        name: copyName(source.name, names.map((entry) => entry.name)),
        thumbnail: source.thumbnail,
        document,
        isTemplate: false,
        clientRevision: 0,
      },
    });
    return toRecord(project);
  },
  async listCustom() {
    const items = await prismaClient().customFurniture.findMany({ orderBy: { createdAt: "desc" } });
    return items.map(toCustom);
  },
  async createCustom(item) {
    const saved = await prismaClient().customFurniture.upsert({
      where: { id: item.id },
      create: item,
      update: item,
    });
    return toCustom(saved);
  },
  async deleteCustom(id) {
    const existing = await prismaClient().customFurniture.findUnique({ where: { id } });
    if (!existing) return false;
    await prismaClient().customFurniture.delete({ where: { id } });
    return true;
  },
};

function toCustom(item: {
  id: string;
  name: string;
  category: string;
  width: number;
  depth: number;
  height: number;
  model: string;
  color: string;
  modelWidth: number;
  modelDepth: number;
  modelHeight: number;
}): CustomFurniture {
  return {
    id: item.id,
    name: item.name,
    category: item.category as CustomFurniture["category"],
    width: item.width,
    depth: item.depth,
    height: item.height,
    model: item.model,
    color: item.color,
    modelWidth: item.modelWidth,
    modelDepth: item.modelDepth,
    modelHeight: item.modelHeight,
  };
}
