# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

```shell
pnpm add some_new_dependency

**Start Preview**

```shell
pnpm run dev
```


## Render.com deployment guide

This project already provides `render.yaml`, so you can create a static site on Render with one click:

1. Push the repo to your own Git repository.
2. On Render, create a **Static Site**, select this repository, and let Render auto-detect `render.yaml`.
3. Configure the following environment variables (all prefixed with `VITE_`, applied at build time); use `.env.example` as a reference:

| Variable | Description |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID |

4. Render will automatically run `pnpm install --frozen-lockfile && pnpm run build` and publish the `dist/` directory.

To simulate the Render build locally, run:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm run preview
```

## Performance optimizations for large data volumes

- **Data caching and single retrieval**: React Query caches Firebase results to avoid duplicate requests across pages; `loadTicketData` uses a one-time `get` read to reduce listener overhead.
- **Paginated rendering**: The three tables default to a page size of 50 to avoid rendering all rows at once and reduce initial DOM load.
- **Memoized computation**: Heavy statistical calculations run only when data changes via `useMemo`, reducing repeated work.

If the dataset grows further, consider smaller page sizes, adding indexes/sharding in Firebase, or adding backend aggregation endpoints to reduce frontend computation.
**To build**

```shell
pnpm run build
```
