import {
  parseEonet,
  parseGistemp,
  parseNoaaCo2,
  parseOpenMeteo,
  parseOpenMeteoAq,
} from '../src/modules/data';

async function text(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

async function main(): Promise<void> {
  const gistemp = parseGistemp(
    await text('https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv'),
  );
  if (!gistemp.some((row) => row.year === 2025 && row.value !== null)) {
    throw new Error('GISTEMP did not parse');
  }
  const co2 = parseNoaaCo2(
    await text('https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv'),
  );
  if (co2.length < 100) throw new Error('CO2 did not parse');
  const weather = parseOpenMeteo(
    await (
      await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=30.04&longitude=31.24&current=temperature_2m,wind_speed_10m,precipitation',
        { signal: AbortSignal.timeout(20000) },
      )
    ).json(),
  );
  if (!weather) throw new Error('Open-Meteo did not parse');
  const air = parseOpenMeteoAq(
    await (
      await fetch(
        'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.04&longitude=31.24&current=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,us_aqi',
        { signal: AbortSignal.timeout(20000) },
      )
    ).json(),
  );
  if (!air) throw new Error('Open-Meteo AQ did not parse');
  const events = parseEonet(
    await (
      await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7', {
        signal: AbortSignal.timeout(20000),
      })
    ).json(),
  );
  if (!Array.isArray(events)) throw new Error('EONET did not parse');
  console.log(`canary ok gistemp=${gistemp.length} co2=${co2.length} events=${events.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'canary failed');
  process.exit(1);
});
