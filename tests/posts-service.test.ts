import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, PLATFORM_ID, TransferState, makeStateKey, runInInjectionContext } from '@angular/core';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import type { PostArticle } from '../src/app/models/post.model';
import { POSTS_SOURCE, PostsService, type PostsSource } from '../src/app/services/posts.service';

const article = {
    post: { id: 'post', title: 'Title', summary: 'Summary', content: 'Body', createdAt: '2026-01-01T00:00:00.000Z' },
    translations: [],
} as unknown as PostArticle;

function service(source: PostsSource, platform = 'browser', state = new TransferState()) {
    const injector = Injector.create({ providers: [
        { provide: POSTS_SOURCE, useValue: source },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: TransferState, useValue: state },
    ] });
    return runInInjectionContext(injector, () => new PostsService());
}

test('shares concurrent requests, restores dates, and releases completed article bodies', () => {
    let requests = 0;
    const response = new Subject<PostArticle>();
    const posts = service({ list: () => of([]), article: () => { requests++; return response; } });
    let first: PostArticle | undefined;
    let second: PostArticle | undefined;
    posts.getArticle('post').subscribe(value => first = value);
    posts.getArticle('post').subscribe(value => second = value);
    assert.equal(requests, 1);
    response.next(article);
    response.complete();
    assert.equal(first?.post.content, 'Body');
    assert.ok(second?.post.createdAt instanceof Date);
    posts.getArticle('post').subscribe();
    assert.equal(requests, 2, 'completed bodies must not be retained in the service');
});

test('cancels abandoned requests and retries failures instead of caching them', () => {
    let requests = 0;
    const response = new Subject<PostArticle>();
    const posts = service({ list: () => of([]), article: () => { requests++; return response; } });
    const a = posts.getArticle('post').subscribe();
    const b = posts.getArticle('post').subscribe();
    a.unsubscribe();
    assert.equal(response.observed, true);
    b.unsubscribe();
    assert.equal(response.observed, false);
    posts.getArticle('post').subscribe().unsubscribe();
    assert.equal(requests, 2);

    let failures = 0;
    const failing = service({ list: () => of([]), article: () => { failures++; return throwError(() => new Error('offline')); } });
    failing.getArticle('post').subscribe({ error: () => undefined });
    failing.getArticle('post').subscribe({ error: () => undefined });
    assert.equal(failures, 2);
});

test('transfers prerendered data once and frees the hydration state after consumption', async () => {
    let requests = 0;
    const source: PostsSource = { list: () => of([]), article: () => { requests++; return of(article); } };
    const serverState = new TransferState();
    await firstValueFrom(service(source, 'server', serverState).getArticle('post'));
    assert.equal(requests, 1);
    const browserState = new TransferState();
    const key = makeStateKey<PostArticle>('posts:article:post');
    browserState.set(key, JSON.parse(serverState.toJson())['posts:article:post']);
    const browser = service(source, 'browser', browserState);
    const result = await firstValueFrom(browser.getArticle('post'));
    assert.equal(result?.post.content, 'Body');
    assert.ok(result?.post.createdAt instanceof Date);
    assert.equal(requests, 1, 'hydration must not make an HTTP request');
    assert.equal(browserState.hasKey(key), false);
    await firstValueFrom(browser.getArticle('post'));
    assert.equal(requests, 2);
});
