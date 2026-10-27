import { deriveRooms } from "@/features/rooms/derive-rooms";
import { solidIntervals } from "@/features/walls/intervals";
import { distancePointToPolygon, furnitureCorners, polygonsOverlap, segmentQuad } from "@/lib/geometry/polygon";
import type { FurnitureInstance, SceneDocument } from "@/types/scene";

export type CollisionFlag = "wall" | "furniture" | "outside";

export function furnitureCollisions(document: SceneDocument): Record<string, CollisionFlag[]> {
  const result: Record<string, CollisionFlag[]> = {};
  const rooms = deriveRooms(document.walls);
  const wallQuads = document.walls.flatMap((wall) =>
    solidIntervals(wall, document.openings).map((interval) => segmentQuad(wall, interval.start, interval.end)),
  );

  for (const item of document.furniture) {
    const flags = new Set<CollisionFlag>();
    const corners = furnitureCorners(item, 0.025);
    for (const quad of wallQuads) {
      if (polygonsOverlap(corners, quad)) {
        flags.add("wall");
        break;
      }
    }
    for (const other of document.furniture) {
      if (other.id === item.id) continue;
      if (polygonsOverlap(corners, furnitureCorners(other, 0.025))) {
        flags.add("furniture");
        break;
      }
    }
    if (rooms.length > 0 && isOutside(item, rooms.map((room) => room.polygon))) {
      flags.add("outside");
    }
    if (flags.size > 0) result[item.id] = [...flags];
  }
  return result;
}

function isOutside(item: FurnitureInstance, polygons: { x: number; y: number }[][]): boolean {
  const corners = furnitureCorners(item, 0);
  return corners.some((corner) =>
    polygons.every((polygon) => distancePointToPolygon(corner, polygon) > 0.08),
  );
}
