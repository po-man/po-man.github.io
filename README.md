# Field Notes

A personal page for side projects by Po Man. Astro builds the static site, and a small script enhances the contact form and project clips.

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

The site publishes from `main` through `.github/workflows/pages.yml`.

1. In the repository settings, set Pages to deploy from GitHub Actions.
2. Add a repository variable named `CONTACT_FORM_ENDPOINT` with the Apps Script web app URL. The workflow fails if it is missing.
3. Push to `main` or run the workflow manually.

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
src/scripts/               Contact form, clip behaviour, calibration logic
public/                    Fonts, images, video, favicon, robots, sitemap
contact-form/              Apps Script endpoint and deployment notes
```

## Editing

Project entries live in `src/pages/index.astro`. Each entry has a catalogue line, a short description, an optional engineering note, a facts list, and a figure. The calibration questions live in `src/scripts/calibration.js`.

The year in the masthead and colophon comes from `src/lib/site.ts` at build time. Project years are written in the entries.