const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const manifestPath = path.join(publicDir, 'posts', 'posts.json');
const outputPath = path.join(__dirname, 'prerender-routes.txt');

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.posts) || manifest.posts.some(post => typeof post !== 'string' || !post)) {
    throw new Error('public/posts/posts.json must contain a posts array of non-empty strings.');
  }

  const routes = ['/', '/blog', ...manifest.posts.map(post => `/blog/${post}`)];
  fs.writeFileSync(outputPath, `${routes.join('\n')}\n`);
  console.log(`Generated ${routes.length} prerender routes at ${outputPath}`);
} catch (error) {
  console.error('Could not generate prerender routes:', error);
  process.exit(1);
}
