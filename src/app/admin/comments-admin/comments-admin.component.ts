import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

interface ModerationComment {
    id: number;
    postId: string;
    author: string;
    body: string;
    createdAt: string;
    parentId: number | null;
    upvotes: number;
    downvotes: number;
}

@Component({
    selector: 'app-comments-admin',
    imports: [FormsModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="mx-auto min-h-[70vh] max-w-5xl px-4 py-12 md:px-6 md:py-16">
            <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary-600">Administración</p>
                    <h1 class="font-display text-4xl font-extrabold tracking-tight text-slate-900">
                        Moderar comentarios
                    </h1>
                    <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        Revisa los comentarios públicos y retira conversaciones completas del blog.
                    </p>
                </div>
                <a routerLink="/blog" class="text-sm font-bold text-slate-500 transition hover:text-primary-700">
                    ← Volver al blog
                </a>
            </header>

            @if (!authenticated()) {
                <form class="max-w-xl rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-8" (ngSubmit)="connect()">
                    <label for="comments-admin-token" class="mb-2 block text-sm font-bold text-slate-800">
                        Token de administración
                    </label>
                    <input id="comments-admin-token" name="token" type="password" required
                        autocomplete="current-password" [(ngModel)]="token"
                        class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
                    <p class="mt-3 text-xs leading-5 text-slate-500">
                        Es el valor de <code>COMMENTS_ADMIN_TOKEN</code>. Se conserva únicamente en esta pestaña.
                    </p>
                    <button type="submit" [disabled]="loading() || !token.trim()"
                        class="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-45">
                        {{ loading() ? 'Comprobando…' : 'Abrir moderación' }}
                    </button>
                </form>
            } @else {
                <section aria-labelledby="active-comments-title">
                    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div>
                            <h2 id="active-comments-title" class="font-bold text-slate-900">
                                {{ comments().length }} comentarios públicos
                            </h2>
                            <p class="mt-1 text-xs text-slate-500">Los más recientes aparecen primero.</p>
                        </div>
                        <button type="button" (click)="logout()"
                            class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                            Cerrar sesión
                        </button>
                    </div>

                    <label for="comment-search" class="sr-only">Buscar comentarios</label>
                    <input id="comment-search" type="search" placeholder="Buscar por autor, post o contenido…"
                        [ngModel]="query()" (ngModelChange)="query.set($event)"
                        class="mb-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100">

                    @if (loading()) {
                        <p class="py-10 text-center text-sm text-slate-400">Cargando comentarios…</p>
                    } @else if (!filteredComments().length) {
                        <div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                            No hay comentarios que coincidan con la búsqueda.
                        </div>
                    } @else {
                        <div class="space-y-4">
                            @for (comment of filteredComments(); track comment.id) {
                                <article class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-900/5">
                                    <header class="mb-3 flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p class="font-bold text-slate-900">{{ comment.author }}</p>
                                            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                                <a [routerLink]="['/blog', comment.postId]"
                                                    class="font-semibold text-primary-600 hover:underline">{{ comment.postId }}</a>
                                                <span>·</span>
                                                <time [attr.datetime]="comment.createdAt">{{ formattedDate(comment.createdAt) }}</time>
                                                @if (comment.parentId !== null) {
                                                    <span>· respuesta a #{{ comment.parentId }}</span>
                                                }
                                            </div>
                                        </div>
                                        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                            ↑ {{ comment.upvotes }} · ↓ {{ comment.downvotes }}
                                        </span>
                                    </header>

                                    <p class="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{{ comment.body }}</p>

                                    <footer class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                        @if (pendingDeleteId() === comment.id) {
                                            <p class="mr-auto text-xs font-semibold text-rose-700">
                                                También se ocultarán todas sus respuestas.
                                            </p>
                                            <button type="button" (click)="pendingDeleteId.set(null)"
                                                class="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
                                                Cancelar
                                            </button>
                                            <button type="button" (click)="deleteComment(comment)"
                                                [disabled]="deletingIds().has(comment.id)"
                                                class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-45">
                                                {{ deletingIds().has(comment.id) ? 'Eliminando…' : 'Confirmar eliminación' }}
                                            </button>
                                        } @else {
                                            <button type="button" (click)="pendingDeleteId.set(comment.id)"
                                                class="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50">
                                                Eliminar del blog
                                            </button>
                                        }
                                    </footer>
                                </article>
                            }
                        </div>
                    }
                </section>
            }

            @if (message()) {
                <p class="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="status">
                    {{ message() }}
                </p>
            }
        </main>
    `,
})
export class CommentsAdminComponent {
    private readonly http = inject(HttpClient);
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly storageKey = 'banegasn.commentsAdminToken';

    readonly comments = signal<ModerationComment[]>([]);
    readonly authenticated = signal(false);
    readonly loading = signal(false);
    readonly message = signal('');
    readonly query = signal('');
    readonly pendingDeleteId = signal<number | null>(null);
    readonly deletingIds = signal<ReadonlySet<number>>(new Set());
    readonly filteredComments = computed(() => {
        const query = this.query().trim().toLocaleLowerCase('es');
        if (!query) return this.comments();
        return this.comments().filter((comment) =>
            comment.author.toLocaleLowerCase('es').includes(query)
            || comment.postId.toLocaleLowerCase('es').includes(query)
            || comment.body.toLocaleLowerCase('es').includes(query),
        );
    });

    token = '';

    constructor() {
        const meta = inject(Meta);
        inject(Title).setTitle('Moderar comentarios | banegasn.dev');
        meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
        inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));

        if (!this.browser) return;
        this.token = sessionStorage.getItem(this.storageKey) ?? '';
        if (this.token) this.loadComments();
    }

    connect(): void {
        this.token = this.token.trim();
        if (!this.browser || !this.token || this.loading()) return;
        sessionStorage.setItem(this.storageKey, this.token);
        this.loadComments();
    }

    logout(): void {
        if (this.browser) sessionStorage.removeItem(this.storageKey);
        this.token = '';
        this.comments.set([]);
        this.authenticated.set(false);
        this.pendingDeleteId.set(null);
        this.message.set('');
    }

    deleteComment(comment: ModerationComment): void {
        if (this.deletingIds().has(comment.id)) return;
        this.deletingIds.update((ids) => new Set(ids).add(comment.id));
        this.message.set('');
        this.http.delete<void>(`/api/comments/${encodeURIComponent(comment.postId)}/${comment.id}`, {
            headers: this.adminHeaders(),
        }).subscribe({
            next: () => {
                this.pendingDeleteId.set(null);
                this.stopDeleting(comment.id);
                this.loadComments();
            },
            error: (error: HttpErrorResponse) => {
                this.stopDeleting(comment.id);
                this.handleError(error, 'No se pudo eliminar el comentario.');
            },
        });
    }

    formattedDate(value: string): string {
        return new Intl.DateTimeFormat('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    }

    private loadComments(): void {
        this.loading.set(true);
        this.message.set('');
        this.http.get<{ comments: ModerationComment[] }>('/api/comments/admin', {
            headers: this.adminHeaders(),
        }).subscribe({
            next: ({ comments }) => {
                this.comments.set(comments);
                this.authenticated.set(true);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.handleError(error, 'No se pudieron cargar los comentarios.');
            },
        });
    }

    private adminHeaders(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
    }

    private handleError(error: HttpErrorResponse, fallback: string): void {
        if (error.status === 401) {
            if (this.browser) sessionStorage.removeItem(this.storageKey);
            this.authenticated.set(false);
            this.message.set('El token de administración no es válido.');
            return;
        }
        this.message.set(fallback);
    }

    private stopDeleting(commentId: number): void {
        this.deletingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(commentId);
            return next;
        });
    }
}
