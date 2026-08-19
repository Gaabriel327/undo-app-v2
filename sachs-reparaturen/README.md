# Sachs Reparaturen – Landingpage

Statische Einzelseite, kein Build-Prozess. Die vier Dateien werden per FTP
in das Web-Verzeichnis kopiert, mehr ist nicht nötig.

    index.html          Die Landingpage
    impressum.html      Platzhalter, muss rechtlich geprüft werden
    datenschutz.html    Platzhalter, muss rechtlich geprüft werden
    _rechtstext.css     Aussehen der beiden Rechtstexte

## Vor dem Livegang

1. **Formular-Adresse eintragen.** In `index.html` ganz oben im Block
   `KONFIG` steht `formularUrl: "FORMULAR_URL"`. Dort die echte Adresse des
   Buchungsformulars eintragen. Alle Buttons der Seite zeigen danach dorthin.
2. **Telefonnummer eintragen.** Ebenfalls in `KONFIG`: `telefonAnzeige`
   (so wird sie angezeigt) und `telefonWaehlen` (so wird gewählt, mit +49).
3. **Gründungsjahr eintragen.** In `KONFIG` bei `gruendungsjahr` das
   `[JAHR PLATZHALTER]` durch die Jahreszahl ersetzen.
4. **Impressum und Datenschutz füllen und prüfen lassen.** Beide Seiten sind
   Gerüste mit Platzhaltern und einem roten Hinweiskasten. Der Kasten wird
   nach der rechtlichen Prüfung entfernt.
5. **LocalBusiness-Daten ergänzen.** In `index.html` im Block
   `application/ld+json`: Adresse, Telefonnummer und Öffnungszeiten.
6. **Adresse der Seite prüfen.** `<link rel="canonical">` und `url` im
   Schema-Block auf die echte Domain setzen.

## Preise ändern

Alle Preise stehen in `index.html` ganz oben in `KONFIG.preise`, jeweils als
reine Zahl ohne Euro-Zeichen. Eine Zahl ändern genügt, die Seite setzt sie
überall ein: Überschrift, Kacheln, Preistabelle und Antworten bei den Fragen.

Die Zahlen, die weiter unten im HTML stehen, sind nur Rückfallwerte für den
seltenen Fall, dass im Browser JavaScript abgeschaltet ist. Sie werden beim
Laden überschrieben und müssen nicht mitgepflegt werden.

## Technik

Keine Frameworks, keine externen Schriften, keine Tracker, keine Cookies.
Die Seite lädt genau eine Datei; das Icon steckt als Data-URI im HTML.
