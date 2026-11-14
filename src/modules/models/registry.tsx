import type { ReactNode } from 'react';
import type { LayerId } from '@/core/actions';

export interface ModelProps {
  playing?: boolean;
  intensity?: number;
  focused?: boolean;
  reducedMotion?: boolean;
}

export interface ModelEntry {
  id: string;
  file: string | null;
  StandIn: (props: ModelProps) => ReactNode;
  Component: (props: ModelProps) => ReactNode;
  clips?: string[];
  layer?: LayerId;
  placement: 'globe' | 'overlay';
  label: { en: string; ar: string };
}

function standIn(shape: string) {
  return function ProceduralStandIn(props: ModelProps) {
    const intensity = props.intensity ?? 0.4;
    const scale = props.reducedMotion || !props.playing ? 1 : 1 + intensity * 0.25;
    return (
      <span
        data-stand-in={shape}
        data-playing={props.playing ? '1' : '0'}
        data-focused={props.focused ? '1' : '0'}
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: shape === 'ring' ? 84 : 64,
          height: shape === 'ring' ? 84 : 64,
          borderRadius:
            shape === 'ring' || shape === 'bowl' ? '999px' : shape === 'disc' ? '50%' : '12px',
          transform: `scale(${scale})`,
          border: props.focused ? '2px solid #ffd34d' : '1px solid rgba(255,255,255,0.35)',
          background:
            shape === 'satellite'
              ? 'linear-gradient(135deg, #e8eefc, #5ad1ff)'
              : 'radial-gradient(circle at 30% 30%, #ffd34d, #0b1020 70%)',
        }}
      />
    );
  };
}

function entry(
  id: string,
  shape: string,
  placement: 'globe' | 'overlay',
  label: { en: string; ar: string },
  layer?: LayerId,
): ModelEntry {
  const StandIn = standIn(shape);
  return {
    id,
    file: null,
    StandIn,
    Component: StandIn,
    clips: ['ACT_idle', 'ACT_play'],
    ...(layer ? { layer } : {}),
    placement,
    label,
  };
}

/** Every model from the Z brief, as a procedural stand-in until the GLB arrives. */
export const MODELS: ModelEntry[] = [
  entry('inst_oud', 'oud', 'overlay', { en: 'Oud', ar: 'عود' }, 'temperature'),
  entry('inst_kamanja', 'kamanja', 'overlay', { en: 'Kamanja', ar: 'كمنجة' }, 'forest'),
  entry('inst_ney', 'ney', 'overlay', { en: 'Ney', ar: 'ناي' }, 'precipitation'),
  entry('inst_darbuka', 'darbuka', 'overlay', { en: 'Darbuka', ar: 'طبلة' }, 'wildfire'),
  entry('inst_riq', 'riq', 'overlay', { en: 'Riq', ar: 'رق' }, 'lightning'),
  entry('inst_qanun', 'qanun', 'overlay', { en: 'Qanun', ar: 'قانون' }, 'sea_ice'),
  entry('inst_chimes', 'chimes', 'overlay', { en: 'Glass chimes', ar: 'أجراس' }, 'air_quality'),
  entry('inst_bowl', 'bowl', 'overlay', { en: 'Singing bowl', ar: 'طاسة' }, 'co2'),
  entry('note_field', 'notes', 'globe', { en: 'Notes', ar: 'نغمات' }),
  entry('jukebox_ring', 'ring', 'globe', { en: 'Jukebox ring', ar: 'حلقة الجوك بوكس' }),
  entry('music_box', 'box', 'overlay', { en: 'Music box', ar: 'صندوق موسيقى' }),
  entry('satellite', 'satellite', 'globe', { en: 'Satellite', ar: 'قمر صناعي' }, 'events'),
  entry('headphones', 'phones', 'overlay', { en: 'Headphones', ar: 'سماعات' }),
  entry('sada', 'sada', 'overlay', { en: 'Sada', ar: 'سادة' }),
  entry('cairo_marker', 'cairo', 'globe', { en: 'Cairo', ar: 'القاهرة' }),
  entry('layer_icon', 'icon', 'overlay', { en: 'Layer icon', ar: 'أيقونة الطبقة' }),
  entry('focus_ring', 'ring', 'overlay', { en: 'Focus ring', ar: 'حلقة التركيز' }),
  entry('stage_disc', 'disc', 'overlay', { en: 'Stage', ar: 'قرص المسرح' }),
];

export function getModel(id: string): ModelEntry | undefined {
  return MODELS.find((model) => model.id === id);
}
