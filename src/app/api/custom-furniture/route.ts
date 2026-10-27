import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db/repository";
import { customFurnitureSchema } from "@/lib/validation/scene";

export const runtime = "nodejs";

export async function GET() {
  const items = await (await getRepository()).listCustom();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = customFurnitureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Não foi possível salvar o móvel." }, { status: 400 });
  }
  const item = await (await getRepository()).createCustom(parsed.data);
  return NextResponse.json({ item });
}
