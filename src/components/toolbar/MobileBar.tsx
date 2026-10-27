"use client";

import { AppWindow, Armchair, DoorOpen, MousePointer2, PenLine, Ruler, SlidersHorizontal } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import type { Tool } from "@/types/editor";

const TOOLS: { id: Tool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Seleção", icon: MousePointer2 },
  { id: "wall", label: "Parede", icon: PenLine },
  { id: "door", label: "Porta", icon: DoorOpen },
  { id: "window", label: "Janela", icon: AppWindow },
  { id: "measure", label: "Medir", icon: Ruler },
];

export function MobileBar() {
  const tool = useEditorStore((state) => state.tool);
  const sheet = useEditorStore((state) => state.mobileSheet);
  return (
    <nav className="flex h-16 shrink-0 items-stretch border-t border-neutral-200 bg-white md:hidden">
      {TOOLS.map((entry) => {
        const Icon = entry.icon;
        const active = tool === entry.id && sheet === null;
        return (
          <button
            key={entry.id}
            type="button"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "text-neutral-900" : "text-neutral-500"}`}
            onClick={() => {
              useEditorStore.getState().setTool(entry.id);
              useEditorStore.getState().setMobileSheet(null);
            }}
          >
            <Icon size={18} />
            {entry.label}
          </button>
        );
      })}
      <button
        type="button"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${sheet === "library" ? "text-neutral-900" : "text-neutral-500"}`}
        onClick={() => useEditorStore.getState().setMobileSheet(sheet === "library" ? null : "library")}
      >
        <Armchair size={18} />
        Móveis
      </button>
      <button
        type="button"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${sheet === "properties" ? "text-neutral-900" : "text-neutral-500"}`}
        onClick={() => useEditorStore.getState().setMobileSheet(sheet === "properties" ? null : "properties")}
      >
        <SlidersHorizontal size={18} />
        Dados
      </button>
    </nav>
  );
}
