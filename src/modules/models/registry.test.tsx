/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OverlayStage } from './overlay-stage';
import { MODELS, getModel } from './registry';

describe('model registry', () => {
  it('has a procedural stand-in and an Egyptian label for every model', () => {
    const ids = MODELS.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const model of MODELS) {
      expect(model.file).toBeNull();
      expect(model.StandIn).toBe(model.Component);
      expect(model.label.ar.length).toBeGreaterThan(0);
      expect(model.placement === 'globe' || model.placement === 'overlay').toBe(true);
    }
    expect(getModel('inst_oud')?.layer).toBe('temperature');
    expect(getModel('missing')).toBeUndefined();
  });

  it('renders stand-ins that react to playing and focus', () => {
    const html = renderToStaticMarkup(
      <OverlayStage ids={['inst_oud', 'missing']} lang="ar" playing intensity={0.8} focused />,
    );
    expect(html).toContain('عود');
    expect(html).toContain('data-playing="1"');
    expect(html).toContain('data-focused="1"');
    const still = renderToStaticMarkup(
      <OverlayStage ids={['headphones']} reducedMotion playing={false} />,
    );
    expect(still).toContain('Headphones');
    expect(still).toContain('data-playing="0"');
  });
});
