"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { registerDoorLeaf } from "@/features/walk/session";
import { extrudeSlabs } from "@/features/walls/extrude";
import { wallLength } from "@/features/walls/intervals";
import { pointAlongWall } from "@/lib/geometry/polygon";
import { wallVolumes } from "@/lib/geometry/wall-join";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { Opening, Wall, WallMode } from "@/types/scene";

export function Walls() {
  const walls = useProjectStore((state) => state.document.walls);
  const openings = useProjectStore((state) => state.document.openings);
  const wallMode = useProjectStore((state) => state.document.settings.wallMode);
  const selection = useEditorStore((state) => state.selection);
  return (
    <group>
      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          walls={walls}
          openings={openings}
          wallMode={wallMode}
          selected={selection?.type === "wall" && selection.id === wall.id}
        />
      ))}
    </group>
  );
}

function WallMesh({
  wall,
  walls,
  openings,
  wallMode,
  selected,
}: {
  wall: Wall;
  walls: Wall[];
  openings: Opening[];
  wallMode: WallMode;
  selected: boolean;
}) {
  const volumes = useMemo(() => wallVolumes(wall, walls, openings), [wall, walls, openings]);
  const geometry = useMemo(() => extrudeSlabs(volumes), [volumes]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const current = material.current;
    if (!current || wallMode === "partial") return;
    const clear = wallMode === "transparent";
    current.opacity = clear ? 0.34 : 1;
    current.transparent = clear;
    current.depthWrite = !clear;
  }, [wallMode]);
  useFrame(({ camera }) => {
    const current = material.current;
    if (!current) return;
    if (useEditorStore.getState().mode === "walk") {
      current.opacity = 1;
      current.transparent = false;
      current.depthWrite = true;
      return;
    }
    if (wallMode !== "partial") return;
    const angle = Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x);
    const normalX = -Math.sin(angle);
    const normalZ = Math.cos(angle);
    const midX = (wall.a.x + wall.b.x) / 2;
    const midZ = (wall.a.y + wall.b.y) / 2;
    const facing = normalX * (camera.position.x - midX) + normalZ * (-camera.position.z - midZ);
    const hidden = facing > 0.2;
    current.opacity = hidden ? 0.14 : 1;
    current.transparent = hidden;
    current.depthWrite = !hidden;
  });
  if (wallLength(wall) < 0.02) return null;
  const related = openings.filter((opening) => opening.wallId === wall.id);
  return (
    <group>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          if (useEditorStore.getState().mode === "walk") return;
          useEditorStore.getState().setSelection({ type: "wall", id: wall.id });
        }}
      >
        <meshStandardMaterial
          ref={material}
          color={selected ? "#d9dee8" : "#e4e0d8"}
          roughness={0.86}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {related.map((opening) => (
        <OpeningAnchor key={opening.id} wall={wall} opening={opening} />
      ))}
    </group>
  );
}

function OpeningAnchor({ wall, opening }: { wall: Wall; opening: Opening }) {
  const angle = Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x);
  const center = pointAlongWall(wall, opening.offset);
  return (
    <group position={[center.x, wall.height / 2, center.y]} rotation={[0, -angle, 0]}>
      <OpeningMesh wall={wall} opening={opening} />
    </group>
  );
}

function OpeningMesh({ wall, opening }: { wall: Wall; opening: Opening }) {
  const sill = opening.kind === "window" ? opening.sill : 0;
  const head = opening.kind === "window" ? opening.sill + opening.height : opening.height;
  const span = Math.max(head - sill, 0.05);
  const midY = (sill + head) / 2 - wall.height / 2;
  const jamb = 0.045;
  const depth = Math.max(wall.thickness, 0.05);
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        if (useEditorStore.getState().mode === "walk") return;
        useEditorStore.getState().setSelection({ type: "opening", id: opening.id });
      }}
    >
      <mesh position={[-opening.width / 2 + jamb / 2, midY, 0]}>
        <boxGeometry args={[jamb, span, depth]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.72} />
      </mesh>
      <mesh position={[opening.width / 2 - jamb / 2, midY, 0]}>
        <boxGeometry args={[jamb, span, depth]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.72} />
      </mesh>
      <mesh position={[0, head - wall.height / 2 - jamb / 2, 0]}>
        <boxGeometry args={[opening.width, jamb, depth]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.72} />
      </mesh>
      {opening.kind === "window" ? (
        <>
          <mesh position={[0, sill - wall.height / 2 + jamb / 2, 0]}>
            <boxGeometry args={[opening.width, jamb, depth]} />
            <meshStandardMaterial color="#d6d3d1" roughness={0.72} />
          </mesh>
          <mesh position={[0, midY, 0]}>
            <boxGeometry args={[Math.max(opening.width - jamb * 2, 0.05), Math.max(span - jamb * 2, 0.05), 0.02]} />
            <meshStandardMaterial color="#dbeafe" transparent opacity={0.45} roughness={0.05} />
          </mesh>
        </>
      ) : (
        <DoorLeaf wall={wall} opening={opening} />
      )}
    </group>
  );
}

function DoorLeaf({ wall, opening }: { wall: Wall; opening: Extract<Opening, { kind: "door" }> }) {
  const hinge = opening.swing === "left" ? -opening.width / 2 : opening.width / 2;
  const leaf = opening.swing === "left" ? opening.width / 2 : -opening.width / 2;
  const swingSign = (opening.flip ? -1 : 1) * (opening.swing === "left" ? 1 : -1);
  const walking = useEditorStore((state) => state.mode === "walk");
  const leafGroup = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const group = leafGroup.current;
    if (group) group.userData.swingSign = swingSign;
    registerDoorLeaf(opening.id, group);
    return () => registerDoorLeaf(opening.id, null);
  }, [opening.id, swingSign]);
  return (
    <group ref={leafGroup} position={[hinge, 0, 0]} rotation={[0, swingSign * (walking ? 0 : 0.7), 0]}>
      <mesh position={[leaf, opening.height / 2 - wall.height / 2, opening.flip ? -wall.thickness / 2 : wall.thickness / 2]}>
        <boxGeometry args={[Math.max(opening.width - 0.04, 0.05), opening.height, 0.04]} />
        <meshStandardMaterial color="#cfc8c0" roughness={0.8} />
      </mesh>
    </group>
  );
}
