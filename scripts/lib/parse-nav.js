// Shared structural parser for CIPP's nav config (src/layouts/config.js).
//
// Strips `icon: (...)` JSX props with balanced-paren scanning (nested parens safe),
// then parses the `nativeMenuItems` array literal with a small structural parser.
// Nothing from the scanned repo is ever executed - no require(), no temp files.
//
// Exports:
//   parseNavTree(text)  -> array of nav item objects. Strings are unquoted; arrays
//                          become real arrays; objects carry a `__line` property with
//                          their 1-based line in the (icon-stripped) source; any other
//                          value is kept as its raw source text.
'use strict';

function stripIcons(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const m = /icon:\s*\(/.exec(text.slice(i));
    if (!m) { out += text.slice(i); break; }
    const start = i + m.index;
    out += text.slice(i, start);
    let j = start + m[0].length;
    let depth = 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '(') depth++;
      else if (text[j] === ')') depth--;
      j++;
    }
    if (text[j] === ',') j++;
    out += 'icon: null,';
    const removed = text.slice(start, j);
    out += '\n'.repeat((removed.match(/\n/g) || []).length);
    i = j;
  }
  return out;
}

function parseNavTree(text) {
  const stripped = stripIcons(text);
  const startM = /nativeMenuItems\s*=\s*\[/.exec(stripped);
  if (!startM) throw new Error('nativeMenuItems array not found in config.js - nav export renamed?');
  const pos = startM.index + startM[0].length - 1;
  const lineOf = (idx) => stripped.slice(0, idx).split('\n').length;

  function skipWs(p) {
    // Also skips // and /* */ comments - only ever called between tokens, never
    // inside a string, so this cannot eat comment-like text in values.
    while (p < stripped.length) {
      if (/[\s,]/.test(stripped[p])) { p++; continue; }
      if (stripped[p] === '/' && stripped[p + 1] === '/') {
        while (p < stripped.length && stripped[p] !== '\n') p++;
        continue;
      }
      if (stripped[p] === '/' && stripped[p + 1] === '*') {
        p += 2;
        while (p < stripped.length && !(stripped[p] === '*' && stripped[p + 1] === '/')) p++;
        p += 2;
        continue;
      }
      break;
    }
    return p;
  }
  function parseString(p) {
    const q = stripped[p];
    let v = '';
    p++;
    while (p < stripped.length && stripped[p] !== q) {
      if (stripped[p] === '\\') { v += stripped[p + 1]; p += 2; continue; }
      v += stripped[p];
      p++;
    }
    return [v, p + 1];
  }
  function parseValue(p) {
    p = skipWs(p);
    const c = stripped[p];
    if (c === '[') return parseArray(p);
    if (c === '{') return parseObject(p);
    if (c === "'" || c === '"' || c === '`') return parseString(p);
    let j = p;
    let depth = 0;
    while (j < stripped.length) {
      const ch = stripped[j];
      if (depth === 0 && (ch === ',' || ch === '}' || ch === ']')) break;
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      if (ch === ')' || ch === ']' || ch === '}') depth--;
      j++;
    }
    return [stripped.slice(p, j).trim(), j];
  }
  // Truncated/malformed input would otherwise loop forever at end-of-text.
  function assertInBounds(p, expected) {
    if (p >= stripped.length) throw new Error(`Unexpected end of nav config while looking for ${expected}`);
  }
  function parseArray(p) {
    const arr = [];
    p++;
    while (true) {
      p = skipWs(p);
      assertInBounds(p, "']'");
      if (stripped[p] === ']') return [arr, p + 1];
      const [v, np] = parseValue(p);
      arr.push(v);
      p = np;
    }
  }
  function parseObject(p) {
    const obj = { __line: lineOf(p) };
    p++;
    while (true) {
      p = skipWs(p);
      assertInBounds(p, "'}'");
      if (stripped[p] === '}') return [obj, p + 1];
      let j = p;
      while (j < stripped.length && stripped[j] !== ':') j++;
      const key = stripped.slice(p, j).trim().replace(/^['"`]|['"`]$/g, '');
      const [v, np] = parseValue(j + 1);
      obj[key] = v;
      p = np;
    }
  }

  const [items] = parseArray(pos);
  return items;
}

module.exports = { stripIcons, parseNavTree };
