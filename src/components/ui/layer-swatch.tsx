import type { LayerId } from '@/core/actions';
import { cn } from '@/lib/utils';

/**
 * Colour plus a shape pattern, so a layer never relies on colour alone.
 * `.pat-<id>` lives in globals.css and reads the `--c` custom property.
 */
export function LayerSwatch({
  id,
  className,
  size = 'md',
}: {
  id: LayerId;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      aria-hidden="true"
      data-layer={id}
      className={cn('pat shrink-0 rounded-[4px] border border-white/25', `pat-${id}`, className)}
      style={
        {
          '--c': `var(--color-layer-${id})`,
          width: size === 'sm' ? 10 : 14,
          height: size === 'sm' ? 10 : 14,
        } as React.CSSProperties
      }
    />
  );
}
