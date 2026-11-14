'use client';

import { useEffect, useRef, useState } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import Globe from 'react-globe.gl';
import {
  getGlobeController,
  registerGlobeController,
  createGlobeController,
} from '@/modules/globe';
import type { GlobeArc, GlobeFraming, GlobePoint } from '@/modules/globe';

const POSTER = '/textures/earth-day.jpg';

export function EarthGlobe({
  lat,
  lon,
  points,
  arcs,
  reducedMotion,
  framing,
  playing,
  onReady,
}: {
  lat: number;
  lon: number;
  points: GlobePoint[];
  arcs: GlobeArc[];
  reducedMotion: boolean;
  framing: GlobeFraming;
  playing: boolean;
  onReady?: () => void;
}) {
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: Math.max(280, Math.round(rect.width)),
        height: Math.max(240, Math.round(rect.height)),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = getGlobeController();
    controller?.setFraming(framing);
    controller?.flyTo(lat, lon, framing === 'hero' ? 1.6 : 2.2, reducedMotion ? 0 : 900);
    controller?.setAutoRotate(!reducedMotion && !playing, 0.35);
    controller?.setUniform('scan', playing ? 1 : 0);
  }, [ready, lat, lon, framing, reducedMotion, playing]);

  useEffect(() => {
    return () => registerGlobeController(null);
  }, []);

  return (
    <div ref={host} data-testid="react-globe" className="absolute inset-0">
      <Globe
        ref={ref}
        width={size.width}
        height={size.height}
        backgroundColor="#05070d"
        backgroundImageUrl={null}
        globeImageUrl={POSTER}
        bumpImageUrl="/textures/earth-height.png"
        showAtmosphere
        atmosphereColor="#5ad1ff"
        atmosphereAltitude={0.18}
        animateIn={false}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude="altitude"
        pointRadius="radius"
        pointLabel="label"
        ringsData={points.slice(0, 1)}
        ringLat="lat"
        ringLng="lng"
        ringColor="color"
        ringMaxRadius={4}
        ringPropagationSpeed={reducedMotion ? 0 : 1}
        ringRepeatPeriod={reducedMotion ? 0 : 800}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcAltitudeAutoScale={0.3}
        onGlobeReady={() => {
          const api = ref.current;
          if (!api) return;
          const controller = createGlobeController({
            pointOfView: (pov, ms) => {
              api.pointOfView(pov, ms);
            },
            scene: () => api.scene(),
            camera: () => api.camera(),
            renderer: () => api.renderer(),
            getCoords: (latitude, longitude, alt) => api.getCoords(latitude, longitude, alt),
            controls: () => api.controls(),
          });
          registerGlobeController(controller);
          setReady(true);
          onReady?.();
        }}
      />
    </div>
  );
}
