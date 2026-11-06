import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminPost } from '../data/admin.models';
@Component({
    selector: 'app-post-seo',
    imports: [FormsModule],
    templateUrl: './post-seo.component.html',
})
export class PostSeoComponent {
    readonly post = input.required<AdminPost>();
    readonly tags = input('');
    readonly changed = output<Partial<AdminPost>>();
    readonly tagsChanged = output<string>();
}
