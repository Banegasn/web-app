import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeSeo, MAX_HTML_BYTES, SAMPLE_HTML } from '../src/app/tools/seo/seo-analyzer';

test('analyzes a server HTML page and resolves local navigation', () => {
    const result = analyzeSeo(SAMPLE_HTML, 'https://example.com/destinos/hotel-ejemplo-aeropuerto', 'TRÁNSFER del Hotel Ejemplo al aeropuerto');
    assert.equal(result.title, 'Transfer de Hotel Ejemplo al aeropuerto | TrustRide');
    assert.deepEqual(result.headings, ['Transfer de Hotel Ejemplo al aeropuerto']);
    assert.equal(result.internalLinks, 2);
    assert.deepEqual(result.matchedTerms, result.terms);
    assert.deepEqual(new Set(result.schemaTypes), new Set(['Service', 'Organization']));
    assert.equal(result.findings.filter(f => f.status === 'urgent').length, 0);
});

test('flags noindex and none regardless of case and combines Googlebot directives', () => {
    for (const directive of ['NOINDEX, FOLLOW', 'none', 'max-snippet: 0, noindex']) {
        const result = analyzeSeo(`<html><head><meta name="Googlebot" content="${directive}"></head><body><h1>Route</h1></body></html>`);
        assert.equal(result.findings.find(f => f.title === 'Directivas de indexación en HTML')?.status, 'urgent');
    }
    assert.equal(analyzeSeo('<meta name="robots" content="nosnippet">').findings.some(f => f.title === 'Fragmentos restringidos'), true);
});

test('does not execute hostile HTML, fetch resources or pollute objects', () => {
    const result = analyzeSeo(`<html lang="es"><head><title>Safe &amp; readable</title>
        <script>throw new Error('Executed HTML')</script>
        <script src="https://example.com/evil.js"></script>
        <script type="application/ld+json">{"__proto__":{"polluted":true},"@type":"Service"}</script>
        </head><body onload="throw 1"><iframe src="http://127.0.0.1/private"></iframe>
        <h1 onclick="throw 1">Visible <span>heading</span></h1><img src="http://localhost/secret" alt="">
        <p>Useful content</p><div hidden>Invisible uniquehidden</div><nav>uniquenavigation</nav></body></html>`);
    assert.equal(result.title, 'Safe & readable');
    assert.deepEqual(result.headings, ['Visible heading']);
    assert.equal(result.missingAlt, 0);
    assert.equal(Object.hasOwn(Object.prototype, 'polluted'), false);
    const hidden = analyzeSeo('<main><div aria-hidden="true">secretword</div><p>Public</p></main>', '', 'secretword');
    assert.deepEqual(hidden.matchedTerms, []);
});

test('handles malformed JSON-LD and valid arrays and graphs separately', () => {
    const result = analyzeSeo(`<h1>Route</h1><script type="application/ld+json">{broken}</script>
      <script type="application/ld+json">[{"@graph":[{"@type":["Service","Thing"]}]}]</script>`);
    assert.equal(result.findings.find(f => f.title === 'Sintaxis JSON-LD')?.status, 'review');
    assert.deepEqual(new Set(result.schemaTypes), new Set(['Service', 'Thing']));
});

test('rejects oversized UTF-8, excessive nodes, nesting, blocks and JSON', () => {
    assert.throws(() => analyzeSeo('a'.repeat(MAX_HTML_BYTES + 1)), /500 KiB/);
    assert.throws(() => analyzeSeo('😀'.repeat(MAX_HTML_BYTES / 3)), /500 KiB/);
    assert.throws(() => analyzeSeo('<div>'.repeat(129)), /128 niveles/);
    assert.throws(() => analyzeSeo('<br>'.repeat(20001)), /20.000 nodos/);
    assert.throws(() => analyzeSeo('<script type="application/ld+json">{}</script>'.repeat(31)), /30 bloques/);
    assert.throws(() => analyzeSeo(`<script type="application/ld+json">"${'a'.repeat(50001)}"</script>`), /50.000/);
    assert.throws(() => analyzeSeo('<p>Hello</p>', '', 'a'.repeat(201)), /límite/);
});

test('requires HTML, allows decorative alt and reports canonical ambiguity', () => {
    assert.throws(() => analyzeSeo('Plain text only'), /etiquetas HTML/);
    assert.throws(() => analyzeSeo(''), /Pega/);
    assert.throws(() => analyzeSeo('<p>Hello</p>', 'javascript:alert(1)'), /URL completa/);
    assert.throws(() => analyzeSeo('<p>Hello</p>', 'https://user:password@example.com'), /sin credenciales/);
    const result = analyzeSeo('<title>First</title><title>Second</title><h1>A</h1><h1>B</h1><img alt=""><img><link rel="canonical" href="/other">', 'https://example.com/page');
    assert.equal(result.missingAlt, 1);
    assert.equal(result.findings.find(f => f.title === 'Título de la página')?.status, 'review');
    assert.equal(result.findings.find(f => f.title === 'Encabezado principal')?.status, 'review');
    assert.equal(result.canonical, 'https://example.com/other');
    assert.equal(result.findings.find(f => f.title === 'URL canónica')?.status, 'review');
});

