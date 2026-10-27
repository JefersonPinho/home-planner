"use client";

import { useEffect, type RefObject } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { sceneBounds, selectionBounds } from "@/lib/geometry/bounds";
import { applyCamera } from "@/components/canvas-3d/apply-camera";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import * as THREE from "three";

export function CameraRig({ controls }: { controls: RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const nonce = useEditorStore((state) => state.cameraCommand.nonce);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const command = useEditorStore.getState().cameraCommand;
    const document = useProjectStore.getState().document;
    const selection = useEditorStore.getState().selection;
    const bounds =
      command.kind === "focus" ? (selectionBounds(document, selection) ?? sceneBounds(document)) : sceneBounds(document);
    applyCamera(camera, controls.current, bounds, command.preset, { width: size.width, height: size.height });
  }, [nonce, camera, controls, size.width, size.height]);

  useFrame((state) => {
    if (useEditorStore.getState().mode === "walk") return;
    if (state.camera.position.y < 0.2) state.camera.position.y = 0.2;
  });

  return null;
}
