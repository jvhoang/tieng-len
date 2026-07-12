#!/usr/bin/env bash
# Ship an achieved ladder rung to GitHub for live testing.
# Usage (from tieng-len/):
#   bash evolve/ship-rung.sh v8.6 v86
# Requires: live ai.js/search.js already stamped with the rung id;
#           gate JSON already present (primary + optional re-run).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RID="${1:?rung id e.g. v8.6}"
TAG="${2:?freeze tag e.g. v86}"
MSG="${3:-Grandmaster ${RID}: ladder gate passed (GM N>=50 >70%); ship for live testing}"

# Freeze current live under policies/
node evolve/freeze-live.js "$TAG" "$RID"
python3 - <<PY
from pathlib import Path
import re
from datetime import datetime, timezone
t = Path("policies/${TAG}-ai.js").read_text()
t = re.sub(
    r"const AI_BUILD = \{[\s\S]*?\n\};",
    '''const AI_BUILD = {
  id: "${RID}",
  stamped: "''' + datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") + '''",
  label: "Grandmaster ${RID} (ladder freeze)"
};''',
    t,
    count=1,
)
Path("policies/${TAG}-ai.js").write_text(t)
print("freeze stamped", "${RID}")
PY

# Ensure live AI_BUILD matches rung
python3 - <<PY
from pathlib import Path
import re
from datetime import datetime, timezone
ai = Path("ai.js").read_text()
ai = re.sub(
    r"const AI_BUILD = \{[\s\S]*?\n\};",
    '''const AI_BUILD = {
  id: "${RID}",
  stamped: "''' + datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") + '''",
  label: "Grandmaster ${RID}"
};''',
    ai,
    count=1,
)
Path("ai.js").write_text(ai)
print("live stamped", "${RID}")
PY

git add ai.js search.js \
  "policies/${TAG}-ai.js" "policies/${TAG}-search.js" \
  evolve/LADDER-STATUS.md evolve/bench-ladder.js \
  evolve/refresh-playlogs-all.js evolve/counterfactual-79-latest.js \
  evolve/ship-rung.sh \
  evolve/*-gm-final.json evolve/*-gm-rerun.json 2>/dev/null || true

# Also add CF summaries if present
git add evolve/counterfactual-*-summary.json evolve/human-vs-*-counterfactual*.md 2>/dev/null || true
git add evolve/playlog-index.json 2>/dev/null || true

git status -sb
git commit -m "$MSG" || {
  echo "Nothing new to commit (or commit failed)"
  exit 0
}
git push origin HEAD
# GitHub Pages serves the gh-pages branch (not main). Keep them aligned.
git branch -f gh-pages HEAD 2>/dev/null || true
git push origin gh-pages --force 2>/dev/null || true
echo "SHIPPED ${RID} → origin main + gh-pages (live testing: hard-refresh site)"
