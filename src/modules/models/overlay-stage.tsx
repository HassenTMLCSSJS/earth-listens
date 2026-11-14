import type { ModelProps } from './registry';
import { getModel } from './registry';

/** One overlay for instruments and characters. DOM stand-ins, so the globe keeps the only WebGL context. */
export function OverlayStage({
  ids,
  playing,
  intensity,
  focused,
  reducedMotion,
  lang = 'en',
}: ModelProps & { ids: string[]; lang?: 'en' | 'ar' }) {
  return (
    <div data-overlay-stage className="flex flex-wrap items-end gap-3">
      {ids.map((id) => {
        const model = getModel(id);
        if (!model) return null;
        const StandIn = model.StandIn;
        return (
          <figure key={id} className="grid justify-items-center gap-1">
            <StandIn
              {...(playing === undefined ? {} : { playing })}
              {...(intensity === undefined ? {} : { intensity })}
              {...(focused === undefined ? {} : { focused })}
              {...(reducedMotion === undefined ? {} : { reducedMotion })}
            />
            <figcaption className="text-xs">
              {lang === 'ar' ? model.label.ar : model.label.en}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
