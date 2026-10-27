import { wallFootprint, wallVolumes } from "../src/lib/geometry/wall-join";
import { presentRooms } from "../src/features/rooms/present";
import { splitAtJunctions } from "../src/features/walls/junctions";
import { createEmptyDocument } from "../src/lib/document";
import { sceneDocumentSchema } from "../src/lib/validation/scene";
import { deriveRooms } from "../src/features/rooms/derive-rooms";
import { snapPoint } from "../src/lib/snapping/snap";
import { moveFurniture } from "../src/features/furniture/transform";
import { findSpawn, isWalkable, obstaclePolygons, slide } from "../src/features/walk/motion";
import { furnitureCollisions } from "../src/lib/collisions/collisions";
import type { Door, SceneDocument, Wall } from "../src/types/scene";

function wall(id: string, x1: number, y1: number, x2: number, y2: number): Wall {
  return { id, a: { x: x1, y: y1 }, b: { x: x2, y: y2 }, height: 2.8, thickness: 0.15 };
}

const walls = [wall("1", 0, 0, 4.5, 0), wall("2", 4.5, 0, 4.5, 3.2), wall("3", 4.5, 3.2, 0, 3.2), wall("4", 0, 3.2, 0, 0)];
const rooms = deriveRooms(walls);
if (rooms.length !== 1 || Math.abs((rooms[0]?.area ?? 0) - 14.4) > 0.15) {
  console.error("room area", rooms);
  process.exit(1);
}

const endpoint = snapPoint({ x: 4.52, y: 0.02 }, walls, { gridSize: 0.1, snapEnabled: true, zoom: 60 });
if (endpoint.kind !== "endpoint" || Math.abs(endpoint.point.x - 4.5) > 0.001) {
  console.error("endpoint snap", endpoint);
  process.exit(1);
}

const angled = snapPoint({ x: 12.04, y: 10.05 }, [], {
  gridSize: 0.1,
  snapEnabled: true,
  zoom: 40,
  anchor: { x: 10, y: 10 },
});
if (angled.kind !== "angle" || Math.abs(angled.point.y - 10) > 0.001 || Math.abs(angled.point.x - 12) > 0.001) {
  console.error("angle snap", angled);
  process.exit(1);
}

sceneDocumentSchema.parse(createEmptyDocument());

const document: SceneDocument = {
  ...createEmptyDocument(),
  walls,
  furniture: [
    {
      id: "bed",
      catalogId: "cama-casal",
      name: "Cama casal",
      model: "/models/cama-casal.glb",
      color: "#fff",
      x: 2,
      y: 1.6,
      rotation: 0,
      width: 1.38,
      depth: 1.88,
      height: 0.6,
      modelWidth: 1.38,
      modelDepth: 1.88,
      modelHeight: 0.6,
    },
  ],
};
const flags = furnitureCollisions(document);
if (flags.bed?.includes("outside")) {
  console.error("bed should sit inside the room", flags);
  process.exit(1);
}

const footprint = wallFootprint(walls[0]!, walls);
const outerX = footprint.endRight.x;
const innerX = footprint.endLeft.x;
if (outerX < 4.5 || innerX > 4.5 || Math.abs(footprint.endRight.y + 0.075) > 0.02 || Math.abs(footprint.endLeft.y - 0.075) > 0.02) {
  console.error("wall miter", footprint);
  process.exit(1);
}

const metrics = presentRooms(walls);
const useful = metrics[0]?.usefulArea ?? 0;
const external = metrics[0]?.externalArea ?? 0;
if (Math.abs(useful - 4.35 * 3.05) > 0.08 || Math.abs(external - 4.65 * 3.35) > 0.08) {
  console.error("internal/external area", useful, external, metrics[0]);
  process.exit(1);
}

const divided = [
  wall("a", 0, 0, 6, 0),
  wall("b", 6, 0, 6, 3),
  wall("c", 6, 3, 0, 3),
  wall("d", 0, 3, 0, 0),
  wall("e", 3, 0, 3, 3),
];
const dividedRooms = deriveRooms(divided);
if (dividedRooms.length !== 2 || dividedRooms.some((room) => Math.abs(room.area - 9) > 0.2)) {
  console.error("shared rooms", dividedRooms);
  process.exit(1);
}

const door: Door = {
  id: "door",
  kind: "door",
  wallId: "1",
  offset: 2.25,
  width: 0.8,
  height: 2.1,
  swing: "left",
  flip: false,
};
const volumes = wallVolumes(walls[0]!, walls, [door]);
const lintel = volumes.find((volume) => volume.bottom >= 2 && volume.top === 2.8);
const pierced = volumes.some((volume) => volume.bottom === 0 && volume.top === 2.8 && volume.polygon.some((point) => point.x > 2.2 && point.x < 2.3 && Math.abs(point.y) < 0.2));
if (!lintel || pierced) {
  console.error("door opening", volumes.map((volume) => [volume.bottom, volume.top]));
  process.exit(1);
}

const joined = createEmptyDocument();
joined.walls = [wall("h", 0, 0, 4, 0), wall("s", 2, 0, 2, 2)];
joined.openings = [{ ...door, id: "moved", wallId: "h", offset: 3, width: 0.8 }];
if (!splitAtJunctions(joined) || joined.walls.length !== 3) {
  console.error("junction split", joined.walls);
  process.exit(1);
}
const moved = joined.openings[0];
if (!moved || moved.wallId === "h" || Math.abs(moved.offset - 1) > 0.02) {
  console.error("opening followed the split", moved);
  process.exit(1);
}

const placed = { ...document.furniture[0]! };
moveFurniture(placed, 2.04, 1.56, Math.PI / 10, { enabled: true, grid: 0.1, position: true, rotation: true });
if (placed.width !== 1.38 || placed.depth !== 1.88 || placed.height !== 0.6 || Math.abs(placed.x - 2) > 0.001 || Math.abs(placed.y - 1.6) > 0.001 || Math.abs(placed.rotation - 0.262) > 0.001) {
  console.error("furniture pose", placed);
  process.exit(1);
}

const house: SceneDocument = { ...document, openings: [door] };
const spawn = findSpawn(house);
const closed = obstaclePolygons(house, new Map());
const opened = obstaclePolygons(house, new Map([[door.id, 1.2]]));
const intoWall = spawn ? slide(spawn, { x: 0, y: -6 }, closed) : null;
const doorway = { x: 2.25, y: 0 };
const pastBed = slide({ x: 2, y: 0.35 }, { x: 0, y: 2 }, closed);
if (
  !spawn ||
  spawn.x < 0.3 ||
  spawn.x > 4.2 ||
  spawn.y < 0.3 ||
  spawn.y > 2.9 ||
  !intoWall ||
  intoWall.y < 0.28 ||
  isWalkable(doorway, closed) ||
  !isWalkable(doorway, opened) ||
  pastBed.y > 0.85
) {
  console.error("walk", { spawn, intoWall, doorwayClosed: isWalkable(doorway, closed), doorwayOpen: isWalkable(doorway, opened), pastBed });
  process.exit(1);
}

console.log("geometry ok", rooms[0]?.area.toFixed(2), useful.toFixed(2));
