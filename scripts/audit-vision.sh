#!/bin/bash
# Audit visual: kirim screenshot ke VLM dengan pertanyaan spesifik
# usage: ./audit-vision.sh <image> <prompt-file-or-inline>
IMG="$1"
PROMPT="$2"
z-ai vision -p "$PROMPT" -i "$IMG" 2>/dev/null
