# Projekt und Zusammenarbeit

Wir entwickeln mit Andrea Kaden die Homepage von **KonferenzWerk**: zielgruppengenaue Inhouse-Konferenzen mit Konzeption, Programm, Speakern, Moderation und digitalem Teilnehmerweg. KonferenzWerk ist eine Marke der WORK WITH EASE EOOD. Die statische Website wird über GitHub Pages unter `konferenzwerk.com` veröffentlicht.

## Ein öffentliches Repository

- Alles liegt in diesem einen Repository `AerdnaNedak/konferenzwerk-homepage`. Es ist **öffentlich**: Jede eingecheckte Datei ist auf GitHub sichtbar, auch wenn sie nicht auf der Website erscheint.
- Es gibt keinen Build. Das handgeschriebene HTML wird so ausgeliefert, wie es im Repository liegt.
- GitHub Pages baut `main` aus dem Wurzelverzeichnis (klassischer Jekyll-Build). `_config.yml` schließt `entwuerfe/` und `scripts/` von der Website aus, auf GitHub bleiben sie trotzdem sichtbar.
- `konzept/` (Briefings, Fotos, Farbstudien) ist per `.gitignore` privat und wird nicht eingecheckt. Private Ausgangsmaterialien nicht ungeprüft auf die Website oder ins Repository übernehmen.

## Aufbau

- Seiten: `index.html`, `konferenzentwicklung/`, `assistenztage/`, `rechtliches/` (Impressum und Datenschutz), `404.html`. `impressum/` und `datenschutz/` leiten nur auf `rechtliches/` weiter.
- Englische Fassung unter `en/`: `en/index.html`, `en/conference-design/`, `en/assistant-days/`, `en/legal/`. Britisches Englisch, Anrede „you“. Die rechtlichen Angaben sind eine Übersetzung, verbindlich ist die deutsche Fassung.
- Gestaltung und Verhalten in `styles.css` und `script.js`, Bilder, Schriften, Logos und Videos unter `assets/`. Bilder liegen als AVIF, WebP und JPG in mehreren Breiten vor und haben `width`/`height`.
- Domain in `CNAME`, unbedingt erhalten.
- Auffindbarkeit: JSON-LD in jeder Seite (gemeinsamer Entitätsgraph mit `#organization` und `#andrea`), `sitemap.xml`, `robots.txt`, `llms.txt`.

## Arbeitsregeln

- Auf Deutsch arbeiten. Offene Inhalte oder Platzhalter nicht durch erfundene Angaben ersetzen.
- Fakten (Zahlen, Firmendaten, Kontakt, Profile) auf allen Seiten, im JSON-LD und in `llms.txt` gleich halten. Die Person `#andrea` steht in jeder Seite, Änderungen daran überall nachziehen.
- **Zweisprachig:** Jede inhaltliche Änderung in beiden Sprachen machen. Deutsch ist die Ausgangsfassung. Zu jedem Seitenpaar gehören gegenseitige `hreflang`-Verweise (`de`, `en`, `x-default` = Deutsch) und der Sprachumschalter im Kopf. Neue Seitenpaare in `scripts/validate-site.mjs` unter `translations` eintragen.
- Bei sichtbaren Inhaltsänderungen `dateModified` der Seite und `lastmod` in `sitemap.xml` auf dasselbe Datum setzen.
- Vor jedem Commit `node scripts/validate-site.mjs` ausführen. Es prüft Dateiverweise, Überschriften, ARIA, JSON-LD, Entitätsgraph, Sitemap und Social-Bilder.
- Vorschau lokal, z. B. mit `python3 -m http.server` im Projektverzeichnis.
- Sinnvolle Zwischenstände selbstständig auf `main` committen. Vor Abschluss einer Änderung den Git-Status prüfen und zugehörige Dateien berücksichtigen.

## Push und Veröffentlichung

- **Ein Push auf `main` ist sofort live.** Deshalb nur auf ausdrückliche Anweisung von Andrea pushen.
- Neue Branches nur auf ausdrücklichen Wunsch anlegen.
- Nach dem Push prüfen, dass der Pages-Build durchläuft (`gh api repos/AerdnaNedak/konferenzwerk-homepage/pages/builds/latest`) und `https://konferenzwerk.com` den neuen Stand ausliefert.
- Der Skill `/veroeffentlichen` gilt nur für work-with-ease.com, nicht für dieses Repository.
