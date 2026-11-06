import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    MAX_IMPORT_BYTES,
    parsePostImport,
} from '../src/app/admin/studio/import/post-import';
import {
    buildAgentInstructions,
    examplePostPackage,
} from '../src/app/admin/studio/agents/agent-instructions';

const metadata = {
    id: 'agent-post',
    title: 'A complete post',
    summary: 'A useful summary',
    language: 'es',
    createdAt: '2026-11-06T12:00:00.000Z',
    author: 'Author',
    seoTitle: 'SEO title',
    tags: ['Angular'],
    keywords: 'Angular, Markdown',
    imageUrl: '/api/media/image',
    translationGroup: 'agent-post',
};
const content =
    '# A complete post\n\n## Code\n\n```ts\nconst message = "Hello";\n```\n\n![An image](/api/media/image)';

test('imports nested and flat packages with all metadata and preserves Markdown exactly', () => {
    const expected = { ...metadata, content };
    assert.deepEqual(
        parsePostImport(JSON.stringify({ metadata, content })),
        expected,
    );
    assert.deepEqual(parsePostImport(JSON.stringify(expected)), expected);
    assert.deepEqual(
        parsePostImport('\uFEFF' + JSON.stringify(expected)),
        expected,
    );
    assert.deepEqual(
        parsePostImport(
            '```json\n' + JSON.stringify({ metadata, content }) + '\n```',
        ),
        expected,
    );
});

test('accepts prior agent deliveries with separate JSON and Markdown, including nested code fences', () => {
    const response = `Aquí está el artículo:\n\n\`\`\`json\n${JSON.stringify(metadata)}\n\`\`\`\n\n\`\`\`\`markdown\n${content}\n\`\`\`\`\n`;
    assert.deepEqual(parsePostImport(response), { ...metadata, content });
});

test('generates a slug, normalizes list fields, and ignores publication and revision instructions', () => {
    const post = parsePostImport(
        JSON.stringify({
            title: 'Una guía práctica',
            summary: 'Resumen',
            content: 'Texto',
            tags: ' Angular, Markdown ',
            keywords: ['Angular', 'Markdown'],
            published: true,
            revision: 99,
            updatedAt: 'fake',
            __proto__: { title: 'unsafe' },
        }),
    );
    assert.equal(post.id, 'una-guia-practica');
    assert.deepEqual(post.tags, ['Angular', 'Markdown']);
    assert.equal(post.keywords, 'Angular, Markdown');
    assert.equal('published' in post, false);
    assert.equal('revision' in post, false);
    assert.equal('updatedAt' in post, false);
    assert.equal(post.title, 'Una guía práctica');
});

test('rejects invalid fields, oversized files, ambiguous blocks and unsafe cover URLs', () => {
    const base = { ...metadata, content };
    for (const change of [
        { title: '' },
        { summary: 12 },
        { content: '' },
        { id: '../escape' },
        { language: 'de' },
        { createdAt: 'tomorrow' },
        { createdAt: '2026-02-30' },
        { tags: [4] },
        { tags: Array(31).fill('tag') },
        { imageUrl: 'javascript:alert(1)' },
        { title: 'x'.repeat(301) },
        { content: 'x'.repeat(500001) },
    ]) {
        assert.throws(() =>
            parsePostImport(JSON.stringify({ ...base, ...change })),
        );
    }
    assert.throws(
        () => parsePostImport('x'.repeat(MAX_IMPORT_BYTES + 1)),
        /1 MB/,
    );
    assert.throws(() => parsePostImport('not JSON'), /único JSON/);
    assert.throws(() => parsePostImport('{broken'), /JSON no es válido/);
    assert.throws(
        () => parsePostImport('```json\n{}\n```\n```json\n{}\n```'),
        /único JSON/,
    );
});

test('the guide example is importable and the prompt describes the actual Studio flow', () => {
    const example = examplePostPackage('2026-11-06T12:00:00.000Z');
    const imported = parsePostImport(example);
    assert.equal(imported.id, 'mi-nuevo-post');
    assert.match(imported.content, /## Primera sección/);
    const prompt = buildAgentInstructions('Un post sobre Angular', example);
    assert.match(prompt, /Un post sobre Angular/);
    assert.match(prompt, /Importar post/);
    assert.match(prompt, /\\n para que el JSON/);
    assert.match(prompt, /no guarda ni publica/);
});
