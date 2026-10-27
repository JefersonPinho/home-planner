import { create } from "zustand";
import type { Camera2D, CameraCommand, EditorMode, Selection, SnapHit, Tool, ViewPreset } from "@/types/editor";
import type { Vec2 } from "@/types/scene";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorState = {
  tool: Tool;
  mode: EditorMode;
  camera: Camera2D;
  selection: Selection;
  wallDraft: { a: Vec2; b: Vec2 } | null;
  measureDraft: Vec2 | null;
  cursor: Vec2 | null;
  snap: SnapHit | null;
  viewPreset: ViewPreset;
  cameraCommand: CameraCommand;
  lockRatio: boolean;
  libraryOpen: boolean;
  mobileSheet: "library" | "properties" | "view" | null;
  saveStatus: SaveStatus;
  setTool: (tool: Tool) => void;
  setMode: (mode: EditorMode) => void;
  setCamera: (camera: Camera2D) => void;
  setSelection: (selection: Selection) => void;
  setWallDraft: (draft: { a: Vec2; b: Vec2 } | null) => void;
  setMeasureDraft: (point: Vec2 | null) => void;
  setCursor: (point: Vec2 | null) => void;
  setSnap: (snap: SnapHit | null) => void;
  requestCamera: (kind: CameraCommand["kind"], preset?: ViewPreset) => void;
  setLockRatio: (value: boolean) => void;
  setLibraryOpen: (value: boolean) => void;
  setMobileSheet: (sheet: EditorState["mobileSheet"]) => void;
  setSaveStatus: (status: SaveStatus) => void;
  resetEphemeral: () => void;
};

const initialCommand: CameraCommand = { kind: "fit", preset: "perspective", nonce: 0 };

export const useEditorStore = create<EditorState>((set, get) => ({
  tool: "select",
  mode: "2d",
  camera: { x: 0, y: 0, zoom: 48 },
  selection: null,
  wallDraft: null,
  measureDraft: null,
  cursor: null,
  snap: null,
  viewPreset: "perspective",
  cameraCommand: initialCommand,
  lockRatio: false,
  libraryOpen: false,
  mobileSheet: null,
  saveStatus: "idle",
  setTool: (tool) =>
    set({
      tool,
      wallDraft: null,
      measureDraft: null,
      snap: null,
    }),
  setMode: (mode) => set({ mode }),
  setCamera: (camera) => set({ camera }),
  setSelection: (selection) => set({ selection }),
  setWallDraft: (wallDraft) => set({ wallDraft }),
  setMeasureDraft: (measureDraft) => set({ measureDraft }),
  setCursor: (cursor) => set({ cursor }),
  setSnap: (snap) => set({ snap }),
  requestCamera: (kind, preset) => {
    const current = get();
    const nextPreset = preset ?? current.viewPreset;
    set({
      viewPreset: nextPreset,
      mode: kind === "preset" && nextPreset !== "top" ? "3d" : current.mode,
      cameraCommand: {
        kind,
        preset: nextPreset,
        nonce: current.cameraCommand.nonce + 1,
      },
    });
  },
  setLockRatio: (lockRatio) => set({ lockRatio }),
  setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
  setMobileSheet: (mobileSheet) => set({ mobileSheet }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  resetEphemeral: () =>
    set({
      tool: "select",
      mode: "2d",
      camera: { x: 0, y: 0, zoom: 48 },
      selection: null,
      wallDraft: null,
      measureDraft: null,
      cursor: null,
      snap: null,
      viewPreset: "perspective",
      cameraCommand: { kind: "fit", preset: "perspective", nonce: 0 },
      lockRatio: false,
      libraryOpen: false,
      mobileSheet: null,
      saveStatus: "idle",
    }),
}));
