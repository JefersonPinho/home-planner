import type { OrbitControls } from "three-stdlib";
import * as THREE from "three";
import type { Bounds } from "@/lib/geometry/bounds";
import type { ViewPreset } from "@/types/editor";

export function applyCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls | null,
  bounds: Bounds,
  preset: ViewPreset,
  viewport: { width: number; height: number },
): void {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minY + bounds.maxY) / 2;
  const spanX = Math.max(bounds.maxX - bounds.minX, 2);
  const spanZ = Math.max(bounds.maxY - bounds.minY, 2);
  const height = Math.max(bounds.maxHeight, 2.4);
  camera.fov = preset === "top" ? 18 : 42;
  const fov = (camera.fov * Math.PI) / 180;
  const aspect = Math.max(viewport.width / Math.max(viewport.height, 1), 0.4);
  const fit = (span: number) => span / 2 / Math.tan(fov / 2);
  const distance = Math.max(fit(spanX) / aspect, fit(spanZ), fit(height), 3.2) * (preset === "top" ? 1.08 : 1.28);
  const target = new THREE.Vector3(centerX, preset === "top" ? 0.02 : Math.min(height * 0.42, 1.4), centerZ);
  const position = new THREE.Vector3();
  if (preset === "top") position.set(centerX, distance, centerZ + distance * 0.012);
  else if (preset === "front") position.set(centerX, height * 0.62, centerZ + distance);
  else if (preset === "back") position.set(centerX, height * 0.62, centerZ - distance);
  else if (preset === "left") position.set(centerX - distance, height * 0.62, centerZ);
  else if (preset === "right") position.set(centerX + distance, height * 0.62, centerZ);
  else if (preset === "dollhouse") position.set(centerX + distance * 0.72, distance * 0.82, centerZ + distance * 0.72);
  else position.set(centerX + distance * 0.7, distance * 0.55, centerZ + distance * 0.7);
  camera.up.set(0, 1, 0);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  if (!controls) return;
  controls.target.copy(target);
  controls.update();
}
