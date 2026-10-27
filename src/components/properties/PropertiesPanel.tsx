"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { deleteSelection, duplicateSelection, focusSelection, renameRoom, rotateSelection, updateWallLength } from "@/features/editor/actions";
import { presentRooms } from "@/features/rooms/present";
import { resizeFurniture } from "@/features/furniture/transform";
import { measurementLength } from "@/features/measurements/measure";
import { clampOpeningToWall, wallLength } from "@/features/walls/intervals";
import { furnitureCollisions } from "@/lib/collisions/collisions";
import { formatArea, formatMeters, formatMetersAndCentimeters, roundMm } from "@/lib/format";
import { newId } from "@/lib/id";
import { customFurnitureFormSchema } from "@/lib/validation/scene";
import { useCustomFurnitureStore } from "@/stores/custom-furniture-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { NumberField } from "@/components/ui/NumberField";
import { Dialog } from "@/components/ui/Dialog";
import type { FurnitureCategory } from "@/types/scene";
import { CATEGORIES } from "@/features/furniture/catalog";

const COLLISION_LABEL = {
  wall: "Atravessa uma parede",
  furniture: "Sobrepõe outro móvel",
  outside: "Fora do ambiente",
} as const;

export function PropertiesPanel() {
  const selection = useEditorStore((state) => state.selection);
  const document = useProjectStore((state) => state.document);
  const lockRatio = useEditorStore((state) => state.lockRatio);
  const [customOpen, setCustomOpen] = useState(false);

  const wall = selection?.type === "wall" ? document.walls.find((entry) => entry.id === selection.id) : undefined;
  const furniture = selection?.type === "furniture" ? document.furniture.find((entry) => entry.id === selection.id) : undefined;
  const opening = selection?.type === "opening" ? document.openings.find((entry) => entry.id === selection.id) : undefined;
  const measurement = selection?.type === "measurement" ? document.measurements.find((entry) => entry.id === selection.id) : undefined;
  const room = selection?.type === "room" ? presentRooms(document.walls, document.rooms).find((entry) => entry.id === selection.id) : undefined;
  const warnings = furniture ? (furnitureCollisions(document)[furniture.id] ?? []) : [];

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto border-neutral-200 bg-white xl:w-[280px] xl:border-l">
      <div className="border-b border-neutral-200 px-3 py-2 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
        Propriedades
      </div>
      <div className="flex flex-col gap-4 p-3">
        {wall ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Parede</h3>
            <NumberField label="Comprimento" suffix="m" min={0.05} max={80} value={wallLength(wall)} onCommit={(value) => updateWallLength(wall.id, value)} />
            <NumberField
              label="Altura"
              suffix="m"
              min={0.5}
              max={8}
              value={wall.height}
              onCommit={(value) =>
                useProjectStore.getState().commit((draft) => {
                  const target = draft.walls.find((entry) => entry.id === wall.id);
                  if (!target) return;
                  target.height = value;
                  for (const entry of draft.openings) {
                    if (entry.wallId === target.id) clampOpeningToWall(entry, target);
                  }
                })
              }
            />
            <NumberField
              label="Espessura"
              suffix="m"
              min={0.05}
              max={0.6}
              value={wall.thickness}
              onCommit={(value) =>
                useProjectStore.getState().commit((draft) => {
                  const target = draft.walls.find((entry) => entry.id === wall.id);
                  if (target) target.thickness = value;
                })
              }
            />
            <div className="flex gap-2">
              <button type="button" className="h-8 border border-neutral-300 px-2 text-[13px]" onClick={focusSelection}>
                Focar
              </button>
              <button type="button" className="h-8 px-2 text-[13px] text-red-700" onClick={deleteSelection}>
                Excluir
              </button>
            </div>
          </section>
        ) : null}

        {furniture ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{furniture.name}</h3>
            {warnings.length > 0 ? (
              <ul className="border border-red-200 bg-red-50 px-2 py-1.5 text-[12px] text-red-700">
                {warnings.map((warning) => (
                  <li key={warning}>{COLLISION_LABEL[warning]}</li>
                ))}
              </ul>
            ) : null}
            <label className="flex items-center gap-2 text-[13px] text-neutral-600">
              <input
                type="checkbox"
                checked={lockRatio}
                onChange={(event) => useEditorStore.getState().setLockRatio(event.target.checked)}
              />
              Manter proporção
            </label>
            {(["width", "depth", "height"] as const).map((axis) => (
              <NumberField
                key={axis}
                label={axis === "width" ? "Largura" : axis === "depth" ? "Profundidade" : "Altura"}
                suffix="m"
                min={0.05}
                max={20}
                value={furniture[axis]}
                onCommit={(value) =>
                  useProjectStore.getState().commit((draft) => {
                    const target = draft.furniture.find((entry) => entry.id === furniture.id);
                    if (!target) return;
                    resizeFurniture(target, axis, value, useEditorStore.getState().lockRatio);
                  })
                }
              />
            ))}
            <NumberField
              label="X"
              suffix="m"
              min={-100}
              max={100}
              value={furniture.x}
              onCommit={(value) =>
                useProjectStore.getState().commit((draft) => {
                  const target = draft.furniture.find((entry) => entry.id === furniture.id);
                  if (target) target.x = roundMm(value);
                })
              }
            />
            <NumberField
              label="Z"
              suffix="m"
              min={-100}
              max={100}
              value={furniture.y}
              onCommit={(value) =>
                useProjectStore.getState().commit((draft) => {
                  const target = draft.furniture.find((entry) => entry.id === furniture.id);
                  if (target) target.y = roundMm(value);
                })
              }
            />
            <NumberField
              label="Rotação"
              suffix="°"
              min={-360}
              max={360}
              value={displayedDegrees(furniture.rotation)}
              onCommit={(value) =>
                useProjectStore.getState().commit((draft) => {
                  const target = draft.furniture.find((entry) => entry.id === furniture.id);
                  if (target) target.rotation = (value * Math.PI) / 180;
                })
              }
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="h-8 border border-neutral-300 px-2 text-[13px]" onClick={() => rotateSelection(-1)}>
                −90°
              </button>
              <button type="button" className="h-8 border border-neutral-300 px-2 text-[13px]" onClick={() => rotateSelection(1)}>
                +90°
              </button>
              <button type="button" className="h-8 border border-neutral-300 px-2 text-[13px]" onClick={duplicateSelection}>
                Duplicar
              </button>
              <button type="button" className="h-8 border border-neutral-300 px-2 text-[13px]" onClick={focusSelection}>
                Focar
              </button>
              <button type="button" className="h-8 border border-neutral-300 px-2 text-[13px]" onClick={() => setCustomOpen(true)}>
                Meus móveis
              </button>
              <button type="button" className="h-8 px-2 text-[13px] text-red-700" onClick={deleteSelection}>
                Excluir
              </button>
            </div>
          </section>
        ) : null}

        {room ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Cômodo</h3>
            <label className="flex flex-col gap-1 text-[12px] text-neutral-500">
              Nome
              <input
                key={`${room.id}-${room.name}`}
                defaultValue={room.name}
                aria-label="Nome do cômodo"
                className="h-8 border border-neutral-300 bg-white px-2 text-[13px] text-neutral-900 outline-none focus:border-neutral-900"
                onBlur={(event) => renameRoom(room.id, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </label>
            <p className="text-[13px] text-neutral-800">Área útil {formatArea(room.usefulArea)}</p>
            <p className="text-[13px] text-neutral-800">Área externa {formatArea(room.externalArea)}</p>
            {room.internal ? (
              <p className="text-[12px] text-neutral-500">
                Vão interno {formatMetersAndCentimeters(room.internal.width)} × {formatMetersAndCentimeters(room.internal.depth)}
              </p>
            ) : null}
            {room.external ? (
              <p className="text-[12px] text-neutral-500">
                Contorno externo {formatMetersAndCentimeters(room.external.width)} × {formatMetersAndCentimeters(room.external.depth)}
              </p>
            ) : null}
            <button type="button" className="h-8 w-fit border border-neutral-300 px-2 text-[13px]" onClick={focusSelection}>
              Focar
            </button>
          </section>
        ) : null}

        {opening ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{opening.kind === "door" ? "Porta" : "Janela"}</h3>
            <NumberField
              label="Largura"
              suffix="m"
              min={0.2}
              max={4}
              value={opening.width}
              onCommit={(value) => patchOpening(opening.id, { width: value })}
            />
            <NumberField
              label="Altura"
              suffix="m"
              min={0.2}
              max={4}
              value={opening.height}
              onCommit={(value) => patchOpening(opening.id, { height: value })}
            />
            <NumberField
              label="Posição"
              suffix="m"
              min={0}
              max={30}
              value={opening.offset}
              onCommit={(value) => patchOpening(opening.id, { offset: value })}
            />
            {opening.kind === "window" ? (
              <NumberField label="Peitoril" suffix="m" min={0} max={3} value={opening.sill} onCommit={(value) => patchOpening(opening.id, { sill: value })} />
            ) : (
              <div className="flex gap-2">
                <button type="button" className="h-8 flex-1 border border-neutral-300 text-[13px]" onClick={() => patchOpening(opening.id, { swing: opening.swing === "left" ? "right" : "left" })}>
                  Abertura {opening.swing === "left" ? "esquerda" : "direita"}
                </button>
                <button type="button" className="h-8 flex-1 border border-neutral-300 text-[13px]" onClick={() => patchOpening(opening.id, { flip: !opening.flip })}>
                  Inverter lado
                </button>
              </div>
            )}
            <button type="button" className="h-8 text-left text-[13px] text-red-700" onClick={deleteSelection}>
              Excluir
            </button>
          </section>
        ) : null}

        {measurement ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Medição</h3>
            <p className="font-mono text-sm">{formatMeters(measurementLength(measurement))}</p>
            <button type="button" className="h-8 text-left text-[13px] text-red-700" onClick={deleteSelection}>
              Excluir medição
            </button>
          </section>
        ) : null}

        <ProjectSettings />
      </div>
      {customOpen && furniture ? <SaveFurnitureDialog furnitureId={furniture.id} onClose={() => setCustomOpen(false)} /> : null}
    </aside>
  );
}

