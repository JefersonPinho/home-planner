"use client";

import { useEffect, useRef } from "react";
import { addMeasurement, addWall, placeOpening } from "@/features/editor/actions";
import { roomAtPoint } from "@/features/rooms/present";
import { splitAtJunctions } from "@/features/walls/junctions";
import { hitTest } from "@/features/editor/hit-test";
import { setPlanViewport } from "@/features/editor/viewport";
import { paintPlan } from "@/components/canvas-2d/paint-plan";
import { clamp, roundMm } from "@/lib/format";
import { snapPoint } from "@/lib/snapping/snap";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import type { Vec2 } from "@/types/scene";

type Drag =
  | { kind: "pan"; sx: number; sy: number; camX: number; camY: number; roomId: string | null }
  | { kind: "pinch"; dist: number; zoom: number; midX: number; midY: number }
  | { kind: "furniture"; id: string; ox: number; oy: number }
  | { kind: "wall"; id: string; a: Vec2; b: Vec2; wx: number; wy: number }
  | { kind: "endpoint"; id: string; end: "a" | "b" }
  | { kind: "rotate"; id: string };

const pointers = new Map<number, { x: number; y: number }>();
const keys = { space: false };

export function PlanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const hoverRef = useRef<string | null>(null);
  const readRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let frame = 0;
    const paint = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (width < 2 || height < 2) {
        schedule();
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      setPlanViewport(width, height);
      const project = useProjectStore.getState();
      const editor = useEditorStore.getState();
      paintPlan(context, {
        document: project.document,
        camera: editor.camera,
        selection: editor.selection,
        wallDraft: editor.wallDraft,
        measureDraft: editor.measureDraft,
        cursor: editor.cursor,
        snap: editor.snap,
        hoverId: hoverRef.current,
        width,
        height,
        dpr,
        interactive: true,
      });
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        paint();
      });
    };
    paint();
    const stopProject = useProjectStore.subscribe(schedule);
    const stopEditor = useEditorStore.subscribe(schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(wrap);
    window.addEventListener("resize", schedule);
    return () => {
      stopProject();
      stopEditor();
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rectOf = () => canvas.getBoundingClientRect();
    const worldAt = (clientX: number, clientY: number): Vec2 => {
      const rect = rectOf();
      const camera = useEditorStore.getState().camera;
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - rect.width / 2) / camera.zoom + camera.x,
        y: camera.y - (sy - rect.height / 2) / camera.zoom,
      };
    };
    const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
      const rect = rectOf();
      const camera = useEditorStore.getState().camera;
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const before = worldAt(clientX, clientY);
      const zoom = clamp(nextZoom, 12, 280);
      useEditorStore.getState().setCamera({
        zoom,
        x: before.x - (sx - rect.width / 2) / zoom,
        y: before.y + (sy - rect.height / 2) / zoom,
      });
      void camera;
    };
    const snapped = (point: Vec2, anchor?: Vec2, excludeWallId?: string) => {
      const project = useProjectStore.getState();
      const editor = useEditorStore.getState();
      return snapPoint(point, project.document.walls, {
        gridSize: project.document.settings.gridSize,
        snapEnabled: project.document.settings.snapEnabled,
        zoom: editor.camera.zoom,
        anchor,
        excludeWallId,
      });
    };
    const updateReadout = (point: Vec2 | null) => {
      if (!readRef.current) return;
      readRef.current.textContent = point
        ? `${point.x.toFixed(2).replace(".", ",")} m    ${point.y.toFixed(2).replace(".", ",")} m`
        : "";
    };

    const onPointerDown = (event: PointerEvent) => {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // The pointer can already be gone on very fast taps.
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        if (!first || !second) return;
        if (dragRef.current && dragRef.current.kind !== "pan" && dragRef.current.kind !== "pinch") {
          useProjectStore.getState().endGesture();
        }
        dragRef.current = {
          kind: "pinch",
          dist: Math.hypot(first.x - second.x, first.y - second.y),
          zoom: useEditorStore.getState().camera.zoom,
          midX: (first.x + second.x) / 2,
          midY: (first.y + second.y) / 2,
        };
        return;
      }
      const world = worldAt(event.clientX, event.clientY);
      const editor = useEditorStore.getState();
      const project = useProjectStore.getState();
      if (event.button === 1 || event.button === 2 || keys.space || editor.tool === "pan") {
        dragRef.current = { kind: "pan", sx: event.clientX, sy: event.clientY, camX: editor.camera.x, camY: editor.camera.y, roomId: null };
        return;
      }
      if (event.button !== 0) return;

      if (editor.tool === "wall") {
        const anchor = editor.wallDraft?.a;
        const hit = snapped(world, anchor);
        editor.setSnap(hit);
        if (!editor.wallDraft) editor.setWallDraft({ a: hit.point, b: hit.point });
        else if (addWall(editor.wallDraft.a, hit.point)) editor.setWallDraft({ a: hit.point, b: hit.point });
        return;
      }
      if (editor.tool === "door" || editor.tool === "window") {
        placeOpening(editor.tool, world);
        return;
      }
      if (editor.tool === "measure") {
        const hit = snapped(world, editor.measureDraft ?? undefined);
        if (!editor.measureDraft) editor.setMeasureDraft(hit.point);
        else {
          addMeasurement(editor.measureDraft, hit.point);
          editor.setMeasureDraft(null);
        }
        return;
      }

      const hit = hitTest(project.document, world, editor.camera.zoom, editor.selection);
      if (!hit) {
        const room = roomAtPoint(project.document.walls, world, project.document.rooms);
        dragRef.current = {
          kind: "pan",
          sx: event.clientX,
          sy: event.clientY,
          camX: editor.camera.x,
          camY: editor.camera.y,
          roomId: room?.id ?? null,
        };
        return;
      }
      if (hit.type === "rotate" || hit.type === "furniture" || hit.type === "wall" || hit.type === "endpoint") {
        useProjectStore.getState().beginGesture();
      }
      if (hit.type === "furniture" || hit.type === "rotate") editor.setSelection({ type: "furniture", id: hit.id });
      if (hit.type === "wall" || hit.type === "endpoint") editor.setSelection({ type: "wall", id: hit.id });
      if (hit.type === "opening") editor.setSelection({ type: "opening", id: hit.id });
      if (hit.type === "measurement") editor.setSelection({ type: "measurement", id: hit.id });

      if (hit.type === "furniture") {
        const item = project.document.furniture.find((entry) => entry.id === hit.id);
        if (!item) return;
        dragRef.current = { kind: "furniture", id: item.id, ox: item.x - world.x, oy: item.y - world.y };
      } else if (hit.type === "rotate") {
        dragRef.current = { kind: "rotate", id: hit.id };
      } else if (hit.type === "endpoint") {
        dragRef.current = { kind: "endpoint", id: hit.id, end: hit.end };
      } else if (hit.type === "wall") {
        dragRef.current = { kind: "wall", id: hit.id, a: { ...project.document.walls.find((wall) => wall.id === hit.id)!.a }, b: { ...project.document.walls.find((wall) => wall.id === hit.id)!.b }, wx: world.x, wy: world.y };
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const world = worldAt(event.clientX, event.clientY);
      updateReadout(world);
      const editorNow = useEditorStore.getState();
      const hit = hitTest(useProjectStore.getState().document, world, editorNow.camera.zoom, editorNow.selection);
      hoverRef.current = hit && (hit.type === "furniture" || hit.type === "wall" || hit.type === "opening") ? hit.id : null;
      canvas.style.cursor = cursorFor(editorNow.tool, keys.space, hoverRef.current, dragRef.current?.kind === "pan");
      useEditorStore.getState().setCursor(world);
      const drag = dragRef.current;
      if (drag?.kind === "pinch" && pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        if (!first || !second) return;
        const dist = Math.hypot(first.x - second.x, first.y - second.y) || 1;
        const midX = (first.x + second.x) / 2;
        const midY = (first.y + second.y) / 2;
        const zoom = clamp(drag.zoom * (dist / Math.max(drag.dist, 1)), 12, 280);
        zoomAt(midX, midY, zoom);
        const camera = useEditorStore.getState().camera;
        useEditorStore.getState().setCamera({
          ...camera,
          x: camera.x - (midX - drag.midX) / zoom,
          y: camera.y + (midY - drag.midY) / zoom,
        });
        drag.midX = midX;
        drag.midY = midY;
        drag.dist = dist;
        drag.zoom = zoom;
        return;
      }
      if (!drag) {
        const editor = useEditorStore.getState();
        if (editor.tool === "wall" && editor.wallDraft) {
          const hit = snapped(world, editor.wallDraft.a);
          editor.setSnap(hit);
          editor.setWallDraft({ a: editor.wallDraft.a, b: hit.point });
        } else if (editor.tool === "measure" && editor.measureDraft) {
          editor.setSnap(snapped(world, editor.measureDraft));
        } else if (editor.tool === "wall" || editor.tool === "door" || editor.tool === "window" || editor.tool === "measure") {
          editor.setSnap(snapped(world));
        } else editor.setSnap(null);
        return;
      }
      if (drag.kind === "pan") {
        const camera = useEditorStore.getState().camera;
        useEditorStore.getState().setCamera({
          ...camera,
          x: drag.camX - (event.clientX - drag.sx) / camera.zoom,
          y: drag.camY + (event.clientY - drag.sy) / camera.zoom,
        });
        return;
      }
      const project = useProjectStore.getState();
      if (drag.kind === "furniture") {
        const hit = snapped(world);
        const grid = project.document.settings.gridSize;
        const enabled = project.document.settings.snapEnabled;
        const x = enabled ? roundMm(Math.round((world.x + drag.ox) / grid) * grid) : roundMm(world.x + drag.ox);
        const y = enabled ? roundMm(Math.round((world.y + drag.oy) / grid) * grid) : roundMm(world.y + drag.oy);
        useProjectStore.getState().updateLive((document) => {
          const item = document.furniture.find((entry) => entry.id === drag.id);
          if (!item) return;
          item.x = x;
          item.y = y;
        });
        void hit;
        return;
      }
      if (drag.kind === "rotate") {
        useProjectStore.getState().updateLive((document) => {
          const item = document.furniture.find((entry) => entry.id === drag.id);
          if (!item) return;
          let rotation = Math.atan2(world.y - item.y, world.x - item.x) - Math.PI / 2;
          if (document.settings.snapEnabled) {
            const step = Math.PI / 12;
            rotation = Math.round(rotation / step) * step;
          }
          item.rotation = roundMm(rotation);
        });
        return;
      }
      if (drag.kind === "endpoint") {
        const anchor = project.document.walls.find((wall) => wall.id === drag.id);
        const fixed = anchor ? (drag.end === "a" ? anchor.b : anchor.a) : undefined;
        const hit = snapped(world, fixed, drag.id);
        useEditorStore.getState().setSnap(hit);
        useProjectStore.getState().updateLive((document) => {
          const wall = document.walls.find((entry) => entry.id === drag.id);
          if (!wall) return;
          wall[drag.end] = { ...hit.point };
          for (const opening of document.openings) {
            if (opening.wallId === wall.id) {
              const length = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
              opening.width = Math.min(opening.width, Math.max(0.2, length - 0.04));
              const half = opening.width / 2;
              opening.offset = Math.min(Math.max(opening.offset, half), Math.max(length - half, half));
            }
          }
        });
        return;
      }
      if (drag.kind === "wall") {
        const grid = project.document.settings.gridSize;
        let dx = world.x - drag.wx;
        let dy = world.y - drag.wy;
        if (project.document.settings.snapEnabled) {
          dx = Math.round(dx / grid) * grid;
          dy = Math.round(dy / grid) * grid;
        }
        useProjectStore.getState().updateLive((document) => {
          const wall = document.walls.find((entry) => entry.id === drag.id);
          if (!wall) return;
          wall.a = { x: roundMm(drag.a.x + dx), y: roundMm(drag.a.y + dy) };
          wall.b = { x: roundMm(drag.b.x + dx), y: roundMm(drag.b.y + dy) };
        });
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2 && dragRef.current?.kind === "pinch") dragRef.current = null;
      const drag = dragRef.current;
      if (pointers.size === 0 && drag && drag.kind !== "pan" && drag.kind !== "pinch") {
        if (drag.kind === "endpoint" || drag.kind === "wall") {
          const project = useProjectStore.getState();
          const probe = structuredClone(project.document);
          if (splitAtJunctions(probe)) project.updateLive((document) => { splitAtJunctions(document); });
        }
        useProjectStore.getState().endGesture();
        dragRef.current = null;
        useEditorStore.getState().setSnap(null);
      } else if (pointers.size === 0 && drag?.kind === "pan") {
        const moved = Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy);
        if (moved < 5) {
          useEditorStore.getState().setSelection(drag.roomId ? { type: "room", id: drag.roomId } : null);
        }
        dragRef.current = null;
      } else if (pointers.size === 0) {
        dragRef.current = null;
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomAt(event.clientX, event.clientY, useEditorStore.getState().camera.zoom * factor);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") keys.space = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") keys.space = false;
    };
    const onContext = (event: Event) => event.preventDefault();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      pointers.clear();
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none">
      <canvas ref={canvasRef} data-plan-canvas className="h-full w-full" />
      <div ref={readRef} className="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] text-neutral-500" />
    </div>
  );
}

function cursorFor(tool: string, space: boolean, hoverId: string | null, panning: boolean): string {
  if (space || panning || tool === "pan") return "grab";
  if (tool === "wall" || tool === "door" || tool === "window" || tool === "measure") return "crosshair";
  if (hoverId) return "move";
  return "default";
}
