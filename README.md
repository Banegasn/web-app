# Banegasn Portfolio & Blog

Personal website and blog showcasing software engineering projects and insights. Built using modern web standards.

## Blog comments

Comments are stored in SQLite by the SSR Express process. Locally, the database is created at
`.data/comments.sqlite`. In production, attach a persistent Railway volume at `/data`; the app uses
`RAILWAY_VOLUME_MOUNT_PATH` automatically. You can override the file with `COMMENTS_DB_PATH`.

`pnpm dev` starts Angular on port 4200 and the local comments API on port 4001. Angular proxies
`/api/comments` to that API, so the browser continues using same-origin requests during development.

Comments can be nested to any depth. Anonymous upvotes and downvotes are associated with a random
identifier stored in the browser; this keeps the feature lightweight, but it is not an identity or
anti-abuse system. Existing databases are migrated automatically when the server starts.

Keep the service at one replica while it uses SQLite. Set `COMMENTS_ADMIN_TOKEN` to enable the
moderation panel at `/admin/comments`. Enter the token there to list and remove public comments.
The browser keeps it only in `sessionStorage`, so closing the tab ends the admin session. The route
is marked `noindex` and every moderation API request still requires the bearer token.

Removing a comment hides it and its visible reply branch without physically deleting the database
records. The same operation is available from the command line:

```bash
curl -X DELETE \
  -H "Authorization: Bearer $COMMENTS_ADMIN_TOKEN" \
  https://banegasn.dev/api/comments/<post-id>/<comment-id>
```


## SEO HTML analyzer

The article companion at `/tools/seo` (Spanish) and `/tools/seo/en` (English) analyzes pasted HTML
or a local file entirely in the browser. It is linked from the SEO 2027 posts rather than the main menu.
It uses a text parser rather than mounting a document: scripts, remote resources, and user-provided
URLs are never executed or fetched. No analysis API, external AI calls, storage, or crawl jobs are used.
Reports are downloaded as plain text. The URL input only resolves canonical and internal links.

Limits are enforced by the analyzer as well as the file input: 500 KiB of UTF-8 HTML, 20,000 parser
nodes, 128 levels, 30 JSON-LD blocks of at most 50,000 characters, 2,000 visited values per JSON-LD
block, a 2,048-character URL, and a 200-character target query. Oversized documents are rejected
without a partial report. No server quota is needed because analyses do not consume server resources.
JSON-LD validation only covers syntax and declared types, not Schema.org or rich-result eligibility.
The query comparison is literal, accent-insensitive term coverage, not ranking or semantic analysis.
Findings include evidence, an explanation and a concrete next step. Missing reference URLs produce
a pending check and a null internal-link count, rather than a website warning or a false zero.
Link examples include navigation and footer links and are displayed as text, never fetched.

The visual meter uses a versioned, editorial HTML-check model, not Google's ranking formula.
Five areas contain criteria with visible weights (up to 20 per area): access/initial text,
presentation/structure, navigation/links, basic accessibility and literal query focus. Overall score
is 100 × earned points / measured weight. Coverage is measured weight / applicable weight.
Missing URL/query inputs reduce coverage; inapplicable image/link-text checks are excluded from both.
A noindex flag is displayed as a blocker even if other checks score well. Word counts and JSON-LD
presence do not earn extra points. Repetition cannot improve set-based query coverage. Authority,
backlinks, semantic quality, truthfulness, field performance and actual rankings are not measured.
Both routes have localized findings, errors, examples, exports, metadata and reciprocal hreflang.
An agent handoff builds a copyable/downloadable prompt from review findings and failed score criteria,
deduplicates related tasks, separates missing inputs and preserves context-sensitive decisions.
The prompt contains quoted audit evidence and verification steps, not executable HTML or external
requests. Clipboard failure opens/selects a plain-text fallback. Passing checks share one quiet
expandable section rather than repeating success badges and nested disclosures.

Run `pnpm test:seo` for parsing, hostile input, URL resolution, limits, score math and localization.

## Development server

Use Node.js 24 LTS (24.22.1 or newer within the 24.x release line). Run `nvm install`
and `nvm use` to select the version in `.nvmrc`, then install dependencies with `pnpm install`.
Railway reads the supported Node.js range from `engines.node` in `package.json`.

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
