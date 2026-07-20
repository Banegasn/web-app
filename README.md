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


## Development server

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
