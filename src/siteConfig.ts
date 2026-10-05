// Single place to update site-wide links.
//
// The hosted instance is the product — the site is framed as a free tool, with
// the OA Agent running on the user's own Anthropic API key. The repo link
// survives only as the quiet "Source" link in the footer; the backend repo is
// the canonical one (its README links across to the frontend repo).
export const GITHUB_URL = 'https://github.com/yuyangchee98/solvethisoaforme-api';

// The running apps (/patent-reader, /oa-agent, /check-antecedent-basis) need the
// backend. `npm run dev`, `npm run build:app`, and `npm run build:prod-app`
// include them; plain `npm run build` leaves them out and must NOT be used as
// the deploy build — it would silently revert the site to marketing-only.
export const APP_ROUTES_ENABLED = import.meta.env.PUBLIC_APP_ROUTES === '1';
