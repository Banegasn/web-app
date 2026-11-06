# Banegasn Portfolio & Blog

Personal website and blog showcasing software engineering projects and insights. Built using modern web standards.

## Blog storage and publishing

Posts and comments share the existing SQLite file (`.data/comments.sqlite` locally).
`COMMENTS_DB_PATH` and `RAILWAY_VOLUME_MOUNT_PATH` still control its location.

The browser reads `/api/posts` for paginated metadata (no Markdown bodies) and
`/api/posts/:id` for one article plus translation metadata. Listing, language selection,
content search, ordering and pagination run in SQLite. Search is debounced and obsolete
requests are canceled. Completed article bodies are not kept in a global browser cache.
Prerendered pages transfer the data needed for hydration so the same request does not
need to run again for the same language.

The administrator publishes at `/admin` (the old `/admin/comments` URL redirects there).
Studio includes a visual/Markdown editor, draft/published states, post metadata and SEO,
cover images, a media library, and comment moderation. The «Guía para agentes» section builds
a copyable brief with metadata, Markdown, image and publication instructions. «Importar post»
accepts the complete JSON package (metadata + content), flat JSON, or separate fenced JSON and
Markdown blocks, pasted or uploaded as a text file. It validates the payload and opens the editor
without saving or publishing; existing slugs can be loaded as an explicit update with the current
revision and publication state preserved. New posts publish immediately without
code deployments. Markdown remains the content format stored in SQLite.

`content/posts/` is the legacy seed catalog. Builds import and package that catalog, but once a
post is saved through Studio it becomes managed content: future imports, restarts, and deployments
cannot overwrite or retire it. Existing comments are preserved. Revision checks reject stale
concurrent saves; existing slugs remain stable to preserve links and comment associations.
Drafts are excluded from the public API, SSR, and the dynamic sitemap. Switching a published
article to a draft removes it from the blog. Public blog HTML is rendered from the live database;
public API responses revalidate on every request, so the prerendered build never hides CMS edits.

Images (PNG/JPEG/WebP/GIF, up to 8 MiB each) are stored as binary blobs in the same persistent
SQLite database and served at `/api/media/:id`. No external storage credentials are needed.
Image insertion in the editor supports file selection, paste and drag/drop. Uploaded files
are public by URL, including images attached to drafts; do not upload private material.
Keep the database on the existing persistent volume and include it in backups.

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` in the server environment. To generate a
salted scrypt hash, run `pnpm admin:password` and provide the password through stdin. Only the
hash is configured on the server; no default account or password is shipped in the repository.
Access uses an 8-hour HttpOnly/SameSite=Strict cookie (Secure over HTTPS), server-side sessions,
a 10-attempt/15-minute login limit per client IP, and a required custom header on admin mutations.
Sessions end on logout, expiry or server restart. No credentials are stored in browser storage.
`COMMENTS_ADMIN_TOKEN` is no longer accepted and may be removed from the deployment.
Keep one replica while using SQLite and in-process sessions.

Studio follows feature components with separate templates and styles: login, sidebar, post list/row,
editor, publication/cover/SEO panels, comment list/card, and media library. The root coordinates
navigation. `AdminApiService` owns HTTP, `AdminSessionService` owns sessions, and domain stores own
posts, comments, media and the current draft. Presentation components communicate through typed
inputs/outputs. Unsaved editor state survives session expiry; stale async loads and edits made
while saving are protected. Shared visual primitives live in `studio-theme.css`.

The TOAST UI ESM patch in `patches/toast-ui-editor.patch` replaces its bundled legacy sanitizer
with its updated DOMPurify dependency. Keep that patch and the pnpm override when updating the editor.
Editor JavaScript and its stylesheet load only when editing a post.

Use `pnpm dev` to prepare the catalog and start Angular plus the local API. Production-like
preview: `pnpm build`, configure the admin variables and `pnpm start`.
`pnpm test:posts` checks catalog imports and public APIs; `pnpm test:admin` covers authentication,
CSRF checks, session revocation, publication, revision conflicts, import preservation, uploads,
and comment moderation. `pnpm migrate:posts` remains available for importing the legacy source.

## Blog comments

Comments are stored in SQLite by the SSR Express process. Locally, the database is created at
`.data/comments.sqlite`. In production, attach a persistent Railway volume at `/data`; the app uses
`RAILWAY_VOLUME_MOUNT_PATH` automatically. You can override the file with `COMMENTS_DB_PATH`.

`pnpm dev` starts Angular on port 4200 and the local blog API on port 4001. Angular proxies
`/api` to that API, so the browser continues using same-origin requests during development.

Comments can be nested to any depth. Anonymous upvotes and downvotes are associated with a random
identifier stored in the browser; this keeps the feature lightweight, but it is not an identity or
anti-abuse system. Existing databases are migrated automatically when the server starts.

Manage comments in the Comments section of `/admin` using the same admin session as posts.
Removing a comment hides it and its visible reply branch without physically deleting records.
The old bearer-token moderation endpoints now require the admin session cookie.

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

Run `pnpm dev` for the dev server and blog API. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `pnpm build` to import posts, generate SEO routes, build the project and package the SQLite catalog. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
