"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { presentRooms, type PresentedRoom } from "@/features/rooms/present";
import { tryPlaceSpawn } from "@/features/walk/enter";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";

export function RoomFloors() {
  const walls = useProjectStore((state) => state.document.walls);
  const saved = useProjectStore((state) => state.document.rooms);
  const rooms = useMemo(() => presentRooms(walls, saved), [walls, saved]);
  return (
    <group>
      {rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}
    </group>
  );
}

function RoomFloor({ room }: { room: PresentedRoom }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(room.inner.map((point) => new THREE.Vector2(point.x, point.y)));
    return new THREE.ShapeGeometry(shape);
  }, [room]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      geometry={geometry}
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        if (tryPlaceSpawn(event.point.x, event.point.z)) return;
        if (useEditorStore.getState().mode === "walk") return;
        useEditorStore.getState().setSelection({ type: "room", id: room.id });
      }}
    >
      <meshStandardMaterial color={floorTint(room.color)} roughness={0.95} metalness={0} />
    </mesh>
  );
}

export function Roof() {
  const showRoof = useProjectStore((state) => state.document.settings.showRoof);
  const walls = useProjectStore((state) => state.document.walls);
  if (!showRoof || walls.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let height = 0;
  for (const wall of walls) {
    minX = Math.min(minX, wall.a.x, wall.b.x);
    maxX = Math.max(maxX, wall.a.x, wall.b.x);
    minY = Math.min(minY, wall.a.y, wall.b.y);
    maxY = Math.max(maxY, wall.a.y, wall.b.y);
    height = Math.max(height, wall.height);
  }
  return (
    <mesh position={[(minX + maxX) / 2, height + 0.06, (minY + maxY) / 2]} castShadow>
      <boxGeometry args={[Math.max(maxX - minX, 0.2) + 0.55, 0.08, Math.max(maxY - minY, 0.2) + 0.55]} />
      <meshStandardMaterial color="#c9c2b8" roughness={0.9} />
    </mesh>
  );
}

function floorTint(hex: string): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(value)) return "#e4d5c0";
  const mix = (channel: number, base: number) => Math.round(channel * 0.28 + base * 0.72).toString(16).padStart(2, "0");
  return `#${mix((value >> 16) & 255, 0xe4)}${mix((value >> 8) & 255, 0xd5)}${mix(value & 255, 0xc0)}`;
}
