const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const postsData = fs.readFileSync(path.join(publicDir, 'posts', 'posts.json'), 'utf8');
const baseUrl = process.env.BASE_URL || 'https://banegasn.dev';
const sitemapPath = path.join(publicDir, 'sitemap.xml');

function parsePostFrontMatter(postId) {
  const postPath = path.join(publicDir, 'posts', `${postId}.md`);
  const markdown = fs.readFileSync(postPath, 'utf8');
  const match = markdown.match(/^---\s*([\s\S]*?)\s*---/);

  if (!match) {
    return {};
  }

  return match[1].split('\n').reduce((metadata, line) => {
    const parts = line.match(/^\s*"?([^"]*?)"?\s*:\s*(.*)\s*$/);
    if (!parts || parts.length < 3) {
      return metadata;
    }

    metadata[parts[1].trim()] = parts[2].trim().replace(/^['"]|['"]$/g, '');
    return metadata;
  }, {});
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toSitemapDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
}

try {
  console.log('Generating sitemap...');
  const posts = JSON.parse(postsData).posts;
  console.log(`Found ${posts.length} posts`);

  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';

  sitemapXml += `
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.00</priority>
  </url>`;
  sitemapXml += `
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.80</priority>
  </url>`;

  posts.forEach(post => {
    if (post) {
      const metadata = parsePostFrontMatter(post);
      const lastmod = toSitemapDate(metadata.updatedAt || metadata.createdAt);
      sitemapXml += `
  <url>
    <loc>${escapeXml(`${baseUrl}/blog/${post}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.64</priority>`;
      if (metadata.imageUrl) {
        sitemapXml += `
    <image:image>
      <image:loc>${escapeXml(`${baseUrl}/${metadata.imageUrl}`)}</image:loc>
      <image:title>${escapeXml(metadata.title || post)}</image:title>
    </image:image>`;
      }
      sitemapXml += `
  </url>`;
    } else {
      console.warn('Skipping post due to missing id:', post);
    }
  });

  // Close sitemap XML
  sitemapXml += '\n</urlset>';

  // Write sitemap file
  fs.writeFileSync(sitemapPath, sitemapXml);
  console.log(`Sitemap successfully generated at ${sitemapPath}`);

} catch (error) {
  console.error('Error generating sitemap:', error);
  process.exit(1); // Exit with error code
} 
