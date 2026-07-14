#!/bin/bash
cd "$(dirname "$0")/.."
python3 evolve/_tmp_combat_residual_census.py 2>&1 | tee evolve/_tmp_combat_residual_census.out
echo EXIT:$?
