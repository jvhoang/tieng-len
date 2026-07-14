#!/usr/bin/env python3
"""Read-only combat residual pattern census (human events).
Input: john_uploads/tienlen-playlogs-1784002833123.json
P1-P3: actor=human & currentComboBefore non-null
P4: free-lead (currentComboBefore null)
Writes: evolve/_tmp_combat_residual_census.out
"""
from __future__ import annotations
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, "john_uploads", "tienlen-playlogs-1784002833123.json")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_tmp_combat_residual_census.out")

RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
SUITS = ["s", "c", "d", "h"]
SUIT_SYM = {"s": "♠", "c": "♣", "d": "♦", "h": "♥"}

lines_out = []


def log(*a):
    s = " ".join(str(x) for x in a)
    lines_out.append(s)
    print(s)


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


def hand_str(hand):
    hs = sorted(hand or [], key=lambda c: (c["rank"], c["suit"]))
    return " ".join(card_str(c) for c in hs)


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
        if consec and n >= 3:
            return {"type": "seq", "top": cards[0], "size": n}
    all_pairs = all(c == 2 for c in counts) and len(ranks) >= 3
    if all_pairs:
        consec = all(ranks[i - 1] - ranks[i] == 1 for i in range(1, len(ranks)))
        if consec:
            return {"type": "doubleseq", "top": cards[0], "size": n, "numPairs": len(ranks)}
    return None


def structure_break_cost(hand, play):
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


def hand_len_bucket(n):
    if n <= 4:
        return "1-4"
    if n <= 7:
        return "5-7"
    if n <= 10:
        return "8-10"
    return "11-13"


def cur_type(cur):
    if not cur:
        return "free"
    return cur.get("type") or "unknown"


def cur_top_rank(cur):
    if not cur or not cur.get("top"):
        return None
    return cur["top"]["rank"]


def hand_has_two(hand):
    return any(c["rank"] == 12 for c in hand or [])


def hand_has_pair_top_le5(hand):
    br = by_rank_counts(hand)
    return any(br[r] >= 2 for r in range(0, 6))


def hand_has_multi_top_ge8(hand):
    br = by_rank_counts(hand)
    for r in range(8, 13):
        if br[r] >= 3:
            return True
    present = [r for r in range(0, 12) if br[r] >= 1]
    run_start = 0
    for i in range(1, len(present) + 1):
        if i == len(present) or present[i] != present[i - 1] + 1:
            length = i - run_start
            if length >= 3 and present[i - 1] >= 8:
                return True
            run_start = i
    d_present = [r for r in range(0, 12) if br[r] >= 2]
    run_start = 0
    for i in range(1, len(d_present) + 1):
        if i == len(d_present) or d_present[i] != d_present[i - 1] + 1:
            length = i - run_start
            if length >= 3 and d_present[i - 1] >= 8:
                return True
            run_start = i
    return False


def legal_singles(legals):
    return [p for p in (legals or []) if p and len(p) == 1]


def combo_type(cards):
    c = detect_combo(cards)
    return c["type"] if c else None


def pct(n, d):
    if not d:
        return "n/a"
    return f"{100.0 * n / d:.1f}%"


def print_table(title, counter, total):
    log(f"\n### {title}")
    log("| key | n | pct |")
    log("|-----|--:|----:|")
    if not counter:
        log("| (none) | 0 | |")
        return
    for k, n in sorted(counter.items(), key=lambda kv: (-kv[1], str(kv[0]))):
        p = f"{100.0 * n / total:.1f}%" if total else ""
        log(f"| {k} | {n} | {p} |")


