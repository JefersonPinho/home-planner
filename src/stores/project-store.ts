import { create } from "zustand";
import { cloneDocument, createEmptyDocument } from "@/lib/document";
import type { ProjectRecord, SceneDocument } from "@/types/scene";

const HISTORY_LIMIT = 80;

type ProjectState = {
  projectId: string | null;
  projectName: string;
  isTemplate: boolean;
  document: SceneDocument;
  past: SceneDocument[];
  future: SceneDocument[];
  gesture: SceneDocument | null;
  dirty: boolean;
  revision: number;
  loaded: boolean;
  load: (project: ProjectRecord) => void;
  setName: (name: string) => void;
  setTemplate: (value: boolean) => void;
  commit: (recipe: (document: SceneDocument) => void) => void;
  beginGesture: () => void;
  updateLive: (recipe: (document: SceneDocument) => void) => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
  reset: () => void;
};

const initialDocument = createEmptyDocument();

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  projectName: "Sem título",
  isTemplate: false,
  document: initialDocument,
  past: [],
  future: [],
  gesture: null,
  dirty: false,
  revision: 0,
  loaded: false,
  load: (project) =>
    set({
      projectId: project.id,
      projectName: project.name,
      isTemplate: project.isTemplate,
      document: cloneDocument(project.document),
      past: [],
      future: [],
      gesture: null,
      dirty: false,
      revision: project.clientRevision ?? 0,
      loaded: true,
    }),
  setName: (name) => set({ projectName: name }),
  setTemplate: (value) => set({ isTemplate: value }),
  commit: (recipe) => {
    const current = get();
    const before = cloneDocument(current.document);
    const next = cloneDocument(current.document);
    recipe(next);
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    set({
      document: next,
      past: [...current.past, before].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
      revision: current.revision + 1,
      gesture: null,
    });
  },
  beginGesture: () => {
    const current = get();
    if (current.gesture) return;
    set({ gesture: cloneDocument(current.document) });
  },
  updateLive: (recipe) => {
    const current = get();
    const next = cloneDocument(current.document);
    recipe(next);
    set({
      document: next,
      dirty: true,
      revision: current.revision + 1,
    });
  },
  endGesture: () => {
    const current = get();
    if (!current.gesture) return;
    const changed = JSON.stringify(current.gesture) !== JSON.stringify(current.document);
    if (!changed) {
      set({ gesture: null });
      return;
    }
    set({
      past: [...current.past, current.gesture].slice(-HISTORY_LIMIT),
      future: [],
      gesture: null,
    });
  },
  undo: () => {
    const current = get();
    const previous = current.past[current.past.length - 1];
    if (!previous) return;
    set({
      past: current.past.slice(0, -1),
      future: [...current.future, cloneDocument(current.document)],
      document: cloneDocument(previous),
      dirty: true,
      revision: current.revision + 1,
      gesture: null,
    });
  },
  redo: () => {
    const current = get();
    const next = current.future[current.future.length - 1];
    if (!next) return;
    set({
      future: current.future.slice(0, -1),
      past: [...current.past, cloneDocument(current.document)].slice(-HISTORY_LIMIT),
      document: cloneDocument(next),
      dirty: true,
      revision: current.revision + 1,
      gesture: null,
    });
  },
  markClean: () => set({ dirty: false }),
  reset: () =>
    set({
      projectId: null,
      projectName: "Sem título",
      isTemplate: false,
      document: createEmptyDocument(),
      past: [],
      future: [],
      gesture: null,
      dirty: false,
      revision: 0,
      loaded: false,
    }),
}));
