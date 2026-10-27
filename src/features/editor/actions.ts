import { deriveRooms } from "@/features/rooms/derive-rooms";
import { presentRooms } from "@/features/rooms/present";
import { splitAtJunctions } from "@/features/walls/junctions";
import { pointInPolygon } from "@/lib/geometry/polygon";
import { sceneBounds, selectionBounds } from "@/lib/geometry/bounds";
import { roundMm } from "@/lib/format";
import { newId } from "@/lib/id";
import { closestPointOnSegment } from "@/lib/geometry/polygon";
import { distance } from "@/lib/geometry/vec";
import { snapPoint } from "@/lib/snapping/snap";
import { createDoor } from "@/features/doors/door";
import { createMeasurement } from "@/features/measurements/measure";
import { rotateFurniture } from "@/features/furniture/transform";
import { createWindow } from "@/features/windows/window";
import { clampOpeningToWall, setWallLength } from "@/features/walls/intervals";
import { frameBounds, getPlanViewport } from "@/features/editor/viewport";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { CatalogItem } from "@/features/furniture/catalog";
import type { CustomFurniture, Vec2 } from "@/types/scene";

function select(selection: NonNullable<ReturnType<typeof useEditorStore.getState>["selection"]> | null): void {
  useEditorStore.getState().setSelection(selection);
}

export function addWall(a: Vec2, b: Vec2): boolean {
  if (distance(a, b) < 0.05) return false;
  const id = newId();
  useProjectStore.getState().commit((document) => {
    document.walls.push({
      id,
      a: { x: roundMm(a.x), y: roundMm(a.y) },
      b: { x: roundMm(b.x), y: roundMm(b.y) },
      height: document.settings.wallHeight,
      thickness: document.settings.wallThickness,
    });
    splitAtJunctions(document);
  });
  select({ type: "wall", id });
  return true;
}

export function placeOpening(kind: "door" | "window", point: Vec2): void {
  const document = useProjectStore.getState().document;
  let best: { wall: (typeof document.walls)[number]; distance: number } | null = null;
  for (const wall of document.walls) {
    const closest = closestPointOnSegment(point, wall.a, wall.b);
    const limit = Math.max(wall.thickness, 0.35);
    if (closest.distance > limit) continue;
    if (!best || closest.distance < best.distance) best = { wall, distance: closest.distance };
  }
  const wall = best?.wall;
  if (!wall) return;
  const opening = kind === "door" ? createDoor(wall, point) : createWindow(wall, point);
  if (!opening) return;
  useProjectStore.getState().commit((draft) => {
    draft.openings.push(opening);
  });
  select({ type: "opening", id: opening.id });
}

export function addMeasurement(a: Vec2, b: Vec2): void {
  const measurement = createMeasurement(a, b);
  if (!measurement) return;
  useProjectStore.getState().commit((document) => {
    document.measurements.push(measurement);
  });
  select({ type: "measurement", id: measurement.id });
}

export function placeCatalogItem(item: CatalogItem | CustomFurniture, native?: { width: number; depth: number; height: number }): void {
  const editor = useEditorStore.getState();
  const document = useProjectStore.getState().document;
  const rooms = deriveRooms(document.walls);
  const cameraPoint = { x: editor.camera.x, y: editor.camera.y };
  const room = rooms.find((entry) => pointInPolygon(cameraPoint, entry.polygon)) ?? rooms[0];
  const snapped = snapPoint(room?.centroid ?? cameraPoint, document.walls, {
    gridSize: document.settings.gridSize,
    snapEnabled: document.settings.snapEnabled,
    zoom: editor.camera.zoom,
  });
  const id = newId();
  const modelWidth = native?.width ?? ("modelWidth" in item ? item.modelWidth : item.width);
  const modelDepth = native?.depth ?? ("modelDepth" in item ? item.modelDepth : item.depth);
  const modelHeight = native?.height ?? ("modelHeight" in item ? item.modelHeight : item.height);
  useProjectStore.getState().commit((draft) => {
    draft.furniture.push({
      id,
      catalogId: item.id,
      name: item.name,
      model: item.model,
      color: item.color,
      x: snapped.point.x,
      y: snapped.point.y,
      rotation: 0,
      width: item.width,
      depth: item.depth,
      height: item.height,
      modelWidth,
      modelDepth,
      modelHeight,
    });
  });
  select({ type: "furniture", id });
  useEditorStore.getState().setTool("select");
  useEditorStore.getState().setLibraryOpen(false);
  useEditorStore.getState().setMobileSheet(null);
}

