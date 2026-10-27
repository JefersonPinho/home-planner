"use client";

import { useState } from "react";
import { CATEGORIES, FURNITURE_CATALOG, catalogByCategory } from "@/features/furniture/catalog";
import type { FurnitureShape } from "@/features/furniture/catalog";
import { planSymbol } from "@/features/furniture/symbols";
import { placeCatalogItem } from "@/features/editor/actions";
import { formatMeters } from "@/lib/format";
import { useCustomFurnitureStore } from "@/stores/custom-furniture-store";
import { useEditorStore } from "@/stores/editor-store";
import type { FurnitureCategory } from "@/types/scene";

export function LibraryPanel({ onClose }: { onClose?: () => void }) {
  const [category, setCategory] = useState<FurnitureCategory>("quarto");
  const [query, setQuery] = useState("");
  const custom = useCustomFurnitureStore((state) => state.items);
  const needle = query.trim().toLowerCase();
  const items = needle
    ? FURNITURE_CATALOG.filter((item) => item.name.toLowerCase().includes(needle))
    : catalogByCategory(category);

  return (
    <aside className="flex h-full w-full flex-col border-neutral-200 bg-white md:w-[320px] md:border-r">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">Biblioteca</span>
        {onClose ? (
          <button type="button" className="text-[12px] text-neutral-500" onClick={onClose}>
            Fechar
          </button>
        ) : (
          <button type="button" className="text-[12px] text-neutral-500" onClick={() => useEditorStore.getState().setLibraryOpen(false)}>
            Fechar
          </button>
        )}
      </div>
      <div className="border-b border-neutral-200 px-3 py-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar móvel"
          aria-label="Buscar móvel"
          className="h-8 w-full border border-neutral-300 px-2 text-[13px] outline-none focus:border-neutral-900"
        />
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-2 py-2">
        {CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`h-7 shrink-0 px-2 text-[12px] ${category === entry.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            onClick={() => setCategory(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {custom.length > 0 ? (
          <section>
            <h3 className="px-3 pt-3 pb-1 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">Meus móveis</h3>
            {custom
              .filter((item) => (needle ? item.name.toLowerCase().includes(needle) : item.category === category))
              .map((item) => (
                <div key={item.id} className="flex items-center hover:bg-neutral-50">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left" onClick={() => placeCatalogItem(item)}>
                    <span className="h-8 w-8 shrink-0 border border-neutral-300" style={{ background: item.color }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{item.name}</span>
                      <span className="block text-[11px] text-neutral-500">
                        {formatMeters(item.width)} × {formatMeters(item.depth)} × {formatMeters(item.height)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="px-3 text-[12px] text-neutral-400"
                    aria-label={`Excluir ${item.name}`}
                    onClick={() => void useCustomFurnitureStore.getState().remove(item.id)}
                  >
                    Excluir
                  </button>
                </div>
              ))}
          </section>
        ) : null}
        {items.map((item) => (
          <button key={item.id} type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50" onClick={() => placeCatalogItem(item)}>
            <SymbolMark shape={item.shape} color={item.color} />
            <span className="min-w-0">
              <span className="block truncate text-[13px]">{item.name}</span>
              <span className="block text-[11px] text-neutral-500">
                {formatMeters(item.width)} × {formatMeters(item.depth)} × {formatMeters(item.height)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function SymbolMark({ shape, color }: { shape: FurnitureShape; color: string }) {
  const marks = planSymbol(shape, 1, 0.72);
  return (
    <svg viewBox="-0.58 -0.42 1.16 0.84" className="h-9 w-12 shrink-0 border border-neutral-300 bg-neutral-50" aria-hidden>
      <rect x="-0.5" y="-0.36" width="1" height="0.72" fill={color} stroke="#44403c" strokeWidth="0.03" />
      {marks.map((mark, index) => (
        <polyline
          key={index}
          points={mark.map((point) => `${point.x},${-point.y}`).join(" ")}
          fill="none"
          stroke="#292524"
          strokeWidth="0.04"
        />
      ))}
    </svg>
  );
}
