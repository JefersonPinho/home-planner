import type { Vec2 } from "@/types/scene";

export type Tool = "select" | "wall" | "door" | "window" | "measure" | "pan";

export type EditorMode = "2d" | "3d";

export type Selection =
  | { type: "wall"; id: string }
  | { type: "furniture"; id: string }
  | { type: "opening"; id: string }
  | { type: "measurement"; id: string }
  | { type: "room"; id: string }
  | null;

export type Camera2D = {
  x: number;
  y: number;
  zoom: number;
};

export type ViewPreset =
  | "top"
  | "front"
  | "back"
  | "left"
  | "right"
  | "perspective"
  | "dollhouse";

export type SnapKind = "endpoint" | "intersection" | "wall" | "grid" | "angle";

export type SnapHit = {
  point: Vec2;
  kind: SnapKind;
};

export type CameraCommand = {
  kind: "preset" | "fit" | "focus";
  preset: ViewPreset;
  nonce: number;
};
