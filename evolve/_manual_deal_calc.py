#!/usr/bin/env python3
"""Identical deal to engine.js LCG + dealCards for 2p. Run: python3 evolve/_manual_deal_calc.py"""
RANKS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2']
SYM = ['♠','♣','♦','♥']

def step(s):
    return (s * 1664525 + 1013904223) & 0xFFFFFFFF

def deal(seed):
    s = seed & 0xFFFFFFFF
    deck = list(range(52))
    for i in range(51, 0, -1):
        s = step(s)
        j = int((s / 4294967296.0) * (i + 1))
        deck[i], deck[j] = deck[j], deck[i]
    hands = [[], []]
    for i in range(13):
        hands[0].append(deck[i])
        hands[1].append(deck[13 + i])
    def cs(c):
        return RANKS[c >> 2] + SYM[c & 3]
    def hs(h):
        return ' '.join(cs(c) for c in sorted(h))
    first_player, first_lead = 0, None
    for p in range(2):
        if 0 in hands[p]:
            first_player, first_lead = p, 0
            break
    if first_lead is None:
        best, owner = 99, 0
        for p in range(2):
            for c in hands[p]:
                if c < best:
                    best, owner = c, p
        first_player, first_lead = owner, best
    # inventory
    def inv(h):
        by = {}
        for c in h:
            r = c >> 2
            by[r] = by.get(r, 0) + 1
        pairs = [RANKS[r] for r in range(12) if by.get(r, 0) >= 2]
        trips = [RANKS[r] for r in range(12) if by.get(r, 0) >= 3]
        twos = by.get(12, 0)
        trash = [RANKS[r] for r in range(10) if by.get(r, 0) == 1]
        return {'pairs': pairs, 'trips': trips, 'twos': twos, 'lonely_low': trash}
    return {
        'seed': seed,
        'firstPlayer': first_player,
        'firstLead': cs(first_lead),
        'p0': hs(hands[0]),
        'p1': hs(hands[1]),
        'inv0': inv(hands[0]),
        'inv1': inv(hands[1]),
    }

if __name__ == '__main__':
    import json
    seeds = [20520009, 20589820, 20629712, 20719469, 20609766, 20549928, 20739415]
    print(json.dumps([deal(s) for s in seeds], indent=2, ensure_ascii=False))
