"use client";

import { AppWindow, Armchair, DoorOpen, Hand, MousePointer2, PenLine, Ruler } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { Tool } from "@/types/editor";

const TOOLS: { id: Tool | "library"; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Selecionar", icon: MousePointer2 },
  { id: "wall", label: "Parede", icon: PenLine },
  { id: "door", label: "Porta", icon: DoorOpen },
  { id: "window", label: "Janela", icon: AppWindow },
  { id: "measure", label: "Medir", icon: Ruler },
  { id: "pan", label: "Mover vista", icon: Hand },
  { id: "library", label: "Móveis", icon: Armchair },
];

export function ToolRail() {
  const tool = useEditorStore((state) => state.tool);
  const libraryOpen = useEditorStore((state) => state.libraryOpen);
  return (
    <div className="hidden w-12 shrink-0 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-2 md:flex">
      {TOOLS.map((entry) => {
        const Icon = entry.icon;
        const active = entry.id === "library" ? libraryOpen : tool === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            title={entry.label}
            aria-label={entry.label}
            className={`grid h-9 w-9 place-items-center ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
            onClick={() => {
              if (entry.id === "library") {
                useEditorStore.getState().setLibraryOpen(!libraryOpen);
                return;
              }
              useEditorStore.getState().setTool(entry.id);
            }}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
