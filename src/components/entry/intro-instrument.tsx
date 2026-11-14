'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { GlbModel, getModel } from '@/modules/models';

function OrbitRig({ children }: { children: React.ReactNode }) {
  const group = useRef<any>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.25;
  });
  return (
    <group ref={group} position={[0, -0.15, 0]}>
      <group position={[1.35, 0, 0]}>{children}</group>
    </group>
  );
}

/**
 * A short-lived second WebGL context rendered only while the satellite or the
 * guitar scene is active. The models registry owns the GLB URLs and the
 * stand-ins it falls back to when loading fails.
 */
export function IntroInstrument({
  id,
  playing,
  reducedMotion,
}: {
  id: 'satellite' | 'inst_guitar';
  playing: boolean;
  reducedMotion: boolean;
}) {
  const model = getModel(id);
  if (!model?.file) return null;
  const satellite = id === 'satellite';
  const scene = (
    <GlbModel
      url={model.file}
      motion={satellite ? 'orbit' : 'spin'}
      baseScale={satellite ? 0.22 : 0.28}
      playing={playing}
      intensity={0.6}
      reducedMotion={reducedMotion}
      fallback={<group />}
    />
  );
  return (
    <Canvas
      key={id}
      className="pointer-events-none absolute inset-0"
      camera={{ position: [0, 0.35, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
      dpr={[1, 1.75]}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 3]} intensity={1.35} />
      <spotLight position={[-3, 2, -2]} intensity={0.6} />
      <Suspense fallback={null}>{satellite ? <OrbitRig>{scene}</OrbitRig> : scene}</Suspense>
    </Canvas>
  );
}
