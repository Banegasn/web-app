import type { Finding, SeoReport } from './seo-analyzer';

export function englishError(message: string): string {
    const errors: Record<string, string> = {
        'Pega el código fuente HTML de una página.': 'Paste the HTML source of a page.',
        'El HTML supera el límite de 500 KiB. Analiza una sola página más pequeña.': 'The HTML exceeds 500 KiB. Analyze a smaller, single page.',
        'La URL o la búsqueda supera el límite permitido.': 'The URL or target query exceeds the allowed length.',
        'Usa una URL completa http:// o https:// sin credenciales.': 'Use a complete http:// or https:// URL without credentials.',
        'HTML demasiado complejo: máximo 20.000 nodos y 128 niveles.': 'HTML is too complex: maximum 20,000 nodes and 128 nesting levels.',
        'HTML demasiado complejo: máximo 20.000 nodos.': 'HTML is too complex: maximum 20,000 nodes.',
        'Máximo 30 bloques JSON-LD por análisis.': 'Maximum 30 JSON-LD blocks per analysis.',
        'No se han detectado etiquetas HTML. Copia el código fuente, no solo el texto.': 'No HTML tags found. Copy the page source, not just its text.',
        'Un bloque JSON-LD supera el límite de 50.000 caracteres.': 'A JSON-LD block exceeds 50,000 characters.',
    };
    return errors[message] || 'The HTML could not be analyzed. Check the input and try again.';
}

