import { Component, inject, signal } from '@angular/core';
import { MediaStore } from '../data/media.store';
import { StudioFeedbackComponent } from '../shared/studio-feedback.component';
@Component({
    selector: 'app-studio-media',
    imports: [StudioFeedbackComponent],
    styleUrl: './media-library.component.css',
    templateUrl: './media-library.component.html',
})
export class MediaLibraryComponent {
    readonly store = inject(MediaStore);
    readonly error = signal('');
    readonly notice = signal('');
    async upload(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.error.set('');
        this.notice.set('');
        try {
            await this.store.upload(file);
            this.notice.set('Imagen subida.');
        } catch (error) {
            this.error.set((error as Error).message);
        } finally {
            input.value = '';
        }
    }
    async copyImage(id: string): Promise<void> {
        this.error.set('');
        this.notice.set('');
        try {
            await navigator.clipboard.writeText(
                `${location.origin}/api/media/${id}`,
            );
            this.notice.set('Enlace copiado.');
        } catch {
            this.error.set('No se pudo copiar el enlace.');
        }
    }
    mediaName(value: string): string {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }
}
