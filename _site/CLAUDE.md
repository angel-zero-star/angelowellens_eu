# angelowellens.eu portfolio site

Static HTML/CSS/JS site. No build step.

## Run locally

```
python3 -m http.server 8080
```

Then open http://localhost:8080

## Deploy

Push to main → Vercel auto-deploys. After JS/CSS edits, bump `?v=` cache param in the HTML.
