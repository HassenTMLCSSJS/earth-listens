"""Content hash for pre-rendered narration. Matches src/modules/voice/plan.ts."""

from __future__ import annotations

import hashlib


def narration_hash(lang: str, text: str) -> str:
    if lang not in {"en", "ar"}:
        raise ValueError(f"unsupported lang {lang}")
    return hashlib.sha256(f"{lang}\n{text}".encode()).hexdigest()