export function deleteSelection(): void {
  const selection = useEditorStore.getState().selection;
  if (!selection) return;
  useProjectStore.getState().commit((document) => {
    if (selection.type === "wall") {
      document.walls = document.walls.filter((wall) => wall.id !== selection.id);
      document.openings = document.openings.filter((opening) => opening.wallId !== selection.id);
    } else if (selection.type === "furniture") {
      document.furniture = document.furniture.filter((item) => item.id !== selection.id);
    } else if (selection.type === "opening") {
      document.openings = document.openings.filter((opening) => opening.id !== selection.id);
    } else if (selection.type === "measurement") {
      document.measurements = document.measurements.filter((item) => item.id !== selection.id);
    } else {
      return;
    }
  });
  select(null);
}

export function duplicateSelection(): void {
  const selection = useEditorStore.getState().selection;
  if (selection?.type !== "furniture") return;
  const source = useProjectStore.getState().document.furniture.find((item) => item.id === selection.id);
  if (!source) return;
  const id = newId();
  useProjectStore.getState().commit((document) => {
    const current = document.furniture.find((item) => item.id === source.id);
    if (!current) return;
    document.furniture.push({
      ...structuredClone(current),
      id,
      x: roundMm(current.x + 0.3),
      y: roundMm(current.y + 0.3),
    });
  });
  select({ type: "furniture", id });
}

export function rotateSelection(direction: 1 | -1): void {
  const selection = useEditorStore.getState().selection;
  if (selection?.type !== "furniture") return;
  useProjectStore.getState().commit((document) => {
    const item = document.furniture.find((entry) => entry.id === selection.id);
    if (item) rotateFurniture(item, direction * (Math.PI / 2));
  });
}

export function renameRoom(roomId: string, name: string): void {
  const next = name.trim().slice(0, 80);
  if (!next) return;
  useProjectStore.getState().commit((document) => {
    const room = presentRooms(document.walls, document.rooms).find((entry) => entry.id === roomId);
    if (!room) return;
    const height = document.walls.reduce((max, wall) => Math.max(max, wall.height), document.settings.wallHeight);
    const existing = document.rooms.find((entry) => entry.id === room.savedId);
    if (existing) {
      existing.name = next;
      existing.polygon = room.polygon.map((point) => ({ ...point }));
      existing.area = roundMm(room.usefulArea);
      existing.color = room.color;
      existing.height = height;
      return;
    }
    document.rooms.push({
      id: newId(),
      name: next,
      polygon: room.polygon.map((point) => ({ ...point })),
      floor: "padrao",
      color: room.color,
      height,
      area: roundMm(room.usefulArea),
    });
  });
}

export function updateWallLength(id: string, length: number): void {
  useProjectStore.getState().commit((document) => {
    const wall = document.walls.find((entry) => entry.id === id);
    if (!wall) return;
    setWallLength(wall, length);
    for (const opening of document.openings) {
      if (opening.wallId === id) clampOpeningToWall(opening, wall);
    }
  });
}

export function frameProject(): void {
  const mode = useEditorStore.getState().mode;
  const document = useProjectStore.getState().document;
  if (mode === "2d") {
    const view = getPlanViewport();
    useEditorStore.getState().setCamera(frameBounds(sceneBounds(document), view.width, view.height));
    return;
  }
  useEditorStore.getState().requestCamera("fit");
}

export function focusSelection(): void {
  const editor = useEditorStore.getState();
  const document = useProjectStore.getState().document;
  const bounds = selectionBounds(document, editor.selection) ?? sceneBounds(document);
  if (editor.mode === "2d") {
    const view = getPlanViewport();
    editor.setCamera(frameBounds(bounds, view.width, view.height));
    return;
  }
  editor.requestCamera("focus");
}

export function enterDollhouse(): void {
  useEditorStore.getState().requestCamera("preset", "dollhouse");
  const mode = useProjectStore.getState().document.settings.wallMode;
  if (mode !== "transparent") {
    useProjectStore.getState().commit((document) => {
      document.settings.wallMode = "transparent";
    });
  }
}
