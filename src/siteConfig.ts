// Single place to update site-wide links.
//
// The hosted backend was retired, so the site is now a portfolio / case-study
// page rather than a live product. Commercial CTAs point here instead.
//
// TODO: update once the public repo URL is final (the api/ and app/ repos are
// being merged into one).
export const GITHUB_URL = 'https://github.com/yuyangchee98/solvethisoaforme';

// The running apps (/patent-reader, /oa-agent, /check-antecedent-basis)
// need a local backend, so they are excluded from the public build. Set
// PUBLIC_APP_ROUTES=1 (as `npm run dev` and `npm run build:local` do) to include
// them. Pages and links guard on this flag.
export const APP_ROUTES_ENABLED = import.meta.env.PUBLIC_APP_ROUTES === '1';
