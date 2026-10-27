import { paintPlan } from "@/components/canvas-2d/paint-plan";
import { sceneBounds } from "@/lib/geometry/bounds";
import type { SceneDocument } from "@/types/scene";

export function renderThumbnail(document: SceneDocument): string {
  const canvas = globalThis.document?.createElement("canvas");
  if (!canvas) return "";
  canvas.width = 640;
  canvas.height = 400;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const bounds = sceneBounds(document);
  const worldWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const worldHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const zoom = Math.min(640 / worldWidth, 400 / worldHeight) * 0.82;
  paintPlan(context, {
    document,
    camera: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      zoom,
    },
    selection: null,
    wallDraft: null,
    measureDraft: null,
    cursor: null,
    snap: null,
    hoverId: null,
    width: 640,
    height: 400,
    dpr: 1,
    interactive: false,
  });
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}
