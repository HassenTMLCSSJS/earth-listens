export function KeyHint({ keys, label }: { keys: string; label: string }) {
  return (
    <p className="flex items-center gap-3 text-sm">
      <kbd className="rounded-md border border-white/20 px-2 py-1 font-mono text-xs">{keys}</kbd>
      <span>{label}</span>
    </p>
  );
}
