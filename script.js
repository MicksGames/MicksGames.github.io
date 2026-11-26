(() => {
  const $ = id => document.getElementById(id);
  const games = [], failed = [];
  const EXTRA = window.INLINE_GAMES || [];
  let cat = 'Alle', query = '', cur = null, token = 0;
  let favs = [];
  try { favs = JSON.parse(localStorage.getItem('gl-favs') || '[]'); } catch (e) {}
  const saveFavs = () => { try { localStorage.setItem('gl-favs', JSON.stringify(favs)); } catch (e) {} };

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
  const norm = g => ({ title: String(g.title || g._folder), description: String(g.description || ''), category: String(g.category || 'Sonstiges'),
    website: String(g.website || ''), thumbnail: g.thumbnail || '', gameFile: g.gameFile || 'index.html', _folder: g._folder, srcdoc: g.srcdoc, order: Number.isFinite(g.order) ? g.order : 1e9 });
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

  function card(g) {
    const el = document.createElement('article'); el.className = 'card';
    const a = document.createElement('a'); a.href = '#' + g._folder;
    a.onpointerenter = () => prefetch(g);
    const th = document.createElement('div'); th.className = 'thumb'; th.style.setProperty('--h', hue(g.title));
    th.textContent = g.title.charAt(0).toUpperCase();
    if (g.thumbnail) { const i = new Image(); i.alt = ''; i.loading = 'lazy'; i.onerror = () => i.remove(); i.src = /^(data:|https?:)/.test(g.thumbnail) ? g.thumbnail : base(g) + g.thumbnail; th.appendChild(i); }
    const m = document.createElement('div'); m.className = 'meta';
    m.innerHTML = '<b></b><span></span>'; m.firstChild.textContent = g.title; m.lastChild.textContent = g.category;
    a.append(th, m);
    const h = document.createElement('button'); h.type = 'button'; h.className = 'heart'; h.textContent = '\u2665';
    h.setAttribute('aria-label', 'Favorit'); h.setAttribute('aria-pressed', favs.includes(g._folder));
    h.onclick = () => { toggleFav(g); renderHome(); };
    el.append(a, h); return el;
  }
  function toggleFav(g) {
    favs = favs.includes(g._folder) ? favs.filter(f => f !== g._folder) : [...favs, g._folder]; saveFavs();
  }
  const prefetched = new Set();
  function prefetch(g) {
    if (g.srcdoc || prefetched.has(g._folder)) return; prefetched.add(g._folder);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = base(g) + g.gameFile; document.head.appendChild(l);
  }

  function renderCats() {
    const names = ['Alle', ...(favs.length ? ['Favoriten'] : []), ...[...new Set(games.map(g => g.category))].sort()];
    if (!names.includes(cat)) cat = 'Alle';
    const box = $('cats'); box.textContent = '';
    names.forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.setAttribute('aria-pressed', n === cat);
      b.onclick = () => { cat = n; renderHome(); }; box.appendChild(b); });
  }
  function renderHome() {
    renderCats();
    const q = query.trim().toLowerCase(), grid = $('grid'); grid.textContent = '';
    const list = games.filter(g => (cat === 'Alle' || (cat === 'Favoriten' ? favs.includes(g._folder) : g.category === cat)) && g.title.toLowerCase().includes(q));
    if (!list.length) { const d = document.createElement('div'); d.className = 'empty';
      d.textContent = games.length ? 'Nichts gefunden. Ändere Suche oder Kategorie.' : (failed.length ? 'Nicht gefunden (404): ' + failed.join('  ') : (window.GAME_FOLDERS ? 'Noch keine Spiele. Trage Ordner in Library/games.js ein.' : 'Library/games.js wurde nicht geladen. Prüfe, ob die Datei im Ordner Library liegt und genau so heißt.')); grid.appendChild(d); return; }
    const f = document.createDocumentFragment(); list.forEach(g => f.appendChild(card(g))); grid.appendChild(f);
  }

  function openGame(g) {
    cur = g; const my = ++token, f = $('game'), ov = $('overlay');
    document.title = g.title + ' – MicksGames';
    $('i-title').textContent = g.title; $('i-cat').textContent = g.category; $('i-desc').textContent = g.description;
    const a = $('i-link'); let ok = false; try { ok = /^https?:$/.test(new URL(g.website).protocol); } catch (e) {}
    a.hidden = !ok; if (ok) a.href = g.website;
    $('fav').setAttribute('aria-pressed', favs.includes(g._folder));
    const more = $('more'); more.textContent = '';
    const rel = games.filter(x => x !== g).sort((a, b) => (b.category === g.category) - (a.category === g.category)).slice(0, 6);
    $('more-h').hidden = !rel.length; rel.forEach(x => more.appendChild(card(x)));
    load(my);
  }
  function load(my) {
    const g = cur, f = $('game'), ov = $('overlay');
    ov.className = 'overlay load'; ov.textContent = '';
    const done = () => { if (my === token) { ov.className = 'overlay done'; focusGame(); } };
    f.onload = done;
    if (g.srcdoc) { f.removeAttribute('src'); f.srcdoc = g.srcdoc; return; }
    f.removeAttribute('srcdoc');
    const url = base(g) + g.gameFile;
    f.src = url; // sofort laden, Prüfung läuft parallel
    if (location.protocol !== 'file:') fetch(url, { method: 'HEAD' }).then(r => { if (!r.ok) throw 0; }).catch(() => {
      if (my !== token) return; f.src = 'about:blank';
      ov.className = 'overlay err'; ov.textContent = 'Das Spiel konnte nicht geladen werden (' + url + '). Prüfe Ordnername und gameFile.';
    });
  }
  // Tastatur: iframe muss den Fokus haben, sonst bekommt das Spiel keine Tasten
  function focusGame() { const f = $('game'); try { f.focus(); f.contentWindow && f.contentWindow.focus(); } catch (e) {} }
  function stop() { token++; cur = null; const f = $('game'); f.removeAttribute('srcdoc'); f.src = 'about:blank'; document.title = 'MicksGames'; }

  function route() {
    const id = decodeURIComponent(location.hash.slice(1)), g = games.find(x => x._folder === id);
    document.body.classList.toggle('playing', !!g);
    if (g) { $('home').hidden = true; $('play').hidden = false; $('search').parentNode.hidden = true; openGame(g); scrollTo(0, 0); }
    else { stop(); $('play').hidden = true; $('home').hidden = false; $('search').parentNode.hidden = false; renderHome(); }
  }

  $('fs').onclick = () => { const el = $('frame'); (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); setTimeout(focusGame, 150); };
  $('reload').onclick = () => { if (cur) load(++token); setTimeout(focusGame, 50); };
  $('fav').onclick = () => { if (!cur) return; toggleFav(cur); $('fav').setAttribute('aria-pressed', favs.includes(cur._folder)); };
  let t; $('search').oninput = e => { clearTimeout(t); t = setTimeout(() => { query = e.target.value; renderHome(); }, 100); };
  addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && !$('home').hidden) { e.preventDefault(); $('search').focus(); } });
  // Pfeiltasten/Leertaste nicht die Seite scrollen lassen, solange ein Spiel offen ist
  addEventListener('keydown', e => {
    if (!$('play').hidden && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key) && !/^(INPUT|BUTTON|A)$/.test(document.activeElement.tagName)) { e.preventDefault(); focusGame(); }
  });
  $('frame').addEventListener('pointerdown', focusGame);
  document.addEventListener('fullscreenchange', () => setTimeout(focusGame, 100));
  addEventListener('hashchange', route);

  Promise.all((window.GAME_FOLDERS || []).map(loadScript)).then(() => {
    const seen = new Set(), all = [...games.splice(0), ...EXTRA].map(norm).filter(g => g._folder && !seen.has(g._folder) && seen.add(g._folder));
    games.push(...all.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)));
    $('count').textContent = games.length + (games.length === 1 ? ' game' : ' games');
    route();
  });
})();
