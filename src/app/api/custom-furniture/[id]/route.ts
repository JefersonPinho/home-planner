import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const removed = await (await getRepository()).deleteCustom(id);
  if (!removed) return NextResponse.json({ error: "Móvel não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
