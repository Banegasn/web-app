import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, mergeMap, of, tap } from 'rxjs';
import { Post } from '../models/post.model';

// Simple Front Matter Parser (adjust regex if needed for complex cases)
function parseMarkdown(markdown: string): Partial<Post> {
    const frontMatterRegex = /^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);

    if (match && match[1]) {
        const yamlContent = match[1];
        const mainContent = match[2] || '';
        const metadata: Record<string, string> = {};
        yamlContent.split('\n').forEach(line => {
            const parts = line.match(/^\s*"?([^"]*?)"?\s*:\s*(.*)\s*$/);
            if (parts && parts.length >= 3) {
                const key = parts[1].trim();
                // Trim potential quotes and whitespace from value
                const value = parts[2].trim().replace(/^['"]|['"]$/g, '');
                metadata[key] = value;
            }
        });
        return {
            id: metadata['id'],
            title: metadata['title'],
            summary: metadata['summary'],
            createdAt: metadata['createdAt'] ? new Date(metadata['createdAt']) : new Date(),
            author: metadata['author'],
            tags: metadata['tags'] ? metadata['tags'].split(',') : [],
            language: metadata['language'],
            translationGroup: metadata['translationGroup'],
            imageUrl: metadata['imageUrl'],
            content: mainContent.trim()
        };
    } else {
        // No front matter found or parsing failed
        console.warn("Could not parse front matter for a post.");
        return { content: markdown };
    }
}

@Injectable({
    providedIn: 'root'
})
export class PostsService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);
    private postsUrl = '/posts/'; // Assumes posts are in src/assets/posts/
    private postsManifestUrl = `${this.postsUrl}posts.json`; // Assumes manifest file lists post IDs

    private allPostsCache$: Observable<Post[]> | null = null; // Cache unfiltered posts

    /**
     * Detects user's preferred language from browser or defaults to 'en'
     */
    private getUserLanguage(): string {
        if (isPlatformBrowser(this.platformId)) {
            const browserLang = navigator.language || 'en';
            // Extract primary language code (e.g., 'es' from 'es-ES', 'en' from 'en-US')
            const langCode = browserLang.split('-')[0].toLowerCase();
            // Support common languages: en, es, or default to en
            return ['en', 'es'].includes(langCode) ? langCode : 'en';
        }
        return 'en'; // Default for SSR
    }

    /**
     * Filters posts by language and deduplicates by translationGroup
     * If multiple posts share the same translationGroup, only the one matching user's language is shown
     * Posts with language but without translationGroup are always shown (never filtered)
     */
    private filterPostsByLanguage(posts: Post[]): Post[] {
        const userLang = this.getUserLanguage();
        const translationGroups = new Map<string, Post[]>();

        // Group posts by translationGroup
        posts.forEach(post => {
            if (post.translationGroup) {
                if (!translationGroups.has(post.translationGroup)) {
                    translationGroups.set(post.translationGroup, []);
                }
                translationGroups.get(post.translationGroup)!.push(post);
            }
        });

        // Filter posts
        return posts.filter(post => {
            // If post has a translationGroup, apply language filtering within that group
            if (post.translationGroup) {
                const groupPosts = translationGroups.get(post.translationGroup)!;
                // Find the best match for user's language
                const preferredPost = groupPosts.find(p => p.language === userLang)
                    || groupPosts.find(p => !p.language)
                    || groupPosts[0];
                // Only show this post if it's the preferred one
                return post.id === preferredPost.id;
            }
            // Posts without translationGroup are always shown (regardless of language)
            // This includes posts with language but without translationGroup
            return true;
        });
    }

    getAllPosts(): Observable<Post[]> {
        if (!this.allPostsCache$) {
            // Cache unfiltered posts
            this.allPostsCache$ = this.http.get<{ posts: string[] }>(this.postsManifestUrl).pipe(
                mergeMap(manifest => {
                    if (!manifest || !manifest.posts || manifest.posts.length === 0) {
                        return of([]);
                    }
                    const postObservables = manifest.posts.map(id =>
                        this.getPostById(id).pipe(
                            catchError(err => {
                                console.error(`Error fetching post ${id}:`, err);
                                return of(undefined);
                            })
                        )
                    );
                    return forkJoin(postObservables).pipe(
                        map(posts => posts.filter((post): post is Post => post !== undefined)),
                        map(posts => posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
                    );
                }),
                catchError(err => {
                    console.error("Error fetching posts manifest:", err);
                    this.allPostsCache$ = null;
                    return of([]);
                }),
                tap(posts => {
                    if (!this.allPostsCache$) {
                        this.allPostsCache$ = of(posts);
                    }
                })
            );
        }
        // Apply language filtering on each request
        return this.allPostsCache$.pipe(
            map(posts => this.filterPostsByLanguage(posts))
        );
    }

    getLatestPosts(count: number): Observable<Post[]> {
        return this.getAllPosts().pipe(
            map(posts => posts.slice(0, count))
        );
    }

    getPostById(id: string): Observable<Partial<Post> | undefined> {
        return this.http.get(`${this.postsUrl}${id}.md`, { responseType: 'text' }).pipe(
            map(markdownContent => parseMarkdown(markdownContent)),
            catchError(err => {
                console.error(`Error fetching or parsing post ${id}:`, err);
                return of(undefined);
            })
        );
    }
} 