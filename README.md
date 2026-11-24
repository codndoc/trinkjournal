# Trinkjournal

Installierbare, deutschsprachige Progressive Web App ohne externe Abhängigkeiten. Alle Getränke und Einträge bleiben im lokalen Browserspeicher. Offline nach erstem erfolgreichen Laden und Aktivieren des Service Workers nutzbar. Keine Synchronisation zwischen Browsern oder Geräten. Browserdaten nicht löschen, ohne vorher CSV zu exportieren.

## Nutzung

Getränk antippen, Menge wählen, speichern. Die Uhrzeit wird beim Öffnen erfasst und kann korrigiert werden. Die Datumsauswahl ermöglicht Nachträge und den Abruf früherer Tage. Unter Getränke verwalten lassen sich Standardmengen ändern und Getränke hinzufügen. Energy Drink startet mit 0,25 l. Einträge können einzeln gelöscht und kurzzeitig wiederhergestellt werden. CSV enthält Datum, Uhrzeit, Getränk und Menge in Litern; UTF-8 mit BOM, Semikolon und deutschem Dezimalkomma.

## Installation

HTTPS-Adresse in einem PWA-fähigen Browser öffnen. In Chrome/Edge die Installationsfunktion im Browser oder den angebotenen App-Button verwenden. Auf iPhone/iPad in Safari über Teilen → Zum Home-Bildschirm hinzufügen. Installation hängt von Browser und Betriebssystem ab.

## Lokal starten

Den Ordner dist über einen HTTP-Server bereitstellen, z. B. `python -m http.server 4173 --directory dist`, dann http://localhost:4173 öffnen. Für Installation außerhalb localhost ist HTTPS nötig.

## Import und Tagesziel

Im Menü oben rechts befinden sich CSV-Import, CSV-Export und Einstellungen. Der Import akzeptiert das Exportformat der App, prüft die gesamte Datei vor dem Speichern und zeigt eine Vorschau der Anzahl neuer und vorhandener Einträge. Einträge werden ergänzt; identische Einträge werden unter Beachtung ihrer Anzahl übersprungen. Unbekannte Getränke werden der Liste hinzugefügt. Dateien bis 5 MB und 50.000 Einträge sind zulässig. CSV enthält keine Einstellungen; das Tagesziel wird lokal verwaltet.

