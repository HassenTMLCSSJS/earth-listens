export interface Announcement {
  en: string;
  ar: string;
  priority: 'polite' | 'assertive';
  speak: boolean;
  narrationId?: string;
}

type Listener = (item: Announcement) => void;

const listeners = new Set<Listener>();
const history: Announcement[] = [];
let pending: Announcement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastText = '';

/** Polite updates coalesce so a burst of state changes reads as one message. */
export const POLITE_DEBOUNCE_MS = 400;

export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announcementLog(): readonly Announcement[] {
  return history;
}

export function resetAnnouncements(): void {
  pending = null;
  history.length = 0;
  lastText = '';
  if (timer) clearTimeout(timer);
  timer = null;
}

function deliver(item: Announcement): void {
  const key = `${item.en}|${item.ar}`;
  // Never repeat the same line back to back; screen readers would stutter.
  if (key === lastText) return;
  lastText = key;
  history.push(item);
  if (typeof window !== 'undefined') {
    window.__elAnnounce = window.__elAnnounce ?? [];
    window.__elAnnounce.push(item.en);
  }
  for (const listener of listeners) listener(item);
}

function clearTimer(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function announce(
  msg: { en: string; ar: string },
  opts?: { priority?: 'polite' | 'assertive'; speak?: boolean; narrationId?: string },
): void {
  const item: Announcement = {
    en: msg.en,
    ar: msg.ar,
    priority: opts?.priority ?? 'polite',
    speak: opts?.speak ?? true,
    ...(opts?.narrationId ? { narrationId: opts.narrationId } : {}),
  };

  if (item.priority === 'assertive') {
    // Assertive interrupts the pending polite chatter and lands immediately.
    clearTimer();
    pending = null;
    deliver(item);
    return;
  }

  pending = item;
  clearTimer();
  timer = setTimeout(() => {
    timer = null;
    const next = pending;
    pending = null;
    if (next) deliver(next);
  }, POLITE_DEBOUNCE_MS);
}
