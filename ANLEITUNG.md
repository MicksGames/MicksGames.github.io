# Neues Spiel hinzufügen
1. Ordner `Games/MeinSpiel/` anlegen, alle Spieldateien dort ablegen (nur relative Pfade im Spiel verwenden).
2. Dort `game.js` anlegen:
   ```js
   registerGame({ title:"Mein Spiel", description:"...", category:"Puzzle",
                  website:"https://...", thumbnail:"thumbnail.png", gameFile:"index.html" });
   ```
   `website` und `thumbnail` sind optional. Neue Kategorien entstehen automatisch.
3. In `Library/games.js` den Ordnernamen (exakt gleiche Schreibweise) zur Liste `GAME_FOLDERS` hinzufügen.
4. Committen und pushen. GitHub Pages: Settings → Pages → Branch `main`, Ordner `/ (root)`.
Lokal testen: `python -m http.server` im Projektordner (Doppelklick auf index.html geht auch).
