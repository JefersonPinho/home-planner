import { roundMm } from "@/lib/format";
import type { FurnitureInstance } from "@/types/scene";

export function resizeFurniture(
  item: FurnitureInstance,
  axis: "width" | "depth" | "height",
  next: number,
  lockRatio: boolean,
): void {
  const current = item[axis];
  if (!lockRatio || current <= 0) {
    item[axis] = roundMm(next);
    return;
  }
  const ratio = next / current;
  item.width = roundMm(Math.max(0.05, item.width * ratio));
  item.depth = roundMm(Math.max(0.05, item.depth * ratio));
  item.height = roundMm(Math.max(0.05, item.height * ratio));
  item[axis] = roundMm(next);
}

export function moveFurniture(
  item: FurnitureInstance,
  x: number,
  planY: number,
  rotation: number,
  snap: { enabled: boolean; grid: number; position: boolean; rotation: boolean },
): void {
  let nextX = x;
  let nextY = planY;
  let nextRotation = rotation;
  if (snap.enabled && snap.grid > 0 && snap.position) {
    nextX = Math.round(nextX / snap.grid) * snap.grid;
    nextY = Math.round(nextY / snap.grid) * snap.grid;
  }
  if (snap.enabled && snap.rotation) {
    const step = Math.PI / 12;
    nextRotation = Math.round(nextRotation / step) * step;
  }
  item.x = roundMm(nextX);
  item.y = roundMm(nextY);
  item.rotation = roundMm(nextRotation);
}

export function rotateFurniture(item: FurnitureInstance, delta: number): void {
  const next = item.rotation + delta;
  const quarter = Math.PI / 2;
  const steps = Math.round(next / quarter);
  if (Math.abs(next - steps * quarter) < 0.02) {
    item.rotation = steps * quarter;
    return;
  }
  item.rotation = roundMm(next);
}
