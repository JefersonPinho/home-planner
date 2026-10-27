import type { FurnitureShape } from "@/features/furniture/catalog";
import type { Vec2 } from "@/types/scene";

export function planSymbol(shape: FurnitureShape | undefined, width: number, depth: number): Vec2[][] {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  if (shape === "bed") {
    const head = -halfDepth + depth * 0.16;
    return [
      [
        { x: -halfWidth, y: -halfDepth },
        { x: halfWidth, y: -halfDepth },
        { x: halfWidth, y: head },
        { x: -halfWidth, y: head },
      ],
      [
        { x: -halfWidth * 0.62, y: head + depth * 0.08 },
        { x: halfWidth * 0.62, y: head + depth * 0.08 },
        { x: halfWidth * 0.62, y: head + depth * 0.28 },
        { x: -halfWidth * 0.62, y: head + depth * 0.28 },
      ],
    ];
  }
  if (shape === "sofa" || shape === "sofa-l") {
    const back = halfDepth - depth * 0.22;
    const parts: Vec2[][] = [
      [
        { x: -halfWidth, y: back },
        { x: halfWidth, y: back },
        { x: halfWidth, y: halfDepth },
        { x: -halfWidth, y: halfDepth },
      ],
      [
        { x: -halfWidth, y: -halfDepth },
        { x: -halfWidth + width * 0.12, y: -halfDepth },
        { x: -halfWidth + width * 0.12, y: back },
        { x: -halfWidth, y: back },
      ],
    ];
    if (shape === "sofa-l") {
      parts.push([
        { x: halfWidth - width * 0.34, y: -halfDepth },
        { x: halfWidth, y: -halfDepth },
        { x: halfWidth, y: back },
        { x: halfWidth - width * 0.34, y: back },
      ]);
    } else {
      parts.push([
        { x: halfWidth - width * 0.12, y: -halfDepth },
        { x: halfWidth, y: -halfDepth },
        { x: halfWidth, y: back },
        { x: halfWidth - width * 0.12, y: back },
      ]);
    }
    return parts;
  }
  if (shape === "table" || shape === "desk") {
    const insetX = width * 0.12;
    const insetY = depth * 0.14;
    return [
      [
        { x: -halfWidth + insetX, y: -halfDepth + insetY },
        { x: halfWidth - insetX, y: -halfDepth + insetY },
        { x: halfWidth - insetX, y: halfDepth - insetY },
        { x: -halfWidth + insetX, y: halfDepth - insetY },
      ],
    ];
  }
  if (shape === "chair" || shape === "office-chair") {
    return [
      [
        { x: -halfWidth * 0.72, y: halfDepth * 0.15 },
        { x: halfWidth * 0.72, y: halfDepth * 0.15 },
        { x: halfWidth * 0.72, y: halfDepth },
        { x: -halfWidth * 0.72, y: halfDepth },
      ],
    ];
  }
  if (shape === "wardrobe" || shape === "cabinet" || shape === "rack") {
    return [
      [
        { x: 0, y: -halfDepth },
        { x: 0, y: halfDepth },
      ],
    ];
  }
  if (shape === "fridge") {
    return [
      [
        { x: halfWidth * 0.72, y: -halfDepth * 0.35 },
        { x: halfWidth * 0.72, y: halfDepth * 0.55 },
      ],
    ];
  }
  if (shape === "stove" || shape === "cooktop") {
    return burners(width, depth);
  }
  return [];
}

function burners(width: number, depth: number): Vec2[][] {
  const marks: Vec2[][] = [];
  for (const x of [-0.22, 0.22]) {
    for (const y of [-0.22, 0.22]) {
      const cx = x * width;
      const cy = y * depth;
      const r = Math.min(width, depth) * 0.12;
      marks.push(circle(cx, cy, r));
    }
  }
  return marks;
}

function circle(cx: number, cy: number, radius: number): Vec2[] {
  const points: Vec2[] = [];
  for (let step = 0; step <= 10; step += 1) {
    const angle = (step / 10) * Math.PI * 2;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
}
