# Finest Properties – Notes Showcase (Offline, IndexedDB)

## Goal
Build a tiny mobile-first PWA showcase:
- Capture a photo / upload an image of quick notes (handwritten notes, business cards etc.)
- Add a short description
- Find notes later via search + quick access list
- Everything stored locally on the device (IndexedDB). No backend.

## Screens

### 1) Home
Light branding: “Finest Properties”
Two big buttons:
- "Dokument hinzufügen"
- "Dokument finden"
Top-right: "?" icon → start tutorial anytime

On first visit: auto-start the tutorial (with Skip + Next).

### 2) Dokument hinzufügen (Flow A)
Steps:
1. Tap "Dokument hinzufügen"
2. Bottom sheet/modal:
   - "Foto aufnehmen" (camera capture)
   - "Hochladen"
3. Preview screen:
   - Image preview
   - **Required** field: Short description (single line)
     - Default/autofill: "Note – {DD.MM.YYYY HH:mm}"
     - User can overwrite (e.g. "Müller – call back")
   - Button: "Save"
4. After save: toast/snackbar “Gespeichert”

Important:
- Compress the image client-side before saving (readability first).

### 3) Dokument finden (Flow B)
On open:
- Search input at the top (optional)
- Below: "kürzlich hochgeladen" list (e.g. last 10), sorted by newest first
Each list item:
- small thumbnail
- description
- date/time
Tap → open Detail

When user types a query:
- Filter/rank against descriptions
- Show results list

If no results:
- Show: `Leider nichts gefunden "{query}".`
- Still show "kürzlich hochgeladen" underneath
- Optional: a small box `Vorschläge: {most recent document}` (clearly labeled as a suggestion)

### 4) Document Detail
- Large image (tap to zoom)
- Optional: edit description
- Optional: "Löschen" button (useful for testing)
- Back navigation

## Data Model
`NoteDoc`:
- `id: string` (uuid)
- `createdAt: number` (Date.now())
- `description: string`
- `mimeType: string`
- `blob: Blob` (compressed JPEG)

## Storage
- IndexedDB (store: `"docs"`, key: `id`, value: `NoteDoc` incl. blob)
- localStorage only for UI flags:
  - `hasSeenTutorial=true/false`

## Image Compression (Readability First)
Handwritten notes must stay readable.
Strategy:
- If `file.size <= 1.5MB`: skip compression or apply very mild compression
- Else compress:
  - `maxWidth`: 2200px (fallback 2000px)
  - output: `image/jpeg`
  - `quality`: 0.85 (range 0.82–0.88)

Implementation idea:
- `createImageBitmap(file)` → draw to canvas → `canvas.toBlob("image/jpeg", quality)`

HEIC/HEIF (important for iPhone uploads):
- Before decoding/compressing, detect HEIC/HEIF and convert to JPEG client-side (lazy-load a converter like `heic2any` only when needed), then run the normal compression pipeline.

## Search / Ranking
Input: query string
- normalize: lowercase, trim, split by whitespace
- score:
  - +2 if keyword is contained in `description` (substring match)
- sort:
  - score desc
  - createdAt desc

If query is empty:
- no search, only "Recent uploads"

## Tutorial (4 Steps)
Trigger: first visit + anytime via "?"
Steps:
1) “Tap **Dokument hinzufügen** to quickly store a photo of a note or business card.”
2) “Use **Dokument finden** to search and open your notes later.”
3) “A short description like ‘Müller – Rückruf’ makes finding notes much easier.”
4) “Fertig — Du kannst jetzt anfangen.”

Implementation:
- Minimal custom overlay + tooltip placement via `getBoundingClientRect()`
- Or a tiny tour library if faster.

## Definition of Done
- PWA runs locally and is deployable
- Add flow: capture/upload → compress → save to IndexedDB
- Find screen: recent list + search + no-results state
- Detail view: open/zoom + optional delete
- Tutorial: first-run + restart via "?"