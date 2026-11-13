import { r6 } from './round';

export interface Spatial {
  x: number;
  y: number;
  z: number;
  pos: { x: number; y: number; z: number };
  pan: number;
  backDb: number;
  lowpassHz: number;
}

const DEG = Math.PI / 180;

/** Wrap a longitude delta into (−180, 180]. */
export function wrapDelta(delta: number): number {
  let x = ((((delta + 180) % 360) + 360) % 360) - 180;
  if (x <= -180) x += 360;
  if (Object.is(x, -0)) return 0;
  return x;
}

export function spatialize(lat: number, lon: number, viewLat: number, viewLon: number): Spatial {
  const phi = lat * DEG;
  const phiC = viewLat * DEG;
  const dLon = wrapDelta(lon - viewLon) * DEG;
  const x = Math.cos(phi) * Math.sin(dLon);
  const y = Math.cos(phiC) * Math.sin(phi) - Math.sin(phiC) * Math.cos(phi) * Math.cos(dLon);
  const z = Math.sin(phiC) * Math.sin(phi) + Math.cos(phiC) * Math.cos(phi) * Math.cos(dLon);
  const backDb = z < 0 ? 9 * z : 0;
  const lowpassHz = z >= 0 ? 20000 : 800 * 25 ** (1 + z);
  return {
    x,
    y,
    z,
    pos: { x, y, z: -z },
    pan: x,
    backDb,
    lowpassHz,
  };
}

export function globalSpatial(): Spatial {
  return {
    x: 0,
    y: 0,
    z: 1,
    pos: { x: 0, y: 0, z: -1 },
    pan: 0,
    backDb: 0,
    lowpassHz: 20000,
  };
}

export function roundSpatial(s: Spatial): Spatial {
  return {
    x: r6(s.x),
    y: r6(s.y),
    z: r6(s.z),
    pos: { x: r6(s.pos.x), y: r6(s.pos.y), z: r6(s.pos.z) },
    pan: r6(s.pan),
    backDb: r6(s.backDb),
    lowpassHz: r6(s.lowpassHz),
  };
}
