import { DEMO_BADGE, FRAME_BANNER, SAMPLE_BANNER } from '@/core/demo';

export function Banner({
  sample,
  demo,
  frameSample = false,
}: {
  sample: boolean;
  demo: boolean;
  frameSample?: boolean;
}) {
  const showFrames = frameSample && !sample;
  if (!sample && !demo && !showFrames) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2 text-sm">
      {sample ? (
        <p className="text-focus" role="status">
          {SAMPLE_BANNER}
        </p>
      ) : null}
      {showFrames ? (
        <p className="text-focus" role="status">
          {FRAME_BANNER}
        </p>
      ) : null}
      {demo ? (
        <span
          className="text-space-950 rounded-full bg-[var(--color-layer-temperature)] px-2 py-1 text-xs font-semibold"
          lang="en"
        >
          {DEMO_BADGE}
        </span>
      ) : null}
    </div>
  );
}
