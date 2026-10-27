"use client";

import { frameProject } from "@/features/editor/actions";
import { useEditorStore } from "@/stores/editor-store";
import type { ViewPreset } from "@/types/editor";

const CELLS: ({ id: ViewPreset; label: string } | null)[] = [
  null,
  { id: "top", label: "TOP" },
  null,
  { id: "left", label: "LEFT" },
  { id: "perspective", label: "3D" },
  { id: "right", label: "RIGHT" },
  null,
  { id: "front", label: "FRONT" },
  null,
];

export function ViewCube() {
  const preset = useEditorStore((state) => state.viewPreset);
  const mode = useEditorStore((state) => state.mode);

  const choose = (next: ViewPreset) => {
    if (next === "top" && useEditorStore.getState().mode === "2d") {
      frameProject();
      return;
    }
    useEditorStore.getState().requestCamera("preset", next);
  };

  return (
    <div className="pointer-events-auto absolute top-2 right-2 z-10 grid grid-cols-3 gap-px border border-neutral-300 bg-neutral-200 p-px">
      {CELLS.map((cell, index) =>
        cell ? (
          <button
            key={cell.id}
            type="button"
            className={`h-6 w-8 text-[9px] font-medium tracking-wide sm:h-7 sm:w-11 sm:text-[10px] ${mode === "3d" && preset === cell.id ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
            onClick={() => choose(cell.id)}
          >
            {cell.label}
          </button>
        ) : (
          <span key={`empty-${index}`} className="h-7 w-11 bg-neutral-50" />
        ),
      )}
    </div>
  );
}