import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { AdminApiService } from '../src/app/admin/studio/data/admin-api.service';
import { AdminPost, newPost } from '../src/app/admin/studio/data/admin.models';
import { PostEditorStore } from '../src/app/admin/studio/data/post-editor.store';
import { PostsStore } from '../src/app/admin/studio/data/posts.store';
import { MediaStore } from '../src/app/admin/studio/data/media.store';

function setup(api: Partial<AdminApiService>) {
    const injector = Injector.create({
        providers: [
            { provide: AdminApiService, useValue: api },
            { provide: PostsStore, useValue: { refresh: async () => {} } },
            { provide: MediaStore, useValue: { uploading: signal(false) } },
        ],
    });
    return runInInjectionContext(injector, () => new PostEditorStore());
}
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => (resolve = done));
    return { promise, resolve };
}

test('legacy metadata is editable without changing its content, URL, or publication timestamp', async () => {
    const original = {
        ...newPost(),
        id: 'legacy',
        imageUrl: 'images/welcome.jpg',
        language: undefined,
        tags: undefined,
        content: '# Original\n\nMarkdown.',
        createdAt: '2025-04-24T17:32:11.000Z',
        revision: 0,
    } as unknown as AdminPost;
    let saved!: AdminPost;
    const store = setup({
        post: async () => original,
        savePost: async (post) => {
            saved = post;
            return { ...post, revision: 1 };
        },
    });
    await store.open('legacy');
    assert.equal(store.post()?.language, '');
    assert.equal(store.post()?.imageUrl, '/images/welcome.jpg');
    store.titleChanged('A revised title');
    await store.save(true);
    assert.equal(saved.id, 'legacy');
    assert.equal(saved.content, original.content);
    assert.equal(saved.createdAt, original.createdAt);
    assert.equal(store.dirty(), false);
});

test('slow loads cannot reopen an abandoned editor or overwrite a newer selection', async () => {
    const pending = deferred<AdminPost>();
    const store = setup({ post: () => pending.promise });
    const opening = store.open('old');
    store.close();
    await store.open();
    store.titleChanged('Nueva idea');
    pending.resolve({ ...newPost(), id: 'old' });
    await opening;
    assert.equal(store.post()?.id, 'nueva-idea');
    assert.equal(store.dirty(), true);
});

test('edits made during saving are retained with the new revision for the next save', async () => {
    const response = deferred<AdminPost>();
    let submitted!: AdminPost;
    const store = setup({
        savePost: (post) => {
            submitted = post;
            return response.promise;
        },
    });
    await store.open();
    store.titleChanged('Mi idea');
    store.contentChanged('Version one');
    const saving = store.save(false);
    store.titleChanged('Renamed while saving');
    store.contentChanged('Version two');
    store.updateTags('Angular, Markdown');
    response.resolve({ ...submitted, revision: 1 });
    await saving;
    assert.equal(submitted.content, 'Version one');
    assert.equal(store.post()?.content, 'Version two');
    assert.equal(store.post()?.title, 'Renamed while saving');
    assert.equal(store.post()?.id, submitted.id, 'a newly created post keeps its saved URL');
    assert.equal(store.post()?.revision, 1);
    assert.equal(store.tags, 'Angular, Markdown');
    assert.equal(store.dirty(), true);
});
