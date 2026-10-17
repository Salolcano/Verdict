#!/usr/bin/env python3
"""Contract source must be LF-only: CRLF changes the bytes the network hashes."""
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
bad = [str(p.relative_to(root)) for p in [*root.glob("contracts/*.py"), *root.glob("scripts/src/*.py")]
       if b"\r\n" in p.read_bytes()]
print("CRLF found in: " + ", ".join(bad) if bad else "all contract sources are LF-only")
sys.exit(1 if bad else 0)
