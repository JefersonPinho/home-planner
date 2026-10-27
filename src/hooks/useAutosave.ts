"use client";

import { useEffect } from "react";
import { updateBrowserProject } from "@/lib/browser-projects";
import { renderThumbnail } from "@/lib/thumbnail";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";

let saving = false;
let pending = false;

export async function saveProject(): Promise<void> {
  const state = useProjectStore.getState();
  if (!state.loaded || !state.projectId || !state.dirty) return;
  if (saving) {
    pending = true;
    return;
  }
  saving = true;
  const revision = state.revision;
  const projectId = state.projectId;
  useEditorStore.getState().setSaveStatus("saving");
  try {
    const thumbnail = renderThumbnail(state.document);
    const payload = { document: state.document, thumbnail, revision };
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body: unknown = await response.json().catch(() => null);
    const browserProject = response.ok ? null : updateBrowserProject(projectId, payload);
    if (!response.ok && !browserProject) throw new Error("save");
    const storedRevision = browserProject?.clientRevision ?? readRevision(body);
    // A reloaded editor used to restart at revision 0. The stored project then
    // refused the write and still answered OK. Continue from the stored number.
    if (storedRevision !== null && storedRevision > revision) {
      useProjectStore.setState({ revision: storedRevision });
      return;
    }
    const latest = useProjectStore.getState();
    if (latest.revision === revision) latest.markClean();
    useEditorStore.getState().setSaveStatus("saved");
  } catch {
    useEditorStore.getState().setSaveStatus("error");
  } finally {
    saving = false;
    if (pending) {
      pending = false;
      if (useProjectStore.getState().dirty) void saveProject();
    }
  }
}

export function flushProjectSave(): void {
  const state = useProjectStore.getState();
  if (!state.loaded || !state.projectId || !state.dirty) return;
  const thumbnail = renderThumbnail(state.document);
  const payload = { document: state.document, thumbnail, revision: state.revision };
  updateBrowserProject(state.projectId, payload);
  void fetch(`/api/projects/${state.projectId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

function readRevision(body: unknown): number | null {
  if (!body || typeof body !== "object" || !("project" in body)) return null;
  const revision = (body as { project?: { clientRevision?: unknown } }).project?.clientRevision;
  return typeof revision === "number" ? revision : null;
}

export function useAutosave(): void {
  const revision = useProjectStore((state) => state.revision);
  const dirty = useProjectStore((state) => state.dirty);
  const loaded = useProjectStore((state) => state.loaded);
  const projectId = useProjectStore((state) => state.projectId);
  const gesturing = useProjectStore((state) => state.gesture !== null);

  useEffect(() => {
    if (!loaded || !projectId || !dirty) return;
    const timer = window.setTimeout(() => {
      void saveProject();
    }, gesturing ? 800 : 0);
    return () => window.clearTimeout(timer);
  }, [revision, dirty, loaded, projectId, gesturing]);

  useEffect(() => {
    const onHide = () => flushProjectSave();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);
}
