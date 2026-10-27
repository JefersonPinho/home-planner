"use client";

import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useGLTF, PivotControls } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { moveFurniture } from "@/features/furniture/transform";
import { furnitureCollisions } from "@/lib/collisions/collisions";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { FurnitureInstance } from "@/types/scene";

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const FLOOR_HIT = new THREE.Vector3();
const POSITION = new THREE.Vector3();
const QUATERNION = new THREE.Quaternion();
const SCALE = new THREE.Vector3();
const EULER = new THREE.Euler(0, 0, 0, "YXZ");

type OrbitControlsLike = { enabled: boolean };
type PointerCaptureTarget = {
  setPointerCapture: (id: number) => void;
  hasPointerCapture: (id: number) => boolean;
  releasePointerCapture: (id: number) => void;
};

export function Furniture() {
  const furniture = useProjectStore((state) => state.document.furniture);
  const document = useProjectStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const collisions = useMemo(() => furnitureCollisions(document), [document]);
  return (
    <group>
      {furniture.map((item) => (
        <FurniturePiece
          key={item.id}
          item={item}
          selected={selection?.type === "furniture" && selection.id === item.id}
          colliding={Boolean(collisions[item.id]?.length)}
        />
      ))}
    </group>
  );
}

function FurniturePiece({ item, selected, colliding }: { item: FurnitureInstance; selected: boolean; colliding: boolean }) {
  const walking = useEditorStore((state) => state.mode === "walk");
  const controls = useThree((state) => state.controls) as OrbitControlsLike | null;
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const drag = useRef<{ pointerId: number; offsetX: number; offsetZ: number } | null>(null);
  const gesture = useRef({ x: item.x, z: item.y, rotation: item.rotation, dragging: false });
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const matrix = useMemo(() => new THREE.Matrix4().makeRotationY(-item.rotation).setPosition(item.x, 0, item.y), [item.x, item.y, item.rotation]);
  const handle = Math.max(item.width, item.depth, 0.8) * (coarse ? 1.05 : 0.95);

  const setOrbit = (enabled: boolean) => {
    const orbit = controlsRef.current;
    if (orbit) orbit.enabled = enabled;
  };

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    const release = () => {
      if (!drag.current) return;
      drag.current = null;
      const orbit = controlsRef.current;
      if (orbit) orbit.enabled = true;
      useProjectStore.getState().endGesture();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      release();
    };
  }, []);

  const applyPose = (x: number, planY: number, rotation: number, allowRotationSnap: boolean) => {
    const travel = Math.hypot(x - gesture.current.x, planY - gesture.current.z);
    const turned = Math.abs(rotation - gesture.current.rotation) > 0.01;
    const rotating = allowRotationSnap && turned && travel < 0.08;
    if (travel >= 0.01 || turned) gesture.current.dragging = true;
    if (!gesture.current.dragging) return;
    const state = useProjectStore.getState();
    const current = state.document.furniture.find((entry) => entry.id === item.id);
    if (!current) return;
    const nextX = rotating ? gesture.current.x : x;
    const nextZ = rotating ? gesture.current.z : planY;
    const nextRotation = rotating ? rotation : gesture.current.rotation;
    const snap = {
      enabled: state.document.settings.snapEnabled,
      grid: state.document.settings.gridSize,
      position: !rotating,
      rotation: rotating,
    };
    const preview = { ...current };
    moveFurniture(preview, nextX, nextZ, nextRotation, snap);
    if (preview.x === current.x && preview.y === current.y && preview.rotation === current.rotation) return;
    state.updateLive((document) => {
      const target = document.furniture.find((entry) => entry.id === item.id);
      if (!target) return;
      moveFurniture(target, nextX, nextZ, nextRotation, snap);
    });
  };

  const onFloorDown = (event: ThreeEvent<PointerEvent>) => {
    if (drag.current || useEditorStore.getState().mode === "walk") return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(FLOOR, FLOOR_HIT);
    if (!point) return;
    useEditorStore.getState().setSelection({ type: "furniture", id: item.id });
    gesture.current = { x: item.x, z: item.y, rotation: item.rotation, dragging: false };
    drag.current = { pointerId: event.pointerId, offsetX: item.x - point.x, offsetZ: item.y + point.z };
    setOrbit(false);
    useProjectStore.getState().beginGesture();
    const pointer = event.target as PointerCaptureTarget | null;
    try {
      pointer?.setPointerCapture(event.pointerId);
    } catch {
      // The browser only captures a pointer it still considers active.
    }
  };

  const onFloorMove = (event: ThreeEvent<PointerEvent>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(FLOOR, FLOOR_HIT);
    if (!point) return;
    applyPose(point.x + current.offsetX, -point.z + current.offsetZ, gesture.current.rotation, false);
  };

  const onFloorUp = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    setOrbit(true);
    useProjectStore.getState().endGesture();
    const pointer = event.target as PointerCaptureTarget | null;
    try {
      if (pointer?.hasPointerCapture(event.pointerId)) pointer.releasePointerCapture(event.pointerId);
    } catch {
      // Releasing a pointer the browser already dropped is safe.
    }
  };

  return (
    <group>
      <group position={[item.x, 0, item.y]} rotation={[0, -item.rotation, 0]}>
        <group onPointerDown={onFloorDown} onPointerMove={onFloorMove} onPointerUp={onFloorUp} onPointerCancel={onFloorUp}>
          <ModelBoundary item={item}>
            <GlbModel item={item} />
          </ModelBoundary>
          <mesh position={[0, item.height / 2, 0]}>
            <boxGeometry args={[item.width, item.height, item.depth]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {selected && colliding && !walking ? (
            <mesh position={[0, item.height / 2, 0]}>
              <boxGeometry args={[item.width, item.height, item.depth]} />
              <meshBasicMaterial color="#dc2626" wireframe />
            </mesh>
          ) : null}
        </group>
      </group>
      {selected && !walking ? (
        <PivotControls
          matrix={matrix}
          autoTransform={false}
          disableScaling
          disableSliders
          activeAxes={[true, false, true]}
          scale={handle}
          lineWidth={coarse ? 4 : 2.5}
          depthTest={false}
          axisColors={["#9a3412", "#44403c", "#1d4ed8"]}
          hoveredColor="#111827"
          onDragStart={() => {
            gesture.current = { x: item.x, z: item.y, rotation: item.rotation, dragging: false };
            useProjectStore.getState().beginGesture();
          }}
          onDrag={(local) => {
            local.decompose(POSITION, QUATERNION, SCALE);
            EULER.setFromQuaternion(QUATERNION, "YXZ");
            applyPose(POSITION.x, POSITION.z, -EULER.y, true);
          }}
          onDragEnd={() => useProjectStore.getState().endGesture()}
        />
      ) : null}
    </group>
  );
}

function GlbModel({ item }: { item: FurnitureInstance }) {
  const gltf = useGLTF(item.model);
  const object = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={object} scale={[item.width / item.modelWidth, item.height / item.modelHeight, item.depth / item.modelDepth]} />;
}

class ModelBoundary extends Component<{ item: FurnitureInstance; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <FallbackBox item={this.props.item} />;
    return this.props.children;
  }
}

function FallbackBox({ item }: { item: FurnitureInstance }) {
  return (
    <mesh position={[0, item.height / 2, 0]} castShadow>
      <boxGeometry args={[item.width, item.height, item.depth]} />
      <meshStandardMaterial color={item.color} />
    </mesh>
  );
}
