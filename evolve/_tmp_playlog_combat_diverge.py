#!/usr/bin/env python3
"""
READ-ONLY combat diverge census for newest playlog.
Writes:
  - tieng-len/scratch/playlog-combat-diverge.json
  - explore scratch copy
SoftN forbidden. No duals.
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, "john_uploads", "tienlen-playlogs-1784002833123.json")
OUT_JSON = os.path.join(ROOT, "scratch", "playlog-combat-diverge.json")
OUT_JSON_EXPLORE = (
    "/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-2452caa32616/"
    "implementer/explore/scratch/playlog-combat-diverge.json"
)

RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
SUITS = ["s", "c", "d", "h"]
SUIT_SYM = {"s": "♠", "c": "♣", "d": "♦", "h": "♥"}


def rank_name(r):
    if r is None:
        return "?"
    return RANKS[r] if 0 <= r < len(RANKS) else str(r)


def card_str(c):
    return RANKS[c["rank"]] + SUIT_SYM[SUITS[c["suit"]]]


def cards_str(cards):
    if not cards:
        return "PASS"
    return " ".join(card_str(c) for c in cards)


def by_rank_counts(hand):
    m = Counter()
    for c in hand or []:
        m[c["rank"]] += 1
    return m


def detect_combo(raw):
    if not raw:
        return None
    cards = sorted(raw, key=lambda c: (-c["rank"], -c["suit"]))
    n = len(cards)
    if n == 1:
        return {"type": "single", "top": cards[0], "size": 1}
    groups = Counter(c["rank"] for c in cards)
    ranks = sorted(groups.keys(), reverse=True)
    counts = list(groups.values())
    if len(ranks) == 1:
        cnt = groups[ranks[0]]
        if cnt == 2:
            return {"type": "pair", "top": cards[0], "size": 2}
        if cnt == 3:
            return {"type": "triple", "top": cards[0], "size": 3}
        if cnt == 4:
            return {"type": "quad", "top": cards[0], "size": 4}
        return None
    is_seq = len(ranks) == n and all(c == 1 for c in counts)
    if is_seq:
        consec = all(ranks[i - 1] - ranks[i] == 1 for i in range(1, len(ranks)))
        if consec and n >= 3 and all(r != 12 for r in ranks):
            return {"type": "seq", "top": cards[0], "size": n}
    all_pairs = all(c == 2 for c in counts) and len(ranks) >= 3
    if all_pairs:
        consec = all(ranks[i - 1] - ranks[i] == 1 for i in range(1, len(ranks)))
        if consec:
            return {
                "type": "doubleseq",
                "top": cards[0],
                "size": n,
                "numPairs": len(ranks),
            }
    return None


def structure_break_cost(hand, play):
    if not play:
        return 0
    br = by_rank_counts(hand)
    cost = 0
    play_ranks = Counter(c["rank"] for c in play)
    for rk, used in play_ranks.items():
        left = br[rk] - used
        had = br[rk]
        if had >= 2 and left == 1 and used == 1:
            cost += 8
        if had == 2 and used == 1:
            cost += 5
        if had >= 3 and 0 < left < 3 and used < had:
            cost += 4
        if left == 0:
            if br[rk - 1] and br[rk + 1]:
                cost += 3
            elif br[rk - 1] or br[rk + 1]:
                cost += 1
    if len(play) == 1 and br[play[0]["rank"]] >= 2:
        cost += 12
    if len(play) == 1:
        pr0 = play[0]["rank"]
        nbr_l = br[pr0 - 1]
        nbr_r = br[pr0 + 1]
        if nbr_l and nbr_r:
            cost += 10
        elif nbr_l or nbr_r:
            cost += 4
    return cost


def play_has_two(play):
    return any(c["rank"] == 12 for c in (play or []))


def play_is_bomb(play):
    com = detect_combo(play)
    if not com:
        return False
    return com["type"] == "quad" or (
        com["type"] == "doubleseq" and com.get("numPairs", 0) >= 3
    )


def play_is_expensive(play):
    return play_has_two(play) or play_is_bomb(play)


def cheap_legals(legals):
    return [p for p in (legals or []) if not play_is_expensive(p)]


def is_pair_break(hand, play):
    if not play or len(play) != 1:
        return False
    return by_rank_counts(hand)[play[0]["rank"]] >= 2


def is_loose_single(hand, play):
    if not play or len(play) != 1:
        return False
    return by_rank_counts(hand)[play[0]["rank"]] == 1


def hand_has_two(hand):
    return any(c["rank"] == 12 for c in (hand or []))


def analyze_hand(hand):
    br = by_rank_counts(hand)
    ranks = sorted(br.keys())
    in_seq = set()
    for length in range(3, len(ranks) + 1):
        for st in range(0, len(ranks) - length + 1):
            ok = all(ranks[st + k] == ranks[st] + k for k in range(length))
            if ok:
                for k in range(length):
                    in_seq.add(ranks[st + k])
    trash = []
    control = 0
    twos = 0
    for c in hand or []:
        if c["rank"] == 12:
            twos += 1
        if c["rank"] >= 10:
            control += 1
        if br[c["rank"]] == 1 and c["rank"] not in in_seq and c["rank"] <= 9:
            trash.append(c)
    return {
        "byRank": br,
        "trash": trash,
        "trashCount": len(trash),
        "twos": twos,
        "control": control,
        "hasControl": twos >= 1 or control >= 2,
    }


def cur_type(cur):
    return (cur or {}).get("type") or "unknown"


def cur_top(cur):
    t = (cur or {}).get("top")
    return t["rank"] if t else None


def min_sbc(hand, plays):
    best = None
    best_c = None
    for p in plays or []:
        c = structure_break_cost(hand, p)
        if best is None or c < best:
            best = c
            best_c = p
    return best, best_c


def hand_len_bucket(n):
    if n <= 4:
        return "1-4"
    if n <= 7:
        return "5-7"
    if n <= 10:
        return "8-10"
    return "11-13"


def omin_from_event(e):
    sizes = e.get("handSizesBefore")
    seat = e.get("seat")
    if not sizes or seat is None:
        return None
    m = 99
    for i, s in enumerate(sizes):
        if i != seat:
            m = min(m, s)
    return m if m < 99 else None


def top_game_ids(games_counter, k=5):
    items = sorted(game_counter.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
    return [{"gameId": g, "n": n} for g, n in items]


def main():
    print("Reading", LOG, file=sys.stderr)
    with open(LOG, "r", encoding="utf-8") as f:
        raw = json.load(f)
    games = raw.get("games") or []
    print(f"games={len(games)} exportedAt={raw.get('exportedAt')}", file=sys.stderr)

    totals = Counter()
    combat_struct = Counter()
    by_cur_type = Counter()
    by_hand_len = Counter()
    play_classes = Counter()
    patterns = defaultdict(lambda: {"n": 0, "games": Counter(), "examples": []})

    w17 = Counter()

    def mark(name, gid, ex=None):
        patterns[name]["n"] += 1
        patterns[name]["games"][gid] += 1
        if ex is not None and len(patterns[name]["examples"]) < 6:
            patterns[name]["examples"].append(ex)

    games_combat = 0

    for g in games:
        gid = g.get("id") or str(g.get("seed"))
        seed = g.get("seed")
        events = g.get("events") or []
        saw_combat = False

        for e in events:
            if e.get("actor") != "human":
                continue
            if e.get("type") not in ("play", "pass"):
                continue

            totals["humanPlayPass"] += 1
            hand = e.get("handBefore") or []
            legals = e.get("legals") or []
            if e.get("handBefore") is not None:
                totals["eventsWithHandBefore"] += 1
            if e.get("legals") is not None:
                totals["eventsWithLegals"] += 1

            cur = e.get("currentComboBefore")
            is_combat = cur is not None
            hand_len = len(hand)
            info = analyze_hand(hand)
            cheap = cheap_legals(legals)
            omin = omin_from_event(e)
            br = by_rank_counts(hand)

            if not is_combat:
                totals["freeLead"] += 1
                if e["type"] == "play":
                    totals["freeLeadPlay"] += 1
                else:
                    totals["freeLeadPass"] += 1

                if e["type"] == "play" and e.get("cards"):
                    fl_com = e.get("combo") or detect_combo(e["cards"])
                    # bropair-like
                    low_pair_legal = False
                    for p in legals:
                        if p and len(p) == 2:
                            tpr = detect_combo(p)
                            if (
                                tpr
                                and tpr["top"]["rank"] <= 6
                                and structure_break_cost(hand, p) < 8
                            ):
                                low_pair_legal = True
                    if hand_len >= 11 and (omin is None or omin >= 6) and low_pair_legal:
                        w17["flPairForceLike"] += 1
                        if (
                            fl_com
                            and fl_com["type"] == "pair"
                            and fl_com["top"]["rank"] <= 6
                        ):
                            w17["flHumanChoseLowPair"] += 1
                            mark(
                                "FL_low_pair_shed",
                                gid,
                                {
                                    "gameId": gid,
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "cards": cards_str(e["cards"]),
                                    "omin": omin,
                                },
                            )
                    # W17 trash gate
                    if (
                        8 <= hand_len <= 12
                        and (omin is None or omin >= 4)
                        and info["hasControl"]
                        and info["trashCount"] >= 1
                    ):
                        multi_hi = False
                        for p in legals:
                            if not p or len(p) < 2:
                                continue
                            tr = detect_combo(p)
                            top_r = tr["top"]["rank"] if tr and tr.get("top") else 99
                            if top_r > 7 or (len(p) >= 3 and top_r > 6):
                                multi_hi = True
                        if multi_hi:
                            w17["flSituationsLikeW17Gate"] += 1
                            chose_trash = False
                            if len(e["cards"]) == 1:
                                c0 = e["cards"][0]
                                for t in info["trash"]:
                                    if t["rank"] == c0["rank"] and t["suit"] == c0["suit"]:
                                        chose_trash = True
                                        break
                            if chose_trash:
                                w17["flHumanChoseTrashWhenGate"] += 1
                                mark(
                                    "FL_trash_first_W17_covered",
                                    gid,
                                    {
                                        "gameId": gid,
                                        "seed": seed,
                                        "handLen": hand_len,
                                        "cards": cards_str(e["cards"]),
                                    },
                                )
                            else:
                                w17["flHumanChoseOtherWhenGate"] += 1
                                mark(
                                    "FL_nontrash_when_W17_gate",
                                    gid,
                                    {
                                        "gameId": gid,
                                        "seed": seed,
                                        "handLen": hand_len,
                                        "cards": cards_str(e["cards"]),
                                        "type": fl_com["type"] if fl_com else None,
                                    },
                                )
                continue

            # combat
            saw_combat = True
            totals["combat"] += 1
            w17["combatResidualUncoveredByW17"] += 1
            ctype = cur_type(cur)
            ctop = cur_top(cur)
            by_cur_type[ctype] += 1
            by_hand_len[hand_len_bucket(hand_len)] += 1

            if e["type"] == "pass":
                totals["combatPass"] += 1
                if not legals:
                    combat_struct["passNoLegal"] += 1
                    mark(
                        "combat_pass_forced_no_legal",
                        gid,
                        {
                            "gameId": gid,
                            "seed": seed,
                            "handLen": hand_len,
                            "cur": ctype,
                            "top": rank_name(ctop),
                        },
                    )
                else:
                    combat_struct["passWithAnyLegal"] += 1
                    mark(
                        "combat_pass_with_legal",
                        gid,
                        {
                            "gameId": gid,
                            "seed": seed,
                            "handLen": hand_len,
                            "cur": ctype,
                            "top": rank_name(ctop),
                            "legalsN": len(legals),
                            "cheapN": len(cheap),
                            "sample": " | ".join(cards_str(p) for p in cheap[:3]),
                        },
                    )
                    if cheap:
                        combat_struct["passWithCheapLegal"] += 1
                        ms, _ = min_sbc(hand, cheap)
                        mark(
                            "combat_pass_with_cheap",
                            gid,
                            {
                                "gameId": gid,
                                "seed": seed,
                                "handLen": hand_len,
                                "cur": ctype,
                                "top": rank_name(ctop),
                                "cheapN": len(cheap),
                                "minSbc": ms,
                            },
                        )
                    if hand_has_two(hand) and cheap:
                        combat_struct["passSave2s"] += 1
                        mark(
                            "combat_pass_save_2s",
                            gid,
                            {
                                "gameId": gid,
                                "seed": seed,
                                "handLen": hand_len,
                                "cur": ctype,
                                "top": rank_name(ctop),
                                "twos": info["twos"],
                                "cheapN": len(cheap),
                            },
                        )
                        pair_or_seq = any(
                            (detect_combo(p) or {}).get("type") in ("pair", "seq")
                            for p in legals
                        )
                        if pair_or_seq:
                            combat_struct["passSave2s_pairOrSeqLegal"] += 1
                            mark(
                                "combat_pass_save_2s_with_pair_or_seq_legal",
                                gid,
                                {
                                    "gameId": gid,
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "cur": ctype,
                                    "top": rank_name(ctop),
                                },
                            )
                continue

            # combat play
            totals["combatPlay"] += 1
            cards = e.get("cards") or []
            com = e.get("combo") or detect_combo(cards)
            ptype = com["type"] if com else None
            sbc = structure_break_cost(hand, cards)
            min_all, _ = min_sbc(hand, legals if legals else [cards])

            if cheap:
                combat_struct["playWhenCheap"] += 1
            else:
                combat_struct["playWhenOnlyExpensive"] += 1

            if ptype == "single":
                combat_struct["combatSinglePlay"] += 1
            elif ptype == "pair":
                combat_struct["combatPairPlay"] += 1
            elif ptype == "seq":
                combat_struct["combatSeqPlay"] += 1
            else:
                combat_struct["combatOtherPlay"] += 1

            is_single = len(cards) == 1
            loose = is_loose_single(hand, cards)
            pair_break = is_pair_break(hand, cards)
            is_min_sbc = min_all is not None and sbc == min_all
            has_lower = min_all is not None and sbc > min_all

            if is_single and loose:
                combat_struct["structurePreserving_looseSingle"] += 1
                mark(
                    "combat_struct_preserve_loose_single",
                    gid,
                    {
                        "gameId": gid,
                        "seed": seed,
                        "handLen": hand_len,
                        "cards": cards_str(cards),
                        "sbc": sbc,
                        "cur": ctype,
                        "top": rank_name(ctop),
                    },
                )
            if (not pair_break) and sbc < 8:
                combat_struct["structurePreserving_noPairBreak"] += 1
            if is_min_sbc and sbc < 8:
                combat_struct["structurePreserving_minSbcBeat"] += 1
                mark(
                    "combat_struct_preserve_min_sbc_beat",
                    gid,
                    {
                        "gameId": gid,
                        "seed": seed,
                        "handLen": hand_len,
                        "cards": cards_str(cards),
                        "sbc": sbc,
                        "cur": ctype,
                        "top": rank_name(ctop),
                    },
                )
            if pair_break:
                combat_struct["structureBreaking_pairBreak"] += 1
                mark(
                    "combat_struct_break_pair_split",
                    gid,
                    {
                        "gameId": gid,
                        "seed": seed,
                        "handLen": hand_len,
                        "cards": cards_str(cards),
                        "sbc": sbc,
                        "cur": ctype,
                        "top": rank_name(ctop),
                    },
                )
            if is_min_sbc and sbc >= 8:
                combat_struct["structureBreaking_minBeatHighSbc"] += 1
                mark(
                    "combat_struct_break_min_beat_high_sbc",
                    gid,
                    {
                        "gameId": gid,
                        "seed": seed,
                        "handLen": hand_len,
                        "cards": cards_str(cards),
                        "sbc": sbc,
                        "cur": ctype,
                        "top": rank_name(ctop),
                    },
                )
            if has_lower:
                combat_struct["structureBreaking_choseHigherSbc"] += 1
                mark(
                    "combat_chose_higher_sbc_than_alt",
                    gid,
                    {
                        "gameId": gid,
                        "seed": seed,
                        "handLen": hand_len,
                        "cards": cards_str(cards),
                        "sbc": sbc,
                        "minAlt": min_all,
                        "cur": ctype,
                        "top": rank_name(ctop),
                    },
                )

            if play_has_two(cards) and ctop is not None and ctop < 12:
                combat_struct["twoForControl"] += 1
                mark(
                    "combat_2_for_control",
                    gid,
                    {
                        "gameId": gid,
                        "seed": seed,
                        "handLen": hand_len,
                        "cards": cards_str(cards),
                        "cur": ctype,
                        "top": rank_name(ctop),
                        "omin": omin,
                    },
                )
                if ctop >= 8:
                    mark(
                        "combat_2_for_control_vs_high",
                        gid,
                        {
                            "gameId": gid,
                            "seed": seed,
                            "handLen": hand_len,
                            "cards": cards_str(cards),
                            "cur": ctype,
                            "top": rank_name(ctop),
                            "omin": omin,
                        },
                    )

            # play class
            if play_has_two(cards) and ctop is not None and ctop < 12:
                class_key = "two_for_control"
            elif is_single and loose and is_min_sbc:
                class_key = "loose_single_min_beat"
            elif is_single and loose:
                class_key = "loose_single_not_min"
            elif pair_break:
                class_key = "pair_break_single"
            elif ptype == "pair" and sbc < 8:
                class_key = "pair_answer_preserve"
            elif ptype == "pair":
                class_key = "pair_answer_other"
            elif ptype == "seq" and sbc < 8:
                class_key = "seq_answer_preserve"
            elif ptype == "seq":
                class_key = "seq_answer_other"
            elif sbc >= 8:
                class_key = "other_struct_break"
            else:
                class_key = "other_struct_preserve"
            play_classes[class_key] += 1
            mark(
                "playclass_" + class_key,
                gid,
                {
                    "gameId": gid,
                    "seed": seed,
                    "handLen": hand_len,
                    "cards": cards_str(cards),
                    "sbc": sbc,
                    "cur": ctype,
                    "top": rank_name(ctop),
                },
            )

            if is_single and len(legals) >= 2:
                any_loose = any(
                    len(p) == 1 and is_loose_single(hand, p) for p in legals
                )
                any_break = any(len(p) == 1 and is_pair_break(hand, p) for p in legals)
                if any_loose and any_break:
                    if loose:
                        mark(
                            "combat_prefer_loose_over_pairbreak",
                            gid,
                            {
                                "gameId": gid,
                                "seed": seed,
                                "handLen": hand_len,
                                "cards": cards_str(cards),
                                "sbc": sbc,
                                "cur": ctype,
                                "top": rank_name(ctop),
                            },
                        )
                    elif pair_break:
                        mark(
                            "combat_prefer_pairbreak_over_loose",
                            gid,
                            {
                                "gameId": gid,
                                "seed": seed,
                                "handLen": hand_len,
                                "cards": cards_str(cards),
                                "sbc": sbc,
                                "cur": ctype,
                                "top": rank_name(ctop),
                            },
                        )

            if is_single and cards[0]["rank"] >= 10:
                cheaper_lower = False
                for p in legals:
                    if len(p) == 1 and p[0]["rank"] < cards[0]["rank"]:
                        if structure_break_cost(hand, p) < sbc:
                            cheaper_lower = True
                if cheaper_lower:
                    mark(
                        "combat_overkill_high_single",
                        gid,
                        {
                            "gameId": gid,
                            "seed": seed,
                            "handLen": hand_len,
                            "cards": cards_str(cards),
                            "sbc": sbc,
                            "cur": ctype,
                            "top": rank_name(ctop),
                        },
                    )

        if saw_combat:
            games_combat += 1

    totals["gamesWithHumanCombat"] = games_combat
    n_hp = totals["humanPlayPass"] or 1

    top_pattern_names = [
        "combat_struct_preserve_loose_single",
        "combat_struct_preserve_min_sbc_beat",
        "combat_pass_with_legal",
        "combat_pass_with_cheap",
        "combat_pass_save_2s",
        "combat_2_for_control",
        "combat_2_for_control_vs_high",
        "combat_struct_break_pair_split",
        "combat_struct_break_min_beat_high_sbc",
        "combat_prefer_loose_over_pairbreak",
        "combat_prefer_pairbreak_over_loose",
        "combat_chose_higher_sbc_than_alt",
        "combat_overkill_high_single",
        "combat_pass_save_2s_with_pair_or_seq_legal",
        "combat_pass_forced_no_legal",
    ]

    top5 = []
    for n in top_pattern_names:
        if n not in patterns:
            continue
        p = patterns[n]
        top5.append(
            {
                "pattern": n,
                "count": p["n"],
                "distinctGames": len(p["games"]),
                "exampleGameIds": top_game_ids(p["games"], 5),
                "examples": p["examples"][:3],
            }
        )
    top5.sort(key=lambda x: -x["count"])
    top5 = top5[:5]

    w17_coverage = []
    for n in top_pattern_names:
        if n not in patterns:
            continue
        is_combat = n.startswith("combat_")
        if n in ("FL_trash_first_W17_covered", "FL_low_pair_shed"):
            coverage = "COVERED_by_W17_BR_FL"
        elif n == "FL_nontrash_when_W17_gate":
            coverage = "PARTIAL_FL_gate_fires_but_human_diverges"
        elif is_combat:
            coverage = "UNCOVERED_combat_residual"
        else:
            coverage = "other"
        w17_coverage.append(
            {
                "pattern": n,
                "count": patterns[n]["n"],
                "coverage": coverage,
                "residualGap": is_combat,
            }
        )
    w17_coverage.sort(key=lambda x: (not x["residualGap"], -x["count"]))

    pass_cheap = patterns.get("combat_pass_with_cheap", {}).get("n", 0)
    pass_save2 = patterns.get("combat_pass_save_2s", {}).get("n", 0)
    loose_n = patterns.get("combat_struct_preserve_loose_single", {}).get("n", 0)
    prefer_loose = patterns.get("combat_prefer_loose_over_pairbreak", {}).get("n", 0)
    two_ctrl = patterns.get("combat_2_for_control", {}).get("n", 0)
    min_sbc_n = patterns.get("combat_struct_preserve_min_sbc_beat", {}).get("n", 0)

    # ONE lever: expert combat residual force (aligns with sibling architecture note)
    # Highest-fire residual not covered by W17: structure-preserving min-sbc / loose single
    # among cheap answers — expertPolicy already orderLegals by sbc but residual pairs/run
    # tertiary force hardens freezes. Also pass-structure is high mass but DEV_VAL risky.
    # User asked for lever that fires often on playlog combat — pick highest mass residual:
    # structure-preserving min-sbc beats dominate combat plays; hard residual force fires every combat cheap single choice.

    lever = {
        "name": "ex_combat_residual_force_minsbc",
        "axis": "expertPolicy combat (one lever; SoftN forbidden; no duals in this note)",
        "targetPatterns": [
            "combat_struct_preserve_loose_single",
            "combat_struct_preserve_min_sbc_beat",
            "combat_prefer_loose_over_pairbreak",
        ],
        "countsSupporting": {
            "combat_struct_preserve_loose_single": loose_n,
            "combat_struct_preserve_min_sbc_beat": min_sbc_n,
            "combat_prefer_loose_over_pairbreak": prefer_loose,
            "combat_pass_with_cheap": pass_cheap,
            "combat_pass_save_2s": pass_save2,
            "combat_2_for_control": two_ctrl,
        },
        "whyLeastCoveredByW17": (
            "p_w17_brfltrash only mutates free-lead BR cand set "
            "(trash-first when control+trash+hi multi; bropair LP). "
            "Zero combat axis. Entire combat residual mass is uncovered."
        ),
        "ruleSketch": {
            "locus": "expertPolicy after cheapLegals; replace bare orderLegals(cheap)[0]",
            "when": "cur present and cheapLegals nonempty",
            "then": (
                "stable-sort cheap by: (1) structureBreakCost ASC, "
                "(2) residual pairCount after play DESC, "
                "(3) residual maxRun DESC, "
                "(4) top gap ASC (min-beat). "
                "Return first. Always play (not pass) — avoids W16/pass-structure DEV_VAL landmines."
            ),
            "fireOftenReason": (
                "Fires on every combat decision with cheap legals — majority of combat plays. "
                "Aligns AI leaf with human loose-single / min-sbc-preserve mass."
            ),
        },
        "altPassLever_notChosen": {
            "name": "ex_combat_struct_pass_breakonly",
            "whyNotPrimary": (
                "pass_with_cheap is real residual but pass-structure burned DEV_VAL historically "
                "(W16 family). Prefer residual force among plays first."
            ),
            "count": pass_cheap,
        },
        "softN": "forbidden",
        "duals": "do not run",
    }

    result = {
        "meta": {
            "source": LOG,
            "exportedAt": raw.get("exportedAt"),
            "games": len(games),
            "analyzedAt": datetime.now(timezone.utc).isoformat(),
            "scope": "actor=human; play|pass; handBefore+legals when present",
            "basePackage": "p_w17_brfltrash (BR FL trash/pair only — no combat axis)",
            "softN": "forbidden",
            "duals": "not run",
        },
        "counts": {
            "humanPlayPass": totals["humanPlayPass"],
            "freeLead": totals["freeLead"],
            "freeLeadPlay": totals["freeLeadPlay"],
            "freeLeadPass": totals["freeLeadPass"],
            "combat": totals["combat"],
            "combatPlay": totals["combatPlay"],
            "combatPass": totals["combatPass"],
            "eventsWithHandBefore": totals["eventsWithHandBefore"],
            "eventsWithLegals": totals["eventsWithLegals"],
            "gamesWithHumanCombat": totals["gamesWithHumanCombat"],
            "combatSharePct": round(100.0 * totals["combat"] / n_hp, 2),
            "freeLeadSharePct": round(100.0 * totals["freeLead"] / n_hp, 2),
        },
        "combatStructure": dict(combat_struct),
        "combatByCurType": dict(by_cur_type),
        "combatByHandLen": dict(by_hand_len),
        "combatPlayClasses": dict(play_classes),
        "top5HumanPatternClasses": top5,
        "w17Coverage": {
            "note": (
                "W17 = free-lead BR only (trash-first + low-pair force). "
                "Combat residual = 100% uncovered by W17."
            ),
            "flGateStats": dict(w17),
            "patternCoverage": w17_coverage,
            "leastCovered": [x for x in w17_coverage if x["residualGap"]][:8],
        },
        "leverProposal": lever,
        "patternFull": [
            {
                "pattern": n,
                "count": patterns[n]["n"],
                "distinctGames": len(patterns[n]["games"]),
                "exampleGameIds": top_game_ids(patterns[n]["games"], 5),
            }
            for n in sorted(patterns.keys(), key=lambda k: -patterns[k]["n"])
        ],
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JSON_EXPLORE), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    with open(OUT_JSON_EXPLORE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(json.dumps({"counts": result["counts"], "top5": [
        {"pattern": t["pattern"], "count": t["count"], "games": t["distinctGames"]}
        for t in top5
    ], "leastCovered": result["w17Coverage"]["leastCovered"], "lever": lever["name"]}, indent=2))
    print("Wrote", OUT_JSON, file=sys.stderr)
    print("Wrote", OUT_JSON_EXPLORE, file=sys.stderr)
    return result


if __name__ == "__main__":
    main()