test('resolves base URLs and ignores unsafe canonical and non-HTTP links', () => {
    const result = analyzeSeo('<base href="https://example.com/routes/"><link rel="canonical" href="hotel"><a href="book">Book</a><a href="#main">Skip</a><a href="mailto:test@example.com">Email</a>');
    assert.equal(result.canonical, 'https://example.com/routes/hotel');
    assert.equal(result.internalLinks, 1);
    const unsafe = analyzeSeo('<link rel="canonical" href="javascript:alert(1)"><h1>Route</h1>', 'https://example.com');
    assert.equal(unsafe.canonical, '');
    const externalBase = analyzeSeo('<base href="https://cdn.example.com/"><a href="book">External</a><a href="https://example.com/book">Internal</a>', 'https://example.com/page');
    assert.equal(externalBase.internalLinks, 1);
});

test('avoids substring keyword matches and distinguishes HTML shell from content', () => {
    const result = analyzeSeo('<title>Transport</title><main><p>Airport</p></main>', '', 'port airport');
    assert.deepEqual(result.matchedTerms, ['airport']);
    const shell = analyzeSeo('<html><head><title>App</title></head><body><app-root></app-root><script>const words="Lots of content"</script></body></html>');
    assert.equal(shell.words, 0);
    assert.equal(shell.findings.find(f => f.title === 'Contenido en el HTML aportado')?.status, 'review');
});

test('missing URL means unmeasured links, not zero links or a website problem', () => {
    const result = analyzeSeo(SAMPLE_HTML);
    const finding = result.findings.find(f => f.title === 'Enlaces a otras páginas de tu web');
    assert.equal(result.internalLinks, null);
    assert.equal(finding?.status, 'pending');
    assert.equal(finding?.needsUrl, true);
    assert.match(finding!.action, /URL de la página/);
    assert.match(finding!.action, /Analizar mi HTML/);
    assert.deepEqual(result.linkExamples.map(link => link.href), ['/reservar', '/destinos']);
    const completed = analyzeSeo(SAMPLE_HTML, 'https://example.com/destinos/hotel-ejemplo-aeropuerto');
    assert.equal(completed.internalLinks, 2);
    assert.equal(completed.findings.find(f => f.title === finding?.title)?.status, 'ok');
});

test('relative canonical without a reference URL is pending, not invalid', () => {
    const result = analyzeSeo('<title>Route</title><link rel="canonical" href="/route"><h1>Route</h1>');
    const canonical = result.findings.find(f => f.title === 'URL canónica');
    assert.equal(canonical?.status, 'pending');
    assert.equal(canonical?.needsUrl, true);
    const completed = analyzeSeo('<link rel="canonical" href="/route">', 'https://example.com/route');
    assert.equal(completed.findings.find(f => f.title === 'URL canónica')?.status, 'ok');
});

test('counts navigation and footer links, excludes hidden links, and gives readable examples', () => {
    const html = `<nav><a href="/reserve">Reservar</a></nav><main><a href="/route"><span>Otro</span> destino</a>
        <a hidden href="/private">Privado</a><a href="https://other.example.com">External</a>
        <a href="#main">Skip</a><a href="tel:123">Call</a></main><footer><a href="/contact">Contacto</a></footer>`;
    const result = analyzeSeo(html, 'https://example.com/route');
    assert.equal(result.internalLinks, 3);
    assert.deepEqual(result.linkExamples.map(link => link.text), ['Reservar', 'Otro destino', 'Contacto']);
});

test('every finding has evidence, explanation and an action; optional schema is not an error', () => {
    const result = analyzeSeo('<title>Route</title><h1>Route</h1><p>Useful information</p>', 'https://example.com/route', 'hotel aeropuerto');
    for (const finding of result.findings) {
        assert.ok(finding.detail.trim());
        assert.ok(finding.why.trim());
        assert.ok(finding.action.trim());
    }
    assert.equal(result.findings.find(f => f.title === 'Sintaxis JSON-LD')?.status, 'info');
    assert.equal(result.findings.find(f => f.title === 'URL canónica')?.status, 'info');
    assert.equal(result.findings.find(f => f.title === 'Cobertura literal de la búsqueda')?.status, 'info');
    assert.equal(result.findings.find(f => f.title === 'Enlaces a otras páginas de tu web')?.status, 'review');
});
