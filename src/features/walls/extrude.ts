import * as THREE from "three";
import type { Vec2 } from "@/types/scene";

export function extrudeSlabs(slabs: { polygon: Vec2[]; bottom: number; top: number }[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const slab of slabs) {
    const polygon = slab.polygon;
    if (polygon.length < 3 || slab.top - slab.bottom < 0.01) continue;
    const bottom = polygon.map((point) => new THREE.Vector3(point.x, slab.bottom, point.y));
    const top = polygon.map((point) => new THREE.Vector3(point.x, slab.top, point.y));
    const up = new THREE.Vector3(0, 1, 0);
    const down = new THREE.Vector3(0, -1, 0);
    addFace(positions, normals, bottom, down);
    addFace(positions, normals, [...top].reverse(), up);
    for (let index = 0; index < polygon.length; index += 1) {
      const next = (index + 1) % polygon.length;
      const a = bottom[index];
      const b = bottom[next];
      const c = top[next];
      const d = top[index];
      if (!a || !b || !c || !d) continue;
      const edge = new THREE.Vector3().subVectors(b, a);
      const normal = new THREE.Vector3(-edge.z, 0, edge.x).normalize();
      pushTriangle(positions, normals, a, b, c, normal);
      pushTriangle(positions, normals, a, c, d, normal);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function addFace(positions: number[], normals: number[], ring: THREE.Vector3[], normal: THREE.Vector3): void {
  const first = ring[0];
  if (!first) return;
  for (let index = 1; index < ring.length - 1; index += 1) {
    const b = ring[index];
    const c = ring[index + 1];
    if (!b || !c) continue;
    pushTriangle(positions, normals, first, b, c, normal);
  }
}

function pushTriangle(
  positions: number[],
  normals: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  normal: THREE.Vector3,
): void {
  for (const point of [a, b, c]) {
    positions.push(point.x, point.y, point.z);
    normals.push(normal.x, normal.y, normal.z);
  }
}
