"use client";

import { useEffect } from "react";
import { deleteSelection, duplicateSelection, rotateSelection } from "@/features/editor/actions";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useEditorHotkeys(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const meta = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (meta && key === "z" && event.shiftKey) {
        event.preventDefault();
        useProjectStore.getState().redo();
        return;
      }
      if (meta && key === "z") {
        event.preventDefault();
        useProjectStore.getState().undo();
        return;
      }
      if (meta && key === "y") {
        event.preventDefault();
        useProjectStore.getState().redo();
        return;
      }
      if (meta && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (event.key === "Escape") {
        const editor = useEditorStore.getState();
        editor.setWallDraft(null);
        editor.setMeasureDraft(null);
        editor.setSelection(null);
        editor.setSnap(null);
        editor.setTool("select");
        return;
      }
      if (meta || event.altKey) return;
      if (key === "r") rotateSelection(1);
      if (key === "v") useEditorStore.getState().setTool("select");
      if (key === "w") useEditorStore.getState().setTool("wall");
      if (key === "d") useEditorStore.getState().setTool("door");
      if (key === "n") useEditorStore.getState().setTool("window");
      if (key === "m") useEditorStore.getState().setTool("measure");
      if (key === "h") useEditorStore.getState().setTool("pan");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
