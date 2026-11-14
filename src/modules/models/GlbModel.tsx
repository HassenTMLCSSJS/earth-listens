'use client';

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Component, type ErrorInfo } from 'react';
import type { ModelProps } from './registry';

type GlbModelProps = ModelProps & {
  url: string;
  /** 'orbit' = satellite orbit motion; 'spin' = guitar turn + bob. */
  motion: 'orbit' | 'spin';
  baseScale: number;
};

function GlbScene({
  url,
  motion,
  baseScale,
  playing,
  intensity,
  focused,
  reducedMotion,
}: GlbModelProps) {
  const { scene } = useGLTF(url);
  const group = useRef<any>(null);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const speed = (playing ? 1 : 0.25) * (1 + (intensity ?? 0.4) * 0.25);

  useEffect(() => {
    cloned.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m && 'emissive' in m) {
            m.emissive = m.emissive ?? { set: () => {} };
            if (typeof m.emissive?.set === 'function') {
              m.emissive.set(focused ? '#3a2c00' : '#000000');
              if ('emissiveIntensity' in m) m.emissiveIntensity = focused ? 0.9 : 0;
            }
          }
        }
      }
    });
  }, [cloned, focused]);

  useEffect(() => {
    return () => {
      cloned.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (!m) continue;
            for (const key of Object.keys(m)) {
              const v = (m as any)[key];
              if (v?.isTexture) v.dispose?.();
            }
            m.dispose?.();
          }
        }
      });
    };
  }, [cloned]);

  useFrame((state, delta) => {
    if (reducedMotion || !group.current) return;
    const t = state.clock.elapsedTime * speed;
    if (motion === 'orbit') {
      group.current.rotation.y += delta * 0.15 * speed;
      group.current.position.y = Math.sin(t * 0.8) * 0.05;
    } else {
      group.current.rotation.y += delta * 0.4 * speed;
      group.current.position.y = Math.sin(t * 1.6) * 0.08;
    }
  });

  const scale = baseScale * (focused ? 1.08 : 1);
  return (
    <group ref={group} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

class GlbErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(_err: Error, _info: ErrorInfo) {}
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GlbModel(props: GlbModelProps & { fallback: ReactNode }) {
  const { fallback, ...rest } = props;
  return (
    <GlbErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbScene {...rest} />
      </Suspense>
    </GlbErrorBoundary>
  );
}
