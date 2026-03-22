# Content Lock — Docs

Documentation site for [Umbraco.Community.ContentLock](https://github.com/warrenbuckley/Umbraco.Community.ContentLock), built with [Astro Starlight](https://starlight.astro.build/).

The deployed site lives at:
**https://warrenbuckley.github.io/Umbraco.Community.ContentLock/**

---

## Prerequisites

- Node.js 20+

---

## Local development

```bash
cd docs
npm install
npm run dev
```

The dev server starts at `http://localhost:4321/Umbraco.Community.ContentLock/`.

> **Note:** The `base` path (`/Umbraco.Community.ContentLock`) is always active — even locally — because it matches the deployed GitHub Pages URL. All internal links and assets are prefixed automatically by Astro.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Content

Documentation pages live in `src/content/docs/` and are written in Markdown or MDX:

```
src/content/docs/
├── index.mdx                   # Home page
├── getting-started/
│   ├── introduction.md
│   ├── installation.md
│   └── quick-start.md
├── features/
│   ├── content-locking.md
│   ├── dashboard.md
│   ├── online-users.md
│   └── audio-calling.md
├── configuration/
│   ├── overview.md
│   ├── online-users.md
│   └── webrtc.md
├── permissions.md
└── reference/                  # Auto-generated sidebar section
```

To add a new page, create a `.md` or `.mdx` file in the relevant directory. The frontmatter `title` is required:

```md
---
title: My New Page
description: A short description shown in search results.
---

Content goes here.
```

Pages under `reference/` are picked up automatically by the sidebar. Pages in all other sections need a corresponding entry in the `sidebar` array inside `astro.config.mjs`.

---

## Theme

The site uses the [Catppuccin Starlight](https://github.com/catppuccin/starlight) plugin:

- Dark mode: **Mocha** with **Mauve** accent
- Light mode: **Latte** with **Mauve** accent

Configured in `astro.config.mjs`.

---

## Deployment

The site deploys automatically to GitHub Pages via `.github/workflows/deploy-docs.yml`.

**Trigger:** any push to `v17/dev` that touches a file under `docs/**`.

You can also trigger a deploy manually from the **Actions** tab in GitHub.

> **First-time setup:** Go to **GitHub repo → Settings → Pages → Source** and select **GitHub Actions**. This only needs to be done once.
