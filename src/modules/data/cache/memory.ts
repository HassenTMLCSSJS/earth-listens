export interface LruEntry<T> {
  value: T;
  bytes: number;
}

/** Size-bounded LRU. Used for decoded grids, not for React state. */
export function createLru<T>(maxBytes: number) {
  const map = new Map<string, LruEntry<T>>();
  let used = 0;
  return {
    get(key: string): T | undefined {
      const hit = map.get(key);
      if (!hit) return undefined;
      map.delete(key);
      map.set(key, hit);
      return hit.value;
    },
    set(key: string, value: T, bytes: number): void {
      const previous = map.get(key);
      if (previous) {
        map.delete(key);
        used -= previous.bytes;
      }
      map.set(key, { value, bytes });
      used += bytes;
      while (used > maxBytes && map.size > 0) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        const entry = map.get(oldest);
        map.delete(oldest);
        used -= entry?.bytes ?? 0;
      }
    },
    bytes(): number {
      return used;
    },
  };
}
