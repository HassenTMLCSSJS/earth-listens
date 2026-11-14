import { LAYER_IDS } from '@/core/actions';
import { narrationText } from '@/modules/narration';
import { describe, expect, it } from 'vitest';
import { LAYER_COLOR, LAYER_SOUND, viewForLayer } from './views';

describe('globe data views', () => {
  it('draws every layer and keeps a sound in both languages', () => {
    for (const id of LAYER_IDS) {
      const view = viewForLayer({
        id,
        cursor: 2020,
        series: {
          global: [
            { t: 2000, v: 1 },
            { t: 2020, v: 2 },
          ],
        },
        focus: { lat: 0, lon: 0 },
      });
      expect(view.points.length).toBeGreaterThan(0);
      expect(view.points[0]?.color).toBe(LAYER_COLOR[id]);
      expect(narrationText(`view.${id}`)).toEqual(LAYER_SOUND[id]);
      expect(LAYER_SOUND[id].ar.length).toBeGreaterThan(0);
      expect(LAYER_SOUND[id].en.length).toBeGreaterThan(0);
    }
  });

  it('places events, fires, and ocean arcs from the records', () => {
    const events = viewForLayer({
      id: 'events',
      cursor: 2024,
      series: {},
      markers: [{ lat: 30, lon: 31, title: 'Storm', t: '2024-06-01' }],
      focus: { lat: 0, lon: 0 },
    });
    expect(events.points[0]).toMatchObject({ lat: 30, lng: 31, label: 'Storm' });
    const fires = viewForLayer({
      id: 'wildfire',
      cursor: 2025,
      series: {},
      cells: [
        { lat: 10, lon: 20, t: '2024-01-01', count: 1 },
        { lat: 12, lon: 22, t: '2025-08-04', count: 4 },
      ],
      focus: { lat: 0, lon: 0 },
    });
    expect(fires.points).toHaveLength(1);
    expect(fires.points[0]?.lat).toBe(12);
    const ocean = viewForLayer({
      id: 'ocean_currents',
      cursor: 2020,
      series: {},
      focus: { lat: 0, lon: 0 },
    });
    expect(ocean.arcs.length).toBeGreaterThan(0);
    const air = viewForLayer({
      id: 'air_quality',
      cursor: 2024,
      series: {},
      focus: { lat: 0, lon: 0 },
    });
    expect(air.points[0]).toMatchObject({ lat: 30.04, lng: 31.24 });
  });
});
