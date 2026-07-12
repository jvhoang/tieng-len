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

# Ensure live AI_BUILD matches rung + sync ai-build.js + index inline fallback
python3 - <<PY
from pathlib import Path
import re
from datetime import datetime, timezone
stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
rid = "${RID}"
build = f'''const AI_BUILD = {{
  id: "{rid}",
  stamped: "{stamp}",
  label: "Grandmaster {rid}"
}};'''
ai = Path("ai.js").read_text()
ai = re.sub(r"const AI_BUILD = \{[\s\S]*?\n\};", build, ai, count=1)
# keep early window publish if present
if "TIENLEN_AI_BUILD" not in ai[:800]:
    ai = ai.replace(
        build,
        build + '''

if (typeof window !== 'undefined') {
  window.TIENLEN_AI_BUILD = AI_BUILD;
  window.TienLenAI = window.TienLenAI || {};
  window.TienLenAI.AI_BUILD = AI_BUILD;
}
''',
        1,
    )
Path("ai.js").write_text(ai)

# Zero-dep stamp file for title screen (file:// safe)
Path("ai-build.js").write_text(f'''/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced by evolve/ship-rung.sh from AI_BUILD.
 */
(function (root) {{
  var BUILD = {{
    id: '{rid}',
    stamped: '{stamp}',
    label: 'Grandmaster {rid}'
  }};
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {{}};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === 'object' && module.exports) module.exports = BUILD;
}}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
''')

# Inline fallback in index.html
idx = Path("index.html").read_text()
idx = re.sub(
    r"window\.TIENLEN_AI_BUILD = window\.TIENLEN_AI_BUILD \|\| \{[\s\S]*?\};",
    f"""window.TIENLEN_AI_BUILD = window.TIENLEN_AI_BUILD || {{
      id: '{rid}',
      stamped: '{stamp}',
      label: 'Grandmaster {rid}'
    }};""",
    idx,
    count=1,
)
# bump site build token for http(s) cache bust
idx = re.sub(
    r"window\.TIENLEN_SITE_BUILD = '[^']*';",
    f"window.TIENLEN_SITE_BUILD = '{stamp[:10].replace('-', '')}{stamp[11:13]}{stamp[14:16]}';",
    idx,
    count=1,
)
Path("index.html").write_text(idx)
print("live stamped", rid, stamp)
PY

git add ai.js search.js ai-build.js index.html \
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
