import { DatePipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminComment } from '../data/admin.models';
@Component({
    selector: 'app-studio-comment-card',
    imports: [DatePipe, RouterLink],
    styleUrl: './comment-card.component.css',
    templateUrl: './comment-card.component.html',
})
export class CommentCardComponent {
    readonly comment = input.required<AdminComment>();
    readonly busy = input(false);
    readonly remove = output<AdminComment>();
    readonly confirming = signal(false);
}
