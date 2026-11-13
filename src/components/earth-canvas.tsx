'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function CameraRig({ lat, lon }: { lat: number; lon: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    camera.position.set(
      Math.sin(phi) * Math.cos(theta) * 2.5,
      Math.cos(phi) * 2.5,
      Math.sin(phi) * Math.sin(theta) * 2.5,
    );
    camera.lookAt(0, 0, 0);
  }, [camera, lat, lon]);
  return null;
}

function Earth({ texture }: { texture: string }) {
  const map = useTexture(texture);
  return (
    <Sphere args={[1, 48, 48]}>
      <meshStandardMaterial map={map} />
    </Sphere>
  );
}

function Fires({ cells }: { cells: { lat: number; lon: number }[] }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(cells.length * 3);
    cells.forEach((cell, index) => {
      const phi = ((90 - cell.lat) * Math.PI) / 180;
      const theta = ((cell.lon + 180) * Math.PI) / 180;
      positions[index * 3] = -Math.sin(phi) * Math.cos(theta) * 1.02;
      positions[index * 3 + 1] = Math.cos(phi) * 1.02;
      positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 1.02;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [cells]);
  if (cells.length === 0) return null;
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#ff4d2e" size={0.035} />
    </points>
  );
}

export function EarthCanvas({
  texture,
  lat,
  lon,
  cells,
}: {
  texture: string;
  lat: number;
  lon: number;
  cells: { lat: number; lon: number }[];
}) {
  return (
    <Canvas camera={{ position: [0, 0, 2.5], fov: 42 }} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={['#05070d']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 2, 2]} intensity={1.4} />
      <Earth texture={texture} />
      <Sphere args={[1.08, 48, 48]}>
        <meshBasicMaterial color="#5ad1ff" transparent opacity={0.16} side={THREE.BackSide} />
      </Sphere>
      <Fires cells={cells} />
      <CameraRig lat={lat} lon={lon} />
    </Canvas>
  );
}
