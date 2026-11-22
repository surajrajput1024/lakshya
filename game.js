// Lakshya: daily number-target puzzle. Same puzzle for everyone per local date.
(function () {
  'use strict';
  const EPOCH = Date.UTC(2026, 10, 22); // day 1 = 2026-11-22 (launch day)
  const today = new Date();
  const dayNo = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - EPOCH) / 864e5) + 1;
  const key = 'lakshya:';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(key + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(key + k, JSON.stringify(v)); } catch (e) {} }
  };

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Build a puzzle that is guaranteed solvable: random numbers, target from a random expression.
  // Min steps + number of solution paths (used to grade difficulty).
  function analyse(nums, t) {
    let best = null, count = 0; const seen = new Map();
    (function rec(a, d) {
      const k = a.slice().sort((x, y) => x - y).join(','); if (seen.has(k) && seen.get(k) <= d) return; seen.set(k, d);
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        const x = Math.max(a[i], a[j]), y = Math.min(a[i], a[j]); const vs = [x + y, x - y, x * y]; if (y && x % y === 0) vs.push(x / y);
        for (const v of vs) { if (v <= 0) continue; if (v === t) { count++; if (best == null || d + 1 < best) best = d + 1; continue; }
          const n = a.filter((_, q) => q !== i && q !== j); n.push(v); if (n.length > 1) rec(n, d + 1); }
      }
    })(nums, 0);
    return { best, count };
  }
  // Weekly curve: Mon easy (par 2) -> Wed/Thu par 3 -> Sat/Sun hard (par 3-4, few paths). Never 1-step.
  function parFor(n) { const w = new Date(EPOCH + (n - 1) * 864e5).getUTCDay(); return [3, 2, 2, 3, 3, 3, 4][w]; }
  // Fixed-date festival targets (Suraj approves this table). Key MM-DD -> target (fn of year) + emoji.
  const FEST = { '01-01': [y => y, '🎉'], '01-26': [() => 1950, '🇮🇳'], '08-15': [() => 1947, '🇮🇳'], '10-02': [() => 1869, '🕊️'], '11-14': [() => 1889, '🎈'] };
  function festFor(n) { const d = new Date(EPOCH + (n - 1) * 864e5); const k = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); const f = FEST[k]; return f ? { target: f[0](d.getUTCFullYear()), emoji: f[1] } : null; }
  function makeFest(n, f) {
    const small = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], big = [25, 50, 75, 100];
    for (let k = 0; k < 400; k++) { const r = rng(n * 104729 + k); const nums = [big[Math.floor(r() * 4)], big[Math.floor(r() * 4)]]; while (nums.length < 6) nums.push(small[Math.floor(r() * 10)]);
      const a = analyse(nums, f.target); if (a.best >= 2 && a.best <= 4) return { nums: nums.sort((x, y) => x - y), target: f.target, par: a.best, paths: a.count, fest: f.emoji }; }
    return null;
  }
  function makePuzzle(n) {
    const f = festFor(n), fp = f && makeFest(n, f); if (fp) return fp;
    const par = parFor(n); let fallback = null;
    for (let k = 0; k < 20; k++) {
      const c = makeRaw(n * 131 + k); const a = analyse(c.nums, c.target);
      if (a.best === par || (par === 4 && a.best === 3 && a.count < 40)) return Object.assign(c, { par: a.best, paths: a.count });
      if (!fallback && a.best >= 2) fallback = Object.assign(c, { par: a.best, paths: a.count });
    }
    return fallback || Object.assign(makeRaw(n), { par: 3, paths: 0 });
  }
  function makeRaw(n) {
    const r = rng(n * 7919 + 13);
    const small = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], big = [25, 50, 75, 100];
    for (let tries = 0; tries < 500; tries++) {
      const nums = [];
      nums.push(big[Math.floor(r() * 4)]);
      while (nums.length < 6) nums.push(small[Math.floor(r() * 10)]);
      let pool = nums.slice(), steps = 3 + Math.floor(r() * 2), ok = true;
      for (let s = 0; s < steps && pool.length > 1; s++) {
        const i = Math.floor(r() * pool.length); const a = pool.splice(i, 1)[0];
        const j = Math.floor(r() * pool.length); const b = pool.splice(j, 1)[0];
        const op = Math.floor(r() * 4); let v;
        if (op === 0) v = a + b; else if (op === 1) v = Math.abs(a - b); else if (op === 2) v = a * b; else v = (b && a % b === 0) ? a / b : a + b;
        if (v <= 0) { ok = false; break; }
        pool.push(v);
      }
      const target = pool[pool.length - 1];
      if (ok && target >= 101 && target <= 999 && !nums.includes(target)) return { nums: nums.sort((x, y) => x - y), target };
    }
    return { nums: [1, 2, 3, 5, 10, 100], target: 263 };
  }
  // Iterative-deepening search returning one shortest path [[a,op,b,result],...] or null (used for hints).
  function solve(nums, t) {
    for (let lim = 1; lim <= 5; lim++) { const r = (function rec(a, d, path) {
      if (d === lim) return null;
      for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length; j++) { if (i === j) continue; const x = a[i], y = a[j];
        const c = [[x + y, '+'], [x - y, '\u2212'], [x * y, '\u00d7']]; if (y && x % y === 0) c.push([x / y, '\u00f7']);
        for (const [v, o] of c) { if (v <= 0 || (o === '+' || o === '\u00d7') && i > j) continue; const p = path.concat([[x, o, y, v]]);
          if (v === t) return p; const n = a.filter((_, q) => q !== i && q !== j); n.push(v); if (n.length > 1) { const r = rec(n, d + 1, p); if (r) return r; } } }
      return null; })(nums, 0, []); if (r) return r; }
    return null; }
  window.__lakshyaGen = { makePuzzle, analyse, parFor, festFor, solve };

  // ---- text in 3 languages: hi = Devanagari, hg = Hinglish, en = English ----
  const T = {
    hi: { sub: 'संख्याएँ जोड़ो और लक्ष्य बनाओ। रोज़ शाम की चाय के साथ — हर दिन नई पहेली।', steps: 'चाल', undo: '↶ पीछे', reset: '⟲ फिर से', giveup: '🏳 बस', hint: '💡 इशारा', share: 'नतीजा शेयर करें', more: 'एक और? अभ्यास (स्ट्रीक नहीं बदलेगी)', install: '📲 होम स्क्रीन पर रखो',
      played: 'खेले', streak: 'स्ट्रीक 🔥', best: 'सबसे अच्छा', stars: 'सितारे', daily: 'रोज़ नई पहेली, आधी रात को · हफ़्ते में एक छुट्टी माफ़', whole: 'सिर्फ़ पूरा भाग चलेगा', pos: 'सिर्फ़ धन संख्या चलेगी',
      near: g => '🔥 बस ' + g + ' दूर!', closest: g => 'सबसे क़रीब: ' + g + ' दूर', w3: '🎯 शाबाश! तय चालों में हल, ⭐⭐⭐', w2: (s, p) => '🎯 ' + s + ' चाल में हल (तय ' + p + ') ⭐⭐', w1: c => 'बस ' + c + ' दूर, ⭐ मिला। कल फिर!', w0: 'कोई बात नहीं, कल नई पहेली!',
      done: s => '✅ आज की हो गई (' + s + ' चाल)। कल नई पहेली!', copied: 'कॉपी हुआ! WhatsApp पर भेजो', pm: 'अभ्यास', ab: '🎯 अभ्यास हल! एक और?', again: 'एक और कोशिश?', hinted: 'इशारा लिया: ⭐⭐ से ऊपर नहीं',
      hintStep: (a, o, b) => '💡 ' + a + ' ' + o + ' ' + b + ' करके देखो', hintNone: '💡 यहाँ से रास्ता नहीं। "पीछे" दबाओ', go: 'चलो!', how: ['1. एक संख्या दबाओ, फिर + − × ÷, फिर दूसरी संख्या।', '2. बड़े लक्ष्य तक पहुँचो — जितनी कम चाल, उतने ज़्यादा सितारे।', '3. अटक जाओ तो 💡 इशारा लो (3 सितारे नहीं मिलेंगे)।'],
      chal: 'तुम कितनी चाल में?' },
    hg: { sub: 'Numbers jodo, target banao. Roz shaam ki chai ke saath, har din nayi paheli.', steps: 'Chaal', undo: '↶ Peeche', reset: '⟲ Phir se', giveup: '🏳 Bas', hint: '💡 Ishara', share: 'Result share karo', more: 'Ek aur? Abhyaas (streak nahi badlegi)', install: '📲 Home screen pe rakho',
      played: 'Khele', streak: 'Streak 🔥', best: 'Best', stars: 'Sitare', daily: 'Roz nayi paheli, raat 12 baje · hafte mein ek chhutti maaf', whole: 'Sirf poora bhaag chalega', pos: 'Sirf positive chalega',
      near: g => '🔥 Bas ' + g + ' door!', closest: g => 'Sabse kareeb: ' + g + ' door', w3: '🎯 Shabaash! Par mein solve, ⭐⭐⭐', w2: (s, p) => '🎯 ' + s + ' chaal mein solve (par ' + p + ') ⭐⭐', w1: c => 'Bas ' + c + ' door, ⭐ mila. Kal phir!', w0: 'Koi baat nahi, kal nayi paheli!',
      done: s => '✅ Aaj ka ho gaya (' + s + ' chaal). Kal nayi paheli!', copied: 'Copy hua! WhatsApp pe bhejo', pm: 'Abhyaas', ab: '🎯 Abhyaas solved! Ek aur?', again: 'Ek aur koshish?', hinted: 'Ishara liya: ⭐⭐ se upar nahi',
      hintStep: (a, o, b) => '💡 ' + a + ' ' + o + ' ' + b + ' karke dekho', hintNone: '💡 Yahan se raasta nahi. "Peeche" dabao', go: 'Chalo!', how: ['1. Ek number dabao, phir + − × ÷, phir doosra number.', '2. Bade target tak pahuncho: jitni kam chaal, utne zyada sitare.', '3. Atak jao to 💡 Ishara lo (3 sitare nahi milenge).'],
      chal: 'Tum kitni chaal mein?' },
    en: { sub: 'Combine the numbers to hit the target. A fresh puzzle every day.', steps: 'Moves', undo: '↶ Undo', reset: '⟲ Reset', giveup: '🏳 Give up', hint: '💡 Hint', share: 'Share result', more: 'One more? Practice (streak unchanged)', install: '📲 Add to home screen',
      played: 'Played', streak: 'Streak 🔥', best: 'Best', stars: 'Stars', daily: 'New puzzle at midnight · one missed day a week is forgiven', whole: 'Whole-number division only', pos: 'Positive results only',
      near: g => '🔥 So close: ' + g + ' away!', closest: g => 'Closest so far: ' + g + ' away', w3: '🎯 Nailed it, within par! ⭐⭐⭐', w2: (s, p) => '🎯 Solved in ' + s + ' (par ' + p + ') ⭐⭐', w1: c => c + ' away, you get ⭐. Back tomorrow!', w0: 'No worries, new puzzle tomorrow!',
      done: s => '✅ Done for today (' + s + ' moves). New puzzle tomorrow!', copied: 'Copied! Send it on WhatsApp', pm: 'Practice', ab: '🎯 Practice solved! Another?', again: 'Try once more?', hinted: 'Hint used: max ⭐⭐',
      hintStep: (a, o, b) => '💡 Try ' + a + ' ' + o + ' ' + b, hintNone: '💡 No way from here. Press Undo', go: "Let's go!", how: ['1. Tap a number, then + − × ÷, then another number.', '2. Reach the target: fewer moves = more stars.', '3. Stuck? Take a 💡 hint (it caps you at 2 stars).'],
      chal: 'How many moves can you do it in?' }
  };
  const LANGS = ['hg', 'hi', 'en'];
  let lang = store.get('lang', /^hi/i.test(navigator.language || '') ? 'hi' : 'hg'); if (!T[lang]) lang = 'hg';
  const L = () => T[lang];

  // ---- zero-spend metrics: GoatCounter events if config.js sets a code, otherwise only a small local log ----
  const CFG = window.LAKSHYA_CFG || {};
  const t0 = Date.now();
  function track(name) {
    try { const log = store.get('evlog', []); log.push([Date.now(), name]); store.set('evlog', log.slice(-60)); } catch (e) {}
    if (window.goatcounter && window.goatcounter.count) try { window.goatcounter.count({ path: name, event: true }); } catch (e) {}
  }
  function loadCounter() {
    if (!CFG.gc || /[?&]dev=1/.test(location.search)) return;
    const s = document.createElement('script'); s.async = true; s.dataset.goatcounter = 'https://' + CFG.gc + '.goatcounter.com/count'; s.src = 'https://gc.zgo.at/count.js'; document.head.appendChild(s);
  }
  function cohort() {
    let first = store.get('first', null);
    if (first == null) { first = dayNo; store.set('first', first); track('new-user'); }
    const diff = dayNo - first, b = diff >= 14 ? 'd14p' : diff >= 8 ? 'd8-13' : diff === 7 ? 'd7' : diff >= 4 ? 'd4-6' : diff >= 1 ? 'd' + diff : null;
    if (b) { const seen = store.get('ret', []); if (seen.indexOf(b) < 0) { seen.push(b); store.set('ret', seen); track('ret-' + b); } }
    track('open');
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && !window.__sess) { window.__sess = 1; const s = (Date.now() - t0) / 1000; track('sess-' + (s < 30 ? 'lt30s' : s < 120 ? 'lt2m' : s < 300 ? 'lt5m' : 'gt5m')); } });

  const practice = /[?&]abhyaas=(\d+)/.exec(location.search);
  const P = practice ? makePuzzle(100000 + +practice[1]) : makePuzzle(dayNo);
  let closest = null, hinted = false, started = false;
  const $ = id => document.getElementById(id);
  let tiles, history, selA = null, selOp = null, done = false, steps = 0, hintIds = null;
  const saved = store.get('day' + dayNo, null);

  function applyText() {
    const l = L(); document.documentElement.lang = lang === 'hi' ? 'hi' : lang === 'en' ? 'en' : 'hi-Latn';
    [['sub', l.sub], ['undo', l.undo], ['reset', l.reset], ['giveup', l.giveup], ['hint', l.hint], ['share', l.share], ['more', l.more], ['install', l.install], ['lPlayed', l.played], ['lStreak', l.streak], ['lBest', l.best], ['lStars', l.stars], ['hist', l.daily], ['lSteps', l.steps], ['go', l.go]].forEach(([i, t]) => { const e = $(i); if (e) e.textContent = t; });
    $('lang').textContent = lang === 'hi' ? 'हिन्दी' : lang === 'hg' ? 'Hinglish' : 'English';
    $('howText').innerHTML = l.how.map(x => '<p>' + x + '</p>').join('');
  }
  function reset() { tiles = P.nums.map((v, i) => ({ v, id: i, gone: false })); history = []; selA = selOp = null; steps = 0; hintIds = null; render(); }
  function render() {
    $('day').textContent = practice ? L().pm : '#' + dayNo + (P.fest ? ' ' + P.fest : '') + ' · par ' + P.par; $('target').textContent = P.target; $('steps').textContent = steps;
    const g = $('nums'); g.innerHTML = '';
    tiles.forEach((t, i) => { const b = document.createElement('button'); b.className = 'n' + (t.gone ? ' gone' : '') + (selA === i ? ' sel' : '') + (hintIds && hintIds.indexOf(i) >= 0 ? ' hint' : ''); b.textContent = t.v; b.setAttribute('aria-label', String(t.v)); b.onclick = () => tap(i); g.appendChild(b); });
    const o = $('ops'); o.innerHTML = '';
    ['+', '−', '×', '÷'].forEach(s => { const b = document.createElement('button'); b.className = 'op' + (selOp === s ? ' sel' : ''); b.textContent = s; b.setAttribute('aria-label', s); b.onclick = () => { if (!done && selA != null) { selOp = s; render(); } }; o.appendChild(b); });
    const st = store.get('stats', { played: 0, streak: 0, best: 0, last: 0 });
    $('sStars').textContent = store.get('stars', 0); $('badge').textContent = badge(store.get('stars', 0));
    $('sPlayed').textContent = st.played; $('sStreak').textContent = st.streak; $('sBest').textContent = st.best;
    $('hint').style.display = done ? 'none' : '';
  }
  function msg(t) { $('msg').textContent = t; }
  function tap(i) {
    if (done || tiles[i].gone) return;
    if (!started) { started = true; track('start'); }
    if (selA == null || selOp == null) { selA = (selA === i ? null : i); hintIds = null; render(); return; }
    if (i === selA) return;
    const a = tiles[selA].v, b = tiles[i].v; let v;
    if (selOp === '+') v = a + b; else if (selOp === '−') v = a - b; else if (selOp === '×') v = a * b;
    else { if (b === 0 || a % b !== 0) { msg(L().whole); return; } v = a / b; }
    if (v <= 0) { msg(L().pos); return; }
    history.push(JSON.stringify(tiles)); steps++;
    tiles[selA].gone = true; tiles[i] = { v, id: tiles[i].id, gone: false };
    selA = null; selOp = null; hintIds = null; msg(''); render();
    const gap = Math.abs(P.target - v); if (closest == null || gap < closest) closest = gap;
    if (v === P.target) return win(hinted ? 2 : steps <= P.par ? 3 : 2);
    if (gap <= 10) msg(L().near(gap)); else if (closest <= 10) msg(L().closest(closest));
  }
  function badge(n) { const B = [[0, ''], [5, '🪔 Diya'], [20, '🌙 Chand'], [50, '⭐ Tara'], [120, '☀️ Surya'], [300, '🎯 Nishana']]; let b = ''; B.forEach(x => { if (n >= x[0]) b = x[1]; }); return b; }
  function doHint() {
    if (done) return; track('hint'); hinted = true;
    const live = []; tiles.forEach((t, i) => { if (!t.gone) live.push({ v: t.v, i }); }); const r = solve(live.map(x => x.v), P.target);
    if (!r) { msg(L().hintNone); return; }
    const [a, o, b] = r[0]; const ia = live.find(x => x.v === a), ib = live.find(x => x.v === b && x.i !== ia.i);
    hintIds = [ia.i, ib.i]; selA = null; selOp = null; render(); msg(L().hintStep(a, o, b) + ' · ' + L().hinted);
  }
  // Streak counts any finished day (win or honest give-up). One missed day per 7 is forgiven silently (grace day).
  function win(stars) {
    done = true;
    if (practice) { msg(stars ? L().ab : L().again); track('practice-done'); $('more').style.display = 'block'; render(); return; }
    const st = store.get('stats', { played: 0, streak: 0, best: 0, last: 0, grace: 0 });
    if (st.last !== dayNo) {
      st.played++;
      const gap = dayNo - st.last;
      if (gap === 1) st.streak++; else if (gap === 2 && dayNo - (st.grace || 0) >= 7) { st.streak++; st.grace = dayNo; } else st.streak = 1;
      st.best = Math.max(st.best, st.streak); st.last = dayNo; store.set('stats', st);
      store.set('stars', store.get('stars', 0) + stars);
      track('finish-' + stars);
      if (st.played === 1) { const s = (Date.now() - t0) / 1000; track('first-finish-' + (s < 30 ? 'lt30s' : s < 90 ? 'lt90s' : s < 180 ? 'lt3m' : 'gt3m')); }
    }
    store.set('day' + dayNo, { steps, stars, closest, hinted });
    msg(stars === 3 ? L().w3 : stars === 2 ? L().w2(steps, P.par) : stars === 1 ? L().w1(closest) : L().w0);
    $('share').style.display = 'block'; $('more').style.display = 'block'; render(); installNudge();
  }
  function installNudge() { const st = store.get('stats', { played: 0 }); if (deferredInstall && st.played >= 2) $('install').style.display = 'block'; }
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  const url = () => location.origin + location.pathname + '?ref=share';
  function shareText() {
    const st = store.get('stats', { streak: 0 }); const s = store.get('day' + dayNo, { steps, stars: 0 });
    const line = s.stars >= 2 ? '🟩'.repeat(Math.min(s.steps, P.par)) + '🟨'.repeat(Math.max(0, s.steps - P.par)) + ' ' + s.steps + '/' + P.par + (s.hinted ? ' 💡' : '') : '🟥 ' + (s.closest != null ? s.closest + ' door' : '');
    return 'लक्ष्य Lakshya #' + dayNo + ' 🎯' + P.target + (P.fest || '') + ' ' + '⭐'.repeat(s.stars || 0) + '\n' + line + ' · 🔥' + st.streak + '\n' + L().chal + ' ' + url();
  }
  // Image card (WhatsApp chat/status picture). Falls back to text when file sharing is unsupported.
  function cardBlob() {
    return new Promise(res => { try {
      const c = document.createElement('canvas'); c.width = c.height = 720; const x = c.getContext('2d'); const s = store.get('day' + dayNo, { steps, stars: 0 }); const st = store.get('stats', { streak: 0 });
      x.fillStyle = '#1b1f3a'; x.fillRect(0, 0, 720, 720); x.textAlign = 'center'; x.fillStyle = '#a7a9c4'; x.font = '600 38px system-ui,sans-serif'; x.fillText('लक्ष्य Lakshya #' + dayNo, 360, 90);
      x.strokeStyle = '#ffb703'; x.lineWidth = 14; [150, 105, 60].forEach(r => { x.beginPath(); x.arc(360, 300, r, 0, 7); x.stroke(); }); x.fillStyle = '#ffb703'; x.font = '800 76px system-ui,sans-serif'; x.fillText(P.target, 360, 326);
      x.font = '70px system-ui,sans-serif'; x.fillText('⭐'.repeat(s.stars || 0) || '·', 360, 520); x.fillStyle = '#f1f1f6'; x.font = '600 40px system-ui,sans-serif'; x.fillText(s.steps + ' / par ' + P.par + '   🔥 ' + st.streak, 360, 590);
      x.fillStyle = '#2ec4b6'; x.font = '600 34px system-ui,sans-serif'; x.fillText(L().chal, 360, 660); c.toBlob(res, 'image/png');
    } catch (e) { res(null); } });
  }
  $('share').onclick = async () => {
    const t = shareText(); track('share');
    try { const b = await cardBlob(); const f = b && new File([b], 'lakshya-' + dayNo + '.png', { type: 'image/png' });
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(t); msg(L().copied); } catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(t)); }
  };
  $('undo').onclick = () => { if (done || !history.length) return; tiles = JSON.parse(history.pop()); steps--; selA = selOp = null; hintIds = null; render(); };
  $('giveup').onclick = () => { if (done || practice) return; win(closest != null && closest <= 10 ? 1 : 0); };
  $('more').onclick = () => { track('practice-start'); location.href = location.pathname + '?abhyaas=' + Math.floor(Math.random() * 1e6); };
  $('install').onclick = async () => { if (!deferredInstall) return; track('install'); deferredInstall.prompt(); deferredInstall = null; $('install').style.display = 'none'; };
  $('reset').onclick = () => { if (!done) { reset(); closest = null; } };
  $('hint').onclick = doHint;
  $('lang').onclick = () => { lang = LANGS[(LANGS.indexOf(lang) + 1) % 3]; store.set('lang', lang); applyText(); render(); if (saved && !practice) msg(L().done(saved.steps)); };
  $('go').onclick = () => { $('how').style.display = 'none'; store.set('seenHow', 1); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { const t = new Date(); if (Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - EPOCH) / 864e5) + 1 !== dayNo) location.reload(); } });

  loadCounter(); applyText(); reset(); cohort();
  if (!store.get('seenHow', 0) && !practice) $('how').style.display = 'flex';
  if (saved && !practice) { done = true; steps = saved.steps; msg(L().done(saved.steps)); $('share').style.display = 'block'; $('more').style.display = 'block'; render(); }
  window.__lakshya = { P, dayNo, tiles: () => tiles };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
