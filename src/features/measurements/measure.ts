import { newId } from "@/lib/id";
import { distance } from "@/lib/geometry/vec";
import type { Measurement, Vec2 } from "@/types/scene";

export function createMeasurement(a: Vec2, b: Vec2): Measurement | null {
  if (distance(a, b) < 0.02) return null;
  return { id: newId(), a: { ...a }, b: { ...b } };
}

export function measurementLength(measurement: Measurement): number {
  return distance(measurement.a, measurement.b);
}
