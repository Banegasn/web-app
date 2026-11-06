import type { Post } from '../src/app/models/post.model';

const REQUIRED_FRONT_MATTER_FIELDS = ['id', 'title', 'summary', 'createdAt'] as const;

function parseFrontMatterDate(value: string, field: string, postId: string): Date {
    // Convert the existing "YYYY-MM-DD HH:mm:ss" values to ISO 8601 before parsing.
    const normalizedValue = value.replace(
        /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/,
        '$1T$2'
    );
    const date = new Date(normalizedValue);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Post "${postId}" has an invalid ${field} value: "${value}".`);
    }

    return date;
}

export function parseMarkdown(markdown: string, requestedId: string): Post {
    const frontMatterRegex = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);

    if (!match?.[1]) {
        throw new Error(`Post "${requestedId}" does not contain valid front matter.`);
    }

    const yamlContent = match[1];
    const mainContent = match[2] || '';
    const metadata: Record<string, string> = {};
    yamlContent.split(/\r?\n/).forEach(line => {
        const parts = line.match(/^\s*"?([^"]*?)"?\s*:\s*(.*)\s*$/);
        if (parts && parts.length >= 3) {
            const key = parts[1].trim();
            const value = parts[2].trim().replace(/^['"]|['"]$/g, '');
            metadata[key] = value;
        }
    });

    const missingFields = REQUIRED_FRONT_MATTER_FIELDS.filter(field => !metadata[field]);
    if (missingFields.length > 0) {
        throw new Error(`Post "${requestedId}" is missing required front matter: ${missingFields.join(', ')}.`);
    }
    if (metadata['id'] !== requestedId) {
        throw new Error(`Post "${requestedId}" declares a different id: "${metadata['id']}".`);
    }

    return {
        id: metadata['id'],
        title: metadata['title'],
        seoTitle: metadata['seoTitle'],
        summary: metadata['summary'],
        createdAt: parseFrontMatterDate(metadata['createdAt'], 'createdAt', requestedId),
        updatedAt: metadata['updatedAt']
            ? parseFrontMatterDate(metadata['updatedAt'], 'updatedAt', requestedId)
            : undefined,
        author: metadata['author'],
        tags: metadata['tags'] ? metadata['tags'].split(',').map(tag => tag.trim()).filter(Boolean) : [],
        keywords: metadata['keywords'],
        language: metadata['language'],
        translationGroup: metadata['translationGroup'],
        imageUrl: metadata['imageUrl'],
        content: mainContent.trim()
    };
}

