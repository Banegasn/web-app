import {
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AdminApiService } from './data/admin-api.service';
import { AdminSessionService } from './data/admin-session.service';
import { StudioSection } from './data/admin.models';
import { PostsStore } from './data/posts.store';
import { CommentsStore } from './data/comments.store';
import { MediaStore } from './data/media.store';
import { PostEditorStore } from './data/post-editor.store';
import { StudioLoginComponent } from './login/studio-login.component';
import { StudioSidebarComponent } from './sidebar/studio-sidebar.component';
import { PostsListComponent } from './posts/posts-list.component';
import { PostEditorComponent } from './editor/post-editor.component';
import { CommentsListComponent } from './comments/comments-list.component';
import { MediaLibraryComponent } from './media/media-library.component';
import { StudioFeedbackComponent } from './shared/studio-feedback.component';

/** Coordinates views; each feature owns its form, state and operations. */
@Component({
    selector: 'app-studio',
    imports: [
        RouterLink,
        StudioLoginComponent,
        StudioSidebarComponent,
        PostsListComponent,
        PostEditorComponent,
        CommentsListComponent,
        MediaLibraryComponent,
        StudioFeedbackComponent,
    ],
    providers: [
        AdminApiService,
        AdminSessionService,
        PostsStore,
        CommentsStore,
        MediaStore,
        PostEditorStore,
    ],
    styleUrl: './studio.component.css',
    templateUrl: './studio.component.html',
})
export class StudioComponent {
    readonly session = inject(AdminSessionService);
    readonly posts = inject(PostsStore);
    readonly comments = inject(CommentsStore);
    readonly media = inject(MediaStore);
    readonly editor = inject(PostEditorStore);
    readonly section = signal<StudioSection>('posts');
    readonly heading = computed(() =>
        this.editor.post()
            ? 'Editor'
            : { posts: 'Posts', comments: 'Comentarios', media: 'Biblioteca' }[
                  this.section()
              ],
    );
    constructor() {
        inject(Title).setTitle('Studio · banegasn.dev');
        const meta = inject(Meta);
        meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
        inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
        effect(() => {
            if (this.session.authenticated()) {
                this.editor.error.set('');
                void this.posts.refresh();
                void this.comments.refresh();
                void this.media.refresh();
            }
        });
    }
    leave(): boolean {
        return this.editor.leave();
    }
    navigate(section: StudioSection): void {
        if (!this.leave()) return;
        this.editor.close();
        this.section.set(section);
    }
    open(id?: string): void {
        if (!this.leave()) return;
        this.section.set('posts');
        void this.editor.open(id);
    }
    async logout(): Promise<void> {
        if (this.leave() && (await this.session.logout())) this.editor.close();
    }
}