export function englishFinding(f: Finding, r: SeoReport): Finding {
    const facts = r.facts;
    const copy = (title: string, detail: string, why: string, action: string, example?: string): Finding => ({
        id: f.id, status: f.status, needsUrl: f.needsUrl, title, detail, why, action, example,
    });
    switch (f.id) {
        case 'title': return copy('Page title', `${facts.titleCount} <title> elements. First title: ${r.title || '(empty)'}.`,
            'The title helps visitors recognize the page in search results and browser tabs.',
            !r.title ? 'Add a specific title in <head> describing the service and destination.' : facts.titleCount > 1 ? 'Keep one <title>. Check whether your template and SEO plugin both generate it.' : 'No presence or duplication issue found. Check that the title accurately distinguishes this page.',
            !r.title ? '<title>Example Hotel airport transfer | Your brand</title>' : undefined);
        case 'description': return copy('Search description', `${facts.descriptionCount} meta descriptions. First description: ${r.description || '(empty)'}.`,
            'Google may use this summary for a search result, or choose a different passage for the query.',
            !r.description ? 'Add one meta description in <head> explaining the offer and the next step.' : facts.descriptionCount > 1 ? 'Keep a single meta description for this page.' : 'Check that the summary is accurate and useful.',
            !r.description ? '<meta name="description" content="Check pickup details, luggage and availability for your Example Hotel airport transfer.">' : undefined);
        case 'heading': return copy('Main heading', `${r.headings.length} H1 headings: ${r.headings.join('; ') || '(none)'}.`,
            'A clear main heading helps visitors understand the page. Multiple H1s do not automatically mean a penalty.',
            !r.headings[0] ? 'Add a visible H1 describing the main service or topic.' : r.headings.length > 1 ? 'Check which heading is the main one. Use H2s for sections such as pickup, luggage and booking.' : 'Check that this heading matches the need addressed by the page.',
            !r.headings.length ? '<h1>Example Hotel airport transfer</h1>' : undefined);
        case 'indexing': return copy('HTML indexing instructions', facts.blocked ? `Exclusion instruction found: ${facts.robots.join('; ')}.` : 'No noindex or none instruction found in robots/Googlebot meta tags.',
            'noindex asks Google to exclude the page from search results. This can be intentional for private or test pages.',
            facts.blocked ? 'If this page should appear in search, remove noindex or none from its robots/Googlebot meta tag. Recheck the HTML and inspect the URL in Search Console. Keep it if exclusion is intentional.' : 'No change needed for this check. Confirm actual indexing in Search Console; HTTP headers and robots.txt are not checked here.');
        case 'snippets': return copy('Restricted search snippets', `nosnippet or max-snippet:0 found in: ${facts.robots.join('; ')}.`,
            'These instructions restrict text snippets in search results.', 'Remove the relevant restriction if you want snippets to be available; keep it if it is intentional.');
        case 'canonical': return copy('Preferred URL (canonical)', `${facts.canonicalCount} canonical tags. Resolved preferred URL: ${r.canonical || '(not resolved)'}.`,
            'A canonical indicates your preferred address when several URLs show the same content. Its absence alone does not prove a problem.',
            f.needsUrl ? 'Enter the full address of the page whose HTML you copied, then run the analysis again. You do not need to change your website to complete this check.'
                : !facts.canonicalCount ? 'Check whether duplicate URL variants exist. If they do, declare one canonical pointing to the preferred version.'
                    : facts.canonicalCount > 1 ? 'Keep a single canonical tag. Check for two templates or plugins generating it.'
                        : !r.canonical ? 'Fix the canonical so that it resolves to a valid HTTP(S) address.'
                            : facts.differentCanonical ? `Check whether you want this page consolidated with ${r.canonical}. If not, change the canonical to the preferred address of this page.` : 'Check that this is the version you actually want search engines to use.');
        case 'language': return copy('Document language', facts.language ? `Declared language: ${facts.language}.` : 'The <html> element does not declare a language.',
            'The lang attribute helps screen readers pronounce the content correctly.',
            facts.language ? 'Check that the declared language matches the content.' : 'Add the correct lang attribute to <html>: en for English, or the actual content language.', !facts.language ? '<html lang="en">' : undefined);
        case 'content': return copy('Text in the supplied HTML', `${r.words} words outside scripts, technical head content, navigation, footer and explicitly hidden elements.`,
            'This shows whether text is already present in the supplied HTML. There is no universal minimum word count. JavaScript and CSS are not evaluated.',
            r.words ? 'Do not add words just to increase this count. Check whether the page explains the service, conditions and booking process.' : 'If this is the original source, check where the content is generated. Inspect the rendered page in Search Console and discuss SSR or prerendering with your developer.');
        case 'images': return copy('Image alternatives', `${r.missingAlt} of ${r.images} images lack an alt attribute, including navigation and footer images. CSS is not evaluated.`,
            'Alternative text helps people understand an image when they cannot see it or use a screen reader.',
            r.missingAlt ? 'Find <img> elements without alt. Describe informative images; use alt="" for purely decorative images.' : 'No missing alt attributes found. Check whether informative images have meaningful descriptions; empty alt is valid for decoration.',
            r.missingAlt ? '<img src="vehicle.jpg" alt="Transfer vehicle with luggage space">' : undefined);
        case 'links': return copy('Links to other pages on your website', r.internalLinks === null ? `The page address is missing. Found ${facts.candidateLinks} candidate links, but their site cannot be determined.` : `${r.internalLinks} links point to the same site, including navigation and footer links.`,
            'These lead from this page to other pages on your own website, such as Booking or Other destinations. They help visitors continue their journey.',
            r.internalLinks === null ? 'In Page URL, paste the full address of the page whose HTML you copied. Then select Analyze my HTML. This pending check is not a website error.' : !r.internalLinks ? 'If visitors need a next step, add a useful booking or related-destination link with descriptive text.' : 'Review the examples and confirm they lead to useful pages. Open the destinations on your website to check they work; there is no ideal link count.',
            r.internalLinks === null ? 'If you copied https://yourwebsite.com/destinations/example-hotel, enter that exact page address.' : !r.internalLinks ? '<a href="/book">Check availability and book</a>' : undefined);
        case 'schema': return copy('JSON-LD syntax', `${facts.jsonLdCount} structured-data blocks; ${facts.invalidJsonLd} invalid or too complex. Readable types: ${r.schemaTypes.join(', ') || '(none)'}.`,
            'JSON-LD describes entities such as a service or organization. Valid JSON alone does not prove rich-result eligibility.',
            facts.invalidJsonLd ? 'Validate application/ld+json scripts for quotes, commas and braces. Simplify oversized structures, then check the page with Rich Results Test.' : !facts.jsonLdCount ? 'Do not add markup just to complete a checklist. Choose types that describe the actual page and its entities.' : 'Syntax checks passed within the analysis limits. Use Rich Results Test to check supported types and their requirements.');
        case 'query': return copy('Literal query coverage', `${r.matchedTerms.length}/${r.terms.length} terms appear in the title, H1 or text. Missing: ${r.terms.filter(t => !r.matchedTerms.includes(t)).join(', ') || '(none)'}.`,
            'This compares words, ignoring case and accents. A missing word may be expressed with a synonym. It does not measure semantic relevance or search positions.',
            'Read the page with this search in mind. Add genuinely missing answers using verified information. Do not repeat terms just to make this check match.');
        default: throw new Error(`Missing English finding: ${f.id}`);
    }
}
