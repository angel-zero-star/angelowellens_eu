# angelowellens.eu portfolio site

Static HTML/CSS/JS site. No build step.

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080

## Deploy

Push to main → Vercel auto-deploys. After JS/CSS edits, bump `?v=` cache param in the HTML.

## Static copy for no-JS readers

Each root page carries a text-only copy of its case study (between the `static-copy` markers), so AI tools and scrapers that don't run JS still see the content. It's generated, never edit it by hand. After editing any `projects/<name>/<name>.html` fragment, run from the repo root:

```
python3 tools/build_static_copy.py
```

## AI page

`projects/ai/ai.html` is generated, don't edit it by hand. Edit `tools/build_ai_page.py`, then run from the repo root:

```
python3 tools/build_ai_page.py tools/ai_icons _site/projects/ai/ai.html && python3 tools/build_static_copy.py
```

The AI page hero (isometric tile grid, Three.js loaded on demand) is drawn by `initTilesHero()` in `js/angelo.js`.
