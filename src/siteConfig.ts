// Single place to update site-wide links.
//
// There is no hosted instance — every "Self-host it" CTA points at the repo.
// The backend and frontend live in separate repos; the backend is the canonical
// one because that's where the setup guide lives and where the agent, the
// validators, and the patent reader actually are. Its README links across to
// the frontend repo.
export const GITHUB_URL = 'https://github.com/yuyangchee98/solvethisoaforme-api';
export const GITHUB_URL_FRONTEND = 'https://github.com/yuyangchee98/solvethisoaforme-frontend';

// The running apps (/patent-reader, /oa-agent, /check-antecedent-basis) need a
// local backend. `npm run dev` and `npm run build:app` include them; `npm run
// build` (the deploy build) leaves them out. Pages and links guard on this.
export const APP_ROUTES_ENABLED = import.meta.env.PUBLIC_APP_ROUTES === '1';
