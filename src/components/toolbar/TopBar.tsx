"use client";

import Link from "next/link";
import { Check, Focus, LoaderCircle, Redo2, Scan, Undo2 } from "lucide-react";
import { enterDollhouse, focusSelection, frameProject } from "@/features/editor/actions";
import { updateBrowserProject } from "@/lib/browser-projects";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { ViewPreset } from "@/types/editor";

const VIEWS: { id: ViewPreset; label: string }[] = [
  { id: "top", label: "Topo" },
  { id: "front", label: "Frente" },
  { id: "back", label: "Trás" },
  { id: "left", label: "Esquerda" },
  { id: "right", label: "Direita" },
  { id: "perspective", label: "Perspectiva" },
  { id: "dollhouse", label: "Casa de boneca" },
];

export function TopBar() {
  const name = useProjectStore((state) => state.projectName);
  const projectId = useProjectStore((state) => state.projectId);
  const mode = useEditorStore((state) => state.mode);
  const status = useEditorStore((state) => state.saveStatus);
  const canUndo = useProjectStore((state) => state.past.length > 0);
  const canRedo = useProjectStore((state) => state.future.length > 0);
  const viewOpen = useEditorStore((state) => state.mobileSheet) === "view";

  const rename = async (value: string) => {
    const next = value.trim();
    if (!next || !projectId) return;
    useProjectStore.getState().setName(next);
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (!response.ok) updateBrowserProject(projectId, { name: next });
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-2">
      <Link href="/" className="hidden h-8 items-center px-2 text-sm font-semibold tracking-tight sm:flex" aria-label="Meus projetos">
        Planta
      </Link>
      <input
        key={name}
        defaultValue={name}
        aria-label="Nome do projeto"
        className="h-8 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none focus:bg-neutral-50 sm:max-w-xs sm:flex-none"
        onBlur={(event) => void rename(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <div className="flex h-8 border border-neutral-300">
        <button type="button" className={`px-2.5 text-[13px] ${mode === "2d" ? "bg-neutral-900 text-white" : ""}`} onClick={() => useEditorStore.getState().setMode("2d")}>
          2D
        </button>
        <button type="button" className={`px-2.5 text-[13px] ${mode === "3d" ? "bg-neutral-900 text-white" : ""}`} onClick={() => useEditorStore.getState().setMode("3d")}>
          3D
        </button>
      </div>
      <button type="button" className="grid h-8 w-8 place-items-center text-neutral-700 disabled:opacity-30" aria-label="Desfazer" disabled={!canUndo} onClick={() => useProjectStore.getState().undo()}>
        <Undo2 size={16} />
      </button>
      <button type="button" className="grid h-8 w-8 place-items-center text-neutral-700 disabled:opacity-30" aria-label="Refazer" disabled={!canRedo} onClick={() => useProjectStore.getState().redo()}>
        <Redo2 size={16} />
      </button>
      <div className="relative">
        <button type="button" className="h-8 px-2 text-[13px] text-neutral-700 hover:bg-neutral-100" onClick={() => useEditorStore.getState().setMobileSheet(viewOpen ? null : "view")}>
          Vista
        </button>
        {viewOpen ? <ViewMenu onClose={() => useEditorStore.getState().setMobileSheet(null)} /> : null}
      </div>
      <button type="button" className="grid h-8 w-8 place-items-center text-neutral-700" aria-label="Enquadrar casa" title="Enquadrar casa" onClick={frameProject}>
        <Scan size={16} />
      </button>
      <button type="button" className="grid h-8 w-8 place-items-center text-neutral-700" aria-label="Focar seleção" onClick={focusSelection}>
        <Focus size={16} />
      </button>
      <div className="ml-auto flex min-w-16 items-center justify-end gap-1 pr-1 text-[12px] text-neutral-500">
        {status === "saving" ? (
          <>
            <LoaderCircle size={13} className="animate-spin" /> Salvando...
          </>
        ) : null}
        {status === "saved" ? (
          <>
            <Check size={13} /> Salvo
          </>
        ) : null}
        {status === "error" ? <span className="text-red-700">Erro ao salvar</span> : null}
      </div>
    </header>
  );
}

export function ViewMenu({ onClose }: { onClose: () => void }) {
  const showRoof = useProjectStore((state) => state.document.settings.showRoof);
  const wallMode = useProjectStore((state) => state.document.settings.wallMode);
  return (
    <div className="absolute top-9 left-0 z-30 w-52 border border-neutral-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className="block h-8 w-full px-3 text-left text-[13px] hover:bg-neutral-50"
          onClick={() => {
            if (view.id === "dollhouse") enterDollhouse();
            else if (view.id === "top" && useEditorStore.getState().mode === "2d") {
              frameProject();
            } else useEditorStore.getState().requestCamera("preset", view.id);
            onClose();
          }}
        >
          {view.label}
        </button>
      ))}
      <button type="button" className="block h-8 w-full px-3 text-left text-[13px] hover:bg-neutral-50" onClick={() => { frameProject(); onClose(); }}>
        Enquadrar casa
      </button>
      <button type="button" className="block h-8 w-full px-3 text-left text-[13px] hover:bg-neutral-50" onClick={() => { focusSelection(); onClose(); }}>
        Focar seleção
      </button>
      <button
        type="button"
        className="block h-8 w-full px-3 text-left text-[13px] hover:bg-neutral-50"
        onClick={() => {
          useProjectStore.getState().commit((document) => {
            document.settings.showRoof = !document.settings.showRoof;
          });
          onClose();
        }}
      >
        Telhado: {showRoof ? "ocultar" : "mostrar"}
      </button>
      <button
        type="button"
        className="block h-8 w-full px-3 text-left text-[13px] hover:bg-neutral-50"
        onClick={() => {
          useProjectStore.getState().commit((document) => {
            document.settings.wallMode = wallMode === "transparent" ? "solid" : "transparent";
          });
          onClose();
        }}
      >
        Paredes: {wallMode === "transparent" ? "normais" : "transparentes"}
      </button>
    </div>
  );
}
