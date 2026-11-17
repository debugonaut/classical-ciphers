/* Pure cipher + cryptanalysis maths. No DOM, no dependencies. */
(function (root) {
  'use strict';

  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var SQUARE_ALPHA = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';   /* 25 letters, J merged into I */

  /* Relative frequency of A–Z in written English, in percent. */
  var ENGLISH = [
    8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153,
    0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056,
    2.758, 0.978, 2.360, 0.150, 1.974, 0.074
  ];
  var ENGLISH_MAX = Math.max.apply(null, ENGLISH);

  function mod(n, m) { return ((n % m) + m) % m; }

  function indexOf(ch) {
    var code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return code - 65;
    if (code >= 97 && code <= 122) return code - 97;
    return -1;
  }

  function isUpper(ch) { var c = ch.charCodeAt(0); return c >= 65 && c <= 90; }

  function letterAt(n, upper) {
    var ch = ALPHA[mod(n, 26)];
    return upper ? ch : ch.toLowerCase();
  }

  function shiftChar(ch, k) {
    var i = indexOf(ch);
    if (i < 0) return ch;
    return letterAt(i + k, isUpper(ch));
  }

  function caesar(text, k) {
    var out = '';
    for (var i = 0; i < text.length; i++) out += shiftChar(text[i], k);
    return out;
  }

  /* ---------------------------------------------------------------- playfair */

  function squareLetters(keyword) {
    var seen = {}, out = '';
    var kw = String(keyword || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    for (var i = 0; i < kw.length; i++) {
      if (!seen[kw[i]]) { seen[kw[i]] = 1; out += kw[i]; }
    }
    for (i = 0; i < SQUARE_ALPHA.length; i++) {
      var ch = SQUARE_ALPHA[i];
      if (!seen[ch]) { seen[ch] = 1; out += ch; }
    }
    return out;
  }

  function playfairPrepare(text) {
    var s = '';
    var up = String(text).toUpperCase().replace(/J/g, 'I');
    for (var i = 0; i < up.length; i++) {
      if (up[i] >= 'A' && up[i] <= 'Z') s += up[i];
    }
    var pairs = [], k = 0;
    while (k < s.length) {
      var a = s[k], b = s[k + 1];
      if (b === undefined) { pairs.push([a, 'X']); k += 1; }
      else if (a === b) { pairs.push([a, 'X']); k += 1; }
      else { pairs.push([a, b]); k += 2; }
    }
    return pairs;
  }

  /*
   * Ciphertext arrives as an unbroken stream of letters that the encryption step
   * already padded. Running playfairPrepare() on it again would insert another
   * X into any pair holding a doubled letter (LL, XX) and shift every digraph
   * after it, so decryption just takes the letters two at a time.
   */
  function playfairGroup(text) {
    var s = String(text).toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    var pairs = [];
    for (var i = 0; i < s.length; i += 2) pairs.push([s[i], s[i + 1] || 'X']);
    return pairs;
  }

  /* Full per-digraph detail: input cells, output cells, rule applied. */
  function playfairDetail(text, keyword, decrypt) {
    var sq = squareLetters(keyword);
    var pos = {};
    for (var i = 0; i < sq.length; i++) pos[sq[i]] = i;
    var d = decrypt ? -1 : 1;

    var pairs = decrypt ? playfairGroup(text) : playfairPrepare(text);

    return pairs.map(function (pair) {
      var a = pair[0], b = pair[1];
      var ia = pos[a], ib = pos[b];
      var ra = Math.floor(ia / 5), ca = ia % 5;
      var rb = Math.floor(ib / 5), cb = ib % 5;
      var rule;

      if (ra === rb) {
        rule = 'row';
        ca = mod(ca + d, 5); cb = mod(cb + d, 5);
      } else if (ca === cb) {
        rule = 'col';
        ra = mod(ra + d, 5); rb = mod(rb + d, 5);
      } else {
        rule = 'rect';
        var t = ca; ca = cb; cb = t;
      }

      return {
        plain: a + b,
        cipher: sq[ra * 5 + ca] + sq[rb * 5 + cb],
        rule: rule,
        inn: [ia, ib],
        out: [ra * 5 + ca, rb * 5 + cb]
      };
    });
  }

  function playfair(text, keyword, decrypt) {
    return playfairDetail(text, keyword, decrypt).map(function (d) { return d.cipher; }).join('');
  }

  /* ---------------------------------------------------------------- vigenère */

  function cleanKeyword(keyword) {
    return String(keyword || '').toUpperCase().replace(/[^A-Z]/g, '');
  }

  /* Shift used at each character position; null for non-letters. */
  function vigenereShifts(text, keyword) {
    var kw = cleanKeyword(keyword);
    var out = [], j = 0;
    for (var i = 0; i < text.length; i++) {
      if (indexOf(text[i]) < 0) { out.push(null); continue; }
      out.push(kw ? ALPHA.indexOf(kw[j % kw.length]) : 0);
      j++;
    }
    return out;
  }

  function vigenere(text, keyword, decrypt) {
    var kw = cleanKeyword(keyword);
    if (!kw) return text;
    var shifts = vigenereShifts(text, kw);
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var s = shifts[i];
      out += s === null ? text[i] : shiftChar(text[i], decrypt ? -s : s);
    }
    return out;
  }

  /* ---------------------------------------------------------------- vernam */

  function randomPad(n) {
    var out = '';
    for (var i = 0; i < n; i++) out += ALPHA[Math.floor(Math.random() * 26)];
    return out;
  }

  function vernam(text, pad, decrypt) {
    var out = '', j = 0;
    for (var i = 0; i < text.length; i++) {
      var idx = indexOf(text[i]);
      if (idx < 0) { out += text[i]; continue; }
      var k = pad && pad[j] ? ALPHA.indexOf(pad[j]) : 0;
      j++;
      out += letterAt(idx + (decrypt ? -k : k), isUpper(text[i]));
    }
    return out;
  }

  /* ---------------------------------------------------------------- rail fence */

  function railPattern(len, rails) {
    var rows = new Array(len);
    if (rails < 2) {                        /* one rail leaves the text as it is */
      for (var j = 0; j < len; j++) rows[j] = 0;
      return rows;
    }
    var r = 0, dir = 1;
    for (var i = 0; i < len; i++) {
      rows[i] = r;
      if (r === 0) dir = 1;
      else if (r === rails - 1) dir = -1;
      r += dir;
    }
    return rows;
  }

  function railEncrypt(text, rails) {
    var chars = Array.from(text);
    var rows = railPattern(chars.length, rails);
    var buckets = [];
    for (var r = 0; r < rails; r++) buckets.push('');
    for (var i = 0; i < chars.length; i++) buckets[rows[i]] += chars[i];
    return buckets.join('');
  }

  function railDecrypt(text, rails) {
    var chars = Array.from(text);
    var rows = railPattern(chars.length, rails);
    var counts = new Array(rails).fill(0);
    var i;
    for (i = 0; i < rows.length; i++) counts[rows[i]]++;

    var buckets = [], p = 0;
    for (var r = 0; r < rails; r++) {
      buckets.push(chars.slice(p, p + counts[r]));
      p += counts[r];
    }
    var cursor = new Array(rails).fill(0);
    var out = '';
    for (i = 0; i < rows.length; i++) out += buckets[rows[i]][cursor[rows[i]]++];
    return out;
  }

  /* ---------------------------------------------------------------- analysis */

  function letterStats(text) {
    var counts = new Array(26).fill(0), total = 0;
    for (var i = 0; i < text.length; i++) {
      var idx = indexOf(text[i]);
      if (idx >= 0) { counts[idx]++; total++; }
    }
    return { counts: counts, total: total };
  }

  function chiSquare(text) {
    var s = letterStats(text);
    if (!s.total) return Infinity;
    var score = 0;
    for (var i = 0; i < 26; i++) {
      var expected = s.total * ENGLISH[i] / 100;
      if (expected <= 0) continue;
      var d = s.counts[i] - expected;
      score += (d * d) / expected;
    }
    return score;
  }

  function bruteForce(cipher) {
    var out = [];
    for (var k = 0; k < 26; k++) {
      var plain = caesar(cipher, -k);
      out.push({ key: k, text: plain, score: chiSquare(plain) });
    }
    return out;
  }

  function bestKey(cipher) {
    var all = bruteForce(cipher), best = all[0];
    for (var i = 1; i < all.length; i++) if (all[i].score < best.score) best = all[i];
    return best.key;
  }

  function frequencyGuess(text) {
    var s = letterStats(text);
    if (!s.total) return null;
    var top = 0;
    for (var i = 1; i < 26; i++) if (s.counts[i] > s.counts[top]) top = i;
    return {
      index: top, letter: ALPHA[top], count: s.counts[top], total: s.total,
      key: mod(top - 4, 26)
    };
  }

  /* Best single shift for a column of letters (used to break Vigenère). */
  function bestShift(text) {
    var best = 0, bestScore = Infinity;
    for (var s = 0; s < 26; s++) {
      var score = chiSquare(caesar(text, -s));
      if (score < bestScore) { bestScore = score; best = s; }
    }
    return best;
  }

  /* 0.066 is the index of coincidence of written English. */
  var ENGLISH_IC = 0.066;

  function indexOfCoincidence(text) {
    var s = letterStats(text), n = s.total;
    if (n < 2) return 0;
    var sum = 0;
    for (var i = 0; i < 26; i++) sum += s.counts[i] * (s.counts[i] - 1);
    return sum / (n * (n - 1));
  }

  /*
   * Key-length search. Each candidate length is judged by the average index of
   * coincidence of its columns: a correct split puts English text in every
   * column (≈0.066), a wrong one mixes shifts and flattens toward 0.038.
   * Once a length is chosen, each column yields its own Caesar shift.
   */
  function crackVigenere(text, maxLen) {
    var letters = '';
    for (var i = 0; i < text.length; i++) {
      if (indexOf(text[i]) >= 0) letters += text[i].toUpperCase();
    }
    var out = [];
    for (var len = 1; len <= maxLen; len++) {
      var key = '', icSum = 0;
      for (var c = 0; c < len; c++) {
        var col = '';
        for (var k = c; k < letters.length; k += len) col += letters[k];
        key += ALPHA[bestShift(col)];
        icSum += indexOfCoincidence(col);
      }
      var plain = vigenere(text, key, true);
      var ic = icSum / len;
      out.push({
        len: len,
        key: key,
        text: plain,
        ic: ic,
        score: Math.abs(ic - ENGLISH_IC)
      });
    }
    return out;
  }

  root.Cipher = {
    ALPHA: ALPHA,
    ENGLISH: ENGLISH,
    ENGLISH_MAX: ENGLISH_MAX,
    mod: mod,
    indexOf: indexOf,
    isUpper: isUpper,
    letterAt: letterAt,
    shiftChar: shiftChar,
    caesar: caesar,
    squareLetters: squareLetters,
    playfairPrepare: playfairPrepare,
    playfairDetail: playfairDetail,
    playfair: playfair,
    cleanKeyword: cleanKeyword,
    vigenereShifts: vigenereShifts,
    vigenere: vigenere,
    randomPad: randomPad,
    vernam: vernam,
    railPattern: railPattern,
    railEncrypt: railEncrypt,
    railDecrypt: railDecrypt,
    letterStats: letterStats,
    chiSquare: chiSquare,
    bruteForce: bruteForce,
    bestKey: bestKey,
    frequencyGuess: frequencyGuess,
    bestShift: bestShift,
    indexOfCoincidence: indexOfCoincidence,
    ENGLISH_IC: ENGLISH_IC,
    crackVigenere: crackVigenere
  };
})(typeof window !== 'undefined' ? window : this);
