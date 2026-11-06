import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPost } from '../data/admin.models';
@Component({
    selector: 'app-post-publishing',
    imports: [FormsModule, RouterLink],
    styleUrl: './post-publishing.component.css',
    templateUrl: './post-publishing.component.html',
})
export class PostPublishingComponent {
    readonly post = input.required<AdminPost>();
    readonly date = input('');
    readonly changed = output<Partial<AdminPost>>();
    readonly dateChanged = output<string>();
}
