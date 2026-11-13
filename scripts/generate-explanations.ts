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
  night_lights: {
    short: {
      en: 'Higher notes mean a higher night brightness index (image-derived, not calibrated radiance).',
      ar: 'النغمة الأعلى تعني مؤشر سطوع ليلي أعلى (مشتق من الصورة، مش إشعاع معاير).',
    },
    detailed: {
      en: 'The index is the cosine-weighted luma of the NASA GIBS Black Marble PNG. It is not calibrated radiance. Brighter is a bell, dimmer is a pad.',
      ar: 'المؤشر هو لمعان صورة الرخام الأسود من GIBS موزون بجيب التمام. ده مش إشعاع معاير. الأفتح جرس، والأغمق وسادة.',
    },
  },
  ocean_sst: {
    short: {
      en: 'SAMPLE series. Higher notes mean warmer sample sea-surface values. The globe can still show a real GIBS frame.',
      ar: 'سلسلة تجريبية. النغمة الأعلى تعني سطح بحر أدفأ في العينة. الكرة ممكن تعرض إطار حقيقي من GIBS.',
    },
    detailed: {
      en: 'SAMPLE ocean series, not the MUR record. A decoded 15 Aug 2024 frame is a separate real snapshot.',
      ar: 'سلسلة محيط تجريبية، ليست سجل MUR. إطار 15 أغسطس 2024 المفكوك لقطة حقيقية منفصلة.',
    },
  },
  ocean_currents: {
    short: {
      en: 'SAMPLE. Currents are a picture of flow. This build does not invent speeds.',
      ar: 'تجريبي. التيارات صورة للجريان. البناء ده ما بيخترعش سرعات.',
    },
    detailed: {
      en: 'SAMPLE bed. Direction comes from frames when they exist. No numeric current speed is spoken.',
      ar: 'خلفية تجريبية. الاتجاه من الإطارات لما توجد. مفيش سرعة رقمية بتتقال.',
    },
  },
  aerosols: {
    short: {
      en: 'SAMPLE. Sea salt, dust, smoke and sulfate would be four timbres. This series is still a sample.',
      ar: 'تجريبي. ملح البحر والتراب والدخان والكبريتات أربع طبقات صوت. السلسلة لسه تجريبية.',
    },
    detailed: {
      en: 'SAMPLE aerosol series. Real MERRA-2 frames are a pipeline step. Species timbres are sea salt flute, dust pad, smoke brass, sulfate bell.',
      ar: 'سلسلة هباء تجريبية. إطارات MERRA-2 الحقيقية خطوة في خط الأنابيب. الطبقات: ناي، وسادة، نحاس، جرس.',
    },
  },
  air_quality: {
    short: {
      en: 'SAMPLE history. Live Cairo air quality, when the network is up, is a separate Open-Meteo snapshot.',
      ar: 'تاريخ تجريبي. جودة هواء القاهرة المباشرة، لما الشبكة شغالة، لقطة Open-Meteo منفصلة.',
    },
    detailed: {
      en: 'SAMPLE chord. PM2.5, ozone, CO and NOx are four voices when a real snapshot is loaded. The sample series is not a measurement.',
      ar: 'كورد تجريبي. الجسيمات والأوزون وأول أكسيد الكربون وأكاسيد النيتروجين أربع أصوات لما اللقطة الحقيقية تتحمل. السلسلة التجريبية مش قياس.',
    },
  },
  lightning: {
    short: {
      en: 'SAMPLE ticks. Lightning here is historical only: 18 seasons, each a 10-day window, and missing days are not filled.',
      ar: 'تكات تجريبية. البرق هنا تاريخي فقط: 18 موسما، كل واحد 10 أيام، والأيام الناقصة ما بتتملاش.',
    },
    detailed: {
      en: 'SAMPLE flash index, not ISS LIS counts. The seasonal windows run from spring 2017 to summer 2021. A frame records how many days were actually present.',
      ar: 'مؤشر ومضات تجريبي، ليس أعداد LIS. النوافذ من ربيع 2017 لصيف 2021. الإطار بيسجل الأيام الموجودة فعلا.',
    },
  },
  forest: {
    short: {
      en: 'SAMPLE. Taller sample canopy plays a higher note; denser variation widens the sound. The real GEDI layer is not wired yet.',
      ar: 'بيانات تجريبية. الغطاء الأعلى نغمته أعلى؛ والتنوع الأكبر يوسّع الصوت. طبقة GEDI الحقيقية لسه مش متوصلة.',
    },
    detailed: {
      en: 'SAMPLE canopy-height values for 2019–2023, shaped like NASA GEDI. Not a measurement. No map frames are shipped for this layer yet, so the globe shows no forest overlay.',
      ar: 'قيم ارتفاع غطاء تجريبية من 2019 لـ 2023، على شكل GEDI. مش قياس. مفيش إطارات خريطة للطبقة دي لسه، فالكرة ما بتعرضش طبقة غابات.',
    },
  },
  precipitation: {
    short: {
      en: 'SAMPLE. More rain plays faster ticks; dry years fall silent. The real IMERG layer is not wired yet.',
      ar: 'بيانات تجريبية. مطر أكتر يعني تكات أسرع؛ والسنين الجافة تسكت. طبقة IMERG الحقيقية لسه مش متوصلة.',
    },
    detailed: {
      en: 'SAMPLE annual precipitation-rate series for 2000–2025, shaped like IMERG. Not a measurement. No map frames are shipped for this layer yet.',
      ar: 'سلسلة تجريبية لمعدل هطول الأمطار السنوي من 2000 لـ 2025، على شكل IMERG. مش قياس. مفيش إطارات خريطة للطبقة دي لسه.',
    },
  },
  events: {
    short: {
      en: 'SAMPLE. More events play more strikes. The real EONET markers are not wired yet.',
      ar: 'بيانات تجريبية. أحداث أكتر يعني ضربات أكتر. علامات EONET الحقيقية لسه مش متوصلة.',
    },
    detailed: {
      en: 'SAMPLE yearly natural-event counts for 2001–2025, shaped like NASA EONET. Not a measurement. Markers and the event feed are not wired yet.',
      ar: 'أعداد تجريبية للأحداث الطبيعية السنوية من 2001 لـ 2025، على شكل EONET. مش قياس. العلامات وتغذية الأحداث لسه مش متوصلة.',
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
