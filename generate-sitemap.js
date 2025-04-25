const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const postsData = fs.readFileSync(path.join(publicDir, 'posts', 'posts.json'), 'utf8');
const baseUrl = process.env.BASE_URL || 'https://banegasn.dev';
const sitemapPath = path.join(publicDir, 'sitemap.xml');

try {
  console.log('Generating sitemap...');
  const posts = JSON.parse(postsData).posts;
  console.log(`Found ${posts.length} posts`);

  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

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
      const updateDate = fs.statSync(path.join(publicDir, 'posts', `${post}.md`)).mtime;
      const lastmod = new Date(updateDate).toISOString().split('T')[0];
      sitemapXml += `
  <url>
    <loc>${baseUrl}/blog/${post}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.64</priority>
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