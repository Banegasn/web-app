import { Injectable, inject, signal } from '@angular/core';
import { AdminApiService } from './admin-api.service';
import { AdminComment } from './admin.models';

@Injectable()
export class CommentsStore {
    private readonly api = inject(AdminApiService);
    readonly comments = signal<AdminComment[]>([]);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly notice = signal('');
    async refresh(): Promise<void> {
        this.error.set('');
        try {
            this.comments.set(await this.api.listComments());
        } catch (error) {
            this.error.set((error as Error).message);
        }
    }
    async remove(comment: AdminComment): Promise<void> {
        if (this.busy()) return;
        this.busy.set(true);
        this.error.set('');
        this.notice.set('');
        try {
            await this.api.removeComment(comment);
            await this.refresh();
            this.notice.set('Comentario y respuestas retirados.');
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            this.busy.set(false);
        }
    }
}
