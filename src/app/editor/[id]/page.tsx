"use client";

import { useParams } from "next/navigation";
import { EditorShell } from "@/components/editor/EditorShell";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return null;
  return <EditorShell projectId={id} />;
}
