# Sachs Reparaturen – Landingpage

Statische Einzelseite, kein Build-Prozess. Die Dateien werden per FTP in das
Web-Verzeichnis kopiert, mehr ist nicht nötig.

    index.html          Die Landingpage
    impressum.html      Platzhalter, muss rechtlich geprüft werden
    datenschutz.html    Platzhalter, muss rechtlich geprüft werden
    _rechtstext.css     Aussehen der beiden Rechtstexte

## Vor dem Livegang

1. **Formular-Adresse eintragen.** In `index.html` ganz oben im Block
   `KONFIG` steht `formularUrl: "FORMULAR_URL"`. Dort die echte Adresse des
   Buchungsformulars eintragen. Alle Buttons der Seite zeigen danach dorthin.
2. **Telefonnummer und Zeiten eintragen.** Ebenfalls in `KONFIG`:
   `telefonAnzeige` (so wird sie angezeigt), `telefonWaehlen` (so wird
   gewählt, mit +49) und `telefonZeiten`.
3. **Gründungsjahr eintragen.** `gruendungsjahr` in `KONFIG`.
4. **Fristen prüfen.** `antwortzeit` und `terminfrist` in `KONFIG` stehen an
   mehreren Stellen der Seite und sind ein Versprechen. Nur eintragen, was
   der Betrieb auch hält.
5. **Impressum und Datenschutz füllen und prüfen lassen.** Beide Seiten sind
   Gerüste mit Platzhaltern und einem roten Hinweiskasten. Der Kasten wird
   nach der rechtlichen Prüfung entfernt.
6. **LocalBusiness-Daten ergänzen.** In `index.html` im ersten
   `application/ld+json`-Block: Adresse, Telefonnummer, Öffnungszeiten.
7. **Adresse der Seite prüfen.** `<link rel="canonical">`, die og-Angaben und
   `url` im Schema-Block auf die echte Domain setzen.

## Preise ändern

Alle Preise stehen in `KONFIG.preise`, jeweils als reine Zahl ohne
Euro-Zeichen. Eine Zahl ändern genügt, die Seite setzt sie überall ein:
Überschrift, Kacheln, Preistabelle und Antworten bei den Fragen.

Die Zahlen, die weiter unten im HTML stehen, sind nur Rückfallwerte für den
seltenen Fall, dass im Browser JavaScript abgeschaltet ist. Sie werden beim
Laden überschrieben und müssen nicht mitgepflegt werden.

Ausnahme: die Preise im JSON-LD-Block (`makesOffer`, `priceRange`) und in den
FAQ-Antworten des FAQ-Schemas sind für Google gedacht und stehen fest im
HTML. Bei einer Preisänderung dort mit ändern, sonst weicht die Angabe in
der Google-Suche vom Preis auf der Seite ab.

## Was an dieser Seite auf Abschluss ausgelegt ist

- **Zwei Wege, immer sichtbar.** Auf dem Handy steht unten dauerhaft eine
  Leiste mit *Anrufen* und *Anfragen*. Am Rechner steht die Nummer in der
  Kopfzeile. Der Anruf ist für diese Zielgruppe der häufigere Weg und wird
  deshalb nicht versteckt.
- **Vier Buttons im Verlauf** an den Stellen, an denen die Kaufabsicht steigt:
  im Hero, nach dem Ablauf, unter der Preistabelle und am Schluss.
- **Kacheln mit eigenem Button.** Wer wegen eines klemmenden Rollladens kommt,
  klickt bei „Rollladen“ und landet mit vorausgewählter Leistung im Formular
  (`...?leistung=rollladen`). Wenn das Formular damit nichts anfangen kann:
  `leistungParameter: ""` in `KONFIG`, dann entfällt der Zusatz.
- **Reihenfolge.** „Was wir reparieren“ steht bewusst vor „So funktioniert
  es“: Der Besucher hat einen konkreten Schaden und soll ihn zuerst
  wiederfinden. Wer die ursprüngliche Reihenfolge will, tauscht die beiden
  `<section>`-Blöcke.
- **Einwände stehen neben dem Button**, nicht nur im FAQ: kostenlos,
  unverbindlich, Anfahrt inklusive, Preis vor dem Termin.
- **Der häufigste Tarif** in der Preistabelle hat einen kräftigeren Rahmen
  und die Zeile „Der häufigste Fall“. Das ist der Anker für die Einordnung
  der anderen Preise.
- **Button-Text testbar.** `buttonText` in `KONFIG` ändert alle Hauptbuttons
  gleichzeitig, etwa „Reparatur anfragen“ gegen „Festpreis anfragen“.
- **FAQ-Schema**, damit Google die Fragen direkt in den Suchergebnissen
  zeigen kann.

Bewusst nicht eingebaut: künstliche Knappheit („nur noch 2 Termine“),
Countdown, Pop-ups, Chat-Fenster. Das kostet bei dieser Zielgruppe
Vertrauen, und unbelegte Angaben sind abmahnbar.

## Bewertungen einschalten

In `KONFIG.bewertung` steht `anzeigen: false`. Sobald es echte, belegbare
Bewertungen gibt, den Text eintragen und auf `true` setzen. Dann erscheint
die Zeile unter dem ersten Button. Vorher nicht einschalten.

## Technik

Keine Frameworks, keine externen Schriften, keine Tracker, keine Cookies.
Die Seite lädt genau eine Datei; das Icon steckt als Data-URI im HTML.
