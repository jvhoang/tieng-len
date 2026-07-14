#!/bin/bash
cd "$(dirname "$0")/.."
node evolve/_tmp_human_gold_patterns.js 2>&1 | tee evolve/_tmp_human_gold_patterns.out
echo EXIT:$?
