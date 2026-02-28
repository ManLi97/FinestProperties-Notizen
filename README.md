# Finest Properties Notes Showcase

Small mobile-first PWA showcase for local note storage and retrieval.

## Run locally

Use any static server in this folder, for example:

- `python -m http.server 4173`
- then open `http://localhost:4173`

## Manual smoke checks

Purpose: quick runtime verification for Markus' one-afternoon showcase test.

1. Home view shows `Dokument hinzufügen`, `Dokument finden`, and `?`.
2. Add flow:
   - choose camera/upload,
   - preview appears,
   - default description is prefilled,
   - save stores the item and shows `Gespeichert`.
3. Find flow:
   - empty search shows `kürzlich hochgeladen`,
   - query ranks matching descriptions,
   - no match shows not-found message + recent list.
4. Detail flow:
   - open note, tap image to zoom, close zoom overlay,
   - edit description and save,
   - delete removes document.
5. Tutorial:
   - first run opens automatically,
   - `?` reopens it anytime.
6. Compatibility:
   - one iPhone HEIC sample,
   - one Android JPEG sample.
