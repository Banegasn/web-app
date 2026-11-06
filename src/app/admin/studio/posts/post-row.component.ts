import { DatePipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { AdminPostSummary } from '../data/admin.models';
@Component({
    selector: 'app-studio-post-row',
    imports: [DatePipe],
    styleUrl: './post-row.component.css',
    templateUrl: './post-row.component.html',
})
export class PostRowComponent {
    readonly entry = input.required<AdminPostSummary>();
    readonly edit = output<string>();
    readonly failedImage = signal('');
}
