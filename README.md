# Inkwell Notes

A note-taking workspace in the style of premium note apps, with every
Professional-tier feature unlocked. It's a static app with no build step:
serve this folder with GitHub Pages or any static server. Data is stored
privately in the browser (IndexedDB) and works offline.

Features: notebooks and stacks, tags, a rich-text editor (checklists, tables,
code, quotes, colors and highlights, Markdown shortcuts), images, file
attachments, sketches, audio notes, `[[note links]]` with backlinks, tasks with
due dates and priority, reminders with notifications, a calendar, templates
(built-in or your own), version history, AES-256 note encryption, advanced
search with operators and saved searches, a command palette (Ctrl/⌘+K),
presentation mode, focus mode, export to HTML/Markdown/TXT/PDF, full JSON backup
and restore, light and dark themes with accent colors, and an installable PWA.

## Run locally

    python3 -m http.server 8000

Then open http://localhost:8000/.
