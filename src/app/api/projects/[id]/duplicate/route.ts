import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const project = await (await getRepository()).duplicateProject(id);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
  return NextResponse.json({ project });
}
