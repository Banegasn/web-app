import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type VoteValue = -1 | 0 | 1;

interface CommentApiModel {
    id: number;
    postId: string;
    author: string;
    body: string;
    createdAt: string;
    parentId: number | null;
    upvotes: number;
    downvotes: number;
    userVote: VoteValue;
}

interface BlogComment extends CommentApiModel {
    replies: BlogComment[];
}

interface VoteResponse {
    vote: Pick<CommentApiModel, 'upvotes' | 'downvotes' | 'userVote'>;
}

@Component({
    selector: 'app-blog-comments',
    imports: [FormsModule, NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="mt-12 border-t border-slate-200 pt-10" aria-labelledby="comments-title">
            <div class="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary-600">
                        {{ isSpanish() ? 'Conversación' : 'Discussion' }}
                    </p>
                    <h2 id="comments-title" class="font-display text-3xl font-extrabold tracking-tight text-slate-900">
                        {{ isSpanish() ? 'Comentarios' : 'Comments' }}
                    </h2>
                </div>
                @if (!loading()) {
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                        {{ commentCount() }} {{ countLabel() }}
                    </span>
                }
            </div>

            <form class="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-6" (ngSubmit)="submit()">
                <label class="mb-2 block text-sm font-bold text-slate-800" for="comment-author">
                    {{ isSpanish() ? 'Tu nombre' : 'Your name' }}
                </label>
                <input id="comment-author" name="author" type="text" maxlength="60" required autocomplete="name"
                    [(ngModel)]="author"
                    class="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100">

                <label class="mb-2 block text-sm font-bold text-slate-800" for="comment-body">
                    {{ isSpanish() ? '¿Qué te ha parecido?' : 'What do you think?' }}
                </label>
                <textarea id="comment-body" name="body" rows="5" maxlength="1500" required
                    [(ngModel)]="body"
                    class="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100"></textarea>

                <div class="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label for="comment-website">Website</label>
                    <input id="comment-website" name="website" type="text" tabindex="-1" autocomplete="off" [(ngModel)]="website">
                </div>

                <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <p class="text-xs leading-5 text-slate-500">
                        {{ isSpanish()
                            ? 'Sin cuenta ni email. El comentario será público.'
                            : 'No account or email required. Your comment will be public.' }}
                    </p>
                    <button type="submit"
                        [disabled]="submitting() || author.trim().length < 2 || body.trim().length < 2"
                        class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45">
                        {{ submitting()
                            ? (isSpanish() ? 'Publicando…' : 'Publishing…')
                            : (isSpanish() ? 'Publicar comentario' : 'Post comment') }}
                    </button>
                </div>

                @if (message()) {
                    <p class="mt-4 rounded-xl px-4 py-3 text-sm"
                        [class.bg-emerald-50]="messageType() === 'success'"
                        [class.text-emerald-700]="messageType() === 'success'"
                        [class.bg-rose-50]="messageType() === 'error'"
                        [class.text-rose-700]="messageType() === 'error'" role="status">
                        {{ message() }}
                    </p>
                }
            </form>

            <div class="mt-8" aria-live="polite">
                @if (loading()) {
                    <p class="py-6 text-center text-sm text-slate-400">
                        {{ isSpanish() ? 'Cargando comentarios…' : 'Loading comments…' }}
                    </p>
                } @else if (!comments().length) {
                    <div class="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center">
                        <p class="text-sm font-semibold text-slate-600">
                            {{ isSpanish()
                                ? 'Todavía no hay comentarios. Puedes abrir la conversación.'
                                : 'No comments yet. You can start the conversation.' }}
                        </p>
                    </div>
                } @else {
                    <ng-container [ngTemplateOutlet]="commentTree"
                        [ngTemplateOutletContext]="{ $implicit: comments() }" />
                }
            </div>
        </section>

        <ng-template #commentTree let-items>
            <div class="space-y-4">
                @for (comment of items; track comment.id) {
                    <article class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-900/5 md:p-5">
                        <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span class="font-bold text-slate-900">{{ comment.author }}</span>
                            <time class="text-xs text-slate-400" [attr.datetime]="comment.createdAt">
                                {{ formattedDate(comment.createdAt) }}
                            </time>
                        </header>
                        <p class="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{{ comment.body }}</p>

                        <footer class="mt-4 flex flex-wrap items-center gap-2">
                            <button type="button" (click)="vote(comment, 1)"
                                [disabled]="votingIds().has(comment.id)"
                                [attr.aria-pressed]="comment.userVote === 1"
                                [attr.aria-label]="isSpanish() ? 'Votar a favor' : 'Upvote'"
                                class="rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                                [class.border-primary-200]="comment.userVote === 1"
                                [class.bg-primary-50]="comment.userVote === 1"
                                [class.text-primary-700]="comment.userVote === 1"
                                [class.border-slate-200]="comment.userVote !== 1"
                                [class.text-slate-500]="comment.userVote !== 1">
                                ↑ {{ comment.upvotes }}
                            </button>
                            <button type="button" (click)="vote(comment, -1)"
                                [disabled]="votingIds().has(comment.id)"
                                [attr.aria-pressed]="comment.userVote === -1"
                                [attr.aria-label]="isSpanish() ? 'Votar en contra' : 'Downvote'"
                                class="rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                                [class.border-rose-200]="comment.userVote === -1"
                                [class.bg-rose-50]="comment.userVote === -1"
                                [class.text-rose-700]="comment.userVote === -1"
                                [class.border-slate-200]="comment.userVote !== -1"
                                [class.text-slate-500]="comment.userVote !== -1">
                                ↓ {{ comment.downvotes }}
                            </button>
                            <button type="button" (click)="toggleReply(comment)"
                                class="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                                {{ replyingToId() === comment.id
                                    ? (isSpanish() ? 'Cancelar' : 'Cancel')
                                    : (isSpanish() ? 'Responder' : 'Reply') }}
                            </button>
                        </footer>

                        @if (replyingToId() === comment.id) {
                            <form class="mt-4 rounded-xl bg-slate-50 p-4" (ngSubmit)="submitReply(comment)">
                                <p class="mb-3 text-xs font-bold text-slate-600">
                                    {{ isSpanish() ? 'Responder a' : 'Reply to' }} {{ comment.author }}
                                </p>
                                <label class="sr-only" [attr.for]="'reply-author-' + comment.id">
                                    {{ isSpanish() ? 'Tu nombre' : 'Your name' }}
                                </label>
                                <input [id]="'reply-author-' + comment.id" [name]="'reply-author-' + comment.id"
                                    type="text" maxlength="60" required autocomplete="name"
                                    [placeholder]="isSpanish() ? 'Tu nombre' : 'Your name'" [(ngModel)]="replyAuthor"
                                    class="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
                                <label class="sr-only" [attr.for]="'reply-body-' + comment.id">
                                    {{ isSpanish() ? 'Tu respuesta' : 'Your reply' }}
                                </label>
                                <textarea [id]="'reply-body-' + comment.id" [name]="'reply-body-' + comment.id"
                                    rows="3" maxlength="1500" required
                                    [placeholder]="isSpanish() ? 'Escribe una respuesta…' : 'Write a reply…'" [(ngModel)]="replyBody"
                                    class="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"></textarea>
                                <div class="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                                    <label [attr.for]="'reply-website-' + comment.id">Website</label>
                                    <input [id]="'reply-website-' + comment.id" [name]="'reply-website-' + comment.id"
                                        type="text" tabindex="-1" autocomplete="off" [(ngModel)]="replyWebsite">
                                </div>
                                <div class="mt-3 flex justify-end">
                                    <button type="submit"
                                        [disabled]="replySubmitting() || replyAuthor.trim().length < 2 || replyBody.trim().length < 2"
                                        class="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-45">
                                        {{ replySubmitting()
                                            ? (isSpanish() ? 'Publicando…' : 'Publishing…')
                                            : (isSpanish() ? 'Publicar respuesta' : 'Post reply') }}
                                    </button>
                                </div>
                                @if (replyMessage()) {
                                    <p class="mt-3 text-xs font-semibold text-rose-700" role="status">{{ replyMessage() }}</p>
                                }
                            </form>
                        }

                        @if (comment.replies.length) {
                            <div class="mt-4 border-l-2 border-slate-100 pl-3 md:pl-5">
                                <ng-container [ngTemplateOutlet]="commentTree"
                                    [ngTemplateOutletContext]="{ $implicit: comment.replies }" />
                            </div>
                        }
                    </article>
                }
            </div>
        </ng-template>
    `,
})
export class BlogCommentsComponent {
    readonly postId = input.required<string>();
    readonly language = input('es');

    private readonly http = inject(HttpClient);
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
    private voterId = '';

    readonly comments = signal<BlogComment[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);
    readonly replySubmitting = signal(false);
    readonly replyingToId = signal<number | null>(null);
    readonly votingIds = signal<ReadonlySet<number>>(new Set());
    readonly message = signal('');
    readonly replyMessage = signal('');
    readonly messageType = signal<'success' | 'error'>('success');
    readonly isSpanish = computed(() => this.language() === 'es');
    readonly commentCount = computed(() => countComments(this.comments()));

    author = '';
    body = '';
    website = '';
    replyAuthor = '';
    replyBody = '';
    replyWebsite = '';

    constructor() {
        if (this.browser) this.voterId = this.getOrCreateVoterId();
        effect(() => {
            const postId = this.postId();
            if (this.browser) this.loadComments(postId);
            else this.loading.set(false);
        });
    }

    submit(): void {
        const author = this.author.trim();
        const body = this.body.trim();
        if (this.submitting() || author.length < 2 || body.length < 2) return;

        this.submitting.set(true);
        this.message.set('');
        this.http.post<{ comment: CommentApiModel }>(this.commentsUrl(), {
            author,
            body,
            website: this.website,
        }).subscribe({
            next: ({ comment }) => {
                this.comments.update((comments) => [...comments, withReplies(comment)]);
                this.body = '';
                this.website = '';
                this.messageType.set('success');
                this.message.set(this.isSpanish() ? 'Comentario publicado.' : 'Comment published.');
                this.submitting.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.messageType.set('error');
                this.message.set(this.commentErrorMessage(error));
                this.submitting.set(false);
            },
        });
    }

    toggleReply(comment: BlogComment): void {
        if (this.replyingToId() === comment.id) {
            this.closeReply();
            return;
        }
        this.replyingToId.set(comment.id);
        this.replyAuthor = this.author;
        this.replyBody = '';
        this.replyWebsite = '';
        this.replyMessage.set('');
    }

    submitReply(parent: BlogComment): void {
        const author = this.replyAuthor.trim();
        const body = this.replyBody.trim();
        if (this.replySubmitting() || author.length < 2 || body.length < 2) return;

        this.replySubmitting.set(true);
        this.replyMessage.set('');
        this.http.post<{ comment: CommentApiModel }>(this.commentsUrl(), {
            author,
            body,
            website: this.replyWebsite,
            parentId: parent.id,
        }).subscribe({
            next: ({ comment }) => {
                this.comments.update((comments) => appendReply(comments, parent.id, withReplies(comment)));
                this.author = author;
                this.closeReply();
                this.replySubmitting.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.replyMessage.set(this.commentErrorMessage(error));
                this.replySubmitting.set(false);
            },
        });
    }

    vote(comment: BlogComment, selectedVote: Exclude<VoteValue, 0>): void {
        if (this.votingIds().has(comment.id)) return;
        const nextVote: VoteValue = comment.userVote === selectedVote ? 0 : selectedVote;
        this.votingIds.update((ids) => new Set(ids).add(comment.id));
        this.http.put<VoteResponse>(`${this.commentsUrl()}/${comment.id}/vote`, { value: nextVote }, {
            headers: this.voterHeaders(),
        }).subscribe({
            next: ({ vote }) => {
                this.comments.update((comments) => updateComment(comments, comment.id, (current) => ({
                    ...current,
                    ...vote,
                })));
                this.stopVoting(comment.id);
            },
            error: () => {
                this.messageType.set('error');
                this.message.set(
                    this.isSpanish()
                        ? 'No se pudo registrar el voto. Inténtalo de nuevo.'
                        : 'The vote could not be recorded. Please try again.',
                );
                this.stopVoting(comment.id);
            },
        });
    }

    countLabel(): string {
        if (this.isSpanish()) return this.commentCount() === 1 ? 'comentario' : 'comentarios';
        return this.commentCount() === 1 ? 'comment' : 'comments';
    }

    formattedDate(value: string): string {
        return new Intl.DateTimeFormat(this.isSpanish() ? 'es-ES' : 'en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    }

    private loadComments(postId: string): void {
        this.loading.set(true);
        this.http.get<{ comments: CommentApiModel[] }>(`/api/comments/${encodeURIComponent(postId)}`, {
            headers: this.voterHeaders(),
        }).subscribe({
            next: ({ comments }) => {
                this.comments.set(buildCommentTree(comments));
                this.loading.set(false);
            },
            error: () => {
                this.comments.set([]);
                this.loading.set(false);
                this.messageType.set('error');
                this.message.set(
                    this.isSpanish()
                        ? 'No se pudieron cargar los comentarios.'
                        : 'Comments could not be loaded.',
                );
            },
        });
    }

    private commentsUrl(): string {
        return `/api/comments/${encodeURIComponent(this.postId())}`;
    }

    private voterHeaders(): HttpHeaders {
        return new HttpHeaders({ 'X-Comment-Voter': this.voterId });
    }

    private getOrCreateVoterId(): string {
        const storageKey = 'banegasn.commentVoterId';
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored && /^[a-zA-Z0-9_-]{16,80}$/.test(stored)) return stored;
            const created = crypto.randomUUID();
            localStorage.setItem(storageKey, created);
            return created;
        } catch {
            return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
        }
    }

    private closeReply(): void {
        this.replyingToId.set(null);
        this.replyBody = '';
        this.replyWebsite = '';
        this.replyMessage.set('');
    }

    private stopVoting(commentId: number): void {
        this.votingIds.update((ids) => {
            const next = new Set(ids);
            next.delete(commentId);
            return next;
        });
    }

    private commentErrorMessage(error: HttpErrorResponse): string {
        if (this.isSpanish()) {
            if (error.status === 409) return 'Este comentario ya se ha publicado.';
            if (error.status === 429) return 'Has enviado demasiados comentarios. Espera unos minutos.';
            if (error.status === 400) return 'Revisa el nombre y el contenido del comentario.';
            return 'No se pudo publicar el comentario. Inténtalo de nuevo.';
        }
        return typeof error.error?.error === 'string'
            ? error.error.error
            : 'The comment could not be published. Please try again.';
    }
}

function withReplies(comment: CommentApiModel): BlogComment {
    return { ...comment, replies: [] };
}

function buildCommentTree(comments: CommentApiModel[]): BlogComment[] {
    const byId = new Map(comments.map((comment) => [comment.id, withReplies(comment)]));
    const roots: BlogComment[] = [];
    for (const comment of byId.values()) {
        const parent = comment.parentId === null ? undefined : byId.get(comment.parentId);
        if (parent) parent.replies.push(comment);
        else roots.push(comment);
    }
    return roots;
}

function appendReply(comments: BlogComment[], parentId: number, reply: BlogComment): BlogComment[] {
    return updateComment(comments, parentId, (parent) => ({
        ...parent,
        replies: [...parent.replies, reply],
    }));
}

function updateComment(
    comments: BlogComment[],
    commentId: number,
    updater: (comment: BlogComment) => BlogComment,
): BlogComment[] {
    return comments.map((comment) => {
        if (comment.id === commentId) return updater(comment);
        if (!comment.replies.length) return comment;
        return { ...comment, replies: updateComment(comment.replies, commentId, updater) };
    });
}

function countComments(comments: BlogComment[]): number {
    return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}