function displayedDegrees(radians: number): number {
  const degrees = (radians * 180) / Math.PI;
  const rounded = Math.round(degrees);
  return Math.abs(degrees - rounded) < 0.05 ? rounded : Math.round(degrees * 100) / 100;
}

function patchOpening(id: string, patch: Record<string, string | number | boolean>): void {
  useProjectStore.getState().commit((document) => {
    const opening = document.openings.find((entry) => entry.id === id);
    const wall = document.walls.find((entry) => entry.id === opening?.wallId);
    if (!opening || !wall) return;
    Object.assign(opening, patch);
    const length = wallLength(wall);
    opening.width = Math.min(opening.width, Math.max(0.2, length - 0.04));
    const half = opening.width / 2;
    opening.offset = Math.min(Math.max(opening.offset, half), Math.max(length - half, half));
    if (opening.kind === "window") {
      opening.sill = Math.min(Math.max(opening.sill, 0), Math.max(wall.height - 0.2, 0));
      opening.height = Math.min(opening.height, Math.max(wall.height - opening.sill, 0.2));
    } else {
      opening.height = Math.min(opening.height, wall.height);
    }
  });
}

function ProjectSettings() {
  const settings = useProjectStore((state) => state.document.settings);
  const update = (recipe: (document: ReturnType<typeof useProjectStore.getState>["document"]) => void) => {
    useProjectStore.getState().commit(recipe);
  };
  return (
    <section className="flex flex-col gap-2 border-t border-neutral-200 pt-3">
      <h3 className="text-sm font-medium">Projeto</h3>
      <label className="grid min-w-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] items-center gap-2 text-[13px]">
        <span className="text-neutral-500">Grade</span>
        <select
          className="h-8 min-w-0 border border-neutral-300 bg-white px-2"
          value={settings.gridSize}
          onChange={(event) =>
            update((document) => {
              document.settings.gridSize = Number(event.target.value);
            })
          }
        >
          <option value={0.05}>5 cm</option>
          <option value={0.1}>10 cm</option>
          <option value={0.5}>50 cm</option>
          <option value={1}>1 m</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={settings.snapEnabled}
          onChange={(event) =>
            update((document) => {
              document.settings.snapEnabled = event.target.checked;
            })
          }
        />
        Snap
      </label>
      <NumberField
        label="Pé-direito"
        suffix="m"
        min={2}
        max={6}
        value={settings.wallHeight}
        onCommit={(value) =>
          update((document) => {
            document.settings.wallHeight = value;
          })
        }
      />
      <NumberField
        label="Espessura"
        suffix="m"
        min={0.05}
        max={0.6}
        value={settings.wallThickness}
        onCommit={(value) =>
          update((document) => {
            document.settings.wallThickness = value;
          })
        }
      />
      <label className="grid min-w-0 grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)] items-center gap-2 text-[13px]">
        <span className="text-neutral-500">Paredes</span>
        <select
          className="h-8 min-w-0 border border-neutral-300 bg-white px-2"
          value={settings.wallMode}
          onChange={(event) =>
            update((document) => {
              document.settings.wallMode = event.target.value as typeof settings.wallMode;
            })
          }
        >
          <option value="solid">Normais</option>
          <option value="transparent">Transparentes</option>
          <option value="partial">Ocultação parcial</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={settings.showRoof}
          onChange={(event) =>
            update((document) => {
              document.settings.showRoof = event.target.checked;
            })
          }
        />
        Mostrar telhado
      </label>
    </section>
  );
}

