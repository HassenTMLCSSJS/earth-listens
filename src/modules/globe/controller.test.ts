import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createGlobeController,
  getGlobeController,
  registerGlobeController,
  type GlobeHandle,
} from './controller';

function fakeObject(): Object3D & { position: { x: number; y: number; z: number } } {
  const position = {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
  };
  return { position } as Object3D & { position: typeof position };
}

describe('globe controller', () => {
  it('flies, frames, and parks objects on the single globe', () => {
    const added: Object3D[] = [];
    const removed: Object3D[] = [];
    const flights: unknown[] = [];
    const framings: string[] = [];
    const controls = { autoRotate: false, autoRotateSpeed: 0 };
    const uniform = { value: 0 };
    const scene = {
      add(obj: Object3D) {
        added.push(obj);
      },
      remove(obj: Object3D) {
        removed.push(obj);
      },
      traverse(fn: (obj: { material?: { uniforms?: Record<string, { value: number }> } }) => void) {
        fn({ material: { uniforms: { scan: uniform } } });
      },
    } as unknown as Scene;
    const handle: GlobeHandle = {
      pointOfView(pov, ms) {
        flights.push({ pov, ms });
      },
      scene: () => scene,
      camera: () => ({}) as Camera,
      renderer: () => ({}) as WebGLRenderer,
      getCoords: (lat, lng, alt) => ({ x: lat, y: alt, z: lng }),
      controls: () => controls,
    };
    const controller = createGlobeController(handle, (framing) => framings.push(framing));
    controller.flyTo(30, 31, 2, 0);
    controller.setFraming('hero');
    controller.setAutoRotate(true, 0.2);
    controller.setUniform('scan', 1);
    const marker = fakeObject();
    controller.addObject('cairo', marker, { lat: 30.04, lng: 31.24, alt: 0.02 });
    controller.addObject('cairo', marker, { lat: 1, lng: 2, alt: 3 });
    controller.removeObject('missing');
    controller.removeObject('cairo');
    expect(flights).toEqual([{ pov: { lat: 30, lng: 31, altitude: 2 }, ms: 0 }]);
    expect(framings).toEqual(['hero']);
    expect(controls.autoRotate).toBe(true);
    expect(uniform.value).toBe(1);
    expect(marker.position).toMatchObject({ x: 1, y: 3, z: 2 });
    expect(removed).toHaveLength(2);
    expect(controller.scene()).toBe(scene);
    expect(controller.camera()).toBeTruthy();
    expect(controller.renderer()).toBeTruthy();
    registerGlobeController(controller);
    expect(getGlobeController()).toBe(controller);
    registerGlobeController(null);
  });
});
