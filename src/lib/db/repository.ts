import { storageMode, type Repository } from "@/lib/db/types";

export { storageMode };
export type { ProjectPatch, Repository } from "@/lib/db/types";

export async function getRepository(): Promise<Repository> {
  if (storageMode() === "postgres") {
    const repository = await import("@/lib/db/prisma-repository");
    return repository.prismaRepository;
  }
  const repository = await import("@/lib/db/file-repository");
  return repository.fileRepository;
}
