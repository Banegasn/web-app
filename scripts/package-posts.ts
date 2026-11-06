import { copyFileSync } from 'node:fs';

// The connection was closed before this copy, so the WAL is checkpointed.
copyFileSync('.data/posts-build.sqlite', 'dist/banegasn/server/posts.sqlite');
