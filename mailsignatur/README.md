# Mail-Signaturen für KonferenzWerk

Zwei Signaturen für Apple Mail, erstellt am 2026-10-15 nach dem Vorbild der WORK-WITH-EASE-Signatur.

- `KonferenzWerk-Signatur-lang.html`: Name, Logo-Zeichen, Kontakt, LinkedIn, Termin, Hinweis auf work-with-ease.com, Claim und Firmenangaben. Für neue Kontakte.
- `KonferenzWerk-Signatur-kurz.html`: vier Zeilen ohne Bilder, deshalb keine Anhänge im Mailverlauf. Für Antworten und Menschen, die Andrea schon kennen.
- `konferenzwerk-zeichen.png`: das Logo-Zeichen der langen Fassung als Einzeldatei.

Beide HTML-Dateien sind eigenständig: Logo und Vorschau-Schrift (Space Grotesk, OFL, siehe `assets/fonts/OFL-Space-Grotesk.txt`) sind eingebettet. Nur das Logo-Zeichen ist ein Bild, alles andere ist echter Text mit Farben direkt am Element.

## In Apple Mail einrichten

1. Datei in Safari öffnen und auf „Signatur kopieren“ klicken.
2. In Mail > Einstellungen > Signaturen den Account auswählen und über + eine neue Signatur anlegen.
3. „Immer Standardschrift für E-Mails verwenden“ deaktivieren, falls die Option angezeigt wird.
4. In das rechte Feld mit ⌘ V einfügen.
5. Falls das Logo fehlt: `konferenzwerk-zeichen.png` an die Stelle ziehen.
6. Testmail an dich selbst schicken und Logo, Farben und Links prüfen.

Die kurze Fassung als zweite Signatur anlegen und beim Antworten auswählen.

## Stand

Im Browser geprüft (Aussehen, Bild, Links). Einfügen in Apple Mail und Versand noch nicht getestet.

Der Ordner ist per `_config.yml` von der Website ausgeschlossen, auf GitHub aber öffentlich sichtbar. Er enthält nur Angaben, die auch im Impressum stehen.
