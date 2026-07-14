#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/johnhoang/Developer/Grok/tieng-len"
SCRATCH="${SCRATCH:-/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-7f76e5fc4524/implementer}"
cd "$ROOT"
mkdir -p "$SCRATCH"
LOG="$SCRATCH/supervisor.log"
exec >>"$LOG" 2>&1
echo "=== supervisor start $(date -u +%Y-%m-%dT%H:%M:%SZ) tags=${WAIT_TAGS:-p_r99g,p_r99f} ==="

live_id() { node -e 'try{console.log(require("./ai-build.js").id)}catch(e){console.log("?")}'; }

has_convert() {
  ps aux | awk '/node evolve\/ship-convert-rung/ && !/awk/ {found=1} END{exit !found}'
}

# Wait for any of the listed ship-rung reports
IFS=',' read -r -a TAGS <<< "${WAIT_TAGS:-p_r99g,p_r99f}"
REPORT=""
CHALL=""
while true; do
  for t in "${TAGS[@]}"; do
    if [ -f "evolve/ship-rung-${t}.json" ]; then
      if node -e "var r=require('./evolve/ship-rung-${t}.json'); process.exit(r.passed?0:2)"; then
        REPORT="evolve/ship-rung-${t}.json"
        CHALL=$(node -e "console.log(require('./${REPORT}').chall)")
        echo "FOUND PASS $REPORT chall=$CHALL"
        break 2
      else
        echo "found FAIL report ship-rung-${t}.json — keep waiting for better"
      fi
    fi
  done
  if ! has_convert; then
    # if live already advanced, skip wait
    L=$(live_id)
    echo "no convert; live=$L"
    break
  fi
  sleep 30
  echo "… wait convert live=$(live_id) $(date -u +%H:%M:%S)"
done

if [ -n "$REPORT" ] && [ -n "$CHALL" ]; then
  # promote to v9.9 if still on v9.8
  L=$(live_id)
  if [ "$L" = "v9.8" ] || [ "$L" = "v9.7" ]; then
    echo "PROMOTE v9.9 bank=$CHALL"
    node evolve/promote-bank-to-live.js "$CHALL" v9.9 v99
  fi
fi

LIVE=$(live_id)
echo "live=$LIVE"
if [ "$LIVE" = "v11.0" ]; then echo DONE; exit 0; fi

# map live -> next start
case "$LIVE" in
  v9.8) START=v9.9 ;;
  v9.9) START=v10.0 ;;
  v10.0) START=v10.1 ;;
  v10.1) START=v10.2 ;;
  v10.2) START=v10.3 ;;
  v10.3) START=v10.4 ;;
  v10.4) START=v10.5 ;;
  v10.5) START=v10.6 ;;
  v10.6) START=v10.7 ;;
  v10.7) START=v10.8 ;;
  v10.8) START=v10.9 ;;
  v10.9) START=v11.0 ;;
  *) START=v9.9 ;;
esac

# if still v9.8 and convert failed, exit 2
if [ "$LIVE" = "v9.8" ]; then
  echo "still v9.8 after wait — convert may have failed"
  # try ladder anyway starting v9.9 (will convert fresh)
  START=v9.9
fi

echo "ladder START_FROM=$START FORCE_SEAT_CAP=20"
export START_FROM="$START" TARGET=v11.0 MAX_PACKS=35 FORCE_SEAT_CAP=20
export SOFT=0 MS=0 TRIALS=20 GAMES=25 BOTH_SEATS=1 SCRATCH
node evolve/ladder-to-v11.js
echo "ladder exit $? live=$(live_id)"
exit $?
