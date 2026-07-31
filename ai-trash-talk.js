/**
 * ai-trash-talk.js — filthy, witty 1v1 GM banter (vs human only).
 * Pure helpers; no DOM. Browser + Node.
 */
(function (root, factory) {
  if (typeof window !== 'undefined') {
    root.TienLenTrashTalk = factory();
    if (typeof module === 'object' && module.exports) {
      try { module.exports = root.TienLenTrashTalk; } catch (_) {}
    }
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TienLenTrashTalk = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LINES = {
    play: [
      "That all you got? My grandmother peels better trash than that.",
      "Eat shit. Pair of deuces incoming and your ego's already soft.",
      "Nice hand. For a corpse. Watch this.",
      "I'm going to fuck your structure like it owes me rent.",
      "Aww, you clung to that 2 like a security blanket. Pathetic.",
      "Bombs away, sweetheart. Hope you packed lube for that climb.",
      "I just peed on your free-lead. Marked territory. Get used to it.",
      "You play like you learned Tiến Lên from a cereal box.",
      "Scooping this pile like I scoop your dignity—effortlessly.",
      "Your singles are so mid I'm getting secondhand embarrassment.",
      "Oh baby, that pass window? Closed. Like your dating options.",
      "I'm not trash-talking. I'm trash-playing. Big difference.",
      "Keep your A for the funeral. I'm taking this trick bareback.",
      "That combo was cute. In a \"try harder, champ\" kind of way.",
      "I'm the grandmaster. You're the grand-disaster. Deal with it."
    ],
    pass: [
      "Pass. Unlike you, I know when not to throw my life away.",
      "I'm out. Sit with that pile and think about your sins.",
      "Passing—not because I'm scared. Because you're not worth the cards.",
      "Nah. I don't smash good structure for mid trash. Learn it.",
      "I'll wait. Patience is a virtue. You're a liability.",
      "Pass. Go ahead, bleed your hand dry, sugar.",
      "Not biting. My 2s have standards. You don't.",
      "I'm passing so hard your ancestors felt it.",
      "Skip. Come back when you can actually beat something.",
      "I'll let you cook. Watching you burn is free entertainment."
    ],
    freeLead: [
      "My lead. Your funeral. Pick a god and pray.",
      "Free lead, free ass-whooping. Same package.",
      "I open. You cope. Classic dynamic.",
      "Leading trash first—unlike your whole vibe.",
      "Watch carefully. This is what competent looks like.",
      "I deal the first slap. You supply the tears."
    ],
    afterHumanPlay: [
      "Bold. Stupid. But bold.",
      "You really just did that with a straight face?",
      "Hot tip: that was ass.",
      "Thanks for the free board control, dumbass.",
      "I've seen better plays in a parking lot.",
      "You spent a 2 on that? Absolute clown shoes.",
      "Noted. I'll use this later to ruin you.",
      "Keep cooking. The smoke is delicious."
    ],
    afterHumanPass: [
      "Pass? Smartest thing you've done all game.",
      "Chicken. The pile thanks you.",
      "Sitting out already? Commitment issues?",
      "Pass accepted. Confidence declined.",
      "I'll take the table. You take the L."
    ],
    win: [
      "GG. Get good, then get bent.",
      "That's a loss. File it under \"predictable.\"",
      "I emptied first. You emptied your self-respect.",
      "Grandmaster just bent you over the table. Rematch?",
      "Zero cards. Infinite shade. Thank you, next.",
      "You brought a water gun to a bomb fight.",
      "Win for me. Therapy for you. Fair trade."
    ],
    lose: [
      "Lucky. Don't let it get to your head—it's empty enough.",
      "Fine. You win this round. The trash talk is still free.",
      "Enjoy it. Lightning doesn't strike twice in your skill bracket.",
      "I lost the hand, not the plot. You're still mid.",
      "Congrats. Even a broken clock, etc. Rematch, coward."
    ],
    start: [
      "1v1. No friends to hide behind. Let's fucking go.",
      "Just us. I'll be the problem. You'll be the lesson.",
      "Welcome to hell. I'm the concierge.",
      "Shuffled and horny for your misery. Deal."
    ]
  };

  function pick(arr, rng) {
    if (!arr || !arr.length) return '';
    var r = typeof rng === 'function' ? rng() : Math.random();
    var i = Math.floor(r * arr.length) % arr.length;
    if (i < 0) i = 0;
    return arr[i];
  }

  /**
   * @param {object} ctx
   *   kind: 'play'|'pass'|'freeLead'|'afterHumanPlay'|'afterHumanPass'|'win'|'lose'|'start'
   *   playLabel?: string  (combo description)
   *   high?: boolean
   *   bomb?: boolean
   *   rng?: () => number
   */
  function lineFor(ctx) {
    ctx = ctx || {};
    var kind = ctx.kind || 'play';
    var pool = LINES[kind] || LINES.play;
    var line = pick(pool, ctx.rng);
    if (kind === 'play' && ctx.playLabel) {
      var tags = [];
      if (ctx.bomb) tags.push(pick([
        ' Bomb in your face.',
        ' That was a war crime, legally speaking.',
        ' Enjoy the detonation, soft boy.'
      ], ctx.rng));
      else if (ctx.high) tags.push(pick([
        ' High card, low hope for you.',
        ' Climb this, princess.',
        ' Top shelf. Your bottom shelf energy.'
      ], ctx.rng));
      if (tags.length) line = line + tags[0];
      line = line + ' (' + ctx.playLabel + ')';
    }
    return line;
  }

  /** True when trash talk is allowed: solo human vs one AI. */
  function enabledForGame(opts) {
    opts = opts || {};
    if (opts.vsAI === false) return false;
    if (opts.playMode && opts.playMode !== 'ai') return false;
    var n = opts.numPlayers != null ? opts.numPlayers : 0;
    return n === 2;
  }

  return {
    LINES: LINES,
    lineFor: lineFor,
    enabledForGame: enabledForGame,
    pick: pick
  };
}));
