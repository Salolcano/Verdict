#!/usr/bin/env python3
"""
Inlines scripts/src/verdict_lib.py into scripts/src/verdict_template.py and writes
contracts/Verdict.py -- the ONE complete file the network receives (sibling imports
fail contract validation). Edit the files in scripts/src/, never contracts/Verdict.py. The first line stays the bare `# { "Depends": ... }`
comment. Usage: python scripts/build_bundle.py [--check]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "scripts" / "src" / "verdict_lib.py"
SRC = ROOT / "scripts" / "src" / "verdict_template.py"
OUT = ROOT / "contracts" / "Verdict.py"
BEGIN = "# BEGIN VERDICT_LIB INLINE"
END = "# END VERDICT_LIB INLINE"
MAX_BYTES = 52224


def strip_lib(text: str) -> str:
    m = re.match(r'\s*""".*?"""\s*', text, flags=re.S)
    if m:
        text = text[m.end():]
    keep = [l for l in text.splitlines()
            if l.strip() not in ("import json", "import re")
            and not l.startswith("from __future__ import")]
    return "\n".join(keep).strip("\n") + "\n"


def build() -> str:
    src = SRC.read_text(encoding="utf-8").replace("\r\n", "\n")
    lines = src.split("\n")
    b = next(i for i, l in enumerate(lines) if BEGIN in l)
    e = next(i for i, l in enumerate(lines) if END in l)
    # keep the two '# ====' rule lines that follow BEGIN and precede END
    out = lines[: b + 2] + strip_lib(LIB.read_text(encoding="utf-8").replace("\r\n", "\n")).split("\n") + lines[e - 1:]
    text = "\n".join(out)
    assert text.startswith('# { "Depends": "py-genlayer:'), "Depends header must be line 1"
    return text


def main() -> int:
    text = build()
    size = len(text.encode())
    if size > MAX_BYTES:
        print(f"bundle is {size} bytes, over the {MAX_BYTES} deploy ceiling")
        return 1
    if "--check" in sys.argv:
        ok = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("bundle is up to date" if ok else "bundle is STALE: run scripts/build_bundle.py")
        return 0 if ok else 1
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)} ({size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
