'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { LayerId } from '@/core/actions';

const TINT: Record<LayerId, string> = {
  temperature: '#ff7a45',
  wildfire: '#ff4d2e',
  sea_ice: '#bfe9ff',
  co2: '#b48cff',
};

const earthVert = /* glsl */ `
  uniform float uLevel;
  uniform float uPulse;
  out vec2 vUv;
  out vec3 vNormal;
  out vec3 vView;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    vec3 displaced = position + normal * (uLevel * 0.045 + uPulse * 0.03);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uLevel;
  uniform float uPulse;
  in vec2 vUv;
  in vec3 vNormal;
  in vec3 vView;
  out vec4 fragColor;
  void main() {
    vec3 tex = texture(uMap, vUv).rgb;
    float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 1.6);
    vec3 color = mix(tex, uTint, 0.18 + uLevel * 0.62);
    color += uTint * fres * (0.15 + uPulse);
    color += uTint * uPulse * uLevel * 0.35;
    fragColor = vec4(color, 1.0);
  }
`;

const airVert = /* glsl */ `
  out vec3 vNormal;
  out vec3 vView;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const airFrag = /* glsl */ `
  uniform vec3 uTint;
  uniform float uLevel;
  uniform float uPulse;
  in vec3 vNormal;
  in vec3 vView;
  out vec4 fragColor;
  void main() {
    float fres = pow(0.72 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.2);
    float alpha = fres * (0.45 + uLevel * 0.7 + uPulse * 0.4);
    fragColor = vec4(uTint, clamp(alpha, 0.0, 1.0));
  }
`;

function CameraRig({ lat, lon }: { lat: number; lon: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    camera.position.set(
      Math.sin(phi) * Math.cos(theta) * 2.6,
      Math.cos(phi) * 2.6,
      Math.sin(phi) * Math.sin(theta) * 2.6,
    );
    camera.lookAt(0, 0, 0);
  }, [camera, lat, lon]);
  return null;
}

function Scene({
  texture,
  lat,
  lon,
  cells,
  level,
  pulseId,
  layerId,
  motion,
}: {
  texture: string;
  lat: number;
  lon: number;
  cells: { lat: number; lon: number }[];
  level: number;
  pulseId: number;
  layerId: LayerId;
  motion: string;
}) {
  const map = useTexture(texture);
  const tint = useMemo(() => new THREE.Color(TINT[layerId]), [layerId]);
  const pulse = useRef(0);
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const earth = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: map },
          uTint: { value: tint.clone() },
          uLevel: { value: 0 },
          uPulse: { value: 0 },
        },
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        glslVersion: THREE.GLSL3,
      }),
    [map, tint],
  );
  const air = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTint: { value: tint.clone() },
          uLevel: { value: 0 },
          uPulse: { value: 0 },
        },
        vertexShader: airVert,
        fragmentShader: airFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        glslVersion: THREE.GLSL3,
      }),
    [tint],
  );

  useEffect(() => {
    if (motion === 'reduce') return;
    pulse.current = 1;
  }, [pulseId, motion]);

  // ShaderMaterial uniforms are mutable GPU state, written once per frame.
  /* eslint-disable react-hooks/immutability */
  useFrame((_, delta) => {
    if (motion !== 'reduce') pulse.current = Math.max(0, pulse.current - delta * 1.4);
    const shown = motion === 'reduce' ? 0 : pulse.current;
    earth.uniforms.uLevel!.value = levelRef.current;
    earth.uniforms.uPulse!.value = shown;
    air.uniforms.uLevel!.value = levelRef.current;
    air.uniforms.uPulse!.value = shown;
    const tintUniform = earth.uniforms.uTint!.value as THREE.Color;
    tintUniform.copy(tint);
    (air.uniforms.uTint!.value as THREE.Color).copy(tint);
  });
  /* eslint-enable react-hooks/immutability */

  const fires = useMemo(() => {
    const positions = new Float32Array(Math.max(cells.length, 1) * 3);
    cells.forEach((cell, index) => {
      const phi = ((90 - cell.lat) * Math.PI) / 180;
      const theta = ((cell.lon + 180) * Math.PI) / 180;
      positions[index * 3] = -Math.sin(phi) * Math.cos(theta) * 1.04;
      positions[index * 3 + 1] = Math.cos(phi) * 1.04;
      positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 1.04;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [cells]);

  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive object={earth} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.14, 48, 48]} />
        <primitive object={air} attach="material" />
      </mesh>
      {cells.length > 0 ? (
        <points geometry={fires}>
          <pointsMaterial
            color={TINT.wildfire}
            size={0.03 + (motion === 'reduce' ? 0 : level * 0.02)}
          />
        </points>
      ) : null}
      <CameraRig lat={lat} lon={lon} />
    </>
  );
}

export function EarthCanvas({
  texture,
  lat,
  lon,
  cells,
  level,
  pulseId,
  layerId,
  motion,
}: {
  texture: string;
  lat: number;
  lon: number;
  cells: { lat: number; lon: number }[];
  level: number;
  pulseId: number;
  layerId: LayerId;
  motion: string;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#05070d']} />
      <Scene
        texture={texture}
        lat={lat}
        lon={lon}
        cells={cells}
        level={level}
        pulseId={pulseId}
        layerId={layerId}
        motion={motion}
      />
    </Canvas>
  );
}
