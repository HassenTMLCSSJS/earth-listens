# Earth Sonification Language

The constants in this file are the ones in `src/modules/sonification/constants.ts`. The score builder is pure. Tone.js only renders a score that was already computed.

## Four steps

1. **Find variables.** Each layer config names the series key, the unit, and the mapping for how much, how strong, how fast, and where.
2. **Normalize** to `n` in `[0, 1]`.
3. **Map** `n` to pitch, gain, rhythm, and a spatial position.
4. **Synthesize** with Tone.js. A global or non-spatial voice sits at `(0, 0, -1)` with pan `0`.

Floats in a score are rounded to 6 decimal places, and `-0` becomes `0`. Events are sorted by `t`, then `layerId`, then `voiceId`.

## Normalization

Min-max, then clamp:

```
n = clamp((v - min) / (max - min), 0, 1)
```

If `max === min`, `n` is `0.5`. A missing value stays missing and is not a note.

Robust mode uses Hyndman–Fan type 7 percentiles. The default window is the 5th and 95th.

A constant `0.5` with range `[0, 1]` is `n = 0.5`, which is `-18 dB` of strength. Sea ice and CO2 use that constant strength in the sample configs.

## How much: pitch

```
midiRaw = register.lo + n * (register.hi - register.lo)
Hz = 440 * 2 ** ((midi - 69) / 12)
```

| Layer       | Solo register | Symphony register |
| ----------- | ------------- | ----------------- |
| temperature | 48–84         | 48–67             |
| wildfire    | 60–84         | 69–81             |
| sea ice     | 72–96         | 84–96             |
| CO2         | 36–43         | 36–43             |

Quantize picks the nearest scale degree. A tie within `1e-9` picks the lower note. The sample CO2 checks are 315 ppm → `n = 0.038462` → MIDI 36 → `65.4064 Hz`, and 427 ppm → `n = 0.9` → MIDI 43 → `97.9989 Hz`.

Scales: pentatonic major, major, chromatic, and the maqamat Rast, Bayati, Hijaz, and Nahawand. Each maqam has a microtonal cent row and a 12-TET fallback. The jukebox checkbox selects the fallback.

## How strong: volume

```
strengthDb = -30 + 24 * n
voiceCountDb = -10 * log10(N)
symphonyTrimDb = -10 * log10(layerCount)
gainDb = min(-6, strengthDb + voiceCountDb + backDb + trimDb)
```

`N` is at least 1. The master volume is clamped to `[-40, 0]` dB. Earcons sit at `-12 dB`.

## Where: position

Latitude and longitude are relative to the view centre. Egypt’s centre in the region table is latitude `26.8`, longitude `30.8`.

```
x = cos(lat) * sin(Δlon)
y = cos(viewLat) * sin(lat) - sin(viewLat) * cos(lat) * cos(Δlon)
z = sin(viewLat) * sin(lat) + cos(viewLat) * cos(lat) * cos(Δlon)
backDb = z < 0 ? 9 * z : 0
lowpassHz = z >= 0 ? 20000 : 800 * 25 ** (1 + z)
```

The panner position is `(x, y, -z)` and the stereo pan is `x`. A lowpass at longitude `135` is about `2053.70 Hz`.

Wildfire keeps the top 24 cells by count. Ties break by latitude descending, then longitude ascending. The voice id is `wildfire:lat,lon`.

## How fast: rhythm

`delta` is the change since the previous step. For wildfire cells that step is 7 days.

```
r = clamp(|delta| / max(|range.lo|, |range.hi|), 0, 1)
ticks = 1 + floor(3 * r + 0.5)
bpm = 60 + 120 * r
```

## What: timbre

| Layer       | Timbre name     |
| ----------- | --------------- |
| temperature | warm-lead       |
| wildfire    | crackle-marimba |
| sea ice     | glass-bells     |
| CO2         | beating-drone   |

The player loads Tone.js on the first unlock and builds the timbre named on the note:

| Timbre          | Recipe                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| warm-lead       | `PolySynth(Synth)` with a 3-voice `fatsawtooth` (spread 20) into a 2400 Hz lowpass. Attack 0.02, decay 0.1, sustain 0.6, release 0.3.                          |
| crackle-marimba | Sine `Synth`, attack 0.001, decay 0.4, sustain 0, release 0.2. Each tick is a `Player` on a 30 ms exponential burst from `mulberry32(hashString('wildfire'))`. |
| glass-bells     | `FMSynth`, harmonicity 3.5, modulation index 10, sine carriers. Attack 0.001, decay 1.2, sustain 0, release 1.5.                                               |
| beating-drone   | Two sine oscillators at `f` and `f + 3` Hz through a `Tremolo`. Depth is the seasonal amplitude divided by 10, clamped to 0–1. Rate is `1 / stepSec`.          |

Every voice still ends in an HRTF `Panner3D` and a `Gain`. The CO2 depth and the step length are playback options. They are not fields on the note, so the score snapshot stays the same.

## Playback

| Mode     | Timing                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------- |
| Sweep    | `nSteps * stepSec`, with `stepSec` of `0.6` / `0.3` / `0.15`                                      |
| Dwell    | 8 seconds on the current time                                                                     |
| Compare  | 2 seconds, then 0.5 seconds of silence, then 2 seconds. Each note’s duration is the 2 second slot |
| Symphony | years `config.symphony.from`–`to` of the first layer, skipping years with no data                 |

Symphony always uses temperature, wildfire, sea ice, and CO2, in that order. Wildfire in a symphony reads the annual series and is treated as one global voice. The sample annual wildfire values stay inside the FRP range `[0, 100]` so strength does not clamp. The detection-count range `[0, 500]` is what “how much” uses for the daily map.

A missing value inserts the missing earcon. Playback fades out over 0.5 seconds on stop.
