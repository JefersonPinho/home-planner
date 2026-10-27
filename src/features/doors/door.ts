import { newId } from "@/lib/id";
import { closestPointOnSegment } from "@/lib/geometry/polygon";
import { distance } from "@/lib/geometry/vec";
import type { Door, Vec2, Wall } from "@/types/scene";

export function createDoor(wall: Wall, point: Vec2): Door | null {
  const length = distance(wall.a, wall.b);
  if (length < 0.4) return null;
  const closest = closestPointOnSegment(point, wall.a, wall.b);
  if (closest.distance > Math.max(wall.thickness, 0.35)) return null;
  const width = Math.min(0.8, length - 0.08);
  const offset = Math.min(Math.max(closest.t * length, width / 2), length - width / 2);
  return {
    id: newId(),
    kind: "door",
    wallId: wall.id,
    offset,
    width,
    height: Math.min(2.1, wall.height),
    swing: "left",
    flip: false,
  };
}
