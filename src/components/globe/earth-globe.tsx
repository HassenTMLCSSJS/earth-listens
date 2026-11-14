'use client';

import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  configureKtx2Loader,
  createGlobeController,
  pickTextureAsset,
  TEXTURE_MANIFEST_URL,
  type GlobeController,
  type GlobeUniforms,
  type TextureManifest,
} from '@/modules/globe';

type TextureTier = '1k' | '2k' | '4k' | '8k';

interface GlobeTextures {
  day: string;
  night: string;
  nightKtx: string | null;
  height: string;
  normal: string | null;
  water: string | null;
  clouds: string | null;
  stars: string | null;
}

const LOCAL_TEXTURES: GlobeTextures = {
  day: '/textures/earth-day.webp',
  night: '/textures/earth-night.webp',
  nightKtx: null,
  height: '/textures/earth-height.png',
  normal: '/textures/earth-normal.webp',
  water: '/textures/earth-water-mask.png',
  clouds: null,
  stars: null,
};

function textureSet(manifest: TextureManifest, tier: TextureTier): GlobeTextures {
  const assetUrl = (role: string, formats: string[]) =>
    pickTextureAsset(manifest, role, tier, formats)?.url;
  const nightKtx = assetUrl('earth-night', ['ktx2']);
  const night = assetUrl('earth-night', ['webp', 'jpeg', 'jpg']);

  return {
    day: assetUrl('earth-day', ['webp', 'jpeg', 'jpg']) ?? LOCAL_TEXTURES.day,
    night: night ?? LOCAL_TEXTURES.night,
    nightKtx: nightKtx ?? null,
    height: assetUrl('earth-height', ['webp', 'jpeg', 'jpg']) ?? LOCAL_TEXTURES.height,
    normal: assetUrl('earth-normal', ['webp', 'jpeg', 'jpg']) ?? null,
    water: assetUrl('earth-water-mask', ['webp', 'jpeg', 'jpg']) ?? null,
    clouds: assetUrl('earth-clouds', ['webp', 'jpeg', 'jpg']) ?? null,
    stars: assetUrl('starfield', ['webp', 'jpeg', 'jpg']) ?? null,
  };
}

function preferredTier(): TextureTier {
  return window.matchMedia('(pointer: coarse)').matches ? '1k' : '2k';
}

function idleTier(renderer: THREE.WebGLRenderer): TextureTier | null {
  if (window.matchMedia('(pointer: coarse)').matches) return null;
  const capabilities = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const memory = capabilities.deviceMemory ?? 4;
  if (capabilities.connection?.saveData) return null;
  if (renderer.capabilities.maxTextureSize >= 8192 && memory >= 8) return '8k';
  if (renderer.capabilities.maxTextureSize >= 4096 && memory >= 4) return '4k';
  return null;
}

