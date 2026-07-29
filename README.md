# strohutt.github.io

Meine Seite. Tusche auf Papier, hell und dunkel.

Läuft auf GitHub Pages, kein Build, kein Framework. Einfach die drei
Dateien öffnen und tippen.

## Was wo liegt

| Datei         | Inhalt                                                        |
| ------------- | ------------------------------------------------------------- |
| `index.html`  | Seite plus alle Zeichnungen als SVG oben im `<svg class="sprite">` |
| `styles.css`  | Farben, Layout, die handgezogenen Linien                       |
| `script.js`   | Lichtschalter und der Discord-Status                           |
| `favicon.svg` | Strohhut fürs Tab                                              |

## Die Zeichnungen

Alles Gezeichnete sind SVG-Pfade, von Hand gesetzt — Hut, Wortmarke,
Kassette, Manga-Band, Klebestreifen, Icons. Keine Bildbibliothek und
kein Generator, deshalb sitzt auch nichts perfekt.

Die Linien unter den Überschriften und Links sind keine `border`, sondern
eine krakelige SVG-Linie als `mask` über einer Farbfläche. Dadurch nehmen
sie automatisch die Tintenfarbe des jeweiligen Modus an.

Neue Zeichnung dazu: als `<symbol id="…">` in den Sprite legen und mit
`<use href="#…">` einsetzen. Farbe nicht im Symbol festnageln — `stroke`
wird von außen geerbt, sonst bleibt sie im Dunkelmodus falsch.

## Discord-Status

`script.js` hängt an [Lanyard](https://github.com/Phineas/lanyard) und
bekommt Änderungen über einen WebSocket geschoben, statt alle paar
Sekunden nachzufragen. Damit das funktioniert, muss man im
[Lanyard-Discord](https://discord.gg/lanyard) sein.

Andere Discord-ID? Die Konstante `DISCORD_ID` oben in `script.js` und die
beiden Profil-Links in `index.html` anpassen.

Wenn Lanyard nicht erreichbar ist, steht da „Status grad nicht abrufbar“
und der Rest der Seite läuft weiter.

## Musik

Im `im ohr`-Kasten steht ein fester Spotify-Track. Läuft grad wirklich
was, tauscht `script.js` den gegen das aktuelle Lied und die Überschrift
wechselt von „letzter ohrwurm“ auf „läuft grad“.

## Lokal ansehen

```sh
python3 -m http.server 8000
```

Dann `http://localhost:8000` aufmachen. Der Discord-Status braucht
Internet, sonst bleibt der Kasten leer.
