import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeSeo, SAMPLE_HTML } from '../src/app/tools/seo/seo-analyzer';
import { scoreSeo } from '../src/app/tools/seo/seo-score';
import { SAMPLE_HTML_EN } from '../src/app/tools/seo/seo-sample.en';
import { SEO_COPY } from '../src/app/tools/seo/seo-copy';

const url = 'https://example.com/destinos/hotel-ejemplo-aeropuerto';
const query = 'transfer hotel ejemplo aeropuerto';
const score = (html = SAMPLE_HTML, pageUrl = url, search = query) => scoreSeo(analyzeSeo(html, pageUrl, search));

test('score is reproducible from displayed criterion weights and ratios', () => {
    const report = score();
    const criteria = report.areas.flatMap(a => a.criteria);
    assert.equal(criteria.reduce((n, c) => n + c.weight, 0), 100);
    const measured = criteria.filter(c => c.ratio !== null).reduce((n, c) => n + c.weight, 0);
    const earned = criteria.reduce((n, c) => n + (c.ratio ?? 0) * c.weight, 0);
    assert.equal(report.overall, Math.round(earned / measured * 100));
    assert.equal(report.overall, 100);
    assert.equal(report.coverage, 100);
    assert.equal(report.areas.length, 5);
});

test('missing inputs reduce coverage without counting as passes or zero scores', () => {
    const report = score(SAMPLE_HTML, '', '');
    assert.equal(report.overall, 100);
    assert.ok(report.coverage < 100);
    assert.equal(report.areas.find(a => a.id === 'focus')?.score, null);
    assert.equal(report.areas.find(a => a.id === 'focus')?.coverage, 0);
    assert.equal(report.areas.find(a => a.id === 'navigation')?.coverage, 50);
    assert.equal(report.measured, 58);
});

test('noindex remains an explicit blocker even with a high numerical score', () => {
    const report = score(SAMPLE_HTML.replace('<head>', '<head><meta name="robots" content="noindex">'));
    assert.equal(report.blocked, true);
    assert.ok(report.overall! < 100);
    assert.equal(report.areas.find(a => a.id === 'access')?.score, 50);
});

test('does not reward longer content, repetitions, extra schemas or punish absent images', () => {
    const original = score();
    assert.equal(score(SAMPLE_HTML.replace('</main>', '<p>transfer hotel ejemplo aeropuerto</p>'.repeat(30) + '</main>')).overall, original.overall);
    assert.equal(score(SAMPLE_HTML.replace(/<script[\s\S]*?<\/script>/, '')).overall, original.overall);
    assert.equal(score(SAMPLE_HTML.replace('</main>', '<img src="decoration.jpg" alt=""></main>')).overall, original.overall);
    assert.equal(original.areas.find(a => a.id === 'accessibility')?.coverage, 100);
});

test('partial image alternatives and generic anchor text produce proportional metrics', () => {
    const report = score(SAMPLE_HTML.replace('</main>', '<img src="a.jpg" alt="Car"><img src="b.jpg"><a href="/more">Click here</a></main>'));
    const criteria = report.areas.flatMap(a => a.criteria);
    assert.equal(criteria.find(c => c.id === 'alt')?.ratio, 0.5);
    assert.equal(criteria.find(c => c.id === 'link-text')?.ratio, 2 / 3);
    assert.ok(report.overall! < 100);
});

test('literal query scores are bounded and do not claim semantic relevance', () => {
    const report = score(SAMPLE_HTML, url, 'helicopter mountain');
    assert.equal(report.areas.find(a => a.id === 'focus')?.score, 0);
    for (const area of report.areas) {
        assert.ok(area.score === null || area.score >= 0 && area.score <= 100);
        assert.ok(area.coverage >= 0 && area.coverage <= 100);
    }
});

test('English reports, sample, actions, errors and UI copy are localized', () => {
    const report = analyzeSeo(SAMPLE_HTML_EN, 'https://example.com/destinations/example-hotel-airport', 'example hotel airport transfer', 'en');
    assert.equal(scoreSeo(report, 'en').overall, 100);
    assert.equal(report.findings.find(f => f.id === 'links')?.title, 'Links to other pages on your website');
    assert.ok(report.findings.every(f => f.action && f.why && f.detail && f.id));
    assert.throws(() => analyzeSeo('', '', '', 'en'), /Paste the HTML/);
    assert.throws(() => analyzeSeo('<p>Hi</p>', 'javascript:alert(1)', '', 'en'), /complete http/);
    assert.throws(() => analyzeSeo('<div>'.repeat(129), '', '', 'en'), /nesting levels/);
    const pending = analyzeSeo(SAMPLE_HTML_EN, '', '', 'en').findings.find(f => f.id === 'links');
    assert.equal(pending?.status, 'pending');
    assert.match(pending!.action, /Page URL/);
    assert.deepEqual(Object.keys(SEO_COPY.es).sort(), Object.keys(SEO_COPY.en).sort());
});

test('English fallback findings cover invalid markup, restrictions and missing fields', () => {
    const html = '<meta name="robots" content="noindex,nosnippet"><link rel="canonical" href="/route"><img src="a"><script type="application/ld+json">{bad}</script>';
    const report = analyzeSeo(html, '', 'airport', 'en');
    assert.equal(report.findings.find(f => f.id === 'canonical')?.needsUrl, true);
    assert.match(report.findings.find(f => f.id === 'schema')!.action, /Validate/);
    assert.match(report.findings.find(f => f.id === 'indexing')!.title, /indexing/);
    assert.ok(report.findings.some(f => f.id === 'snippets'));
});

test('accessible link labels are recognized and same-site navigation includes footer links', () => {
    const report = analyzeSeo('<nav><a href="/book" aria-label="Book your trip"></a></nav><footer><a href="/contact"><img src="x" alt="Contact the team"></a></footer>', 'https://example.com');
    assert.equal(report.facts.descriptiveLinks, 2);
    assert.equal(report.internalLinks, 2);
});
