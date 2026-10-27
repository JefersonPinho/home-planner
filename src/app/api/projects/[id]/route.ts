import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db/repository";
import { projectPatchSchema } from "@/lib/validation/scene";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const project = await (await getRepository()).getProject(id);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = projectPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Não foi possível salvar o projeto." }, { status: 400 });
  }
  const project = await (await getRepository()).updateProject(id, parsed.data);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const removed = await (await getRepository()).deleteProject(id);
  if (!removed) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
