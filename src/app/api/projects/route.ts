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
  const contentType = request.headers.get("content-type") ?? "";
  const formPost = !contentType.includes("application/json");
  const payload: unknown = formPost
    ? { name: String((await request.formData()).get("name") ?? "") }
    : await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(payload);
  if (!parsed.success) {
    if (formPost) return NextResponse.redirect(new URL("/", request.url), 303);
    return NextResponse.json({ error: "Informe um nome para o projeto." }, { status: 400 });
  }
  const repository = await getRepository();
  const project = await repository.createProject(parsed.data.name);
  if (formPost) return NextResponse.redirect(new URL(`/editor/${project.id}`, request.url), 303);
  return NextResponse.json({ project });
}
