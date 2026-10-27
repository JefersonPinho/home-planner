import type { Vec2 } from "@/types/scene";

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, k: number): Vec2 {
  return { x: a.x * k, y: a.y * k };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function lengthOf(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalize(a: Vec2): Vec2 {
  const len = lengthOf(a);
  if (len < 1e-9) return { x: 1, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

export function angleOf(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function normalizeAngle(angle: number): number {
  const turn = Math.PI * 2;
  let value = angle % turn;
  if (value <= -Math.PI) value += turn;
  if (value > Math.PI) value -= turn;
  return value;
}

export function samePoint(a: Vec2, b: Vec2, epsilon = 0.001): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}