function SaveFurnitureDialog({ furnitureId, onClose }: { furnitureId: string; onClose: () => void }) {
  const furniture = useProjectStore((state) => state.document.furniture.find((entry) => entry.id === furnitureId));
  const form = useForm<{ name: string; category: FurnitureCategory; width: number; depth: number; height: number }>({
    resolver: zodResolver(customFurnitureFormSchema),
    defaultValues: {
      name: furniture ? `Meu ${furniture.name.toLowerCase()}` : "Meu móvel",
      category: "quarto",
      width: furniture?.width ?? 1,
      depth: furniture?.depth ?? 1,
      height: furniture?.height ?? 1,
    },
  });
  if (!furniture) return null;
  return (
    <Dialog title="Salvar em Meus móveis" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit(async (values) => {
          const ok = await useCustomFurnitureStore.getState().add({
            id: newId(),
            name: values.name,
            category: values.category,
            width: values.width,
            depth: values.depth,
            height: values.height,
            model: furniture.model,
            color: furniture.color,
            modelWidth: furniture.modelWidth,
            modelDepth: furniture.modelDepth,
            modelHeight: furniture.modelHeight,
          });
          if (ok) onClose();
        })}
      >
        <input className="h-9 border border-neutral-300 px-2 text-sm" placeholder="Nome" {...form.register("name")} />
        <select className="h-9 border border-neutral-300 px-2 text-sm" {...form.register("category")}>
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <Dimension name="width" label="L" form={form} />
          <Dimension name="depth" label="P" form={form} />
          <Dimension name="height" label="A" form={form} />
        </div>
        {form.formState.errors.name ? <p className="text-[12px] text-red-700">{form.formState.errors.name.message}</p> : null}
        <button type="submit" className="h-9 bg-neutral-900 text-sm text-white">
          Salvar móvel
        </button>
      </form>
    </Dialog>
  );
}

function Dimension({
  name,
  label,
  form,
}: {
  name: "width" | "depth" | "height";
  label: string;
  form: ReturnType<typeof useForm<{ name: string; category: FurnitureCategory; width: number; depth: number; height: number }>>;
}) {
  return (
    <label className="text-[12px] text-neutral-500">
      {label}
      <input type="number" step="0.01" className="mt-1 h-8 w-full border border-neutral-300 px-2 text-neutral-900" {...form.register(name, { valueAsNumber: true })} />
    </label>
  );
}
