import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { LAYER_IDS, type LayerId } from '../src/core/actions';
import { ExplanationSchema } from '../src/modules/data/schemas';
import { NARRATION_IDS } from '../src/modules/narration/speak';
import { SCRIPTS } from '../src/modules/narration/script';

const root = process.cwd();

const COPY: Record<
  LayerId,
  { short: { en: string; ar: string }; detailed: { en: string; ar: string } }
> = {
  temperature: {
    short: {
      en: 'SAMPLE. Higher notes mean warmer years. This sample range goes from -0.6 to 1.4 °C. The rhythm speeds up when the year-to-year change is bigger.',
      ar: 'بيانات تجريبية. النغمة الأعلى تعني سنة أدفأ. المدى التجريبي من -0.6 إلى 1.4 درجة. الإيقاع يسرع لما الفرق بين السنين يكبر.',
    },
    detailed: {
      en: 'SAMPLE data, not a GISTEMP measurement. Pitch is the anomaly, loudness is fixed for this layer, and rhythm follows the change from the previous year. One sample year is intentionally outside the range so you can hear the warning tone.',
      ar: 'بيانات تجريبية، ليست قياس GISTEMP. الطبقة هي الشذوذ، والعلو ثابت في الطبقة دي، والإيقاع ماشي مع الفرق عن السنة اللي فاتت. فيه سنة تجريبية خارجة عن المدى عشان تسمع نغمة التحذير.',
    },
  },
  wildfire: {
    short: {
      en: 'SAMPLE. More detections play a higher note. Louder means higher sample fire power. You hear the sound from the cell’s place on Earth.',
      ar: 'بيانات تجريبية. الرصدات الأكتر نغمتها أعلى. الصوت الأعلى يعني طاقة حريق تجريبية أكبر. هتسمع الصوت من مكان الخلية على الأرض.',
    },
    detailed: {
      en: 'SAMPLE counts on a 5° grid, not FIRMS detections. The loudest cells are the top 24 that day. A week-earlier cell sets the rhythm. Annual sample values stay inside the daily range so the symphony does not slam the ceiling.',
      ar: 'أعداد تجريبية على شبكة 5 درجات، ليست رصدات FIRMS. أعلى 24 خلية في اليوم هي اللي بتسمع. خلية من أسبوع فات بتحدد الإيقاع. القيم السنوية التجريبية جوه المدى اليومي عشان السيمفونية ما تطلعش للسقف.',
    },
  },
  sea_ice: {
    short: {
      en: 'SAMPLE. Higher notes mean more September ice in the sample series. The sound sits in the north.',
      ar: 'بيانات تجريبية. النغمة الأعلى تعني جليد سبتمبر أكتر في السلسلة التجريبية. الصوت جاي من الشمال.',
    },
    detailed: {
      en: 'SAMPLE September values, not the NSIDC Sea Ice Index. Loudness is steady. Rhythm follows the change since the previous September. The real DOI still needs a check before anyone cites it.',
      ar: 'قيم سبتمبر تجريبية، ليست مؤشر NSIDC. العلو ثابت. الإيقاع ماشي مع الفرق عن سبتمبر اللي فات. رقم DOI الحقيقي لسه محتاج مراجعة قبل أي استشهاد.',
    },
  },
  co2: {
    short: {
      en: 'SAMPLE. Higher notes mean a higher sample carbon dioxide value. The drone has no left-right position because the series is global.',
      ar: 'بيانات تجريبية. النغمة الأعلى تعني قيمة تجريبية أعلى لثاني أكسيد الكربون. الدندنة ملهاش يمين وشمال لأن السلسلة عالمية.',
    },
    detailed: {
      en: 'SAMPLE curve shaped like a seasonal cycle plus a rise. It is not the NOAA Mauna Loa record. The annual mean is what you hear in the symphony. Seasonal amplitude is stored beside it and is not a forecast.',
      ar: 'منحنى تجريبي فيه دورة موسمية وصعود. ده مش سجل ماونا لوا بتاع NOAA. المتوسط السنوي هو اللي بتسمعه في السيمفونية. سعة الموسم متخزنة جنبه ومش توقع.',
    },
  },
};

async function main(): Promise<void> {
  const items = [];
  for (const id of LAYER_IDS) {
    const config = JSON.parse(
      await readFile(path.join(root, `public/data/layers/${id}.config.json`), 'utf8'),
    ) as {
      variables: { how_much: { range: [number, number] } };
    };
    const range = config.variables.how_much.range;
    for (const level of ['short', 'detailed'] as const) {
      const text = COPY[id][level];
      const item = ExplanationSchema.parse({
        id,
        level,
        text: {
          en: `${text.en} Sample range ${range[0]} to ${range[1]}.`,
          ar: `${text.ar} المدى التجريبي من ${range[0]} إلى ${range[1]}.`,
        },
      });
      items.push(item);
    }
  }
  const file = path.join(root, 'public/data/explanations/all.json');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ sample: true, items }, null, 2)}\n`);
  const manifest = {
    sample: true,
    items: NARRATION_IDS.map((id) => ({
      id,
      en: {
        text: SCRIPTS[id].en,
        file: `/audio/narration/en/${id}.mp3`,
        status: 'missing' as const,
      },
      ar: {
        text: SCRIPTS[id].ar,
        file: `/audio/narration/ar/${id}.mp3`,
        status: 'missing' as const,
      },
    })),
  };
  await mkdir(path.join(root, 'public/audio/narration/en'), { recursive: true });
  await mkdir(path.join(root, 'public/audio/narration/ar'), { recursive: true });
  await writeFile(
    path.join(root, 'public/audio/narration/manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
