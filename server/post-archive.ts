import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { fromBuffer, type Entry, type ZipFile } from 'yauzl';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Definition, Nodes } from 'mdast';
import { Parser } from 'htmlparser2';
import { MAX_ARCHIVE_BYTES } from '../src/app/admin/studio/import/post-archive.models';
import { MAX_IMPORT_BYTES, parsePostImport } from '../src/app/admin/studio/import/post-import';
import { imageType } from './media-type';

const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 128;
const MAX_IMAGES = 30;
const imageExtension = /\.(png|jpe?g|webp|gif)$/i;

export class PostArchiveError extends Error {}
export interface ArchiveImage {
    id: string;
    name: string;
    type: string;
    data: Buffer;
}

function fail(message: string): never { throw new PostArchiveError(message); }

function safePath(value: string): string {
    const path = value.normalize('NFC');
    if (!path || path.length > 512 || /[\\:]/.test(path) || [...path].some((char) => char.charCodeAt(0) < 32) ||
        path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..'))
        fail('El ZIP contiene una ruta no válida. Usa carpetas relativas sin «..».');
    return path;
}

function bundled(url: string): boolean {
    return !!url && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url);
}

async function openZip(data: Buffer): Promise<ZipFile> {
    if (data.length > MAX_ARCHIVE_BYTES) fail('El ZIP supera los 32 MB permitidos.');
    return new Promise((resolve, reject) => fromBuffer(data, {
        lazyEntries: true, autoClose: false, validateEntrySizes: true, strictFileNames: true,
    }, (error, zip) => error || !zip ? reject(error) : resolve(zip)));
}

async function indexZip(zip: ZipFile): Promise<Map<string, Entry>> {
    const entries = new Map<string, Entry>();
    const names = new Set<string>();
    let count = 0, expanded = 0;
    return new Promise((resolve, reject) => {
        zip.on('error', reject);
        zip.on('entry', (entry: Entry) => {
            try {
                if (++count > MAX_ENTRIES) fail('El ZIP admite hasta 128 archivos y carpetas.');
                expanded += entry.uncompressedSize;
                if (expanded > MAX_EXPANDED_BYTES) fail('El ZIP supera los 64 MB descomprimidos.');
                if (entry.isEncrypted() || ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000)
                    fail('No se admiten archivos cifrados ni enlaces simbólicos.');
                const directory = entry.fileName.endsWith('/');
                const name = safePath(directory ? entry.fileName.slice(0, -1) : entry.fileName);
                const key = name.toLowerCase();
                if (names.has(key)) fail('El ZIP contiene rutas duplicadas o ambiguas.');
                names.add(key);
                if (!directory) entries.set(name, entry);
                zip.readEntry();
            } catch (error) { reject(error); zip.close(); }
        });
        zip.once('end', () => resolve(entries));
        zip.readEntry();
    });
}

async function readEntry(zip: ZipFile, entry: Entry, limit: number): Promise<Buffer> {
    if (entry.uncompressedSize > limit) fail(`El archivo «${entry.fileName}» supera su límite de tamaño.`);
    return new Promise((resolve, reject) => zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) { reject(error); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on('error', reject);
        stream.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > limit) {
                stream.destroy(new PostArchiveError('Un archivo descomprimido supera su límite.'));
                return;
            }
            chunks.push(chunk);
        });
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    }));
}

function markdownNodes(content: string): Nodes[] {
    const stack: Nodes[] = [fromMarkdown(content)];
    const nodes: Nodes[] = [];
    while (stack.length) {
        const node = stack.pop()!;
        if (nodes.length >= 20000) fail('El Markdown del ZIP es demasiado complejo.');
        nodes.push(node);
        if ('children' in node) stack.push(...node.children);
    }
    return nodes;
}

