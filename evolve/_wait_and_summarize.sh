#!/bin/bash
# Wait for BASE det dump, then run all patch seed-duels + summarize.
set -e
ROOT="/Users/johnhoang/Developer/Grok/tieng-len"
cd "$ROOT"
PID=$(cat evolve/v92-BASE-det.pid)
LOG=evolve/v92-hunt.log
echo "waiting for BASE pid $PID" | tee -a "$LOG"
while kill -0 "$PID" 2>/dev/null; do
  n=$(grep -c '"seed"' evolve/v92-seed-BASE-det.out 2>/dev/null || echo 0)
  echo "$(date -u +%H:%M:%S) BASE n=$n" | tee -a "$LOG"
  sleep 30
done
echo "BASE done" | tee -a "$LOG"
tail -2 evolve/v92-seed-BASE-det.out | tee -a "$LOG"

# extract losses
python3 - <<'PY' | tee -a evolve/v92-hunt.log
import json
from pathlib import Path
rows=[]
for l in Path('evolve/v92-seed-BASE-det.out').read_text().splitlines():
  if l.startswith('{') and '"seed"' in l and 'liveWin' in l:
    rows.append(json.loads(l))
losses=[r['seed'] for r in rows if not r['liveWin']]
wins20=[]
all_seeds=[20260711+g*9973 for g in range(50)]
by={r['seed']:r for r in rows}
for s in all_seeds[:20]:
  if by.get(s) and by[s]['liveWin']:
    wins20.append(s)
Path('evolve/v92-loss-seeds.json').write_text(json.dumps({
  'n': len(rows),
  'liveWins': sum(1 for r in rows if r['liveWin']),
  'rate': sum(1 for r in rows if r['liveWin'])/max(1,len(rows)),
  'lossSeeds': losses,
  'winSeedsFirst20': wins20,
  'det': True,
  'budget': 'live140/freeze100'
}, indent=2))
print('BASE wins', sum(1 for r in rows if r['liveWin']), '/', len(rows))
print('LOSS', losses)
print('WINS20', wins20)
Path('evolve/v92-loss-list.txt').write_text(','.join(map(str,losses)))
Path('evolve/v92-wins20-list.txt').write_text(','.join(map(str,wins20)))
PY

export TIENLEN_FREEZE=v91 TIENLEN_FREEZE_MS=100 TIENLEN_FREEZE_ITERS=64
export TIENLEN_V8_MS=140 TIENLEN_V8_ITERS=100 TIENLEN_BR_TRIALS=40 TIENLEN_EXACT=1
LOSS=$(cat evolve/v92-loss-list.txt)
WINS20=$(cat evolve/v92-wins20-list.txt)

for p in MIDGAP SOFTPASS11 TWO7 TRASHFL STRUCT; do
  echo "=== $p losses $(date -u +%H:%M:%S) ===" | tee -a "$LOG"
  TIENLEN_PATCH=$p SEEDS=$LOSS node evolve/seed-duel.js > evolve/v92-seed-$p.out 2>&1
  tail -1 evolve/v92-seed-$p.out | tee -a "$LOG"
done

# win regression for candidates that flip >=2
python3 - <<'PY' | tee -a evolve/v92-hunt.log
import json
from pathlib import Path
losses=list(map(int, Path('evolve/v92-loss-list.txt').read_text().split(','))) if Path('evolve/v92-loss-list.txt').read_text().strip() else []
def load(name):
  m={}
  p=Path(f'evolve/v92-seed-{name}.out')
  if not p.exists(): return m
  for l in p.read_text().splitlines():
    if l.startswith('{') and '"seed"' in l and 'liveWin' in l:
      r=json.loads(l); m[r['seed']]=r['liveWin']
  return m
cands=[]
for name in ['MIDGAP','SOFTPASS11','TWO7','TRASHFL','STRUCT']:
  m=load(name)
  flips=[s for s in losses if m.get(s) is True]
  print(name, 'flips', len(flips), flips)
  if len(flips) >= 2:
    cands.append(name)
Path('evolve/v92-cands.txt').write_text('\n'.join(cands))
print('cands', cands)
PY

# regression first-20 wins for candidates
if [ -s evolve/v92-cands.txt ]; then
  while read p; do
    [ -z "$p" ] && continue
    echo "=== $p wins20 $(date -u +%H:%M:%S) ===" | tee -a "$LOG"
    TIENLEN_PATCH=$p SEEDS=$WINS20 node evolve/seed-duel.js > evolve/v92-seed-$p-wins20.out 2>&1
    tail -1 evolve/v92-seed-$p-wins20.out | tee -a "$LOG"
  done < evolve/v92-cands.txt
fi

python3 - <<'PY' | tee -a evolve/v92-hunt.log
import json
from pathlib import Path
print('=== SUMMARY ===')
base=json.loads(Path('evolve/v92-loss-seeds.json').read_text())
print('BASE', base['liveWins'], base['n'], base['rate'])
losses=base['lossSeeds']
wins20=base['winSeedsFirst20']
for name in ['MIDGAP','SOFTPASS11','TWO7','TRASHFL','STRUCT']:
  m={}
  p=Path(f'evolve/v92-seed-{name}.out')
  if not p.exists(): continue
  for l in p.read_text().splitlines():
    if l.startswith('{') and '"seed"' in l and 'liveWin' in l:
      r=json.loads(l); m[r['seed']]=r['liveWin']
  flips=[s for s in losses if m.get(s) is True]
  wp=Path(f'evolve/v92-seed-{name}-wins20.out')
  wflip=[]
  if wp.exists():
    wm={}
    for l in wp.read_text().splitlines():
      if l.startswith('{') and '"seed"' in l and 'liveWin' in l:
        r=json.loads(l); wm[r['seed']]=r['liveWin']
    wflip=[s for s in wins20 if wm.get(s) is False]
  print(f'{name}: lossFlips={len(flips)} {flips} winFlips={len(wflip)} {wflip} candidate={len(flips)>=2 and len(wflip)<2}')
print('HUNT_DONE')
Path('evolve/v92-hunt.done').write_text('ok')
PY
echo HUNT_SCRIPT_DONE | tee -a "$LOG"
