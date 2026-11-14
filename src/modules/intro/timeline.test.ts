import { describe, expect, it } from 'vitest';
import {
  createIntroTimeline,
  getIntroTimeline,
  lastIntroStart,
  sceneForTime,
  startIntro,
} from './timeline';

describe('intro timeline', () => {
  it('maps the storyboard boundaries onto scenes 1 through 8', () => {
    expect(sceneForTime(0)).toBe(1);
    expect(sceneForTime(9.9)).toBe(1);
    expect(sceneForTime(10)).toBe(2);
    expect(sceneForTime(22)).toBe(3);
    expect(sceneForTime(36)).toBe(4);
    expect(sceneForTime(48)).toBe(5);
    expect(sceneForTime(64)).toBe(6);
    expect(sceneForTime(78)).toBe(7);
    expect(sceneForTime(88)).toBe(8);
    expect(sceneForTime(100)).toBe(8);
  });

  it('plays to scene 8 on the clock and stays put while scrolling', () => {
    let tick = (_ms: number) => {
      void _ms;
    };
    const scenes: number[] = [];
    const times: number[] = [];
    const timeline = createIntroTimeline({
      step(cb) {
        tick = cb;
        return () => {
          tick = () => undefined;
        };
      },
    });
    const offScene = timeline.onScene((scene) => scenes.push(scene));
    const offTime = timeline.onTime((seconds) => times.push(seconds));
    expect(timeline.duration).toBe(100);
    timeline.play();
    tick(12_000);
    expect(scenes).toContain(2);
    timeline.setMode('scroll');
    tick(20_000);
    expect(times.at(-1)).toBeLessThan(20);
    timeline.setMode('clock');
    tick(100_000);
    expect(scenes.at(-1)).toBe(8);
    timeline.pause();
    const frozen = times.at(-1) ?? 0;
    tick(5_000);
    expect(times.at(-1)).toBe(frozen);
    timeline.seek(0);
    expect(times.at(-1)).toBe(0);
    offScene();
    offTime();
    timeline.seek(12);
    expect(times.at(-1)).toBe(0);
  });

  it('starts from the gate with a clock', () => {
    const timeline = startIntro({ locale: 'ar', mode: 'listening' });
    expect(getIntroTimeline()).toBe(timeline);
    expect(lastIntroStart()).toEqual({ locale: 'ar', mode: 'listening' });
    timeline.seek(48);
    timeline.pause();
  });
});
