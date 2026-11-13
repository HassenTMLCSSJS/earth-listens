import type { Action, Origin } from '@/core/actions';

type Handler = (action: Action, origin: Origin) => void;

const handlers = new Map<string, Set<Handler>>();

export function subscribe(type: Action['type'] | '*', handler: Handler): () => void {
  const set = handlers.get(type) ?? new Set();
  set.add(handler);
  handlers.set(type, set);
  return () => set.delete(handler);
}

export function emit(action: Action, origin: Origin): void {
  for (const handler of handlers.get(action.type) ?? []) handler(action, origin);
  for (const handler of handlers.get('*') ?? []) handler(action, origin);
}
