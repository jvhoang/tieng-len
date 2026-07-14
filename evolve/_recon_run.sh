#!/usr/bin/env bash
# Reconstruct residual v9.3 dual-loss deals.
cd "$(dirname "$0")/.."
node evolve/_recon-v93-losses.js
