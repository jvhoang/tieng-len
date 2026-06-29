# Tiến Lên (Tieng Len / Tien Len / Thirteen / 13) - Canonical Rules

Source of truth for this implementation: authoritative references from Pagat.com (John McLeod) and Wikipedia, with core 4-player ruleset chosen for consistency.

## Players & Deck
- 2 to 4 players (this implementation supports exactly 2, 3, or 4).
- Standard 52-card Anglo-American deck, no jokers.
- Each player dealt exactly 13 cards (for <4 players, excess cards set aside unused).

## Card Ranking
- Rank order (high to low): 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3
- Suit order (high to low within same rank): ♥ Hearts > ♦ Diamonds > ♣ Clubs > ♠ Spades
- Thus 2♥ is the absolute highest card; 3♠ is the absolute lowest.

## Deal and First Lead
- First hand: dealer chosen randomly; the player holding 3♠ must lead with a legal combination that **includes the 3♠**.
- Subsequent hands: the winner of the previous hand leads first (can lead any legal combination).
- Play is clockwise.

## Legal Combinations
All combinations are played face up to a central pile.

1. **Single**: one card.
2. **Pair**: two cards of identical rank (any suits).
3. **Triple**: three cards of identical rank.
4. **Quad** (four of a kind): four cards of identical rank.
5. **Sequence** (straight): 3 or more cards of consecutive ranks (suits irrelevant). 
   - No "around the corner": A-2-3 invalid (2 is high, 3 low).
   -  J-Q-K-A-2 is valid sequence.
6. **Double Sequence** (pair sequence / "double straight"): 3 or more consecutive pairs.
   - E.g. 3-3-4-4-5-5 ,  8-8-9-9-10-10-J-J

## How Play Works
- On your turn: either play a **higher** combination of the **exact same type** (same length for sequences), or **Pass**.
- Comparison: look at the highest card in the combination (rank primary, then suit tiebreaker).
- After a play that no one beats, the pile is cleared aside, and the player who played the unbeaten combination leads a new combination (any type).
- **Pass lock-out**: Once you Pass in the current trick/pile, you are locked out and cannot play again until the pile is cleared and a fresh lead occurs.

## Bombs (Special exceptions that beat 2s)
These may be played against combinations consisting of 2s, **even if you have previously passed** in the current pile. After playing a bomb it sets the new type to beat.

- Any **Quad** beats a single 2 (but not other singles).
- A **3-pair double sequence** beats a single 2.
- A **4-pair double sequence** beats a pair of 2s.
- A **5-pair double sequence** beats a triple of 2s.

Higher same-type bombs beat lower ones. Quads beat other quads by top card.

Bombs **do not** beat non-2 plays (except when used to beat a 2 that beat something else).

## Winning
- Goal: be the first to play all your cards (shedding).
- Players drop out when they have 0 cards.
- The round ends when only one player still holds cards: that player is the loser.
- In friendly play: loser deals next, or winner of previous leads next.
- This implementation tracks full round results, shows finishing order, and allows new round with correct lead rules.

## Supported Variants in This Build (Core Pagat/Wiki)
- 2/3/4 players, 13 cards each.
- First lead must include 3♠ (4p).
- Full bomb rules as above.
- Pass lockout enforced.
- No "four 2s auto-win", no trading, no stacking beyond core, no VC slams unless toggled (core locked to Pagat main).
- No sequences containing 2s in single straights per some variants (but per main sources 2 can finish high sequences).

## References (embedded for verification)
- https://www.pagat.com/climbing/thirteen.html (primary detailed source)
- https://en.wikipedia.org/wiki/Ti%E1%BA%BFn_l%C3%AAn (core rules summary)

All engine code, tests, and UI must conform exactly to the above for beating, legality, lead, pass, bomb, and win conditions.

## Notes on Implementation Fidelity
- Combo detection, comparison, and legal move generator are pure functions.
- Unit tests exercise 3♠ lead, pair/triple/seq compare, bomb vs 2s (including after pass), win detection, pass locking, 2/3/4p deals.
- AI must only ever return legal plays per the engine.

This RULES.md is the contract.
