"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MOUSE, TOUCH, VSMShadowMap } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CameraRig } from "@/components/canvas-3d/CameraRig";
import { Furniture } from "@/components/canvas-3d/Furniture";
import { RoomFloors, Roof } from "@/components/canvas-3d/SceneExtras";
import { WalkController } from "@/components/canvas-3d/WalkController";
import { Walls } from "@/components/canvas-3d/Walls";
import { tryPlaceSpawn } from "@/features/walk/enter";
import { useEditorStore } from "@/stores/editor-store";

export function Viewport3D() {
  const controls = useRef<OrbitControlsImpl>(null);
  const walking = useEditorStore((state) => state.mode === "walk");
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="absolute inset-0">
      <Canvas
        shadows={!coarse}
        dpr={[1, coarse ? 1.25 : 1.5]}
        camera={{ position: [8, 6, 8], fov: 42, near: 0.05, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = VSMShadowMap;
        }}
        onPointerMissed={() => {
          if (useEditorStore.getState().mode !== "walk") useEditorStore.getState().setSelection(null);
        }}
      >
        <color attach="background" args={["#e6e4e0"]} />
        <hemisphereLight args={["#f7f4ef", "#cfc6ba", 0.72]} />
        <ambientLight intensity={0.28} color="#fffaf5" />
        <directionalLight
          position={[6, 14, 5]}
          intensity={1.25}
          castShadow={!coarse}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
          shadow-radius={3}
          shadow-camera-near={1}
          shadow-camera-far={40}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
          onClick={(event) => {
            if (tryPlaceSpawn(event.point.x, -event.point.z)) event.stopPropagation();
          }}
        >
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#eceae6" roughness={1} />
        </mesh>
        {walking ? null : <gridHelper args={[40, 40, "#d5d0c8", "#e4e0d8"]} position={[0, 0.006, 0]} />}
        <group scale={[1, 1, -1]}>
          <RoomFloors />
          <Walls />
          <Suspense fallback={null}>
            <Furniture />
          </Suspense>
          <Roof />
        </group>
        <OrbitControls
          ref={controls}
          makeDefault
          enabled={!walking}
          enableDamping
          dampingFactor={0.09}
          rotateSpeed={0.72}
          zoomSpeed={0.75}
          panSpeed={0.7}
          minPolarAngle={0.06}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minDistance={0.8}
          maxDistance={70}
          mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        />
        <CameraRig controls={controls} />
        {walking ? <WalkController /> : null}
      </Canvas>
    </div>
  );
}
