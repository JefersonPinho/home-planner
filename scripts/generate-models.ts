import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FURNITURE_CATALOG } from "../src/features/furniture/catalog";
import { shapeBoxes, type BoxSpec, type Rgba } from "./shapes";

type Primitive = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  color: Rgba;
};

function triNormal(a: number[], b: number[], c: number[]): number[] {
  const ux = (b[0] ?? 0) - (a[0] ?? 0);
  const uy = (b[1] ?? 0) - (a[1] ?? 0);
  const uz = (b[2] ?? 0) - (a[2] ?? 0);
  const vx = (c[0] ?? 0) - (a[0] ?? 0);
  const vy = (c[1] ?? 0) - (a[1] ?? 0);
  const vz = (c[2] ?? 0) - (a[2] ?? 0);
  const x = uy * vz - uz * vy;
  const y = uz * vx - ux * vz;
  const z = ux * vy - uy * vx;
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function addBox(positions: number[], normals: number[], indices: number[], box: BoxSpec): void {
  const hx = box.w / 2;
  const hy = box.h / 2;
  const hz = box.d / 2;
  const x0 = box.cx - hx;
  const x1 = box.cx + hx;
  const y0 = box.cy - hy;
  const y1 = box.cy + hy;
  const z0 = box.cz - hz;
  const z1 = box.cz + hz;
  const faces = [
    [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
    [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]],
    [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]],
    [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]],
    [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]],
    [[x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]],
  ];
  for (const face of faces) {
    const a = face[0] ?? [0, 0, 0];
    const b = face[1] ?? [0, 0, 0];
    const c = face[2] ?? [0, 0, 0];
    const d = face[3] ?? [0, 0, 0];
    let ordered = [a, b, c, d];
    let normal = triNormal(a, b, c);
    const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
    const outward = [mid[0] - box.cx, mid[1] - box.cy, mid[2] - box.cz];
    const facing = normal[0] * outward[0] + normal[1] * outward[1] + normal[2] * outward[2];
    if (facing < 0) {
      ordered = [a, d, c, b];
      normal = triNormal(ordered[0] ?? a, ordered[1] ?? d, ordered[2] ?? c);
    }
    const base = positions.length / 3;
    for (const vertex of ordered) {
      positions.push(vertex[0] ?? 0, vertex[1] ?? 0, vertex[2] ?? 0);
      normals.push(normal[0] ?? 0, normal[1] ?? 0, normal[2] ?? 0);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function primitivesFor(boxes: BoxSpec[]): Primitive[] {
  const groups = new Map<string, { color: Rgba; boxes: BoxSpec[] }>();
  for (const box of boxes) {
    const key = box.color.join(",");
    const group = groups.get(key) ?? { color: box.color, boxes: [] };
    group.boxes.push(box);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    for (const box of group.boxes) addBox(positions, normals, indices, box);
    return {
      positions: Float32Array.from(positions),
      normals: Float32Array.from(normals),
      indices: Uint16Array.from(indices),
      color: group.color,
    };
  });
}

function pad(length: number): number {
  return (4 - (length % 4)) % 4;
}

function encodeGlb(primitives: Primitive[]): Buffer {
  const chunks: Buffer[] = [];
  const bufferViews: { buffer: number; byteOffset: number; byteLength: number }[] = [];
  const accessors: object[] = [];
  const meshPrimitives: object[] = [];
  let offset = 0;
  const push = (data: Buffer) => {
    const padding = pad(offset);
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      offset += padding;
    }
    const view = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.length });
    chunks.push(data);
    offset += data.length;
    return view;
  };

  primitives.forEach((primitive, material) => {
    const positionBuffer = Buffer.from(primitive.positions.buffer, primitive.positions.byteOffset, primitive.positions.byteLength);
    const normalBuffer = Buffer.from(primitive.normals.buffer, primitive.normals.byteOffset, primitive.normals.byteLength);
    const indexBuffer = Buffer.from(primitive.indices.buffer, primitive.indices.byteOffset, primitive.indices.byteLength);
    const positionView = push(positionBuffer);
    const count = primitive.positions.length / 3;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let index = 0; index < count; index += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = primitive.positions[index * 3 + axis] ?? 0;
        min[axis] = Math.min(min[axis] ?? Infinity, value);
        max[axis] = Math.max(max[axis] ?? -Infinity, value);
      }
    }
    const positionAccessor = accessors.length;
    accessors.push({ bufferView: positionView, componentType: 5126, count, type: "VEC3", min, max });
    const normalAccessor = accessors.length;
    accessors.push({ bufferView: push(normalBuffer), componentType: 5126, count, type: "VEC3" });
    const indexAccessor = accessors.length;
    accessors.push({ bufferView: push(indexBuffer), componentType: 5123, count: primitive.indices.length, type: "SCALAR" });
    meshPrimitives.push({
      attributes: { POSITION: positionAccessor, NORMAL: normalAccessor },
      indices: indexAccessor,
      material,
    });
  });

  const endPad = pad(offset);
  if (endPad) {
    chunks.push(Buffer.alloc(endPad));
    offset += endPad;
  }
  const bin = Buffer.concat(chunks);
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0", generator: "planta" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: meshPrimitives }],
      materials: primitives.map((primitive) => ({
        doubleSided: true,
        alphaMode: primitive.color[3] < 0.999 ? "BLEND" : "OPAQUE",
        pbrMetallicRoughness: {
          baseColorFactor: primitive.color,
          metallicFactor: 0,
          roughnessFactor: 0.8,
        },
      })),
      buffers: [{ byteLength: bin.length }],
      bufferViews,
      accessors,
    }),
  );
  const jsonPadding = pad(json.length);
  const jsonChunk = jsonPadding ? Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]) : json;
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
  const file = Buffer.alloc(total);
  let cursor = 0;
  file.writeUInt32LE(0x46546c67, cursor);
  cursor += 4;
  file.writeUInt32LE(2, cursor);
  cursor += 4;
  file.writeUInt32LE(total, cursor);
  cursor += 4;
  file.writeUInt32LE(jsonChunk.length, cursor);
  cursor += 4;
  file.writeUInt32LE(0x4e4f534a, cursor);
  cursor += 4;
  jsonChunk.copy(file, cursor);
  cursor += jsonChunk.length;
  file.writeUInt32LE(bin.length, cursor);
  cursor += 4;
  file.writeUInt32LE(0x004e4942, cursor);
  cursor += 4;
  bin.copy(file, cursor);
  return file;
}

async function main(): Promise<void> {
  const output = path.join(process.cwd(), "public", "models");
  await mkdir(output, { recursive: true });
  for (const item of FURNITURE_CATALOG) {
    const boxes = shapeBoxes(item.shape, item.width, item.depth, item.height, item.color);
    const file = encodeGlb(primitivesFor(boxes));
    await writeFile(path.join(output, `${item.id}.glb`), file);
  }
  console.log(`generated ${FURNITURE_CATALOG.length} models`);
}

void main();
