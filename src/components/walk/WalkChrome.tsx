"use client";

import { useEffect, useRef } from "react";
import { enterHouse, leaveHouse } from "@/features/walk/enter";
import { isDoorOpen, toggleDoor, walkInput } from "@/features/walk/session";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useEditorStore } from "@/stores/editor-store";
import { useWalkStore } from "@/stores/walk-store";

export function WalkChrome() {
  const mode = useEditorStore((state) => state.mode);
  const notice = useWalkStore((state) => state.notice);
  const showHelp = useWalkStore((state) => state.showHelp);
  const interactId = useWalkStore((state) => state.interactId);
  const interactOpen = useWalkStore((state) => state.interactOpen);
  const touch = useMediaQuery("(pointer: coarse), (max-width: 767px)");

  useEffect(() => {
    if (mode === "2d") useWalkStore.getState().setNotice(null);
    if (mode !== "walk") return;
    useWalkStore.getState().setShowHelp(true);
    const timer = window.setTimeout(() => useWalkStore.getState().setShowHelp(false), 4200);
    return () => window.clearTimeout(timer);
  }, [mode]);

  if (mode === "3d") {
    return (
      <>
        {notice ? (
          <p className="pointer-events-none absolute inset-x-4 top-4 z-20 bg-white/95 px-3 py-2 text-center text-[13px] text-neutral-800 shadow-sm">
            {notice}
          </p>
        ) : null}
        <button
          type="button"
          className="absolute bottom-20 left-1/2 z-20 h-9 -translate-x-1/2 bg-neutral-900 px-4 text-[13px] text-white md:bottom-4"
          onClick={() => enterHouse()}
        >
          Entrar na casa
        </button>
      </>
    );
  }

  if (mode !== "walk") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {showHelp && !touch ? (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-neutral-950/75 px-4 py-2 text-[12px] leading-5 text-white">
          <p>WASD — Movimentar</p>
          <p>Mouse — Olhar</p>
          <p>Shift — Correr</p>
          <p>Esc — Sair</p>
        </div>
      ) : null}
      {interactId && !showHelp && !touch ? (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-neutral-950/75 px-3 py-1.5 text-[12px] text-white">
          E — {interactOpen ? "Fechar porta" : "Abrir porta"}
        </p>
      ) : null}
      <button
        type="button"
        className="pointer-events-auto absolute right-3 top-3 h-9 bg-white/95 px-3 text-[13px] text-neutral-900"
        onClick={leaveHouse}
      >
        Sair
      </button>
      {touch ? (
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Joystick />
        <div className="flex flex-col items-end gap-2">
          {interactId ? (
            <button
              type="button"
              className="h-12 min-w-12 bg-white/95 px-3 text-[13px] text-neutral-900"
              onClick={() => {
                toggleDoor(interactId);
                useWalkStore.getState().setInteract(interactId, isDoorOpen(interactId));
              }}
            >
              {interactOpen ? "Fechar" : "Abrir"}
            </button>
          ) : null}
          <button
            type="button"
            className="h-12 min-w-12 bg-white/95 px-3 text-[13px] text-neutral-900"
            onPointerDown={(event) => {
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Holding the button still runs if capture is unavailable.
              }
              walkInput.run = true;
            }}
            onPointerUp={() => {
              walkInput.run = false;
            }}
            onPointerCancel={() => {
              walkInput.run = false;
            }}
          >
            Correr
          </button>
          <button type="button" className="h-12 min-w-12 bg-neutral-900 px-3 text-[13px] text-white" onClick={leaveHouse}>
            Sair
          </button>
        </div>
      </div>
      ) : null}
    </div>
  );
}

function Joystick() {
  const knob = useRef<HTMLSpanElement>(null);
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const moveKnob = (x: number, y: number) => {
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  return (
    <div
      className="relative grid h-28 w-28 touch-none place-items-center rounded-full bg-neutral-950/25"
      aria-label="Caminhar"
      onPointerDown={(event) => {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // A pointer the browser is not tracking can still drive the stick.
        }
        origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        const start = origin.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const distance = Math.hypot(dx, dy) || 1;
        const limit = 42;
        const scale = Math.min(distance, limit) / distance;
        const x = dx * scale;
        const y = dy * scale;
        const strength = Math.min(distance, limit) / limit;
        walkInput.axisX = strength < 0.12 ? 0 : (x / limit);
        walkInput.axisY = strength < 0.12 ? 0 : -(y / limit);
        moveKnob(x, y);
      }}
      onPointerUp={(event) => {
        if (origin.current?.id !== event.pointerId) return;
        origin.current = null;
        walkInput.axisX = 0;
        walkInput.axisY = 0;
        moveKnob(0, 0);
      }}
      onPointerCancel={() => {
        origin.current = null;
        walkInput.axisX = 0;
        walkInput.axisY = 0;
        moveKnob(0, 0);
      }}
    >
      <span ref={knob} className="h-12 w-12 rounded-full bg-white/90" />
    </div>
  );
}
