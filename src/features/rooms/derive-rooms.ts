import { closestPointOnSegment, polygonArea, polygonCentroid } from "@/lib/geometry/polygon";
import { distance, normalizeAngle } from "@/lib/geometry/vec";
import type { Vec2, Wall } from "@/types/scene";

export type DerivedRoom = {
  id: string;
  name: string;
  polygon: Vec2[];
  area: number;
  centroid: Vec2;
  color: string;
};

const COLORS = ["#e7f0e8", "#e8eef8", "#f6efe4", "#f3e8ee", "#e7f2f2", "#f4f0e4"];

type GraphEdge = {
  to: string;
  angle: number;
};

let cacheKey = "";
let cacheValue: DerivedRoom[] = [];

function clusterKey(point: Vec2, clusters: Vec2[]): string {
  for (let index = 0; index < clusters.length; index += 1) {
    const cluster = clusters[index];
    if (cluster && distance(cluster, point) <= 0.02) return String(index);
  }
  clusters.push(point);
  return String(clusters.length - 1);
}

function stationsOnWall(wall: Wall, walls: Wall[]): Vec2[] {
  const points = [wall.a, wall.b];
  for (const other of walls) {
    if (other.id === wall.id) continue;
    for (const end of [other.a, other.b]) {
      const closest = closestPointOnSegment(end, wall.a, wall.b);
      if (closest.distance <= 0.02 && closest.t > 0.02 && closest.t < 0.98) points.push(closest.point);
    }
  }
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  points.sort((first, second) => (first.x - wall.a.x) * dx + (first.y - wall.a.y) * dy - ((second.x - wall.a.x) * dx + (second.y - wall.a.y) * dy));
  const unique: Vec2[] = [];
  for (const point of points) {
    if (!unique.some((existing) => distance(existing, point) <= 0.02)) unique.push(point);
  }
  return unique;
}

function nextClockwise(outgoing: GraphEdge[], arrivalAngle: number): GraphEdge | null {
  if (outgoing.length === 0) return null;
  const incoming = normalizeAngle(arrivalAngle + Math.PI);
  let best: GraphEdge | null = null;
  let bestDelta = Infinity;
  for (const edge of outgoing) {
    let delta = normalizeAngle(incoming - edge.angle);
    if (delta < 0) delta += Math.PI * 2;
    if (delta > 1e-4 && delta < bestDelta) {
      bestDelta = delta;
      best = edge;
    }
  }
  return best ?? outgoing[0] ?? null;
}

export function deriveRooms(walls: Wall[]): DerivedRoom[] {
  const key = walls.map((wall) => `${wall.a.x.toFixed(3)},${wall.a.y.toFixed(3)},${wall.b.x.toFixed(3)},${wall.b.y.toFixed(3)}`).join("|");
  if (key === cacheKey) return cacheValue;

  const clusters: Vec2[] = [];
  const adjacency = new Map<string, GraphEdge[]>();
  const addEdge = (from: string, to: string, angle: number) => {
    const list = adjacency.get(from) ?? [];
    if (!list.some((edge) => edge.to === to)) list.push({ to, angle });
    adjacency.set(from, list);
  };

  for (const wall of walls) {
    clusterKey(wall.a, clusters);
    clusterKey(wall.b, clusters);
  }

  for (const wall of walls) {
    if (distance(wall.a, wall.b) < 0.05) continue;
    const stations = stationsOnWall(wall, walls);
    for (let index = 0; index < stations.length - 1; index += 1) {
      const startPoint = stations[index];
      const endPoint = stations[index + 1];
      if (!startPoint || !endPoint || distance(startPoint, endPoint) < 0.05) continue;
      const start = clusterKey(startPoint, clusters);
      const end = clusterKey(endPoint, clusters);
      if (start === end) continue;
      addEdge(start, end, Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x));
      addEdge(end, start, Math.atan2(startPoint.y - endPoint.y, startPoint.x - endPoint.x));
    }
  }

  const used = new Set<string>();
  const faces: Vec2[][] = [];
  for (const [from, edges] of adjacency) {
    for (const edge of edges) {
      const startId = `${from}>${edge.to}`;
      if (used.has(startId)) continue;
      const polygon: Vec2[] = [];
      let current = from;
      let next = edge.to;
      let guard = 0;
      while (guard < 80) {
        guard += 1;
        const mark = `${current}>${next}`;
        if (used.has(mark)) break;
        used.add(mark);
        const point = clusters[Number(current)];
        if (point) polygon.push(point);
        if (next === from && polygon.length > 2) break;
        const arrival = Math.atan2(
          (clusters[Number(next)]?.y ?? 0) - (clusters[Number(current)]?.y ?? 0),
          (clusters[Number(next)]?.x ?? 0) - (clusters[Number(current)]?.x ?? 0),
        );
        const following = nextClockwise(adjacency.get(next) ?? [], arrival);
        if (!following) break;
        current = next;
        next = following.to;
      }
      if (polygon.length >= 3) {
        const area = polygonArea(polygon);
        if (area > 0.25) faces.push(polygon);
      }
    }
  }

  const unique: Vec2[][] = [];
  for (const face of faces) {
    const signature = face
      .map((point) => `${Math.round(point.x * 50)},${Math.round(point.y * 50)}`)
      .sort()
      .join(";");
    if (unique.some((existing) => existing.map((point) => `${Math.round(point.x * 50)},${Math.round(point.y * 50)}`).sort().join(";") === signature)) {
      continue;
    }
    unique.push(face);
  }

  let rooms = unique.map((polygon) => ({ polygon, area: polygonArea(polygon) }));
  if (rooms.length > 1) {
    const largest = Math.max(...rooms.map((room) => room.area));
    const others = rooms.filter((room) => room.area < largest - 0.05).reduce((sum, room) => sum + room.area, 0);
    if (others > 0 && Math.abs(largest - others) < Math.max(0.4, largest * 0.08)) {
      rooms = rooms.filter((room) => room.area < largest - 0.05);
    }
  }

  cacheValue = rooms.map((room, index) => {
    const centroid = polygonCentroid(room.polygon);
    return {
      id: `derived-${centroid.x.toFixed(2)}-${centroid.y.toFixed(2)}-${room.area.toFixed(2)}`,
      name: "Cômodo",
      polygon: room.polygon,
      area: room.area,
      centroid,
      color: COLORS[index % COLORS.length] ?? "#e7f0e8",
    };
  });
  cacheKey = key;
  return cacheValue;
}
