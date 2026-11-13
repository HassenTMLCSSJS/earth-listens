import { DEMO_BADGE, SAMPLE_BANNER } from '@/core/demo';

export function Banner({ sample, demo }: { sample: boolean; demo: boolean }) {
  if (!sample && !demo) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2 text-sm">
      {sample ? (
        <p className="text-focus" role="status">
          {SAMPLE_BANNER}
        </p>
      ) : null}
      {demo ? (
        <span
          className="bg-warm text-space-950 rounded-full px-2 py-1 text-xs font-semibold"
          lang="en"
        >
          {DEMO_BADGE}
        </span>
      ) : null}
    </div>
  );
}