/** In-memory inspection only. No archive entry is ever extracted to disk or fetched. */
export async function inspectPostArchive(data: Buffer) {
    let zip: ZipFile | undefined;
    try {
        zip = await openZip(data);
        const entries = await indexZip(zip);
        const manifests = [...entries.keys()].filter((name) =>
            /^(post|studio-import)\.json$/i.test(posix.basename(name)));
        if (manifests.length !== 1)
            fail('Incluye un único post.json o studio-import.json con metadata y content.');
        const manifest = manifests[0];
        const source = await readEntry(zip, entries.get(manifest)!, MAX_IMPORT_BYTES);
        const raw = JSON.parse(source.toString('utf8').replace(/^\uFEFF/, ''));
        const metadata = raw?.metadata ?? raw;
        const cover = metadata?.imageUrl;
        // The ordinary importer still disallows local covers. Only this archive
        // resolver can turn one into a validated, bundled media URL.
        if (typeof cover === 'string' && bundled(cover)) metadata.imageUrl = '/zip-cover';
        const post = parsePostImport(JSON.stringify(raw));
        const images = new Map<string, ArchiveImage>();
        const urls = new Map<string, string>();
        const resolveImage = async (url: string): Promise<string> => {
            if (!bundled(url)) return url;
            let decoded: string;
            try { decoded = decodeURIComponent(url); }
            catch { return fail('Hay una ruta de imagen con codificación no válida.'); }
            const relative = safePath(decoded.replace(/^(\.\/)+/, ''));
            const path = posix.join(posix.dirname(manifest), relative);
            if (urls.has(path)) return urls.get(path)!;
            if (urls.size >= MAX_IMAGES) fail('El post admite hasta 30 imágenes del ZIP.');
            const entry = entries.get(path);
            if (!entry) fail(`Falta la imagen «${relative}» en el ZIP.`);
            if (!imageExtension.test(path)) fail('Las imágenes del ZIP deben ser PNG, JPEG, WebP o GIF.');
            const bytes = await readEntry(zip!, entry, MAX_IMAGE_BYTES);
            const type = imageType(bytes);
            const expected = /\.png$/i.test(path) ? 'image/png'
                : /\.jpe?g$/i.test(path) ? 'image/jpeg'
                : /\.webp$/i.test(path) ? 'image/webp' : 'image/gif';
            if (!type || type !== expected) fail(`La imagen «${relative}» no tiene un formato válido.`);
            const id = 'zip-' + createHash('sha256').update(bytes).digest('hex');
            images.set(id, { id, name: posix.basename(path), type, data: bytes });
            const result = `/api/media/${id}`;
            urls.set(path, result);
            return result;
        };
        if (typeof cover === 'string') post.imageUrl = await resolveImage(cover);

        const nodes = markdownNodes(post.content);
        const definitions = new Map<string, Definition>();
        for (const node of nodes) if (node.type === 'definition') definitions.set(node.identifier, node);
        const edits: { start: number; end: number; value: string; resolveUrl?: boolean }[] = [];
        for (const node of nodes) {
            if (node.type === 'image' || node.type === 'imageReference') {
                const definition = node.type === 'imageReference' ? definitions.get(node.identifier) : node;
                if (!definition || !bundled(definition.url)) continue;
                const url = await resolveImage(definition.url);
                const alt = (node.alt || '').replace(/[\\[\]]/g, '\\$&');
                const title = definition.title ? ` "${definition.title.replace(/[\\"]/g, '\\$&')}"` : '';
                edits.push({ start: node.position!.start.offset!, end: node.position!.end.offset!, value: `![${alt}](${url}${title})` });
            } else if (node.type === 'html') {
                // HTML img tags are supported too; code blocks/spans never enter here.
                const parser = new Parser({ onopentag(name, attrs) {
                    if ((name === 'img' || name === 'source') && attrs['srcset']?.split(',').some((part) => bundled(part.trim().split(/\s+/)[0])))
                        fail('Usa Markdown o img con src para las imágenes locales; srcset debe usar URLs completas.');
                    if (name !== 'img' || !attrs['src'] || !bundled(attrs['src'])) return;
                    const start = parser.startIndex;
                    const tag = node.value.slice(start, parser.endIndex + 1);
                    const match = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
                    if (!match) return;
                    const original = match[1] ?? match[2] ?? match[3];
                    const offset = start + match.index + match[0].indexOf('=') + 1;
                    const valueOffset = node.value.indexOf(original, offset);
                    edits.push({ start: node.position!.start.offset! + valueOffset, end: node.position!.start.offset! + valueOffset + original.length, value: attrs['src'], resolveUrl: true });
                } }, { decodeEntities: true });
                parser.end(node.value);
            }
        }
        // Resolve HTML edits after parsing callbacks (which must remain synchronous).
        for (const edit of edits) if (edit.resolveUrl) edit.value = await resolveImage(edit.value);
        edits.sort((a, b) => b.start - a.start);
        for (const edit of edits) post.content = post.content.slice(0, edit.start) + edit.value + post.content.slice(edit.end);
        // Revalidate expanded URLs/content before any persistent media writes.
        const validated = parsePostImport(JSON.stringify(post));
        return { post: validated, images: [...images.values()] };
    } catch (error) {
        if (error instanceof PostArchiveError) throw error;
        throw new PostArchiveError('El ZIP o su post.json no son válidos. Revisa el formato y los tamaños.');
    } finally { zip?.close(); }
}
