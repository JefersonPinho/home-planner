import { create } from "zustand";
import type { CustomFurniture } from "@/types/scene";

type CustomFurnitureState = {
  items: CustomFurniture[];
  loaded: boolean;
  refresh: () => Promise<void>;
  add: (item: CustomFurniture) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
};

export const useCustomFurnitureStore = create<CustomFurnitureState>((set) => ({
  items: [],
  loaded: false,
  refresh: async () => {
    const response = await fetch("/api/custom-furniture");
    if (!response.ok) return;
    const body = (await response.json()) as { items: CustomFurniture[] };
    set({ items: body.items, loaded: true });
  },
  add: async (item) => {
    const response = await fetch("/api/custom-furniture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { item: CustomFurniture };
    set((state) => ({ items: [body.item, ...state.items.filter((entry) => entry.id !== body.item.id)] }));
    return true;
  },
  remove: async (id) => {
    await fetch(`/api/custom-furniture/${id}`, { method: "DELETE" });
    set((state) => ({ items: state.items.filter((entry) => entry.id !== id) }));
  },
}));
