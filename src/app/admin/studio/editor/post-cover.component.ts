import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminPost } from '../data/admin.models';
@Component({
    selector: 'app-post-cover',
    imports: [FormsModule],
    styleUrl: './post-cover.component.css',
    templateUrl: './post-cover.component.html',
})
export class PostCoverComponent {
    readonly post = input.required<AdminPost>();
    readonly uploading = input(false);
    readonly changed = output<Partial<AdminPost>>();
    readonly upload = output<File>();
    selectFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) this.upload.emit(file);
        input.value = '';
    }
}
