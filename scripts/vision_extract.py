#!/usr/bin/env python3
"""Ekstrak isi 'content' dari output JSON z-ai vision yang disimpan di file."""
import json
import re
import sys

raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()
m = re.search(r"\{.*\}", raw, re.S)
if not m:
    print("NO_JSON")
    sys.exit(1)
try:
    d = json.loads(m.group(0))
    print(d["choices"][0]["message"]["content"])
except Exception as e:
    print(f"PARSE_ERROR: {e}")
    sys.exit(1)
