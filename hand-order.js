/**
 * hand-order.js — Pure helpers for default sort + custom hand order.
 * No DOM. Used by ui.js and unit tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(typeof require === 'function' ? require('./engine.js') : null);
  } else {
    root.TienLenHandOrder = factory(root.TienLenEngine);
  }
}(typeof self !== 'undefined' ? self : this, function (engine) {

  function cardKey(c) {
    return c.rank * 4 + c.suit;
  }

  function cardCompare(a, b) {
    if (engine && engine.cardCompare) return engine.cardCompare(a, b);
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.suit - b.suit;
  }

  /** Default: lowest on the left → highest on the right (rank then suit). */
  function sortHandDefault(hand) {
    return (hand || []).slice().sort(cardCompare);
  }

  /**
   * Apply a custom order (array of card keys or cards) to a hand membership list.
   * Cards not in customOrder are appended in default sort order.
   * Cards in customOrder not in hand are dropped.
   */
  function applyHandOrder(hand, customOrder) {
    if (!hand || !hand.length) return [];
    if (!customOrder || !customOrder.length) return sortHandDefault(hand);

    const handMap = new Map();
    hand.forEach(c => handMap.set(cardKey(c), c));

    const ordered = [];
    const used = new Set();
    for (const item of customOrder) {
      const key = typeof item === 'number' ? item : cardKey(item);
      if (handMap.has(key) && !used.has(key)) {
        ordered.push(handMap.get(key));
        used.add(key);
      }
    }
    // Append any remaining hand cards in default order
    const rest = sortHandDefault(hand.filter(c => !used.has(cardKey(c))));
    return ordered.concat(rest);
  }

  /**
   * Reorder: move card at fromIndex to toIndex in the display order array.
   * Returns a new array of cards (display order).
   */
  function reorderCards(displayOrder, fromIndex, toIndex) {
    const arr = (displayOrder || []).slice();
    if (fromIndex < 0 || fromIndex >= arr.length) return arr;
    if (toIndex < 0) toIndex = 0;
    if (toIndex >= arr.length) toIndex = arr.length - 1;
    if (fromIndex === toIndex) return arr;
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    return arr;
  }

  /** Keys for persisting custom order across re-renders. */
  function orderKeys(displayOrder) {
    return (displayOrder || []).map(cardKey);
  }

  /**
   * Sync custom keys after a play: drop cards no longer in hand, keep relative order,
   * append newly relevant cards (shouldn't happen) in default sort.
   */
  function syncOrderKeys(hand, prevKeys) {
    if (!prevKeys || !prevKeys.length) return orderKeys(sortHandDefault(hand));
    return orderKeys(applyHandOrder(hand, prevKeys));
  }

  return {
    cardKey,
    sortHandDefault,
    applyHandOrder,
    reorderCards,
    orderKeys,
    syncOrderKeys
  };
}));
