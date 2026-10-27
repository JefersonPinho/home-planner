import { handlePoint, wallLabelOffset } from "@/features/editor/hit-test";
import { getCatalogItem } from "@/features/furniture/catalog";
import { planSymbol } from "@/features/furniture/symbols";
import { presentRooms } from "@/features/rooms/present";
import { openingsOnWall, wallLength } from "@/features/walls/intervals";
import { furnitureCollisions } from "@/lib/collisions/collisions";
import { formatArea, formatMeters } from "@/lib/format";
import { wallPolygons } from "@/lib/geometry/wall-join";
import { furnitureCorners, localToWorld, pointAlongWall, wallNormal } from "@/lib/geometry/polygon";
import { distance, midpoint } from "@/lib/geometry/vec";
import type { Camera2D, Selection, SnapHit } from "@/types/editor";
import type { Door, FurnitureInstance, SceneDocument, Vec2, Wall } from "@/types/scene";

export type PlanPaintInput = {
  document: SceneDocument;
  camera: Camera2D;
  selection: Selection;
  wallDraft: { a: Vec2; b: Vec2 } | null;
  measureDraft: Vec2 | null;
  cursor: Vec2 | null;
  snap: SnapHit | null;
  hoverId: string | null;
  width: number;
  height: number;
  dpr: number;
  interactive: boolean;
};

