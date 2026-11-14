import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initialEntry, reduceEntry } from './machine';

const pre = initialEntry('en');

describe('entry machine', () => {
  it('does not decide mode from motion or the user agent', () => {
    const source = readFileSync('src/modules/entry/machine.ts', 'utf8');
    expect(source.includes('prefers-reduced-motion')).toBe(false);
    expect(source.includes('userAgent')).toBe(false);
    expect(source.includes('navigator')).toBe(false);
  });

  it('starts on the textless gate', () => {
    expect(pre.phase).toBe('pre');
    expect(pre.mode).toBeNull();
  });

  it('sends a language click straight into the visual intro', () => {
    const next = reduceEntry(pre, { type: 'language', lang: 'ar' });
    expect(next).toMatchObject({
      phase: 'intro',
      lang: 'ar',
      mode: 'visual',
      modeSource: 'click',
      line: 'mode.visual.confirm',
    });
  });

  it('walks the keyboard path through prompt, space, and intro', () => {
    const prompt = reduceEntry(pre, { type: 'sound', gesture: 'key' });
    expect(prompt.phase).toBe('prompt');
    expect(prompt.line).toBe('gate.prompt');
    const listen = reduceEntry(prompt, { type: 'prompt_done' });
    expect(listen.phase).toBe('listen1');
    const intro = reduceEntry(listen, { type: 'space' });
    expect(intro).toMatchObject({ phase: 'intro', mode: 'audio_first', modeSource: 'space' });
  });

  it('treats Listen and any clear speech as listening-first, and keeps the spoken language', () => {
    const listen = reduceEntry(
      { ...pre, phase: 'listen1', gesture: 'key' },
      { type: 'speech', text: 'اسمع', lang: 'ar' },
    );
    expect(listen).toMatchObject({ phase: 'intro', lang: 'ar', modeSource: 'voice' });
    const sentence = reduceEntry(
      { ...pre, phase: 'listen1', gesture: 'pointer' },
      { type: 'speech', text: 'hello there', lang: 'en' },
    );
    expect(sentence.modeSource).toBe('voice');
    const missed = reduceEntry(
      { ...pre, phase: 'listen2' },
      { type: 'speech', text: 'hi', lang: 'en' },
    );
    expect(missed.phase).toBe('listen2');
    expect(missed.line).toBe('err.didnt_catch');
  });

  it('reprompts once, then falls back from the first gesture', () => {
    const listen = reduceEntry(
      { ...pre, phase: 'prompt', gesture: 'pointer' },
      { type: 'prompt_done' },
    );
    const again = reduceEntry(listen, { type: 'silence' });
    expect(again.phase).toBe('reprompt');
    const second = reduceEntry(again, { type: 'reprompt_done' });
    expect(second.phase).toBe('listen2');
    const visual = reduceEntry(second, { type: 'silence' });
    expect(visual).toMatchObject({ mode: 'visual', modeSource: 'fallback' });
    const keyed = reduceEntry({ ...second, gesture: 'key' }, { type: 'silence' });
    expect(keyed.mode).toBe('audio_first');
  });

  it('keeps the keys working when the mic is denied', () => {
    const denied = reduceEntry({ ...pre, phase: 'listen1' }, { type: 'mic_denied' });
    expect(denied.phase).toBe('listen1');
    expect(denied.line).toBe('err.mic_denied');
    expect(reduceEntry(denied, { type: 'space' }).mode).toBe('audio_first');
  });

  it('skips to the hub and welcomes a returning visitor', () => {
    expect(reduceEntry(pre, { type: 'skip' }).phase).toBe('hub');
    const back = reduceEntry(pre, {
      type: 'boot',
      introSeen: true,
      savedMode: 'audio_first',
      lang: 'ar',
    });
    expect(back).toMatchObject({ phase: 'hub', line: 'gate.welcome_back', lang: 'ar' });
    const fresh = reduceEntry(pre, {
      type: 'boot',
      introSeen: false,
      savedMode: 'visual',
      lang: 'en',
    });
    expect(fresh.phase).toBe('intro');
    expect(reduceEntry({ ...fresh, phase: 'intro' }, { type: 'intro_done' }).phase).toBe('hub');
  });

  it('replays into the intro only after a mode exists', () => {
    expect(reduceEntry(pre, { type: 'replay' }).phase).toBe('pre');
    const ready = reduceEntry({ ...pre, mode: 'visual', phase: 'hub' }, { type: 'replay' });
    expect(ready.phase).toBe('intro');
  });
});
