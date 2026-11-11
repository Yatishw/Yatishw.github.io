# Yatishw.github.io

Personal portfolio of **Yatish Waghmare** — Cyber Security Analyst (SOC · Threat Hunting · Detection Engineering).
Live at **https://yatishw.github.io/**

Static single-page site (HTML/CSS/JS, no build step) hosted on GitHub Pages.

## Structure

- `index.html` — all sections (hero, stats, about, skills, projects, certifications, contact)
- `css/styles.css` — design system (dark hero / light content, Inter + JetBrains Mono)
- `js/main.js` — typing animation, scroll reveal, mobile nav, back-to-top
- `images/` — optimized assets (avatar, project thumbnails, cert logos)
- `docs/` — project reports & certificate PDFs linked from the site

## Local preview

```powershell
python -m http.server 8080
# open http://localhost:8080
```

## Deploy

Push to `main` on `Yatishw/Yatishw.github.io` — GitHub Pages serves it automatically.
