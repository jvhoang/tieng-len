/**
 * test/dom-shim.js
 * Complete fake DOM for Node-based UI tests.
 * Used only by tests: pre-seeded elements for every ID the UI queries.
 * classList implements add/remove/contains/toggle(cls, force).
 */

function makeClassList() {
  const set = new Set();
  return {
    add(cls) { if (cls) set.add(String(cls)); },
    remove(cls) { if (cls) set.delete(String(cls)); },
    contains(cls) { return cls ? set.has(String(cls)) : false; },
    toggle(cls, force) {
      if (!cls) return false;
      const c = String(cls);
      if (force === true) { set.add(c); return true; }
      if (force === false) { set.delete(c); return false; }
      if (set.has(c)) { set.delete(c); return false; }
      set.add(c); return true;
    },
    _toArray() { return Array.from(set); }
  };
}

function makeEl(tagName = 'div') {
  const children = [];
  const classList = makeClassList();
  const style = {};
  const dataset = {};
  let _innerHTML = '';
  let _textContent = '';
  const listeners = {};
  let _parentNode = null;

  const el = {
    tagName: String(tagName).toUpperCase(),
    id: '',
    className: '',
    classList,  // always defined object
    style,
    dataset,
    children,
    parentNode: null,
    appendChild(child) {
      if (child && child !== el) {
        children.push(child);
        if (child.parentNode !== el) child.parentNode = el;
      }
      return child;
    },
    removeChild(child) {
      const i = children.indexOf(child);
      if (i >= 0) children.splice(i, 1);
    },
    remove() {
      // no-op for test
    },
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!listeners[type]) return;
      const i = listeners[type].indexOf(fn);
      if (i >= 0) listeners[type].splice(i, 1);
    },
    setAttribute(name, value) {
      if (name === 'class') {
        classList._toArray().forEach(c => classList.remove(c));
        String(value || '').split(/\s+/).forEach(c => c && classList.add(c));
      } else if (name === 'id') {
        this.id = value;
      } else {
        this[name] = value;
      }
    },
    getAttribute(name) {
      if (name === 'class') return classList._toArray().join(' ');
      return this[name];
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    focus() {},
    click() {
      if (this.onclick) this.onclick({ target: this });
      const arr = listeners['click'] || [];
      arr.forEach(fn => fn({ target: this }));
    },
    get innerHTML() { return _innerHTML; },
    set innerHTML(v) {
      _innerHTML = String(v || '');
      // naive: clear children on set for test simplicity
      children.length = 0;
    },
    get textContent() { return _textContent || _innerHTML; },
    set textContent(v) { _textContent = String(v || ''); },
    // allow direct onclick assignment as the UI code does
    onclick: null,
    get parentNode() { return _parentNode; },
    set parentNode(p) { _parentNode = p; },
  };

  // support .className sync with classList (basic)
  Object.defineProperty(el, 'className', {
    get() { return classList._toArray().join(' '); },
    set(v) {
      classList._toArray().forEach(c => classList.remove(c));
      String(v || '').split(/\s+/).forEach(c => c && classList.add(c));
    }
  });

  // guarantee classList is never undefined
  if (!el.classList) el.classList = makeClassList();

  return el;
}

function createDOMShim() {
  const registry = {};

  function getOrCreate(id, tag = 'div') {
    if (!registry[id]) {
      const el = makeEl(tag);
      el.id = id;
      registry[id] = el;
    }
    return registry[id];
  }

  // Pre-seed all known IDs the current UI code queries or creates
  const ids = [
    'game-screen', 'mode-screen',
    'player-0', 'player-1', 'player-2', 'player-3',
    'hand-0', 'hand-1', 'hand-2', 'hand-3',
    'trick-pile', 'trick-area', 'table-area',
    'btn-play', 'btn-pass',
    'selection-info',
    'turn-indicator',
    'active-seat-label',
    'rules-modal',
    'seat-switcher',
    'winner-banner'
  ];

  ids.forEach(id => getOrCreate(id));

  const document = {
    createElement(tag) {
      const e = makeEl(tag);
      if (!e.classList) e.classList = makeClassList();
      return e;
    },
    getElementById(id) {
      const e = getOrCreate(id);
      if (!e.classList) e.classList = makeClassList();
      return e;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    body: getOrCreate('body'),
    addEventListener() {},
    removeEventListener() {},
    // allow tests to reset children if needed
    _registry: registry
  };

  // Seed a few container styles/dims for "has drawing dimensions" checks
  const ta = getOrCreate('table-area');
  ta.style.width = '800px';
  ta.style.height = '520px';

  return { document, registry: registry };
}

module.exports = { createDOMShim, makeEl };