export function paintPlan(ctx: CanvasRenderingContext2D, input: PlanPaintInput): void {
  const { document, camera, width, height, dpr } = input;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, width, height);

  const toScreen = (point: Vec2) => ({
    x: (point.x - camera.x) * camera.zoom + width / 2,
    y: (camera.y - point.y) * camera.zoom + height / 2,
  });

  drawGrid(ctx, input, toScreen);
  for (const room of presentRooms(document.walls, document.rooms)) {
    const selected = input.selection?.type === "room" && input.selection.id === room.id;
    trace(ctx, room.inner, toScreen, true);
    ctx.fillStyle = room.color;
    ctx.fill();
    if (selected) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#1d4ed8";
      ctx.stroke();
    }
    if (camera.zoom > 18) {
      const screen = toScreen(room.centroid);
      label(ctx, room.name, { x: screen.x, y: screen.y - 8 }, selected ? "#1d4ed8" : "#374151", false, true);
      label(ctx, formatArea(room.usefulArea), { x: screen.x, y: screen.y + 8 }, "#6b7280", false, true);
    }
  }

  const collisions = furnitureCollisions(document);
  for (const wall of document.walls) drawWall(ctx, wall, input, toScreen);
  for (const item of document.furniture) {
    drawFurniture(ctx, item, input, toScreen, Boolean(collisions[item.id]?.length));
  }
  for (const measurement of document.measurements) {
    const selected = input.selection?.type === "measurement" && input.selection.id === measurement.id;
    dimension(ctx, measurement.a, measurement.b, formatMeters(distance(measurement.a, measurement.b)), toScreen, selected ? "#1d4ed8" : "#374151");
  }
  if (input.wallDraft && distance(input.wallDraft.a, input.wallDraft.b) > 0.01) {
    strokeLine(ctx, input.wallDraft.a, input.wallDraft.b, toScreen, "#1d4ed8", 2, [6, 4]);
    dimension(
      ctx,
      input.wallDraft.a,
      input.wallDraft.b,
      formatMeters(distance(input.wallDraft.a, input.wallDraft.b)),
      toScreen,
      "#1d4ed8",
    );
  }
  if (input.measureDraft && input.cursor) {
    strokeLine(ctx, input.measureDraft, input.cursor, toScreen, "#b45309", 1.5, [4, 3]);
    dimension(ctx, input.measureDraft, input.cursor, formatMeters(distance(input.measureDraft, input.cursor)), toScreen, "#b45309");
  }
  if (input.interactive && input.snap) drawSnap(ctx, input.snap, toScreen);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  input: PlanPaintInput,
  toScreen: (point: Vec2) => { x: number; y: number },
): void {
  const { camera, width, height, document } = input;
  const grid = document.settings.gridSize;
  const left = camera.x - width / 2 / camera.zoom;
  const right = camera.x + width / 2 / camera.zoom;
  const bottom = camera.y - height / 2 / camera.zoom;
  const top = camera.y + height / 2 / camera.zoom;
  const minor = grid * camera.zoom >= 10 ? grid : 1;
  const startX = Math.floor(left / minor) * minor;
  const startY = Math.floor(bottom / minor) * minor;
  ctx.lineWidth = 1;
  for (let x = startX; x <= right; x += minor) {
    const major = Math.abs(x / 1 - Math.round(x / 1)) < 1e-4;
    ctx.strokeStyle = major ? "#c5cad3" : "#e3e5ea";
    const screen = toScreen({ x, y: 0 });
    ctx.beginPath();
    ctx.moveTo(screen.x, 0);
    ctx.lineTo(screen.x, height);
    ctx.stroke();
  }
  for (let y = startY; y <= top; y += minor) {
    const major = Math.abs(y / 1 - Math.round(y / 1)) < 1e-4;
    ctx.strokeStyle = major ? "#c5cad3" : "#e3e5ea";
    const screen = toScreen({ x: 0, y });
    ctx.beginPath();
    ctx.moveTo(0, screen.y);
    ctx.lineTo(width, screen.y);
    ctx.stroke();
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  input: PlanPaintInput,
  toScreen: (point: Vec2) => { x: number; y: number },
): void {
  const selected = input.selection?.type === "wall" && input.selection.id === wall.id;
  const hovered = input.hoverId === wall.id && !selected;
  for (const polygon of wallPolygons(wall, input.document.walls, input.document.openings)) {
    trace(ctx, polygon, toScreen, true);
    ctx.fillStyle = selected ? "#3f3f46" : hovered ? "#52525b" : "#2c2c31";
    ctx.fill();
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeStyle = selected ? "#1d4ed8" : "#27272a";
    ctx.stroke();
  }
  for (const opening of openingsOnWall(wall.id, input.document.openings)) {
    const openingSelected = input.selection?.type === "opening" && input.selection.id === opening.id;
    const half = opening.width / 2;
    const start = pointAlongWall(wall, opening.offset - half);
    const end = pointAlongWall(wall, opening.offset + half);
    if (opening.kind === "window") {
      strokeLine(ctx, start, end, toScreen, openingSelected ? "#1d4ed8" : "#93c5fd", 3);
    } else {
      drawDoor(ctx, wall, opening, toScreen, openingSelected);
    }
  }
  if (wallLength(wall) >= 0.05 && (selected || input.camera.zoom >= 42)) {
    label(ctx, formatMeters(wallLength(wall)), toScreen(wallLabelOffset(wall)), selected ? "#1d4ed8" : "#111827", true);
  }
  if (selected && input.interactive) {
    for (const end of [wall.a, wall.b]) drawHandle(ctx, toScreen(end));
  }
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  door: Door,
  toScreen: (point: Vec2) => { x: number; y: number },
  selected: boolean,
): void {
  const length = Math.max(wallLength(wall), 0.001);
  const direction = { x: (wall.b.x - wall.a.x) / length, y: (wall.b.y - wall.a.y) / length };
  const normal = wallNormal(wall);
  const hingeDelta = door.swing === "left" ? -door.width / 2 : door.width / 2;
  const hinge = pointAlongWall(wall, door.offset + hingeDelta);
  const closed = door.swing === "left" ? direction : { x: -direction.x, y: -direction.y };
  const side = door.flip ? -1 : 1;
  const open = { x: normal.x * side, y: normal.y * side };
  ctx.beginPath();
  for (let step = 0; step <= 14; step += 1) {
    const t = (step / 14) * (Math.PI / 2);
    const point = {
      x: hinge.x + (closed.x * Math.cos(t) + open.x * Math.sin(t)) * door.width,
      y: hinge.y + (closed.y * Math.cos(t) + open.y * Math.sin(t)) * door.width,
    };
    const screen = toScreen(point);
    if (step === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  }
  ctx.strokeStyle = selected ? "#1d4ed8" : "#a8a29e";
  ctx.lineWidth = 1;
  ctx.stroke();
  const leaf = {
    x: hinge.x + open.x * door.width,
    y: hinge.y + open.y * door.width,
  };
  strokeLine(ctx, hinge, leaf, toScreen, selected ? "#1d4ed8" : "#78716c", 2);
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  item: FurnitureInstance,
  input: PlanPaintInput,
  toScreen: (point: Vec2) => { x: number; y: number },
  colliding: boolean,
): void {
  const selected = input.selection?.type === "furniture" && input.selection.id === item.id;
  const hovered = input.hoverId === item.id && !selected;
  const corners = furnitureCorners(item);
  trace(ctx, corners, toScreen, true);
  ctx.fillStyle = hexAlpha(item.color, 0.92);
  ctx.fill();
  ctx.lineWidth = selected || colliding ? 2 : hovered ? 1.5 : 1;
  ctx.strokeStyle = colliding ? "#dc2626" : selected ? "#1d4ed8" : hovered ? "#44403c" : "#57534e";
  ctx.stroke();
  drawSymbol(ctx, item, toScreen, selected);
  if (selected && item.width * input.camera.zoom > 46) {
    label(ctx, item.name, toScreen({ x: item.x, y: item.y }), "#292524", false);
  }
  if (!selected || !input.interactive) return;
  const widthA = localToWorld(item, -item.width / 2, item.depth / 2 + 0.22);
  const widthB = localToWorld(item, item.width / 2, item.depth / 2 + 0.22);
  const depthA = localToWorld(item, item.width / 2 + 0.22, -item.depth / 2);
  const depthB = localToWorld(item, item.width / 2 + 0.22, item.depth / 2);
  dimension(ctx, widthA, widthB, formatMeters(item.width), toScreen, "#1d4ed8");
  dimension(ctx, depthA, depthB, formatMeters(item.depth), toScreen, "#1d4ed8");
  const stem = localToWorld(item, 0, item.depth / 2);
  const handle = handlePoint(item);
  strokeLine(ctx, stem, handle, toScreen, "#1d4ed8", 1);
  const screen = toScreen(handle);
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  item: FurnitureInstance,
  toScreen: (point: Vec2) => { x: number; y: number },
  selected: boolean,
): void {
  const shape = getCatalogItem(item.catalogId)?.shape;
  const marks = planSymbol(shape, item.width, item.depth);
  if (marks.length === 0) return;
  ctx.save();
  ctx.strokeStyle = selected ? "#1e3a8a" : "#292524";
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "round";
  for (const mark of marks) {
    const world = mark.map((point) => localToWorld(item, point.x, point.y));
    trace(ctx, world, toScreen, mark.length > 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnap(ctx: CanvasRenderingContext2D, snap: SnapHit, toScreen: (point: Vec2) => { x: number; y: number }): void {
  const screen = toScreen(snap.point);
  ctx.beginPath();
  if (snap.kind === "endpoint" || snap.kind === "intersection") {
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screen.x - 6, screen.y - 6, 12, 12);
  } else {
    ctx.arc(screen.x, screen.y, snap.kind === "grid" ? 3 : 5, 0, Math.PI * 2);
    ctx.fillStyle = snap.kind === "grid" ? "#9ca3af" : "#1d4ed8";
    ctx.fill();
  }
  if (snap.kind === "grid") return;
  const text = snap.kind === "angle" ? "ângulo" : snap.kind === "endpoint" ? "extremo" : "encontro";
  label(ctx, text, { x: screen.x, y: screen.y - 16 }, "#1d4ed8", true, true);
}

function drawHandle(ctx: CanvasRenderingContext2D, point: { x: number; y: number }): void {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 1.5;
  ctx.fillRect(point.x - 5, point.y - 5, 10, 10);
  ctx.strokeRect(point.x - 5, point.y - 5, 10, 10);
}

function trace(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  toScreen: (point: Vec2) => { x: number; y: number },
  close: boolean,
): void {
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  const start = toScreen(first);
  ctx.moveTo(start.x, start.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (!point) continue;
    const screen = toScreen(point);
    ctx.lineTo(screen.x, screen.y);
  }
  if (close) ctx.closePath();
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  a: Vec2,
  b: Vec2,
  toScreen: (point: Vec2) => { x: number; y: number },
  color: string,
  width: number,
  dash?: number[],
): void {
  const start = toScreen(a);
  const end = toScreen(b);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash ?? []);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function dimension(
  ctx: CanvasRenderingContext2D,
  a: Vec2,
  b: Vec2,
  text: string,
  toScreen: (point: Vec2) => { x: number; y: number },
  color: string,
): void {
  const start = toScreen(a);
  const end = toScreen(b);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * 4;
  const ny = (dx / length) * 4;
  for (const point of [start, end]) {
    ctx.beginPath();
    ctx.moveTo(point.x - nx, point.y - ny);
    ctx.lineTo(point.x + nx, point.y + ny);
    ctx.stroke();
  }
  ctx.restore();
  label(ctx, text, midpoint(start, end), color, true, true);
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  point: { x: number; y: number },
  color: string,
  pill: boolean,
  alreadyScreen = false,
): void {
  ctx.save();
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (pill) {
    const width = ctx.measureText(text).width + 8;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fillRect(point.x - width / 2, point.y - 9, width, 18);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, point.x, point.y);
  ctx.restore();
  void alreadyScreen;
}

function hexAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const channel = Number.parseInt(value, 16);
  if (!Number.isFinite(channel) || value.length !== 6) return `rgba(168,162,158,${alpha})`;
  const red = (channel >> 16) & 255;
  const green = (channel >> 8) & 255;
  const blue = channel & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
