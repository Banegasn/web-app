import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { Observable, catchError, defer, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { PostArticle, PostSummary, PostsQuery } from '../models/post.model';

export interface PostsSource {
    list(query: PostsQuery): Observable<PostSummary[]>;
    article(id: string): Observable<PostArticle | undefined>;
}

export const POSTS_SOURCE = new InjectionToken<PostsSource>('POSTS_SOURCE', {
    providedIn: 'root',
    factory: () => {
        const http = inject(HttpClient);
        return {
            list: query => http.get<PostSummary[]>('/api/posts', {
                params: { language: query.language || 'en', search: query.search || '', limit: query.limit ?? 24, offset: query.offset ?? 0 },
                transferCache: false,
            }),
            article: id => http.get<PostArticle>(`/api/posts/${encodeURIComponent(id)}`, { transferCache: false }).pipe(
                catchError(error => error instanceof HttpErrorResponse && error.status === 404
                    ? of(undefined) : throwError(() => error))
            ),
        };
    },
});

@Injectable({ providedIn: 'root' })
export class PostsService {
    private readonly source = inject(POSTS_SOURCE);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly state = inject(TransferState);
    // Deduplicate concurrent subscriptions only; completed bodies are not retained.
    private readonly pending = new Map<string, Observable<unknown>>();

    getAllPosts(query: PostsQuery = {}): Observable<PostSummary[]> {
        const normalized = { language: this.getUserLanguage(), ...query };
        return this.load(`list:${JSON.stringify(normalized)}`, () => this.source.list(normalized)).pipe(
            map(posts => posts.map(post => this.restoreDates(post)))
        );
    }

    getLatestPosts(count: number): Observable<PostSummary[]> {
        return this.getAllPosts({ limit: count });
    }

    getArticle(id: string): Observable<PostArticle | undefined> {
        return this.load(`article:${id}`, () => this.source.article(id)).pipe(
            map(article => article ? {
                post: this.restoreDates(article.post),
                translations: article.translations.map(post => this.restoreDates(post)),
            } : undefined)
        );
    }

    private getUserLanguage(): string {
        if (isPlatformBrowser(this.platformId)) {
            const language = navigator.language.split('-')[0].toLowerCase();
            return language === 'es' ? 'es' : 'en';
        }
        return 'en';
    }

    private restoreDates<T extends PostSummary>(post: T): T {
        return { ...post, createdAt: new Date(post.createdAt), updatedAt: post.updatedAt ? new Date(post.updatedAt) : undefined };
    }

    private load<T>(key: string, fetch: () => Observable<T>): Observable<T> {
        return defer(() => {
            const stateKey = makeStateKey<T>(`posts:${key}`);
            if (isPlatformBrowser(this.platformId) && this.state.hasKey(stateKey)) {
                const value = this.state.get(stateKey, undefined as T);
                this.state.remove(stateKey);
                return of(value);
            }
            const pending = this.pending.get(key) as Observable<T> | undefined;
            if (pending) return pending;
            const request = defer(fetch).pipe(
                tap(value => {
                    if (!isPlatformBrowser(this.platformId) && value !== undefined) this.state.set(stateKey, value);
                }),
                finalize(() => this.pending.delete(key)),
                shareReplay({ bufferSize: 1, refCount: true }),
            );
            this.pending.set(key, request);
            return request;
        });
    }
}
