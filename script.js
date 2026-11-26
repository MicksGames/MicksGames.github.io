(() => {
  const $ = id => document.getElementById(id);
  const games = [];
  let cat = 'All Games', query = '', current = null, token = 0;

  // Spiele melden sich über registerGame() in ihrer eigenen game.js
  window.registerGame = g => { const s = document.currentScript; if (s) g._folder = s.dataset.folder; games.push(g); };

  const loadScript = folder => new Promise(res => {
    const s = document.createElement('script');
    s.src = 'Games/' + encodeURIComponent(folder) + '/game.js';
    s.dataset.folder = folder;
    s.onload = () => { s.remove(); res(true); };
    s.onerror = () => { console.warn('game.js nicht gefunden:', folder); s.remove(); res(false); };
    document.head.appendChild(s);
  });

  const base = g => 'Games/' + encodeURIComponent(g._folder) + '/';
  const clean = g => ({
    title: String(g.title || g._folder), description: String(g.description || ''),
    category: String(g.category || 'Other'), website: String(g.website || ''),
    thumbnail: g.thumbnail || '', gameFile: g.gameFile || 'index.html', _folder: g._folder
  });

  function renderCats() {
    const names = ['All Games', ...new Set(games.map(g => g.category))].sort((a, b) => a === 'All Games' ? -1 : b === 'All Games' ? 1 : a.localeCompare(b));
    const box = $('cats'); box.textContent = '';
    names.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = n; b.setAttribute('aria-pressed', n === cat);
      b.onclick = () => { cat = n; renderCats(); renderGrid(); };
      box.appendChild(b);
    });
  }

  function renderGrid() {
    const grid = $('grid'); grid.textContent = '';
    const q = query.trim().toLowerCase();
    const list = games.filter(g => (cat === 'All Games' || g.category === cat) && g.title.toLowerCase().includes(q));
    if (!list.length) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = games.length ? 'Keine Spiele gefunden. Ändere Suche oder Kategorie.' : 'Noch keine Spiele registriert. Trage Ordner in Library/games.js ein.'; grid.appendChild(d); return; }
    const frag = document.createDocumentFragment();
    list.forEach(g => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'card';
      b.setAttribute('aria-current', g === current);
      const img = new Image(); img.className = 'thumb'; img.alt = ''; img.loading = 'lazy';
      img.onerror = () => img.removeAttribute('src');
      if (g.thumbnail) img.src = base(g) + g.thumbnail;
      const t = document.createElement('b'); t.textContent = g.title;
      const c = document.createElement('span'); c.textContent = g.category;
      b.append(img, t, c); b.onclick = () => select(g); frag.appendChild(b);
    });
    grid.appendChild(frag);
  }

  function showInfo(g) {
    $('i-title').textContent = g.title; $('i-cat').textContent = g.category; $('i-desc').textContent = g.description;
    const th = $('i-thumb'); th.hidden = !g.thumbnail; th.onerror = () => { th.hidden = true; };
    if (g.thumbnail) th.src = base(g) + g.thumbnail;
    const a = $('i-link'); let ok = false;
    try { ok = /^https?:$/.test(new URL(g.website).protocol); } catch (e) {}
    a.hidden = !ok; if (ok) a.href = g.website;
  }

  function select(g) {
    current = g; const my = ++token;
    const f = $('game'), ov = $('overlay');
    showInfo(g); renderGrid();
    f.src = 'about:blank'; // vorheriges Spiel vollständig beenden
    ov.hidden = false; ov.className = 'overlay loading'; ov.textContent = 'Lädt …';
    $('fs').disabled = false;
    const url = base(g) + g.gameFile;
    // Erreichbarkeit prüfen (bei file:// nicht möglich, dann direkt laden)
    const start = () => {
      f.onload = () => { if (my === token && f.src !== 'about:blank') ov.hidden = true; };
      f.src = url;
    };
    if (location.protocol === 'file:') return start();
    fetch(url, { method: 'HEAD' }).then(r => {
      if (my !== token) return;
      if (!r.ok) throw 0; start();
    }).catch(() => {
      if (my !== token) return;
      ov.className = 'overlay err';
      ov.textContent = 'Spiel nicht erreichbar: ' + url + ' – prüfe Ordnername, gameFile und Schreibweise.';
    });
  }

  $('fs').onclick = () => {
    const el = $('frame');
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  };
  let timer; $('search').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { query = e.target.value; renderGrid(); }, 120); };

  Promise.all((window.GAME_FOLDERS || []).map(loadScript)).then(() => {
    const seen = new Set();
    const clean_ = games.splice(0).map(clean).filter(g => !seen.has(g._folder) && seen.add(g._folder));
    games.push(...clean_);
    games.sort((a, b) => a.title.localeCompare(b.title));
    renderCats(); renderGrid();
  });
})();
