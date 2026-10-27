import { NextResponse } from "next/server";
import { getRepository, storageMode } from "@/lib/db/repository";
import { createProjectSchema } from "@/lib/validation/scene";

export const runtime = "nodejs";

export async function GET() {
  const repository = await getRepository();
  const projects = await repository.listProjects();
  return NextResponse.json({ storage: storageMode(), projects });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um nome para o projeto." }, { status: 400 });
  }
  const repository = await getRepository();
  const project = await repository.createProject(parsed.data.name);
  return NextResponse.json({ project });
}
