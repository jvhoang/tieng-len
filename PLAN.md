# PLAN — Live play log / history (data collection)

**Goal:** Record every live game on the GitHub site with analysis-grade detail, and provide a UI to browse/export logs so human-vs-AI deep dives can improve the AI.

## Design
- **Client-side first** (static Pages): `localStorage` via `play-log.js`
- **Schema v1:** full deal hands + ordered events (play/pass) + AI search stats + outcome
- **Controller hooks:** start on reconfigure/newRound; log each human/AI action; finalize on roundOver
- **UI:** title-screen “Game History” card → panel list + detail + export JSON / clear
- **No new remote backend** yet (export files for offline analysis); optional remote later

## Deliverables
1. `play-log.js`
2. Controller integration
3. History UI in `index.html` (+ glue)
4. Tests for store/export/schema
5. Cache-bust + STATUS
