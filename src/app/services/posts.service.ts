import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, mergeMap, of, catchError, tap } from 'rxjs';
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
    private postsUrl = '/posts/'; // Assumes posts are in src/assets/posts/
    private postsManifestUrl = `${this.postsUrl}posts.json`; // Assumes manifest file lists post IDs

    private allPostsCache$: Observable<Post[]> | null = null;

    getAllPosts(): Observable<Post[]> {
        if (!this.allPostsCache$) {
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
        return this.allPostsCache$;
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