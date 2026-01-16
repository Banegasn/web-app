import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-new-chat-dialog',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './new-chat-dialog.component.html',
    styleUrl: './new-chat-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewChatDialogComponent {
    chatName = '';

    dialogRef = inject(DialogRef<string>);

    create() {
        if (this.chatName.trim()) {
            this.dialogRef.close(this.chatName);
        }
    }

    close() {
        this.dialogRef.close();
    }
} 