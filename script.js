(() => {
  const $ = id => document.getElementById(id);
  const games = [], failed = [];
  const EXTRA = window.INLINE_GAMES || [];
  let cat = 'Alle', query = '', sort = 'default', cur = null, token = 0, startT = 0, tick = 0;
  const ls = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  let favs = ls.get('gl-favs', []), stats = ls.get('gl-stats', {});

  // Spiele melden sich über registerGame() in ihrer eigenen game.js
  window.registerGame = g => { const s = document.currentScript; if (s) g._folder = s.dataset.folder; games.push(g); };
  const loadScript = folder => new Promise(res => {
    const s = document.createElement('script');
    s.src = 'Games/' + encodeURIComponent(folder) + '/game.js';
    s.dataset.folder = folder;
    s.onload = () => { s.remove(); res(); };
    s.onerror = () => { failed.push(s.src); s.remove(); res(); };
    document.head.appendChild(s);
  });

  const base = g => 'Games/' + encodeURIComponent(g._folder) + '/';
  const thumbSrc = g => /^(data:|https?:)/.test(g.thumbnail) ? g.thumbnail : base(g) + g.thumbnail;
  const norm = g => ({ title: String(g.title || g._folder), description: String(g.description || ''), category: String(g.category || 'Sonstiges'),
    website: String(g.website || ''), thumbnail: g.thumbnail || '', gameFile: g.gameFile || 'index.html', _folder: g._folder, srcdoc: g.srcdoc,
    order: Number.isFinite(g.order) ? g.order : 1e9, minHeight: Number(g.minHeight) || 0 });
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const st = g => stats[g._folder] || { plays: 0, last: 0, ms: 0 };
  const fmt = ms => { const m = Math.round(ms / 60000); return m < 1 ? '< 1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };

  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }
  function toggleFav(g) {
    const on = !favs.includes(g._folder);
    favs = on ? [...favs, g._folder] : favs.filter(f => f !== g._folder); ls.set('gl-favs', favs);
    toast(on ? '♥ ' + g.title + ' zu Favoriten hinzugefügt' : g.title + ' aus Favoriten entfernt');
  }
  const prefetched = new Set();
  function prefetch(g) {
    if (g.srcdoc || prefetched.has(g._folder)) return; prefetched.add(g._folder);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = base(g) + g.gameFile; document.head.appendChild(l);
  }

  function card(g) {
    const el = document.createElement('article'); el.className = 'card';
    const a = document.createElement('a'); a.href = '#' + g._folder; a.onpointerenter = () => prefetch(g);
    const th = document.createElement('div'); th.className = 'thumb'; th.style.setProperty('--h', hue(g.title));
    th.textContent = g.title.charAt(0).toUpperCase();
    if (g.thumbnail) { const i = new Image(); i.alt = ''; i.loading = 'lazy'; i.onerror = () => i.remove(); i.src = thumbSrc(g); th.appendChild(i); }
    const m = document.createElement('div'); m.className = 'meta'; m.innerHTML = '<b></b><span></span>';
    m.firstChild.textContent = g.title; const p = st(g).plays;
    m.lastChild.textContent = g.category + (p ? ' · ' + p + '× gespielt' : '');
    a.append(th, m);
    const h = document.createElement('button'); h.type = 'button'; h.className = 'heart'; h.textContent = '\u2665';
    h.setAttribute('aria-label', 'Favorit'); h.setAttribute('aria-pressed', favs.includes(g._folder));
    h.onclick = () => { toggleFav(g); renderHome(); };
    el.append(a, h); return el;
  }

  function renderHero(show) {
    const box = $('hero'); box.textContent = ''; box.hidden = !show || !games.length; if (box.hidden) return;
    const played = games.filter(g => st(g).last).sort((a, b) => st(b).last - st(a).last)[0], g = played || games[0];
    const a = document.createElement('a'); a.className = 'hero'; a.href = '#' + g._folder; a.onpointerenter = () => prefetch(g);
    a.style.setProperty('--h', hue(g.title));
    if (g.thumbnail) { const i = new Image(); i.alt = ''; i.onerror = () => i.remove(); i.src = thumbSrc(g); a.appendChild(i); }
    const b = document.createElement('div'); b.className = 'hero-body';
    b.innerHTML = '<span class="kicker"></span><h2></h2><p></p><span class="btn">\u25b6 run</span>';
    b.children[0].textContent = played ? '✻ weiterspielen' : '✻ featured';
    b.children[1].textContent = g.title; b.children[2].textContent = g.description;
    a.appendChild(b); box.appendChild(a);
  }

  function renderCats() {
    const names = ['Alle', ...(favs.length ? ['Favoriten'] : []), ...[...new Set(games.map(g => g.category))].sort()];
    if (!names.includes(cat)) cat = 'Alle';
    const box = $('cats'); box.textContent = '';
    names.forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.setAttribute('aria-pressed', n === cat);
      b.onclick = () => { cat = n; renderHome(); }; box.appendChild(b); });
  }

  function renderHome() {
    renderCats(); renderHero(!query && cat === 'Alle');
    const q = query.trim().toLowerCase(), grid = $('grid'); grid.textContent = '';
    let list = games.filter(g => (cat === 'Alle' || (cat === 'Favoriten' ? favs.includes(g._folder) : g.category === cat)) && g.title.toLowerCase().includes(q));
    if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'recent') list.sort((a, b) => st(b).last - st(a).last);
    if (sort === 'most') list.sort((a, b) => st(b).plays - st(a).plays);
    if (!list.length) { const d = document.createElement('div'); d.className = 'empty';
      d.textContent = games.length ? 'Nichts gefunden. Ändere Suche oder Kategorie.' : (failed.length ? 'Nicht gefunden (404): ' + failed.join('  ') : (window.GAME_FOLDERS ? 'Noch keine Spiele. Trage Ordner in Library/games.js ein.' : 'Library/games.js wurde nicht geladen. Prüfe, ob die Datei im Ordner Library liegt und genau so heißt.'));
      grid.appendChild(d); return; }
    const f = document.createDocumentFragment(); list.forEach(g => f.appendChild(card(g))); grid.appendChild(f);
  }

  function updStats() {
    if (!cur) return; const s = st(cur);
    $('i-stats').textContent = s.plays + '× gespielt · ' + fmt(s.ms + (Date.now() - startT)) + ' Spielzeit';
  }
  function endSession() {
    clearInterval(tick);
    if (cur && startT) { const s = st(cur); s.ms += Date.now() - startT; stats[cur._folder] = s; ls.set('gl-stats', stats); }
    startT = 0;
  }
  function openGame(g) {
    endSession(); cur = g; const my = ++token;
    const s = st(g); s.plays++; s.last = Date.now(); stats[g._folder] = s; ls.set('gl-stats', stats);
    startT = Date.now(); updStats(); tick = setInterval(updStats, 15000);
    document.title = g.title + ' – MicksGames';
    $('i-title').textContent = g.title; $('i-cat').textContent = g.category; $('i-desc').textContent = g.description;
    const a = $('i-link'); let ok = false; try { ok = /^https?:$/.test(new URL(g.website).protocol); } catch (e) {}
    a.hidden = !ok; if (ok) a.href = g.website;
    $('fav').setAttribute('aria-pressed', favs.includes(g._folder));
    const more = $('more'); more.textContent = '';
    const rel = games.filter(x => x !== g).sort((a, b) => (b.category === g.category) - (a.category === g.category)).slice(0, 6);
    $('more-h').hidden = !rel.length; rel.forEach(x => more.appendChild(card(x)));
    fit(); load(my);
  }
  function load(my) {
    const g = cur, f = $('game'), ov = $('overlay');
    ov.className = 'overlay load'; ov.textContent = '';
    f.onload = () => { if (my === token) { ov.className = 'overlay done'; focusGame(); } };
    if (g.srcdoc) { f.removeAttribute('src'); f.srcdoc = g.srcdoc; return; }
    f.removeAttribute('srcdoc');
    const url = base(g) + g.gameFile;
    f.src = url; // sofort laden, Prüfung läuft parallel
    if (location.protocol !== 'file:') fetch(url, { method: 'HEAD' }).then(r => { if (!r.ok) throw 0; }).catch(() => {
      if (my !== token) return; f.src = 'about:blank';
      ov.className = 'overlay err'; ov.textContent = 'Das Spiel konnte nicht geladen werden (' + url + '). Prüfe Ordnername und gameFile.';
    });
  }
  // Kleine Fenster: Spiel in Mindesthöhe rendern und verkleinert anzeigen, damit nichts scrollt
  function fit() {
    const f = $('game'), fr = $('frame'), mh = cur && cur.minHeight, W = fr.clientWidth, H = fr.clientHeight;
    const s = mh && W && H ? Math.min(1, H / mh) : 1;
    if (s >= 1) { f.style.width = f.style.height = f.style.transform = f.style.transformOrigin = ''; return; }
    f.style.width = (W / s) + 'px'; f.style.height = mh + 'px'; f.style.transform = 'scale(' + s + ')'; f.style.transformOrigin = '0 0';
  }
  new ResizeObserver(fit).observe($('frame'));
  // Tastatur: iframe muss den Fokus haben, sonst bekommt das Spiel keine Tasten
  function focusGame() { const f = $('game'); try { f.focus(); f.contentWindow && f.contentWindow.focus(); } catch (e) {} }
  function stop() { endSession(); token++; cur = null; const f = $('game'); f.removeAttribute('srcdoc'); f.src = 'about:blank'; document.title = 'MicksGames'; }

  function route() {
    const id = decodeURIComponent(location.hash.slice(1)), g = games.find(x => x._folder === id);
    document.body.classList.toggle('playing', !!g);
    if (g) { $('home').hidden = true; $('play').hidden = false; $('search').parentNode.hidden = true; openGame(g); scrollTo(0, 0); }
    else { stop(); $('play').hidden = true; $('home').hidden = false; $('search').parentNode.hidden = false; renderHome(); }
  }
  function randomGame() {
    const pool = games.filter(g => g !== cur); if (!pool.length) return;
    location.hash = pool[Math.floor(Math.random() * pool.length)]._folder;
  }

  $('fs').onclick = () => { const el = $('frame'); (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); setTimeout(focusGame, 150); };
  $('reload').onclick = () => { if (cur) load(++token); setTimeout(focusGame, 50); };
  $('fav').onclick = () => { if (!cur) return; toggleFav(cur); $('fav').setAttribute('aria-pressed', favs.includes(cur._folder)); };
  $('share').onclick = () => {
    const url = location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link kopiert'), () => toast('Kopieren nicht möglich: ' + url));
  };
  $('rand').onclick = randomGame;
  $('sort').onchange = e => { sort = e.target.value; renderHome(); };
  let t; $('search').oninput = e => { clearTimeout(t); t = setTimeout(() => { query = e.target.value; renderHome(); }, 100); };
  // Glow, der dem Mauszeiger über der Karte folgt
  $('grid').addEventListener('pointermove', e => {
    const c = e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (!$('home').hidden && tag !== 'INPUT') {
      if (e.key === '/') { e.preventDefault(); $('search').focus(); }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) randomGame();
    }
    // Pfeiltasten/Leertaste nicht die Seite scrollen lassen, solange ein Spiel offen ist
    if (!$('play').hidden && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && !/^(INPUT|BUTTON|A)$/.test(tag)) { e.preventDefault(); focusGame(); }
  });
  $('frame').addEventListener('pointerdown', focusGame);
  document.addEventListener('fullscreenchange', () => setTimeout(focusGame, 100));
  addEventListener('pagehide', endSession);
  addEventListener('hashchange', route);

  Promise.all((window.GAME_FOLDERS || []).map(loadScript)).then(() => {
    const seen = new Set(), all = [...games.splice(0), ...EXTRA].map(norm).filter(g => g._folder && !seen.has(g._folder) && seen.add(g._folder));
    games.push(...all.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)));
    $('count').textContent = games.length + (games.length === 1 ? ' game' : ' games');
    $('foot').textContent = '$ MicksGames · ' + games.length + (games.length === 1 ? ' game' : ' games') + ' · [ / ] suchen · [ r ] zufällig';
    route();
  });
})();