def main():
    with open(LOG, "r", encoding="utf-8") as f:
        raw = json.load(f)
    games = raw.get("games") or []
    log("Source:", LOG)
    log("games:", len(games), "exportedAt:", raw.get("exportedAt"))
    log("Scope: actor=human; P1–P3 combat (currentComboBefore non-null); P4 free-lead")

    # P1
    p1_combat_single = 0
    p1_multi_single_legal = 0
    p1_strict_min_sbc = 0
    p1_lower_sbc = 0
    p1_higher_sbc = 0
    p1_both_lone_break = 0
    p1_chose_lone = 0
    p1_chose_break = 0
    p1_by_delta = Counter()
    p1_by_hand = Counter()
    p1_by_cur = Counter()
    p1_ex_lone = []
    p1_ex_lower = []
    p1_ex_break = []

    # P2
    p2_combat_two = 0
    p2_pass_two = 0
    p2_situations = 0
    p2_pass_pairseq = 0
    p2_play_pairseq = 0
    p2_pass_pair = 0
    p2_pass_seq = 0
    p2_by_cur = Counter()
    p2_by_hand = Counter()
    p2_by_kinds = Counter()
    p2_ex = []

    # P3 rank>=10 (K/A/2)
    p3_combat_single = 0
    p3_high = 0
    p3_high_lower_legal = 0
    p3_high_cheaper = 0
    p3_low_when_high = 0
    p3_by_hand = Counter()
    p3_by_curtop = Counter()
    p3_min_lower = Counter()
    p3_delta = Counter()
    p3_ex = []

    # P3b face 10+ (rank idx >=7)
    p3b_high = 0
    p3b_cheaper = 0
    p3b_ex = []

    # P4
    p4_fl = 0
    p4_pair = 0
    p4_multi = 0
    p4_low_pair = 0
    p4_hi_multi = 0
    p4_has_lp = 0
    p4_has_hm = 0
    p4_both = 0
    p4_chose_lp = 0
    p4_chose_hm = 0
    p4_chose_other = 0
    p4_pair_top = Counter()
    p4_multi_top = Counter()
    p4_both_hand = Counter()
    p4_ex_lp = []
    p4_ex_hm = []
    p4_ex_both = []

    human_combat = 0
    human_combat_play = 0
    human_combat_pass = 0
    human_fl = 0

    for g in games:
        seed = g.get("seed")
        for e in g.get("events") or []:
            if e.get("actor") != "human":
                continue
            if e.get("type") not in ("play", "pass"):
                continue
            hand = e.get("handBefore") or []
            hand_len = len(hand)
            cur = e.get("currentComboBefore")
            legals = e.get("legals") or []
            is_combat = cur is not None
            br = by_rank_counts(hand)

            # P4 free-lead
            if not is_combat and e.get("type") == "play" and e.get("cards"):
                human_fl += 1
                p4_fl += 1
                com = e.get("combo") or detect_combo(e["cards"])
                typ = com["type"] if com else combo_type(e["cards"])
                top_r = com["top"]["rank"] if com and com.get("top") else None
                has_lp = hand_has_pair_top_le5(hand)
                has_hm = hand_has_multi_top_ge8(hand)
                if has_lp:
                    p4_has_lp += 1
                if has_hm:
                    p4_has_hm += 1
                is_pair = typ == "pair"
                is_multi = typ in ("seq", "triple", "quad", "doubleseq")
                if is_pair:
                    p4_pair += 1
                    p4_pair_top[f"top={rank_name(top_r)}"] += 1
                    if top_r is not None and top_r <= 5:
                        p4_low_pair += 1
                        if len(p4_ex_lp) < 12:
                            p4_ex_lp.append(
                                {
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "cards": cards_str(e["cards"]),
                                    "hand": hand_str(hand),
                                    "top": rank_name(top_r),
                                }
                            )
                if is_multi:
                    p4_multi += 1
                    p4_multi_top[f"top={rank_name(top_r)} type={typ}"] += 1
                    if top_r is not None and top_r >= 8:
                        p4_hi_multi += 1
                        if len(p4_ex_hm) < 12:
                            p4_ex_hm.append(
                                {
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "cards": cards_str(e["cards"]),
                                    "hand": hand_str(hand),
                                    "top": rank_name(top_r),
                                    "type": typ,
                                }
                            )
                if has_lp and has_hm:
                    p4_both += 1
                    p4_both_hand[hand_len_bucket(hand_len)] += 1
                    if is_pair and top_r is not None and top_r <= 5:
                        p4_chose_lp += 1
                        choice = "low_pair_top<=5"
                    elif is_multi and top_r is not None and top_r >= 8:
                        p4_chose_hm += 1
                        choice = "multi_top>=8"
                    else:
                        p4_chose_other += 1
                        choice = f"other:{typ or '?'} top={rank_name(top_r)}"
                    if len(p4_ex_both) < 20:
                        p4_ex_both.append(
                            {
                                "seed": seed,
                                "handLen": hand_len,
                                "cards": cards_str(e["cards"]),
                                "hand": hand_str(hand),
                                "choice": choice,
                            }
                        )

            if not is_combat:
                continue

            human_combat += 1
            if e.get("type") == "pass":
                human_combat_pass += 1
            else:
                human_combat_play += 1

            # P2
            if hand_has_two(hand):
                p2_combat_two += 1
                pair_legal = False
                seq_legal = False
                for p in legals:
                    lt = combo_type(p)
                    if lt == "pair":
                        pair_legal = True
                    if lt == "seq":
                        seq_legal = True
                pair_or_seq = pair_legal or seq_legal
                if pair_or_seq:
                    p2_situations += 1
                if e.get("type") == "pass":
                    p2_pass_two += 1
                    if pair_legal:
                        p2_pass_pair += 1
                    if seq_legal:
                        p2_pass_seq += 1
                    if pair_or_seq:
                        p2_pass_pairseq += 1
                        kinds = (
                            ("pair" if pair_legal else "")
                            + ("+" if pair_legal and seq_legal else "")
                            + ("seq" if seq_legal else "")
                        )
                        p2_by_cur[cur_type(cur)] += 1
                        p2_by_hand[hand_len_bucket(hand_len)] += 1
                        p2_by_kinds[kinds or "none"] += 1
                        if len(p2_ex) < 20:
                            sample = " | ".join(
                                f"{cards_str(p)}/{combo_type(p) or '?'}" for p in legals[:6]
                            )
                            p2_ex.append(
                                {
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "hand": hand_str(hand),
                                    "curType": cur_type(cur),
                                    "curTop": rank_name(cur_top_rank(cur)),
                                    "kinds": kinds,
                                    "legals": sample,
                                }
                            )
                elif pair_or_seq and e.get("type") == "play":
                    p2_play_pairseq += 1

            # P1 & P3 combat singles
            if e.get("type") != "play" or not e.get("cards") or len(e["cards"]) != 1:
                continue

            p1_combat_single += 1
            p3_combat_single += 1
            played = e["cards"]
            played_rank = played[0]["rank"]
            played_count = br[played_rank]
            played_sbc = structure_break_cost(hand, played)
            singles = legal_singles(legals)
            alts = [
                s
                for s in singles
                if not (s[0]["rank"] == played[0]["rank"] and s[0]["suit"] == played[0]["suit"])
            ]

            if len(singles) >= 2:
                p1_multi_single_legal += 1
                min_alt = min((structure_break_cost(hand, a) for a in alts), default=played_sbc)
                global_min = min(played_sbc, min_alt)
                if played_sbc == global_min:
                    p1_strict_min_sbc += 1
                if alts and played_sbc < min_alt:
                    p1_lower_sbc += 1
                    delta = played_sbc - min_alt
                    if delta <= -12:
                        db = "<=-12"
                    elif delta <= -8:
                        db = "-11..-8"
                    elif delta <= -4:
                        db = "-7..-4"
                    else:
                        db = "-3..-1"
                    p1_by_delta[f"played_vs_minAlt={db}"] += 1
                    p1_by_hand[hand_len_bucket(hand_len)] += 1
                    p1_by_cur[cur_type(cur)] += 1
                    if len(p1_ex_lower) < 15:
                        alt_sample = sorted(alts, key=lambda p: structure_break_cost(hand, p))[:4]
                        p1_ex_lower.append(
                            {
                                "seed": seed,
                                "handLen": hand_len,
                                "cards": cards_str(played),
                                "hand": hand_str(hand),
                                "playedSbc": played_sbc,
                                "minAlt": min_alt,
                                "cnt": played_count,
                                "curType": cur_type(cur),
                                "curTop": rank_name(cur_top_rank(cur)),
                                "alts": " | ".join(
                                    f"{cards_str(p)} sbc={structure_break_cost(hand, p)} cnt={br[p[0]['rank']]}"
                                    for p in alt_sample
                                ),
                            }
                        )
                elif alts and played_sbc > min_alt:
                    p1_higher_sbc += 1
                    d = played_sbc - min_alt
                    if d >= 12:
                        db = ">=+12"
                    elif d >= 8:
                        db = "+8..+11"
                    elif d >= 4:
                        db = "+4..+7"
                    else:
                        db = "+1..+3"
                    p1_by_delta[f"played_vs_minAlt={db}"] += 1
                elif alts:
                    p1_by_delta["played_vs_minAlt=0"] += 1

                any_lone = any(br[s[0]["rank"]] == 1 for s in singles)
                any_break = any(br[s[0]["rank"]] >= 2 for s in singles)
                if any_lone and any_break:
                    p1_both_lone_break += 1
                    if played_count == 1:
                        p1_chose_lone += 1
                        if len(p1_ex_lone) < 12:
                            p1_ex_lone.append(
                                {
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "cards": cards_str(played),
                                    "hand": hand_str(hand),
                                    "playedSbc": played_sbc,
                                    "cnt": played_count,
                                    "curType": cur_type(cur),
                                    "curTop": rank_name(cur_top_rank(cur)),
                                    "alts": " | ".join(
                                        f"{cards_str(p)} cnt={br[p[0]['rank']]} sbc={structure_break_cost(hand, p)}"
                                        for p in alts[:5]
                                    ),
                                }
                            )
                    elif played_count >= 2:
                        p1_chose_break += 1
                        if len(p1_ex_break) < 8:
                            p1_ex_break.append(
                                {
                                    "seed": seed,
                                    "handLen": hand_len,
                                    "cards": cards_str(played),
                                    "hand": hand_str(hand),
                                    "playedSbc": played_sbc,
                                    "cnt": played_count,
                                    "curType": cur_type(cur),
                                    "curTop": rank_name(cur_top_rank(cur)),
                                }
                            )

            # P3 K/A/2
            if played_rank >= 10:
                p3_high += 1
                lower_legals = [s for s in singles if s[0]["rank"] < played_rank]
                cheaper_lower = [
                    s
                    for s in lower_legals
                    if structure_break_cost(hand, s) < played_sbc
                ]
                if lower_legals:
                    p3_high_lower_legal += 1
                    min_lower = min(s[0]["rank"] for s in lower_legals)
                    p3_min_lower[f"minLower={rank_name(min_lower)}"] += 1
                if cheaper_lower:
                    p3_high_cheaper += 1
                    p3_by_hand[hand_len_bucket(hand_len)] += 1
                    p3_by_curtop[f"faceTop={rank_name(cur_top_rank(cur))}"] += 1
                    min_cheap = min(structure_break_cost(hand, s) for s in cheaper_lower)
                    d3 = played_sbc - min_cheap
                    if d3 >= 12:
                        db = "sbcDelta=+12+"
                    elif d3 >= 8:
                        db = "sbcDelta=+8-11"
                    elif d3 >= 4:
                        db = "sbcDelta=+4-7"
                    else:
                        db = "sbcDelta=+1-3"
                    p3_delta[db] += 1
                    if len(p3_ex) < 15:
                        p3_ex.append(
                            {
                                "seed": seed,
                                "handLen": hand_len,
                                "cards": cards_str(played),
                                "hand": hand_str(hand),
                                "playedSbc": played_sbc,
                                "curType": cur_type(cur),
                                "curTop": rank_name(cur_top_rank(cur)),
                                "cheaper": " | ".join(
                                    f"{cards_str(p)} sbc={structure_break_cost(hand, p)}"
                                    for p in cheaper_lower[:5]
                                ),
                            }
                        )
            else:
                if any(s[0]["rank"] >= 10 for s in singles):
                    p3_low_when_high += 1

            # P3b face 10+
            if played_rank >= 7:
                p3b_high += 1
                cheaper_lower = [
                    s
                    for s in singles
                    if s[0]["rank"] < played_rank
                    and structure_break_cost(hand, s) < played_sbc
                ]
                if cheaper_lower:
                    p3b_cheaper += 1
                    if len(p3b_ex) < 8:
                        p3b_ex.append(
                            {
                                "seed": seed,
                                "handLen": hand_len,
                                "cards": cards_str(played),
                                "hand": hand_str(hand),
                                "playedSbc": played_sbc,
                                "cheaper": " | ".join(
                                    f"{cards_str(p)} sbc={structure_break_cost(hand, p)}"
                                    for p in cheaper_lower[:4]
                                ),
                            }
                        )

    # REPORT
    log("\n========== BASE RATES ==========")
    log(
        f"human combat decisions: {human_combat} (play {human_combat_play}, pass {human_combat_pass})"
    )
    log(f"human free-lead plays: {human_fl}")

    log(
        "\n========== P1: lower structure-break single / prefer lone (count==1) over break =========="
    )
    log(f"combat single plays: {p1_combat_single}")
    log(f"combat single with >=2 single legals: {p1_multi_single_legal}")
    log(
        f"played strict min SBC among singles: {p1_strict_min_sbc} {pct(p1_strict_min_sbc, p1_multi_single_legal)}"
    )
    log(
        f"played SBC < min alt SBC: {p1_lower_sbc} {pct(p1_lower_sbc, p1_multi_single_legal)}"
    )
    log(
        f"played SBC > min alt SBC: {p1_higher_sbc} {pct(p1_higher_sbc, p1_multi_single_legal)}"
    )
    log(f"both lone(count==1) AND break(count>=2) single legals: {p1_both_lone_break}")
    log(f"  chose lone (count==1): {p1_chose_lone} {pct(p1_chose_lone, p1_both_lone_break)}")
    log(
        f"  chose break (count>=2): {p1_chose_break} {pct(p1_chose_break, p1_both_lone_break)}"
    )
    print_table(
        "P1a played vs minAlt SBC delta (multi-single situations with alts)",
        p1_by_delta,
        p1_multi_single_legal,
    )
    print_table("P1b lower-Sbc choice by handLen", p1_by_hand, p1_lower_sbc)
    print_table("P1c lower-Sbc choice by cur.type", p1_by_cur, p1_lower_sbc)

    log("\n### P1 examples: chose LONE single when break also legal")
    for i, ex in enumerate(p1_ex_lone[:5], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards={ex['cards']} cnt={ex['cnt']} sbc={ex['playedSbc']} cur={ex['curType']}/{ex['curTop']}"
        )
        log(f"   hand: {ex['hand']}")
        log(f"   alts: {ex['alts']}")

    log("\n### P1 examples: played LOWER sbc than alt singles")
    for i, ex in enumerate(p1_ex_lower[:5], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards={ex['cards']} sbc={ex['playedSbc']} minAlt={ex['minAlt']} cnt={ex['cnt']}"
        )
        log(f"   hand: {ex['hand']}")
        log(f"   alts: {ex['alts']}")

    log("\n========== P2: PASS when pair/seq legal and hand has 2 (rank 12) ==========")
    log(f"combat with 2 in hand: {p2_combat_two}")
    log(
        f"combat pass with 2 in hand: {p2_pass_two} {pct(p2_pass_two, p2_combat_two)}"
    )
    log(f"combat situations: pair|seq legal AND 2 in hand: {p2_situations}")
    log(
        f"  of those, PASS: {p2_pass_pairseq} {pct(p2_pass_pairseq, p2_situations)}"
    )
    log(
        f"  of those, PLAY: {p2_play_pairseq} {pct(p2_play_pairseq, p2_situations)}"
    )
    log(f"pass + pair legal + 2: {p2_pass_pair}")
    log(f"pass + seq legal + 2: {p2_pass_seq}")
    print_table("P2a pass+pair|seq+2 by cur.type", p2_by_cur, p2_pass_pairseq)
    print_table("P2b pass+pair|seq+2 by handLen", p2_by_hand, p2_pass_pairseq)
    print_table("P2c pass+pair|seq+2 by legal kinds", p2_by_kinds, p2_pass_pairseq)

    log("\n### P2 examples: PASS with pair/seq legal and 2 in hand")
    for i, ex in enumerate(p2_ex[:5], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards=PASS cur={ex['curType']}/{ex['curTop']} kinds={ex['kinds']}"
        )
        log(f"   hand: {ex['hand']}")
        log(f"   legals: {ex['legals']}")

    log(
        "\n========== P3: play single rank>=10 (K/A/2) when cheaper lower single exists =========="
    )
    log(f"combat single plays: {p3_combat_single}")
    log(
        f"high single plays (rank idx >=10 → K/A/2): {p3_high} {pct(p3_high, p3_combat_single)}"
    )
    log(
        f"  of high: lower-rank single also legal: {p3_high_lower_legal} {pct(p3_high_lower_legal, p3_high)}"
    )
    log(
        f"  of high: cheaper (lower sbc) lower single exists: {p3_high_cheaper} {pct(p3_high_cheaper, p3_high)}"
    )
    log(f"low single when high also legal: {p3_low_when_high}")
    print_table("P3a high+cheaperLower by handLen", p3_by_hand, p3_high_cheaper)
    print_table("P3b high+cheaperLower by curTop", p3_by_curtop, p3_high_cheaper)
    print_table(
        "P3c high when any lower legal — min lower rank",
        p3_min_lower,
        p3_high_lower_legal,
    )
    print_table("P3d sbc delta high vs cheaper lower", p3_delta, p3_high_cheaper)

    log("\n### P3 examples: high single (K/A/2) with cheaper lower single available")
    for i, ex in enumerate(p3_ex[:5], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards={ex['cards']} sbc={ex['playedSbc']} cur={ex['curType']}/{ex['curTop']}"
        )
        log(f"   hand: {ex['hand']}")
        log(f"   cheaperLower: {ex['cheaper']}")

    log("\n--- P3 secondary: face high (card 10+, rank idx >=7) ---")
    log(f"face-high single plays: {p3b_high}")
    log(
        f"face-high with cheaper lower single: {p3b_cheaper} {pct(p3b_cheaper, p3b_high)}"
    )
    for i, ex in enumerate(p3b_ex[:3], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards={ex['cards']} sbc={ex['playedSbc']}"
        )
        log(f"   hand: {ex['hand']}")
        log(f"   cheaper: {ex['cheaper']}")

    log("\n========== P4: free-lead low pair top<=5 vs multi top>=8 ==========")
    log(f"free-lead plays: {p4_fl}")
    log(f"pair leads: {p4_pair} {pct(p4_pair, p4_fl)}")
    log(
        f"  of which low pair top<=5 (ranks 3–8): {p4_low_pair} {pct(p4_low_pair, p4_pair)}"
    )
    log(f"multi leads (seq/triple/quad/doubleseq): {p4_multi} {pct(p4_multi, p4_fl)}")
    log(
        f"  of which multi top>=8 (J+): {p4_hi_multi} {pct(p4_hi_multi, p4_multi)}"
    )
    log(f"FL hands with low-pair structure (top<=5): {p4_has_lp}")
    log(f"FL hands with high-multi structure (top>=8): {p4_has_hm}")
    log(f"FL both structures available: {p4_both}")
    log(f"  chose low pair top<=5: {p4_chose_lp} {pct(p4_chose_lp, p4_both)}")
    log(f"  chose multi top>=8: {p4_chose_hm} {pct(p4_chose_hm, p4_both)}")
    log(f"  chose other: {p4_chose_other} {pct(p4_chose_other, p4_both)}")
    print_table("P4a pair leads by top", p4_pair_top, p4_pair)
    print_table("P4b multi leads by top+type", p4_multi_top, p4_multi)
    print_table("P4c both-available by handLen", p4_both_hand, p4_both)

    log("\n### P4 examples: low pair top<=5 free-lead")
    for i, ex in enumerate(p4_ex_lp[:5], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards={ex['cards']} top={ex['top']}"
        )
        log(f"   hand: {ex['hand']}")

    log("\n### P4 examples: multi top>=8 free-lead")
    for i, ex in enumerate(p4_ex_hm[:5], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} cards={ex['cards']} type={ex['type']} top={ex['top']}"
        )
        log(f"   hand: {ex['hand']}")

    log("\n### P4 examples: both low-pair & high-multi structure available")
    for i, ex in enumerate(p4_ex_both[:8], 1):
        log(
            f"{i}) seed={ex['seed']} handLen={ex['handLen']} choice={ex['choice']} cards={ex['cards']}"
        )
        log(f"   hand: {ex['hand']}")

    log("\n========== 5 CONCRETE RESIDUAL EXAMPLES (mixed) ==========")
    mixed = []
    for ex in p1_ex_lone[:2]:
        mixed.append(
            (
                "P1_lone_over_break",
                ex["seed"],
                ex["handLen"],
                ex["cards"],
                ex["hand"],
                f"cnt=1 sbc={ex['playedSbc']} cur={ex['curType']}/{ex['curTop']}",
            )
        )
    for ex in p2_ex[:2]:
        mixed.append(
            (
                "P2_pass_pairseq_with_2",
                ex["seed"],
                ex["handLen"],
                "PASS",
                ex["hand"],
                f"cur={ex['curType']}/{ex['curTop']} kinds={ex['kinds']}",
            )
        )
    for ex in p3_ex[:1]:
        mixed.append(
            (
                "P3_high_when_cheaper_lower",
                ex["seed"],
                ex["handLen"],
                ex["cards"],
                ex["hand"],
                f"sbc={ex['playedSbc']} cheaper=[{ex['cheaper']}]",
            )
        )
    i = 0
    while len(mixed) < 5 and i < len(p4_ex_both):
        ex = p4_ex_both[i]
        mixed.append(
            (
                "P4_FL_both_struct",
                ex["seed"],
                ex["handLen"],
                ex["cards"],
                ex["hand"],
                ex["choice"],
            )
        )
        i += 1
    for idx, (pat, seed, hl, cards, hand, note) in enumerate(mixed[:5], 1):
        log(f"{idx}) [{pat}] seed={seed} handLen={hl} cards={cards}")
        log(f"   hand: {hand}")
        log(f"   note: {note}")

    # JSON summary for machine use
    summary = {
        "games": len(games),
        "exportedAt": raw.get("exportedAt"),
        "humanCombat": human_combat,
        "humanCombatPlay": human_combat_play,
        "humanCombatPass": human_combat_pass,
        "humanFreeLead": human_fl,
        "P1": {
            "combatSinglePlays": p1_combat_single,
            "multiSingleLegal": p1_multi_single_legal,
            "strictMinSbc": p1_strict_min_sbc,
            "lowerSbc": p1_lower_sbc,
            "higherSbc": p1_higher_sbc,
            "bothLoneAndBreak": p1_both_lone_break,
            "choseLone": p1_chose_lone,
            "choseBreak": p1_chose_break,
            "byDelta": dict(p1_by_delta),
            "byHandLen": dict(p1_by_hand),
            "byCurType": dict(p1_by_cur),
            "examplesLone": p1_ex_lone[:5],
            "examplesLower": p1_ex_lower[:5],
        },
        "P2": {
            "combatWithTwo": p2_combat_two,
            "passWithTwo": p2_pass_two,
            "situationsPairOrSeqAndTwo": p2_situations,
            "passPairOrSeqAndTwo": p2_pass_pairseq,
            "playPairOrSeqAndTwo": p2_play_pairseq,
            "passPairAndTwo": p2_pass_pair,
            "passSeqAndTwo": p2_pass_seq,
            "byCurType": dict(p2_by_cur),
            "byHandLen": dict(p2_by_hand),
            "byLegalKinds": dict(p2_by_kinds),
            "examples": p2_ex[:5],
        },
        "P3": {
            "combatSinglePlays": p3_combat_single,
            "highKA2": p3_high,
            "highWhenLowerLegal": p3_high_lower_legal,
            "highWhenCheaperLower": p3_high_cheaper,
            "lowWhenHighLegal": p3_low_when_high,
            "byHandLen": dict(p3_by_hand),
            "byCurTop": dict(p3_by_curtop),
            "minLower": dict(p3_min_lower),
            "sbcDelta": dict(p3_delta),
            "examples": p3_ex[:5],
            "face10plus": p3b_high,
            "face10plusCheaperLower": p3b_cheaper,
            "faceExamples": p3b_ex[:3],
        },
        "P4": {
            "freeLeads": p4_fl,
            "pairLeads": p4_pair,
            "lowPairTopLe5": p4_low_pair,
            "multiLeads": p4_multi,
            "multiTopGe8": p4_hi_multi,
            "handHasLowPair": p4_has_lp,
            "handHasHighMulti": p4_has_hm,
            "bothAvailable": p4_both,
            "choseLowPair": p4_chose_lp,
            "choseHighMulti": p4_chose_hm,
            "choseOther": p4_chose_other,
            "pairByTop": dict(p4_pair_top),
            "multiByTop": dict(p4_multi_top),
            "bothByHandLen": dict(p4_both_hand),
            "examplesLowPair": p4_ex_lp[:5],
            "examplesHighMulti": p4_ex_hm[:5],
            "examplesBoth": p4_ex_both[:8],
        },
    }
    json_out = OUT.replace(".out", ".json")
    with open(json_out, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines_out) + "\n")
    log("\nWrote", OUT)
    log("Wrote", json_out)


if __name__ == "__main__":
    main()
