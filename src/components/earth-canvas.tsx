'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { LayerId } from '@/core/actions';

const TINT: Record<LayerId, string> = {
  temperature: '#ff7a45',
  wildfire: '#ff4d2e',
  sea_ice: '#bfe9ff',
  co2: '#b48cff',
  night_lights: '#f0c36a',
  ocean_sst: '#2f6fed',
  ocean_currents: '#3ec6c6',
  aerosols: '#d2a15a',
  air_quality: '#c46bff',
  lightning: '#f4f7ff',
  forest: '#4f9d5d',
  precipitation: '#4f8cff',
  events: '#ffb454',
};

const earthVert = /* glsl */ `
  uniform sampler2D uHeight;
  uniform float uHasHeight;
  uniform sampler2D uFrameA;
  uniform float uExag;
  uniform float uCanopy;
  uniform float uHeightOffset;
  uniform float uHeightScale;
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
    float h = 0.0;
    if (uHasHeight > 0.5) {
      h = texture(uHeight, uv).r * uExag;
    }
    if (uCanopy > 0.0) {
      h += texture(uFrameA, uv).r * uCanopy;
    }
    vec3 displaced = position + normal * (h + uLevel * 0.045 + uPulse * 0.03);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uNight;
  uniform sampler2D uFrameA;
  uniform sampler2D uRamp;
  uniform sampler2D uWater;
  uniform vec3 uTint;
  uniform vec3 uSunDir;
  uniform float uLevel;
  uniform float uPulse;
  uniform float uHasNight;
  uniform float uHasOverlay;
  uniform float uHasWater;
  uniform float uOverlayOpacity;
  uniform float uNightGain;
  uniform float uPlayheadLon;
  uniform float uPlayheadGain;
  in vec2 vUv;
  in vec3 vNormal;
  in vec3 vView;
  out vec4 fragColor;
  void main() {
    vec3 day = texture(uMap, vUv).rgb;
    vec3 night = texture(uNight, vUv).rgb;
    vec3 N = normalize(vNormal);
    float dayMix = uHasNight > 0.5 ? smoothstep(-0.12, 0.18, dot(N, normalize(uSunDir))) : 1.0;
    vec3 base = mix(night * uNightGain, day, dayMix);
    float fres = pow(1.0 - max(dot(N, normalize(vView)), 0.0), 3.0);
    vec3 color = mix(base, uTint, 0.18 + uLevel * 0.62);
    color += vec3(0.3, 0.6, 1.0) * fres * (0.08 + uPulse);
    color += uTint * uPulse * uLevel * 0.35;
    if (uHasOverlay > 0.5) {
      float value = texture(uFrameA, vUv).r;
      float water = uHasWater > 0.5 ? texture(uWater, vUv).r : 1.0;
      float valid = step(0.004, value);
      vec3 ramp = texture(uRamp, vec2(value, 0.5)).rgb;
      color = mix(color, ramp, uOverlayOpacity * valid * water);
    }
    float lon = vUv.x * 360.0 - 180.0;
    float glow = exp(-pow((lon - uPlayheadLon) / 14.0, 2.0));
    color += uTint * glow * uPlayheadGain;
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
    float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.0);
    float alpha = fres * (0.45 + uLevel * 0.35 + uPulse * 0.25);
    fragColor = vec4(mix(vec3(0.3, 0.6, 1.0), uTint, 0.25), clamp(alpha, 0.0, 1.0));
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
  night,
  height,
  water,
  overlay,
  ramp,
  lat,
  lon,
  playheadLon,
  cells,
  level,
  pulseId,
  layerId,
  motion,
  segments,
}: {
  texture: string;
  night?: string;
  height?: string;
  water?: string;
  overlay?: string;
  ramp?: string;
  lat: number;
  lon: number;
  playheadLon: number;
  cells: { lat: number; lon: number }[];
  level: number;
  pulseId: number;
  layerId: LayerId;
  motion: string;
  segments: number;
}) {
  const maps = useTexture({
    day: texture,
    night: night ?? texture,
    height: height ?? texture,
    water: water ?? texture,
    frame: overlay ?? texture,
    ramp: ramp ?? texture,
  });
  const tint = useMemo(() => new THREE.Color(TINT[layerId]), [layerId]);
  const pulse = useRef(0);
  const levelRef = useRef(level);
  const playRef = useRef(playheadLon);
  useEffect(() => {
    levelRef.current = level;
    playRef.current = playheadLon;
  }, [level, playheadLon]);

  const earth = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: maps.day },
          uNight: { value: maps.night },
          uHeight: { value: maps.height },
          uFrameA: { value: maps.frame },
          uRamp: { value: maps.ramp },
          uWater: { value: maps.water },
          uTint: { value: tint.clone() },
          uSunDir: { value: new THREE.Vector3(0.6, 0.25, 0.4).normalize() },
          uLevel: { value: 0 },
          uPulse: { value: 0 },
          uHasNight: { value: night ? 1 : 0 },
          uHasHeight: { value: height ? 1 : 0 },
          uHasOverlay: { value: overlay ? 1 : 0 },
          uHasWater: { value: water && overlay ? 1 : 0 },
          uExag: { value: 0.045 },
          uCanopy: { value: layerId === 'forest' && overlay ? 0.04 : 0 },
          uHeightOffset: { value: -10900 },
          uHeightScale: { value: 19700 },
          uOverlayOpacity: { value: 0.82 },
          uNightGain: { value: 1.4 },
          uPlayheadLon: { value: lon },
          uPlayheadGain: { value: 0 },
        },
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        glslVersion: THREE.GLSL3,
      }),
    [maps, tint, night, height, water, overlay, lon, layerId],
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
    earth.uniforms.uPlayheadLon!.value = playRef.current;
    earth.uniforms.uPlayheadGain!.value = shown;
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
        <sphereGeometry args={[1, segments, Math.round(segments / 2)]} />
        <primitive object={earth} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.025, 48, 48]} />
        <primitive object={air} attach="material" />
      </mesh>
      {cells.length > 0 ? (
        <points geometry={fires}>
          <pointsMaterial
            color={TINT[layerId]}
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
  night,
  height,
  water,
  overlay,
  ramp,
  lat,
  lon,
  playheadLon,
  cells,
  level,
  pulseId,
  layerId,
  motion,
}: {
  texture: string;
  night?: string;
  height?: string;
  water?: string;
  overlay?: string;
  ramp?: string;
  lat: number;
  lon: number;
  playheadLon?: number;
  cells: { lat: number; lon: number }[];
  level: number;
  pulseId: number;
  layerId: LayerId;
  motion: string;
}) {
  const segments = motion === 'reduce' ? 64 : 128;
  const cap = motion === 'reduce' ? 1 : 1.5;
  const [dpr, setDpr] = useState(cap);
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={dpr}
      frameloop={motion === 'reduce' ? 'demand' : 'always'}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(cap)} />
      <color attach="background" args={['#05070d']} />
      <Scene
        texture={texture}
        {...(night ? { night } : {})}
        {...(height ? { height } : {})}
        {...(water ? { water } : {})}
        {...(overlay ? { overlay } : {})}
        {...(ramp ? { ramp } : {})}
        lat={lat}
        lon={lon}
        playheadLon={playheadLon ?? lon}
        cells={cells}
        level={level}
        pulseId={pulseId}
        layerId={layerId}
        motion={motion}
        segments={segments}
      />
    </Canvas>
  );
}
