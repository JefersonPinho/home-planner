"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PlanCanvas } from "@/components/canvas-2d/PlanCanvas";
import { ViewCube } from "@/components/editor/ViewCube";
import { LibraryPanel } from "@/components/furniture-library/LibraryPanel";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { MobileBar } from "@/components/toolbar/MobileBar";
import { ToolRail } from "@/components/toolbar/ToolRail";
import { TopBar } from "@/components/toolbar/TopBar";
import { flushProjectSave, useAutosave } from "@/hooks/useAutosave";
import { useEditorHotkeys } from "@/hooks/useEditorHotkeys";
import { presentRooms } from "@/features/rooms/present";
import { formatArea, formatMeters } from "@/lib/format";
import { useCustomFurnitureStore } from "@/stores/custom-furniture-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectRecord } from "@/types/scene";

const Viewport3D = dynamic(() => import("@/components/canvas-3d/Viewport3D").then((mod) => mod.Viewport3D), {
  ssr: false,
});

export function EditorShell({ projectId }: { projectId: string }) {
  const [error, setError] = useState("");
  const loaded = useProjectStore((state) => state.loaded && state.projectId === projectId);
  const mode = useEditorStore((state) => state.mode);
  const libraryOpen = useEditorStore((state) => state.libraryOpen);
  const sheet = useEditorStore((state) => state.mobileSheet);
  useAutosave();
  useEditorHotkeys();

  useEffect(() => {
    let cancelled = false;
    useEditorStore.getState().resetEphemeral();
    useProjectStore.getState().reset();
    void (async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        if (!cancelled) setError("Não foi possível abrir este projeto.");
        return;
      }
      const body = (await response.json()) as { project: ProjectRecord };
      if (!cancelled) useProjectStore.getState().load(body.project);
    })();
    void useCustomFurnitureStore.getState().refresh();
    return () => {
      cancelled = true;
      flushProjectSave();
    };
  }, [projectId]);

  if (error) {
    return (
      <div className="grid h-dvh place-items-center gap-3 bg-[#f3f4f6] text-sm">
        <p>{error}</p>
        <Link href="/" className="underline">
          Voltar aos projetos
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return <div className="grid h-dvh place-items-center bg-[#f3f4f6] text-sm text-neutral-500">Abrindo projeto...</div>;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#e7e8ec] text-[#111827]">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        {libraryOpen ? (
          <div className="hidden md:block">
            <LibraryPanel />
          </div>
        ) : null}
        <div className="relative min-w-0 flex-1">
          {mode === "2d" ? <PlanCanvas /> : <Viewport3D />}
          <ViewCube />
          <SelectionStrip />
        </div>
        <div className="hidden md:block">
          <PropertiesPanel />
        </div>
      </div>
      {sheet === "library" || sheet === "properties" ? (
        <div className="fixed inset-x-0 bottom-16 z-30 max-h-[72dvh] overflow-hidden border-t border-neutral-200 bg-white md:hidden">
          {sheet === "library" ? <LibraryPanel onClose={() => useEditorStore.getState().setMobileSheet(null)} /> : <PropertiesPanel />}
        </div>
      ) : null}
      <MobileBar />
    </div>
  );
}

function SelectionStrip() {
  const selection = useEditorStore((state) => state.selection);
  const document = useProjectStore((state) => state.document);
  const furniture = selection?.type === "furniture" ? document.furniture.find((item) => item.id === selection.id) : undefined;
  const wall = selection?.type === "wall" ? document.walls.find((item) => item.id === selection.id) : undefined;
  const room = selection?.type === "room" ? presentRooms(document.walls, document.rooms).find((item) => item.id === selection.id) : undefined;
  if (!furniture && !wall && !room) return null;
  const text = furniture
    ? `${furniture.name}  ${formatMeters(furniture.width)} × ${formatMeters(furniture.depth)} × ${formatMeters(furniture.height)}`
    : wall
      ? `Parede  ${formatMeters(Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y))}`
      : room
        ? `${room.name}  ${formatArea(room.usefulArea)}`
        : "";
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[90%] -translate-x-1/2 truncate bg-white/95 px-3 py-1.5 text-[12px] text-neutral-700">
      {text}
    </div>
  );
}
