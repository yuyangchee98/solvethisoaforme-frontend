import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://solvethisoaforme.chyuang.com',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !['/login/', '/settings/', '/subscribe/', '/oa-response/', '/check-antecedent-basis/'].some(
          (p) => new URL(page).pathname === p
        ),
    }),
  ]
});