Das Tagesziel startet mit 1,5 Litern (DGE: https://www.dge.de/gesunde-ernaehrung/gut-essen-und-trinken/dge-empfehlungen/am-besten-wasser-trinken). Es lässt sich in den Einstellungen ändern und bleibt lokal gespeichert. Der Fortschrittsbalken bezieht sich auf alle erfassten Getränke des angezeigten Tages. Bestehende Einträge und Standardmengen bleiben bei der Aktualisierung erhalten.

## Prüfungen

## Favoriten, Varianten und Inhaltsstoffe

Alle Getränke sind zunächst Favoriten. Die Liste startet alphabetisch; manuelle Reihenfolgen bleiben danach gespeichert. Einstellungen einschließlich Ziel, Erinnerungen und Getränkeangaben werden bei gültiger Eingabe sofort gespeichert. In den Einstellungen blendet der Stern Getränke ein oder aus. Reihenfolge am rechten Griff mit Maus/Touch ändern oder den Griff fokussieren und Pfeiltasten, Pos1 oder Ende drücken. Die Sortierung ordnet nach deutschem Alphabet und bei gleichen Namen nach aufsteigender Portionsgröße. Gleiche Namen dürfen mehrfach vorkommen.

Unter „Bearbeiten“ stehen Alkohol (% vol), Energie (kcal/100 ml), Zucker (g/100 ml), Süßstoffnamen und Gesamtkonzentration (mg/l) sowie Koffein (mg/100 ml). Leere Felder sind unbekannt; ein bekannter Nullwert muss explizit eingetragen werden. Recherchierte, editierbare Richtwerte sind je Getränk mit Referenzprodukt, Rechenannahmen und Quellen hinterlegt; nicht veröffentlichte Mengen bleiben unbekannt. Eigene Werte werden bei der Migration erhalten, explizit angeforderte Alkoholwerte übernommen. Beim Erfassen werden die aktuellen Angaben als Momentaufnahme gespeichert. Spätere Änderungen gelten für künftige Einträge. Ältere Einträge und alte CSV-Dateien enthalten keine nachträglich geschätzten Werte. Die Bilanz zeigt nur Inhaltsstoffe mit hinterlegten Mengen (einschließlich ausdrücklich eingetragener Nullwerte) und kennzeichnet die Zahl der berücksichtigten Einträge. Alkohol wird aus Volumenprozent in ml und näherungsweise mit 0,8 g/ml in g umgerechnet, Energie zusätzlich mit 4,184 kJ/kcal angezeigt. CSV kann die zusätzlichen sechs Inhaltsstoff-Spalten enthalten; das alte Format bleibt lesbar.

Bezugsgrößen: https://www.lebensmittelverband.de/de/lebensmittel/kennzeichnung/naehrwert und https://www.bfr.bund.de/stellungnahme/gesundheitliche-bewertung-der-verwendung-von-suessungsmitteln-in-erfrischungsgetraenken/ ; Alkoholumrechnung: https://www.dge.de/fileadmin/Bilder/wissenschaft/referenzwerte/DGE-Position_Alkohol_EU_2024_10.pdf

## Trinkerinnerung

Voreinstellung aus, alle 60 Minuten, erste Erinnerung 08:00, Ende 22:00, Ton aus. Das Intervall ist am Beginn des Zeitfensters verankert; die Endezeit ist einschließlich, sofern dort ein Intervall endet. Zeitfenster über Mitternacht sind erlaubt. Ein Countdown zeigt die nächste Erinnerung, auch wenn diese am Folgetag liegt. Stark verspätete Erinnerungen (ab 60 Sekunden) werden übersprungen, ohne mehrere Erinnerungen nachzuholen. Mehrere Tabs werden nach Möglichkeit über Web Locks und einen lokalen Zeitstempel zusammengeführt.

Erinnerungen laufen nur bei geöffneter, vom Browser ausgeführter App. Hintergrund-Tabs, Gerätesperre und geschlossene Apps erlauben keine verlässlichen lokalen Wecker. Kein serverseitiger Push-Dienst. Hinweise dazu stehen in den Einstellungen. Drei Standardtöne werden offline erzeugt. Eigene MP3/WAV-Dateien (bis 5 MB und 120 Sekunden) werden nach erfolgreicher Dekodierung lokal in IndexedDB gespeichert. Eine Erinnerung spielt höchstens 15 Sekunden ab. Browser können nach Neustart eine erneute Aktivierung der Tonwiedergabe verlangen. CSV sichert die Einträge und Inhaltsstoffe, keine Toneinstellungen oder Audiodateien.

## Statistiken

Im Menü „Statistiken“ stehen Kalenderwoche (Montag–Sonntag), Monat, Jahr und ein frei wählbarer Zeitraum zur Verfügung. Die Datumsauswahl beginnt beim angezeigten Trinktag. Laufende Kalenderzeiträume enden heute. Eigene Zeiträume schließen beide gewählten Tage ein und dürfen nicht in der Zukunft liegen.

Die Auswertung bietet Gesamtmenge, einzelne Getränkearten (gleiche Namen über Portionsgrößen hinweg zusammengefasst) und Inhaltsstoffe. Diagramme zeigen Abschnittssummen oder den Durchschnitt pro Kalendertag. Automatisch werden bis 45 Tage einzelne Tage, bis 210 Tage Wochen und darüber Monate verwendet; die Zeiteinheit ist manuell änderbar. Angeschnittene Wochen und Monate berücksichtigen nur die ausgewählten Tage. Tage ohne Eintrag zählen zum Durchschnitt. Bei Inhaltsstoffen bleiben unbekannte Angaben unbekannt: Teilsummen sind gekennzeichnet, vollständig unbekannte Abschnitte erhalten keine numerische Null. Die Detailtabellen zeigen dieselben Zahlen wie die Diagramme. Ausgewählte Zeiträume sind auf 100 Jahre und Diagramme auf 1.500 Abschnitte begrenzt, damit die App reaktionsfähig bleibt.

Nach erfolgreichem Speichern eines Getränks schließt sich eine sichtbare Trinkerinnerung automatisch. Beim Abbrechen oder bei einem Speicherfehler bleibt sie bestehen.

## Prüfungen

`npm run check` prüft die Berechnungen und Migration. `npx playwright test` prüft die Bedienung mit Maus, Touch und Tastatur in einem separaten Microsoft-Edge-Testbrowser in Desktop- und Mobilansicht.
