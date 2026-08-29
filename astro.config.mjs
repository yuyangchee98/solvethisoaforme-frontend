import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://solvethisoaforme.chyuang.com';

// Routes that only work with a local backend running. They live in src/app-routes/
// rather than src/pages/ so they are NOT picked up by file-based routing, and are
// injected only when PUBLIC_APP_ROUTES=1 (`npm run dev`, `npm run build:local`).
// The public deploy is a static site with no API behind it, so it ships only the
// marketing and docs pages.
const APP_ROUTES = [
  { pattern: '/patent-reader', entrypoint: './src/app-routes/patent-reader.astro' },
  { pattern: '/oa-agent', entrypoint: './src/app-routes/oa-agent.astro' },
  { pattern: '/check-antecedent-basis', entrypoint: './src/app-routes/check-antecedent-basis.astro' },
  { pattern: '/login', entrypoint: './src/app-routes/login.astro' },
  { pattern: '/settings', entrypoint: './src/app-routes/settings.astro' },
];

const appRoutesEnabled = process.env.PUBLIC_APP_ROUTES === '1';

/** @returns {import('astro').AstroIntegration} */
function appRoutes() {
  return {
    name: 'app-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute, logger }) => {
        if (!appRoutesEnabled) {
          logger.info(
            `public build — ${APP_ROUTES.length} app route(s) excluded (set PUBLIC_APP_ROUTES=1 to include)`,
          );
          return;
        }
        for (const route of APP_ROUTES) injectRoute(route);
        logger.info(`local build — injected ${APP_ROUTES.length} app route(s)`);
      },
    },
  };
}

// Allowlist rather than a blocklist: only the pages a search engine should see.
// A blocklist silently indexes anything new that gets added.
const SITEMAP_ALLOWED = [/^\/$/, /^\/tools\/[^/]+\/$/, /^\/blog\/?$/, /^\/blog\/[^/]+\/$/];

export default defineConfig({
  site: SITE,

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    appRoutes(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return SITEMAP_ALLOWED.some((re) => re.test(pathname));
      },
    }),
  ],
});
