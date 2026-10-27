"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { leaveHouse } from "@/features/walk/enter";
import { EYE_HEIGHT, LOOK_LIMIT, OPEN_ANGLE, RUN_SPEED, WALK_SPEED, obstaclePolygons, slide } from "@/features/walk/motion";
import { doorAngles, isDoorOpen, nearestDoor, stepDoors, toggleDoor, walkInput } from "@/features/walk/session";
import { pointAlongWall } from "@/lib/geometry/polygon";
import { useProjectStore } from "@/stores/project-store";
import { useWalkStore } from "@/stores/walk-store";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function WalkController() {
  const gl = useThree((state) => state.gl);
  const velocity = useRef({ x: 0, z: 0 });
  const cameraRef = useRef<THREE.Camera | null>(null);
  const scene = useProjectStore((state) => state.document);

  useEffect(() => {
    return () => {
      const camera = cameraRef.current;
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      camera.fov = 42;
      camera.near = 0.05;
      camera.updateProjectionMatrix();
    };
  }, []);

  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.key === "Escape") {
        if (document.pointerLockElement) return;
        leaveHouse();
        return;
      }
      if (event.key.toLowerCase() === "e" && !event.repeat) {
        const doorId = useWalkStore.getState().interactId;
        if (doorId) toggleDoor(doorId);
      }
      if (event.code.startsWith("Key") || event.code.startsWith("Arrow") || event.code.startsWith("Shift")) event.preventDefault();
      walkInput.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      walkInput.keys.delete(event.code);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button === 0) {
        if (document.pointerLockElement !== element) void Promise.resolve(element.requestPointerLock()).catch(() => undefined);
        return;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement === element) {
        walkInput.lookX += event.movementX;
        walkInput.lookY += event.movementY;
        return;
      }
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      if (previous.x < window.innerWidth * 0.46) {
        previous.x = event.clientX;
        previous.y = event.clientY;
        return;
      }
      walkInput.lookX += event.clientX - previous.x;
      walkInput.lookY += event.clientY - previous.y;
      previous.x = event.clientX;
      previous.y = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
    };
    const releaseKeys = () => walkInput.keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseKeys);
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseKeys);
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      walkInput.keys.clear();
      walkInput.axisX = 0;
      walkInput.axisY = 0;
      walkInput.run = false;
    };
  }, [gl]);

  useFrame((state, delta) => {
    const camera = state.camera;
    cameraRef.current = camera;
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== 68) {
      camera.fov = 68;
      camera.near = 0.08;
      camera.updateProjectionMatrix();
    }
    const dt = Math.min(delta, 0.05);
    stepDoors(dt, OPEN_ANGLE);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lookScale = coarse ? 0.0048 : 0.0026;
    walkInput.yaw -= walkInput.lookX * lookScale;
    walkInput.pitch = Math.min(LOOK_LIMIT, Math.max(-LOOK_LIMIT, walkInput.pitch - walkInput.lookY * lookScale));
    walkInput.lookX = 0;
    walkInput.lookY = 0;

    let forward = 0;
    let strafe = 0;
    if (walkInput.keys.has("KeyW") || walkInput.keys.has("ArrowUp")) forward += 1;
    if (walkInput.keys.has("KeyS") || walkInput.keys.has("ArrowDown")) forward -= 1;
    if (walkInput.keys.has("KeyA") || walkInput.keys.has("ArrowLeft")) strafe -= 1;
    if (walkInput.keys.has("KeyD") || walkInput.keys.has("ArrowRight")) strafe += 1;
    forward += walkInput.axisY;
    strafe += walkInput.axisX;
    const magnitude = Math.hypot(forward, strafe);
    if (magnitude > 1) {
      forward /= magnitude;
      strafe /= magnitude;
    }
    const yaw = walkInput.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const running = walkInput.run || walkInput.keys.has("ShiftLeft") || walkInput.keys.has("ShiftRight");
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const desiredX = (fx * forward + Math.cos(yaw) * strafe) * speed;
    const desiredZ = (-fz * forward + Math.sin(yaw) * strafe) * speed;
    const blend = 1 - Math.exp(-14 * dt);
    velocity.current.x += (desiredX - velocity.current.x) * blend;
    velocity.current.z += (desiredZ - velocity.current.z) * blend;
    const beforeX = walkInput.x;
    const beforeZ = walkInput.z;
    const next = slide(
      { x: beforeX, y: beforeZ },
      { x: velocity.current.x * dt, y: velocity.current.z * dt },
      obstaclePolygons(scene, doorAngles()),
    );
    if (Math.hypot(next.x - (beforeX + velocity.current.x * dt), next.y - (beforeZ + velocity.current.z * dt)) > 0.012) {
      velocity.current.x *= 0.35;
      velocity.current.z *= 0.35;
    }
    walkInput.x = next.x;
    walkInput.z = next.y;
    camera.rotation.order = "YXZ";
    camera.rotation.y = walkInput.yaw;
    camera.rotation.x = walkInput.pitch;
    camera.position.set(walkInput.x, EYE_HEIGHT, -walkInput.z);

    const doors = scene.openings.flatMap((opening) => {
      if (opening.kind !== "door") return [];
      const wall = scene.walls.find((entry) => entry.id === opening.wallId);
      if (!wall) return [];
      const center = pointAlongWall(wall, opening.offset);
      return [{ id: opening.id, x: center.x, y: center.y }];
    });
    const near = nearestDoor({ x: walkInput.x, y: walkInput.z }, doors);
    useWalkStore.getState().setInteract(near, near ? isDoorOpen(near) : false);
  });

  return null;
}
