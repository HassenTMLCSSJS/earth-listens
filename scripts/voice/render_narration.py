#!/usr/bin/env python3
"""Render fixed Earth Listens narration with Resemble AI Chatterbox (MIT).

Chatterbox is archived and unmaintained as of August 2026. Resemble AI no
longer ships or supports it. This script keeps the library's built-in Perth
watermark. It does not strip it.

Do not install Chatterbox into the pipeline environment. On Python 3.12 it
pins numpy<2, and this repo's pipeline pins numpy 2.5.4.

Finish the render
-----------------
From the repo root, with ffmpeg on PATH:

    python3 -m venv /tmp/chatterbox-venv
    # PyPI chatterbox-tts 0.1.7 is Turbo + Multilingual V2 only.
    # Nano and Multilingual V3 are on the archived GitHub master.
    /tmp/chatterbox-venv/bin/pip install "chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox.git"
    pnpm voice:collect
    /tmp/chatterbox-venv/bin/python scripts/voice/render_narration.py --device cpu

English is Chatterbox-Nano (110M, CPU). The checkpoint ships conds.pt, so no
speaker recording is required. Arabic is Chatterbox Multilingual V3
(language_id=ar) reading the strings already in the repo. Those Arabic
strings are Egyptian colloquial, the same words as the captions. The model
is the multilingual MSA-capable checkpoint; the script does not rewrite them.

Paralinguistic tags such as [chuckle] are left untouched if a source line
contains one. Current lines do not use them.

Useful subsets while a full pass is too slow:

    .../python scripts/voice/render_narration.py --device cpu --lang en --limit 8
    .../python scripts/voice/render_narration.py --device cpu --lang ar --limit 4
    .../python scripts/voice/render_narration.py --dry-run

Files of 3_000_000 bytes or more are written under release-assets/narration/
(gitignored). Their manifest URL is the public R2 prefix v1/narration/. Hassan
uploads that directory from a shell that already has the R2 env vars:

    node scripts/upload-r2.mjs --dir release-assets
    node scripts/upload-r2.mjs --dir release-assets --yes

Smaller MP3s stay in public/audio/narration/<lang>/<sha256>.mp3 and are
committed. Re-running skips an MP3 that already exists.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))

from earth_pipeline.narration import narration_hash  # noqa: E402

R2_BASE = "https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev"
MAX_GIT_BYTES = 3_000_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render fixed narration with Chatterbox")
    parser.add_argument("--sources", type=Path, default=ROOT / "public/data/narration.sources.json")
    parser.add_argument("--manifest", type=Path, default=ROOT / "public/data/narration.manifest.json")
    parser.add_argument(
        "--legacy",
        type=Path,
        default=ROOT / "public/audio/narration/manifest.json",
    )
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--lang", choices=("en", "ar", "both"), default="both")
    parser.add_argument("--limit", type=int, default=0, help="shortest N lines per language; 0 = all")
    parser.add_argument("--ids", action="append", default=[], help="id prefix, repeatable")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def select_lines(lines: list[dict], args: argparse.Namespace) -> list[dict]:
    chosen = []
    for line in lines:
        if args.lang != "both" and line["lang"] != args.lang:
            continue
        if args.ids and not any(str(line["id"]).startswith(prefix) for prefix in args.ids):
            continue
        chosen.append(line)
    if args.limit > 0:
        per_lang: dict[str, list[dict]] = {"en": [], "ar": []}
        for line in sorted(chosen, key=lambda item: len(item["text"])):
            bucket = per_lang[line["lang"]]
            if len(bucket) < args.limit:
                bucket.append(line)
        chosen = per_lang["en"] + per_lang["ar"]
    return chosen


def load_model(lang: str, device: str):
    """Prefer Nano and Multilingual V3. PyPI 0.1.7 only has Turbo and V2."""
    if lang == "en":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        try:
            return ChatterboxTurboTTS.from_pretrained(device, nano=True), "chatterbox-nano"
        except TypeError:
            print("installed Chatterbox has no nano=True; using Chatterbox-Turbo")
            return ChatterboxTurboTTS.from_pretrained(device), "chatterbox-turbo"
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    try:
        return (
            ChatterboxMultilingualTTS.from_pretrained(device, t3_model="v3"),
            "chatterbox-multilingual-v3",
        )
    except TypeError:
        print("installed Chatterbox has no t3_model=v3; using the wheel's multilingual checkpoint")
        return ChatterboxMultilingualTTS.from_pretrained(device), "chatterbox-multilingual-v2"


def synthesize(model, lang: str, text: str):
    if lang == "ar":
        return model.generate(text, language_id="ar")
    return model.generate(text)


def write_mp3(wav, sample_rate: int, dest: Path) -> float:
    import numpy as np
    import torch
    import torchaudio

    if isinstance(wav, np.ndarray):
        tensor = torch.from_numpy(wav)
    else:
        tensor = wav.detach().cpu()
    tensor = tensor.float()
    if tensor.dim() == 1:
        tensor = tensor.unsqueeze(0)
    duration = float(tensor.shape[-1]) / float(sample_rate)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
        wav_path = Path(handle.name)
    torchaudio.save(str(wav_path), tensor, sample_rate)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "5",
            str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wav_path.unlink(missing_ok=True)
    return duration


def place_audio(temp_mp3: Path, lang: str, digest: str) -> tuple[str, int]:
    size = temp_mp3.stat().st_size
    name = f"{digest}.mp3"
    if size < MAX_GIT_BYTES:
        dest = ROOT / "public/audio/narration" / lang / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(temp_mp3), dest)
        return f"/audio/narration/{lang}/{name}", size
    dest = ROOT / "release-assets/narration" / lang / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(temp_mp3), dest)
    return f"{R2_BASE}/v1/narration/{lang}/{name}", size


def main() -> None:
    args = parse_args()
    if shutil.which("ffmpeg") is None and not args.dry_run:
        raise SystemExit("ffmpeg is required to write MP3s")
    sources = json.loads(args.sources.read_text())
    chosen = select_lines(sources["lines"], args)
    print(f"{len(chosen)} lines selected of {len(sources['lines'])}")
    if args.dry_run:
        for line in chosen:
            print(f"  {line['lang']} {line['id']} {len(line['text'])} chars")
        return

    manifest = json.loads(args.manifest.read_text()) if args.manifest.exists() else {"items": []}
    items = {f"{item['lang']}:{item['hash']}": item for item in manifest.get("items", [])}
    legacy = json.loads(args.legacy.read_text()) if args.legacy.exists() else None
    models: dict[str, tuple[object, str]] = {}

    for line in chosen:
        digest = narration_hash(line["lang"], line["text"])
        key = f"{line['lang']}:{digest}"
        public_mp3 = ROOT / "public/audio/narration" / line["lang"] / f"{digest}.mp3"
        release_mp3 = ROOT / "release-assets/narration" / line["lang"] / f"{digest}.mp3"
        if key in items and (public_mp3.exists() or release_mp3.exists()):
            print(f"skip {line['id']} {line['lang']}")
            continue
        if line["lang"] not in models:
            print(f"loading {line['lang']} model on {args.device}")
            models[line["lang"]] = load_model(line["lang"], args.device)
        model, engine = models[line["lang"]]
        print(f"render {line['lang']} {line['id']}")
        wav = synthesize(model, line["lang"], line["text"])
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as handle:
            temp_mp3 = Path(handle.name)
        duration = write_mp3(wav, int(model.sr), temp_mp3)
        url, size = place_audio(temp_mp3, line["lang"], digest)
        record = {
            "hash": digest,
            "lang": line["lang"],
            "url": url,
            "duration": round(duration, 3),
            "bytes": size,
            "id": line["id"],
            "kind": line["kind"],
            "engine": engine,
            "watermark": "resemble-perth",
        }
        items[key] = record
        print(f"  {size} bytes {duration:.2f}s {url}")
        if legacy and line["kind"] == "script" and url.startswith("/audio/"):
            for entry in legacy["items"]:
                if entry["id"] != line["id"]:
                    continue
                side = entry[line["lang"]]
                side["file"] = url
                side["status"] = "recorded"

    manifest["items"] = sorted(items.values(), key=lambda item: (item["lang"], item["id"]))
    manifest["watermark"] = "resemble-perth"
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if legacy:
        args.legacy.write_text(json.dumps(legacy, ensure_ascii=False, indent=2) + "\n")
    print(f"manifest {args.manifest} ({len(manifest['items'])} clips)")


if __name__ == "__main__":
    main()
