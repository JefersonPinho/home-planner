"use client";

import { presentRooms } from "@/features/rooms/present";
import { doorAngles, resetWalkSession, walkInput } from "@/features/walk/session";
import { findSpawn, forwardYaw, isWalkable, obstaclePolygons } from "@/features/walk/motion";
import { pointInPolygon } from "@/lib/geometry/polygon";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { useWalkStore } from "@/stores/walk-store";
import type { Vec2 } from "@/types/scene";

export function enterHouse(point?: Vec2): void {
  const document = useProjectStore.getState().document;
  const angles = doorAngles();
  const polygons = obstaclePolygons(document, angles);
  const spawn = point ?? findSpawn(document, angles);
  if (!spawn || !isWalkable(spawn, polygons)) {
    useWalkStore.getState().setNotice(
      point
        ? "Esse ponto está ocupado. Escolha outro lugar livre."
        : "Não há um espaço livre para começar. Clique no piso em um ponto livre.",
    );
    return;
  }
  const rooms = presentRooms(document.walls, document.rooms);
  const room = rooms.find((entry) => pointInPolygon(spawn, entry.inner.length >= 3 ? entry.inner : entry.polygon));
  resetWalkSession();
  walkInput.x = spawn.x;
  walkInput.z = spawn.y;
  walkInput.yaw = room ? forwardYaw(spawn, room.centroid) : 0;
  walkInput.pitch = 0;
  useWalkStore.getState().setNotice(null);
  useWalkStore.getState().setShowHelp(true);
  useWalkStore.getState().setInteract(null, false);
  useEditorStore.getState().setSelection(null);
  useEditorStore.getState().setMobileSheet(null);
  useEditorStore.getState().setMode("walk");
}

export function leaveHouse(): void {
  if (typeof document !== "undefined" && document.pointerLockElement) document.exitPointerLock();
  useWalkStore.getState().setInteract(null, false);
  useWalkStore.getState().setShowHelp(false);
  useWalkStore.getState().setNotice(null);
  useEditorStore.getState().requestCamera("preset", "perspective");
}

export function tryPlaceSpawn(x: number, z: number): boolean {
  if (useEditorStore.getState().mode !== "3d" || !useWalkStore.getState().notice) return false;
  enterHouse({ x, y: z });
  return true;
}
