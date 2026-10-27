import type { SceneDocument } from "@/types/scene";

export function createEmptyDocument(): SceneDocument {
  return {
    version: 1,
    settings: {
      units: "m",
      gridSize: 0.1,
      snapEnabled: true,
      wallHeight: 2.8,
      wallThickness: 0.15,
      showRoof: false,
      wallMode: "solid",
    },
    walls: [],
    openings: [],
    rooms: [],
    furniture: [],
    measurements: [],
  };
}

export function cloneDocument(document: SceneDocument): SceneDocument {
  return structuredClone(document);
}
