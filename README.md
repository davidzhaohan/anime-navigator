# Anime Todo Tracker

Browse, search, filter, and track anime from [MyAnimeList](https://myanimelist.net/). Mark shows as finished, filter by genre/rating/status/score, and keep your local catalog up to date.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm (or [bun](https://bun.sh/))

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 8080 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Refresh Catalog

The app ships with a pre-loaded catalog of anime from MyAnimeList. Use the **Refresh catalog** button (top-right of the page) to fetch the latest titles.

### What it does

1. Scrapes the **newest pages first** from the [Jikan API](https://docs.api.jikan.moe/) to catch recently announced anime.
2. Then crawls the remaining pages in popularity order, resuming from where the last refresh stopped.
3. Deduplicates titles (keeping the highest-scored version of each).
4. Saves the updated catalog to `available_animes/catalog.json` and metadata to `available_animes/catalog-meta.json`.
5. A progress bar shows real-time status — you can keep using the app while it refreshes.

### Notes

- The button is disabled while a refresh is in progress.
- Refresh respects Jikan's rate limits (450 ms delay between requests) with automatic retry on 429/5xx responses.
- The catalog persists across sessions — you only need to refresh when you want new titles.

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Radix UI, Lucide icons.
