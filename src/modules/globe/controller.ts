import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';

export type GlobeFraming = 'hero' | 'stage' | 'mini' | 'hidden';

/** Minimal surface of the one react-globe.gl instance. */
export interface GlobeHandle {
  pointOfView(pov: { lat: number; lng: number; altitude: number }, ms?: number): void;
  scene(): Scene;
  camera(): Camera;
  renderer(): WebGLRenderer;
  getCoords?(lat: number, lng: number, alt: number): { x: number; y: number; z: number };
  controls?(): { autoRotate: boolean; autoRotateSpeed: number };
}

/**
 * Shared globe API. Zain's intro and Hassan's data layers both call this
 * instead of touching the renderer directly.
 */
export interface GlobeController {
  flyTo(lat: number, lng: number, altitude: number, ms?: number): void;
  setFraming(f: GlobeFraming): void;
  setAutoRotate(on: boolean, speed?: number): void;
  setUniform(name: string, value: number): void;
  scene(): Scene;
  camera(): Camera;
  renderer(): WebGLRenderer;
  addObject(id: string, obj: Object3D, at?: { lat: number; lng: number; alt: number }): void;
  removeObject(id: string): void;
}

interface UniformMaterial {
  uniforms?: Record<string, { value: number }>;
}

interface Traversable {
  traverse?: (fn: (obj: { material?: UniformMaterial | UniformMaterial[] }) => void) => void;
}

export function createGlobeController(
  handle: GlobeHandle,
  onFraming?: (framing: GlobeFraming) => void,
): GlobeController {
  const objects = new Map<string, Object3D>();
  let framing: GlobeFraming = 'stage';

  return {
    flyTo(lat, lng, altitude, ms = 1200) {
      handle.pointOfView({ lat, lng, altitude }, ms);
    },
    setFraming(next) {
      framing = next;
      onFraming?.(framing);
    },
    setAutoRotate(on, speed = 0.4) {
      const controls = handle.controls?.();
      if (!controls) return;
      controls.autoRotate = on;
      controls.autoRotateSpeed = speed;
    },
    setUniform(name, value) {
      const scene = handle.scene() as Scene & Traversable;
      scene.traverse?.((node) => {
        const obj = node as { material?: UniformMaterial | UniformMaterial[] };
        const material = obj.material;
        const list = Array.isArray(material) ? material : material ? [material] : [];
        for (const item of list) {
          const slot = item.uniforms?.[name];
          if (slot) slot.value = value;
        }
      });
    },
    scene() {
      return handle.scene();
    },
    camera() {
      return handle.camera();
    },
    renderer() {
      return handle.renderer();
    },
    addObject(id, obj, at) {
      this.removeObject(id);
      if (at && handle.getCoords) {
        const coords = handle.getCoords(at.lat, at.lng, at.alt);
        obj.position.set(coords.x, coords.y, coords.z);
      }
      handle.scene().add(obj);
      objects.set(id, obj);
    },
    removeObject(id) {
      const existing = objects.get(id);
      if (!existing) return;
      handle.scene().remove(existing);
      objects.delete(id);
    },
  };
}

let active: GlobeController | null = null;

export function registerGlobeController(controller: GlobeController | null): void {
  active = controller;
}

export function getGlobeController(): GlobeController | null {
  return active;
}
