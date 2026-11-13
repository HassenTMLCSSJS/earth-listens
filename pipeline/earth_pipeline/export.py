"""Write a real-data layer file and check it against the exported JSON Schema."""

from __future__ import annotations

import json
from pathlib import Path

import jsonschema


def export_layer(payload: dict, dest: Path, schema_path: Path) -> None:
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    jsonschema.validate(payload, schema)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