export function EarthGlobe({
  demo,
  online,
  reducedMotion,
  onControllerReady,
}: {
  demo: boolean;
  online: boolean;
  reducedMotion: boolean;
  onControllerReady?: (controller: GlobeController | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const shaderRef = useRef<{ uniforms: Record<string, { value: unknown }> } | null>(null);
  const materialRef = useRef<THREE.MeshPhongMaterial | null>(null);
  const fallbackNight = useMemo(
    () => new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat),
    [],
  );
  const nightTextureRef = useRef<THREE.Texture>(fallbackNight);
  const uniforms = useMemo<GlobeUniforms>(
    () => ({
      terminator: { value: 0 },
      scan: { value: 0 },
      glow: { value: 0.3 },
    }),
    [],
  );
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState<TextureTier>('2k');
  const [textureManifest, setTextureManifest] = useState<TextureManifest | null>(null);

  const material = useMemo(() => {
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 12,
      bumpScale: 0.018,
    });
    earthMaterial.onBeforeCompile = (shader) => {
      shaderRef.current = shader;
      shader.uniforms.uNightMap = { value: nightTextureRef.current };
      shader.uniforms.uSunDirection = { value: new THREE.Vector3(0.55, 0.18, 0.82).normalize() };
      shader.uniforms.uTerminator = uniforms.terminator;
      shader.uniforms.uGlow = uniforms.glow;
      shader.uniforms.uScan = uniforms.scan;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vEarthWorldNormal;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvEarthWorldNormal = normalize(mat3(modelMatrix) * objectNormal);',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'uniform sampler2D uNightMap;',
            'uniform vec3 uSunDirection;',
            'uniform float uTerminator;',
            'uniform float uGlow;',
            'uniform float uScan;',
            'varying vec3 vEarthWorldNormal;',
          ].join('\n'),
        )
        .replace(
          '#include <map_fragment>',
          [
            '#include <map_fragment>',
            'vec3 earthNight = texture2D(uNightMap, vMapUv).rgb;',
            'float earthDayMix = smoothstep(-0.12 - uTerminator, 0.18 - uTerminator, dot(normalize(vEarthWorldNormal), normalize(uSunDirection)));',
            'diffuseColor.rgb *= earthDayMix;',
          ].join('\n'),
        )
        .replace(
          '#include <emissivemap_fragment>',
          [
            '#include <emissivemap_fragment>',
            'float earthNightGlow = 1.0 - earthDayMix;',
            'totalEmissiveRadiance += earthNight * earthNightGlow * 1.4;',
            'totalEmissiveRadiance += vec3(0.015, 0.04, 0.075) * uGlow;',
            'totalEmissiveRadiance += vec3(0.25, 0.72, 1.0) * uScan * 0.08;',
          ].join('\n'),
        );
    };
    earthMaterial.customProgramCacheKey = () => 'earth-globe-night-lights-v1';
    return earthMaterial;
  }, [uniforms]);

  const activeTier = demo || !online ? '1k' : tier;
  const textures = useMemo(
    () =>
      demo || !online || !textureManifest
        ? LOCAL_TEXTURES
        : textureSet(textureManifest, activeTier),
    [activeTier, demo, online, textureManifest],
  );
  const onGlobeReady = useCallback(() => setReady(true), [setReady]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      materialRef.current = null;
    };
  }, [material]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (demo || !online) return;

    const abort = new AbortController();
    void fetch(TEXTURE_MANIFEST_URL, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`texture manifest HTTP ${response.status}`);
        return (await response.json()) as TextureManifest;
      })
      .then((manifest) => {
        const initialTier = preferredTier();
        setTier(initialTier);
        setTextureManifest(manifest);
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        console.warn('Could not load globe texture manifest; using local textures.', error);
        setTier('1k');
        setTextureManifest(null);
      });
    return () => abort.abort();
  }, [demo, online]);

  useEffect(() => {
    const globe = globeRef.current;
    const host = hostRef.current;
    if (!ready || !globe || !host) return;
    const controller = createGlobeController(globe, host, uniforms, reducedMotion);
    controller.setAutoRotate(!reducedMotion, 0.18);
    onControllerReady?.(controller);
    return () => {
      onControllerReady?.(null);
    };
  }, [onControllerReady, ready, reducedMotion, uniforms]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || demo || !online || !textureManifest || !globe) return;
    const targetTier = idleTier(globe.renderer());
    if (
      !targetTier ||
      ['1k', '2k', '4k', '8k'].indexOf(targetTier) <= ['1k', '2k', '4k', '8k'].indexOf(activeTier)
    ) {
      return;
    }

    let timer: number | undefined;
    let idleId: number | undefined;
    const upgrade = () => setTier(targetTier);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(upgrade, { timeout: 12_000 });
    } else {
      timer = window.setTimeout(upgrade, 10_000);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [activeTier, demo, online, ready, textureManifest]);

  useEffect(() => {
    if (!ready) return;
    const globe = globeRef.current;
    const earthMaterial = materialRef.current;
    if (!globe || !earthMaterial) return;
    let cancelled = false;
    let cloudMesh: THREE.Mesh | null = null;
    const loadedTextures: THREE.Texture[] = [];
    let disposeKtxLoader = () => {};
    const textureLoader = new THREE.TextureLoader();

    const attachTexture = (url: string, apply: (texture: THREE.Texture) => void, label: string) => {
      textureLoader.load(
        url,
        (texture) => {
          if (cancelled) {
            texture.dispose();
            return;
          }
          loadedTextures.push(texture);
          apply(texture);
        },
        undefined,
        (error) => {
          if (!cancelled) console.error(`Could not load globe ${label} texture: ${url}`, error);
        },
      );
    };

    const resetNightMap = () => {
      nightTextureRef.current = fallbackNight;
      const uniform = shaderRef.current?.uniforms.uNightMap;
      if (uniform) uniform.value = fallbackNight;
    };
    const loadNightFallback = () => {
      attachTexture(
        textures.night,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          nightTextureRef.current = texture;
          const uniform = shaderRef.current?.uniforms.uNightMap;
          if (uniform) uniform.value = texture;
        },
        'night',
      );
    };

    resetNightMap();
    if (textures.nightKtx) {
      void (async () => {
        const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
        if (cancelled) return;
        const loader = new KTX2Loader();
        disposeKtxLoader = () => loader.dispose();
        configureKtx2Loader(loader);
        loader.detectSupport(globe.renderer());
        try {
          const texture = await loader.loadAsync(textures.nightKtx!);
          if (cancelled) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          loadedTextures.push(texture);
          nightTextureRef.current = texture;
          const uniform = shaderRef.current?.uniforms.uNightMap;
          if (uniform) uniform.value = texture;
        } catch (error) {
          if (!cancelled) {
            console.error('Could not load KTX2 night texture; trying the WebP fallback.', error);
            loadNightFallback();
          }
        }
      })().catch((error: unknown) => {
        if (!cancelled) {
          console.error('Could not initialize the KTX2 globe texture loader; using WebP.', error);
          loadNightFallback();
        }
      });
    } else {
      loadNightFallback();
    }

    if (textures.normal) {
      attachTexture(
        textures.normal,
        (texture) => {
          earthMaterial.normalMap = texture;
          earthMaterial.needsUpdate = true;
        },
        'normal',
      );
    }
    if (textures.water) {
      attachTexture(
        textures.water,
        (texture) => {
          earthMaterial.specularMap = texture;
          earthMaterial.specular.set('#7caed1');
          earthMaterial.needsUpdate = true;
        },
        'water mask',
      );
    }
    if (textures.clouds) {
      attachTexture(
        textures.clouds,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.004, 64, 32),
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 0.18,
              depthWrite: false,
            }),
          );
          cloudMesh = clouds;
          globe.scene().add(clouds);
        },
        'cloud',
      );
    }

    return () => {
      cancelled = true;
      disposeKtxLoader();
      if (cloudMesh) {
        globe.scene().remove(cloudMesh);
        cloudMesh.geometry.dispose();
        const cloudMaterial = cloudMesh.material;
        if (Array.isArray(cloudMaterial)) cloudMaterial.forEach((entry) => entry.dispose());
        else cloudMaterial.dispose();
      }
      loadedTextures.forEach((texture) => texture.dispose());
      earthMaterial.normalMap = null;
      earthMaterial.specularMap = null;
      resetNightMap();
    };
  }, [fallbackNight, ready, textures]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const y = 1 - (index / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const distance = 55;
      positions[index * 3] = Math.cos(angle) * radius * distance;
      positions[index * 3 + 1] = y * distance;
      positions[index * 3 + 2] = Math.sin(angle) * radius * distance;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: '#d9e8ff',
        size: 0.45,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    globe.scene().add(stars);
    return () => {
      globe.scene().remove(stars);
      geometry.dispose();
      const starMaterial = stars.material;
      if (Array.isArray(starMaterial)) starMaterial.forEach((entry) => entry.dispose());
      else starMaterial.dispose();
    };
  }, [ready]);

  useEffect(
    () => () => {
      fallbackNight.dispose();
      material.dispose();
    },
    [fallbackNight, material],
  );

  return (
    <div
      ref={hostRef}
      data-testid="globe-gl"
      data-globe-tier={tier}
      className="absolute inset-0 overflow-hidden"
      style={{
        backgroundColor: '#05070d',
        backgroundImage:
          'radial-gradient(1px 1px at 12% 18%, #fff, transparent), radial-gradient(1px 1px at 30% 76%, #d7e7ff, transparent), radial-gradient(1.5px 1.5px at 74% 26%, #fff, transparent), radial-gradient(1px 1px at 86% 68%, #9ad7ff, transparent), radial-gradient(1px 1px at 51% 49%, #fff, transparent)',
      }}
    >
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        backgroundImageUrl={textures.stars}
        globeImageUrl={textures.day}
        bumpImageUrl={textures.height}
        globeMaterial={material}
        showAtmosphere
        atmosphereColor="#5ad1ff"
        atmosphereAltitude={0.16}
        showGraticules={false}
        rendererConfig={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onGlobeReady={onGlobeReady}
      />
    </div>
  );
}
