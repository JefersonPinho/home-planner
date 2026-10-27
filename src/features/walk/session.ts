type Leaf = {
  rotation: { y: number };
  userData: { swingSign?: number };
};

const leaves = new Map<string, Leaf>();
const angles = new Map<string, number>();
const open = new Set<string>();

export const walkInput = {
  x: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  axisX: 0,
  axisY: 0,
  run: false,
  lookX: 0,
  lookY: 0,
  keys: new Set<string>(),
};

export function registerDoorLeaf(id: string, leaf: Leaf | null): void {
  if (leaf) leaves.set(id, leaf);
  else leaves.delete(id);
}

export function doorAngles(): ReadonlyMap<string, number> {
  return angles;
}

export function isDoorOpen(id: string): boolean {
  return open.has(id);
}

export function toggleDoor(id: string): void {
  if (open.has(id)) open.delete(id);
  else open.add(id);
}

export function resetWalkSession(): void {
  open.clear();
  angles.clear();
  walkInput.axisX = 0;
  walkInput.axisY = 0;
  walkInput.run = false;
  walkInput.lookX = 0;
  walkInput.lookY = 0;
  walkInput.pitch = 0;
  walkInput.keys.clear();
  for (const leaf of leaves.values()) leaf.rotation.y = 0;
}

export function stepDoors(delta: number, openAngle: number): void {
  const speed = 2.6;
  for (const [id, leaf] of leaves) {
    const sign = leaf.userData.swingSign ?? 1;
    const target = open.has(id) ? openAngle : 0;
    const current = angles.get(id) ?? 0;
    const gap = target - current;
    const next = current + Math.sign(gap) * Math.min(Math.abs(gap), speed * delta);
    angles.set(id, next);
    leaf.rotation.y = sign * next;
  }
}

export function nearestDoor(
  position: { x: number; y: number },
  doors: { id: string; x: number; y: number }[],
  reach = 1.55,
): string | null {
  let best: string | null = null;
  let bestDistance = reach;
  for (const door of doors) {
    const distance = Math.hypot(door.x - position.x, door.y - position.y);
    if (distance < bestDistance) {
      best = door.id;
      bestDistance = distance;
    }
  }
  return best;
}
