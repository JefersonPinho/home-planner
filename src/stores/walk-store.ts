import { create } from "zustand";

type WalkState = {
  notice: string | null;
  interactId: string | null;
  interactOpen: boolean;
  showHelp: boolean;
  setNotice: (notice: string | null) => void;
  setInteract: (id: string | null, open: boolean) => void;
  setShowHelp: (showHelp: boolean) => void;
};

export const useWalkStore = create<WalkState>((set, get) => ({
  notice: null,
  interactId: null,
  interactOpen: false,
  showHelp: false,
  setNotice: (notice) => set({ notice }),
  setInteract: (interactId, interactOpen) => {
    const current = get();
    if (current.interactId === interactId && current.interactOpen === interactOpen) return;
    set({ interactId, interactOpen });
  },
  setShowHelp: (showHelp) => set({ showHelp }),
}));
