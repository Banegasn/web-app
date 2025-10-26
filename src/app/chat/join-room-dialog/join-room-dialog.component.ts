import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-join-room-dialog',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './join-room-dialog.component.html',
    styleUrl: './join-room-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoinRoomDialogComponent {
    userName = '';
    userEmail = '';

    dialogRef = inject(DialogRef<{ userName: string; userEmail: string }>);

    join() {
        if (this.userName.trim() && this.userEmail.trim()) {
            this.dialogRef.close({
                userName: this.userName.trim(),
                userEmail: this.userEmail.trim()
            });
        }
    }

    close() {
        this.dialogRef.close();
    }
}
