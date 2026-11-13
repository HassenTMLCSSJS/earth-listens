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
let queue: Announcement[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastText = '';
let lastAt = 0;

export function subscribeAnnouncements(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announcementLog(): readonly Announcement[] {
  return history;
}

export function resetAnnouncements(): void {
  queue = [];
  history.length = 0;
  lastText = '';
  lastAt = 0;
  if (timer) clearTimeout(timer);
  timer = null;
}

function deliver(item: Announcement): void {
  const key = `${item.en}|${item.ar}`;
  const now = Date.now();
  if (key === lastText && now - lastAt < 2000) return;
  lastText = key;
  lastAt = now;
  history.push(item);
  if (typeof window !== 'undefined') {
    window.__elAnnounce = window.__elAnnounce ?? [];
    window.__elAnnounce.push(item.en);
  }
  for (const listener of listeners) listener(item);
}

function flush(): void {
  if (timer || queue.length === 0) return;
  timer = setTimeout(() => {
    const item = queue[queue.length - 1];
    queue = [];
    timer = null;
    if (item) deliver(item);
    if (queue.length > 0) flush();
    else {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, 1000);
    }
  }, 30);
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
  if (queue.length > 0 && item.priority === 'polite') queue[queue.length - 1] = item;
  else queue.push(item);
  flush();
}
