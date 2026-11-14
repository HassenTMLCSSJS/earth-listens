import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import type { GlobeMethods } from 'react-globe.gl';

export type GlobeFraming = 'hero' | 'stage' | 'mini' | 'hidden';

export interface GlobeController {
  flyTo(lat: number, lng: number, altitude: number, ms?: number): void;
  setFraming(framing: GlobeFraming): void;
  setAutoRotate(on: boolean, speed?: number): void;
  setUniform(name: string, value: number): void;
  scene(): Scene;
  camera(): Camera;
  renderer(): WebGLRenderer;
  addObject(id: string, object: Object3D, at?: { lat: number; lng: number; alt: number }): void;
  removeObject(id: string): void;
}

export interface GlobeUniforms {
  terminator: { value: number };
  scan: { value: number };
  glow: { value: number };
}

export function createGlobeController(
  globe: GlobeMethods,
  host: HTMLElement,
  uniforms: GlobeUniforms,
  reducedMotion: boolean,
): GlobeController {
  const objects = new Map<string, Object3D>();
  host.style.transformOrigin = 'center';
  host.style.transition = reducedMotion
    ? 'none'
    : 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease';

  return {
    flyTo(lat, lng, altitude, ms = 1000) {
      globe.pointOfView({ lat, lng, altitude }, reducedMotion ? 0 : ms);
    },
    setFraming(framing) {
      const scales: Record<GlobeFraming, number> = {
        hero: 1,
        stage: 0.88,
        mini: 0.48,
        hidden: 0.48,
      };
      host.dataset.framing = framing;
      host.style.transform = `scale(${scales[framing]})`;
      host.style.opacity = framing === 'hidden' ? '0' : '1';
      host.style.visibility = framing === 'hidden' ? 'hidden' : 'visible';
      host.style.pointerEvents = framing === 'hidden' ? 'none' : 'auto';
    },
    setAutoRotate(on, speed = 0.2) {
      globe.controls().autoRotate = on && !reducedMotion;
      globe.controls().autoRotateSpeed = speed;
    },
    setUniform(name, value) {
      const uniform = uniforms[name as keyof GlobeUniforms];
      if (!uniform) throw new Error(`Unknown globe uniform: ${name}`);
      uniform.value = value;
    },
    scene() {
      return globe.scene();
    },
    camera() {
      return globe.camera();
    },
    renderer() {
      return globe.renderer();
    },
    addObject(id, object, at) {
      if (objects.has(id)) throw new Error(`Globe object already exists: ${id}`);
      if (at) {
        const coords = globe.getCoords(at.lat, at.lng, at.alt);
        object.position.set(coords.x, coords.y, coords.z);
      }
      globe.scene().add(object);
      objects.set(id, object);
    },
    removeObject(id) {
      const object = objects.get(id);
      if (!object) return;
      globe.scene().remove(object);
      objects.delete(id);
    },
  };
}
