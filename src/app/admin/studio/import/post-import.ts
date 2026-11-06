import type { AdminPost } from '../data/admin.models';

export const MAX_IMPORT_BYTES = 1024 * 1024;
export type ImportedPost = Partial<Omit<AdminPost, 'published' | 'revision'>> &
    Pick<AdminPost, 'id' | 'title' | 'summary' | 'content'>;

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            'El JSON no es válido. Revisa las comillas y los saltos de línea dentro de content.',
        );
    }
}
function text(
    value: unknown,
    field: string,
    maximum: number,
    required = false,
): string | undefined {
    if (value === undefined && !required) return undefined;
    if (typeof value !== 'string' || (required && !value.trim()))
        throw new Error(`El campo ${field} debe contener texto.`);
    if (value.length > maximum)
        throw new Error(
            `${field} supera los ${maximum.toLocaleString('es')} caracteres permitidos.`,
        );
    return value;
}
function stringList(value: unknown, field: string): string[] {
    const list = typeof value === 'string' ? value.split(',') : value;
    if (!Array.isArray(list) || list.some((item) => typeof item !== 'string'))
        throw new Error(
            `${field} debe ser una lista de textos o un texto separado por comas.`,
        );
    return list.map((item: string) => item.trim()).filter(Boolean);
}

/** Parses data only: imports never execute HTML, fetch URLs, persist or publish. */
export function parsePostImport(source: string): ImportedPost {
    if (new TextEncoder().encode(source).byteLength > MAX_IMPORT_BYTES)
        throw new Error(
            'El paquete supera 1 MB. Importa el texto y sube las imágenes por separado.',
        );
    const raw = source.replace(/^\uFEFF/, '').trim();
    if (!raw)
        throw new Error('Pega la entrega del agente o selecciona un archivo.');
    let data: unknown;
    let separateMarkdown: string | undefined;
    if (raw.startsWith('{')) data = parseJson(raw);
    else {
        const blocks = [
            ...raw.matchAll(
                /^(`{3,}|~{3,})(json|markdown|md)[ \t]*\r?\n([\s\S]*?)^\1[ \t]*\r?$/gm,
            ),
        ];
        const json = blocks.filter((block) => block[2] === 'json');
        const markdown = blocks.filter(
            (block) => block[2] === 'markdown' || block[2] === 'md',
        );
        if (json.length !== 1 || markdown.length > 1)
            throw new Error(
                'Usa un único JSON con metadata y content, o un bloque json y un bloque markdown separados.',
            );
        data = parseJson(json[0][3]);
        separateMarkdown = markdown[0]?.[3].replace(/\r?\n$/, '');
    }
    if (!record(data)) throw new Error('La entrega debe ser un objeto JSON.');
    const metadata = data['metadata'] === undefined ? data : data['metadata'];
    if (!record(metadata)) throw new Error('metadata debe ser un objeto JSON.');
    const title = text(metadata['title'], 'title', 300, true)!.trim();
    const summary = text(metadata['summary'], 'summary', 2000, true)!;
    const content = text(
        data['content'] ?? separateMarkdown,
        'content',
        500000,
        true,
    )!;
    const generatedId = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
    const id = text(metadata['id'], 'id', 100)?.trim() || generatedId;
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(id))
        throw new Error(
            'id debe tener entre 1 y 100 caracteres: minúsculas, números y guiones.',
        );
    const post: ImportedPost = { id, title, summary, content };
    for (const field of [
        'author',
        'seoTitle',
        'keywords',
        'translationGroup',
        'imageUrl',
    ] as const) {
        const value =
            field === 'keywords' && Array.isArray(metadata[field])
                ? stringList(metadata[field], field).join(', ')
                : text(metadata[field], field, MAX_IMPORT_BYTES);
        if (value !== undefined) post[field] = value;
    }
    if (metadata['language'] !== undefined) {
        if (!['es', 'en', ''].includes(String(metadata['language'])))
            throw new Error('language debe ser es, en o una cadena vacía.');
        post.language = metadata['language'] as string;
    }
    if (metadata['tags'] !== undefined) {
        const tags = stringList(metadata['tags'], 'tags');
        if (tags.length > 30 || tags.some((tag) => tag.length > 100))
            throw new Error(
                'Usa hasta 30 etiquetas, de hasta 100 caracteres cada una.',
            );
        post.tags = tags;
    }
    if (metadata['createdAt'] !== undefined) {
        const date = text(metadata['createdAt'], 'createdAt', 50, true)!;
        if (
            !/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(date) ||
            !Number.isFinite(Date.parse(date))
        )
            throw new Error(
                'createdAt debe ser una fecha ISO 8601 válida, con zona horaria si incluye una hora.',
            );
        if (
            new Date(date.slice(0, 10) + 'T00:00:00Z')
                .toISOString()
                .slice(0, 10) !== date.slice(0, 10)
        )
            throw new Error('createdAt contiene una fecha que no existe.');
        post.createdAt = new Date(date).toISOString();
    }
    if (post.imageUrl && !/^(https:\/\/|\/[^/])/.test(post.imageUrl))
        throw new Error(
            'imageUrl debe ser una URL HTTPS o una ruta del sitio que empiece por /.',
        );
    return post;
}
