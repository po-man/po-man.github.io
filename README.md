# Field Notes

A personal page for side projects by Po Man. Astro builds the static site, and a small script enhances the contact form, the project clips, the engineering notes, and the figure lightbox.

## Local development

```sh
npm install
npm run dev
```

Open the URL Astro prints. The contact form stays inert until `CONTACT_FORM_ENDPOINT` is set, because the repository never contains the deployed endpoint.

```sh
CONTACT_FORM_ENDPOINT="https://script.google.com/macros/s/.../exec" npm run build
npm run preview
```

## Deployment

The site publishes through `.github/workflows/pages.yml`, which runs when a tag matching `release.*` is pushed.

1. In the repository settings, set Pages to deploy from GitHub Actions.
2. Add a repository variable named `CONTACT_FORM_ENDPOINT` with the Apps Script web app URL. The workflow fails if it is missing.
3. Push a release tag, or run the workflow manually:

   ```sh
   git tag release.1
   git push origin release.1
   ```

   Pushing to `main` no longer deploys on its own.

The workflow runs `npm ci` and `npm run build`, then uploads `dist/`. The endpoint is injected at build time from the repository variable, so it never enters the source tree.

## Contact form

The form posts a JSON string to Apps Script. The browser sends no custom content type, so the request avoids a CORS preflight. The script validates the payload, writes to a private Sheet, and sends a notification email.

Setup and deployment notes are in `contact-form/README.md`. The script lives in `contact-form/appsscript/Code.gs`. The notification address and sheet ID are stored in Apps Script properties, not in this repository.

## Structure

```text
astro.config.mjs           Astro configuration
src/lib/site.ts            Site metadata and the build year
src/layouts/Base.astro     Document shell and social metadata
src/pages/index.astro      Masthead, index, seven projects, notes, contact
src/pages/calibration/     Field test: twenty questions, curve, Brier score
src/pages/404.astro        Not-found page
src/pages/calibration-exercise-demo/
                           Redirect to /calibration/
src/styles/                Site and calibration styles, bundled by Vite
src/scripts/               Contact form, clip behaviour, calibration, analytics
public/                    Fonts, images, video, favicon, robots, sitemap
contact-form/              Apps Script endpoint and deployment notes
```

## Editing

Project entries live in `src/pages/index.astro`. Each entry has a catalogue line, a short description, an optional engineering note, a facts list, and a figure. The calibration questions live in `src/scripts/calibration.js`.

Engineering notes ship open so they print and read as part of the dossier. A small inline script collapses them before first paint on narrow screens, and a `beforeprint` handler reopens them so a collapsed note is never lost on paper. Clicking a figure opens the shared `<dialog>` lightbox; images fit the viewport, and clips play paused with native controls.

Up to 980px the section rail is pinned as a top bar. Sections carry a negative `scroll-margin-top` equal to their padding, so an in-page jump lands the rail at the top, and the Contact section has a `min-height` so it can always be scrolled to the top (otherwise a jump on a tall viewport would leave the previous rail pinned).

The year in the masthead and colophon comes from `src/lib/site.ts` at build time. Project years are written in the entries.

## Analytics

GoatCounter is loaded in `src/layouts/Base.astro`, and `src/scripts/analytics.js` sends an event for every outbound link click. Relative in-site links and anchors are ignored. GoatCounter's default session handling means repeat clicks in one session count once.

Each outbound link carries a `data-outbound` code that names its event (for example `ext-meerkat-src`, `ext-github-header`). Links without a code fall back to `ext-<host><path>`. The link text becomes the event title. Add a code to any new outbound link so it shows up under a readable name, and include `target="_blank" rel="noopener noreferrer"` so it opens in a new tab.

Campaign links such as `/?campaign=resume&ref=cv` are tracked by GoatCounter automatically; the tracking parameters are removed from the address bar once the pageview has been sent, and the canonical URL keeps the page path at `/`.