import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

interface Room {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
    isPrivate: boolean;
    createdBy: string;
}

@Component({
    selector: 'app-share-room-dialog',
    standalone: true,
    templateUrl: './share-room-dialog.component.html',
    styleUrl: './share-room-dialog.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareRoomDialogComponent {
    room: Room;
    dialogRef = inject(DialogRef);

    constructor() {
        this.room = inject(DIALOG_DATA).room;
    }

    get shareLink(): string {
        return `${window.location.origin}/chat/join/${this.room.token}`;
    }

    copyLink() {
        navigator.clipboard.writeText(this.shareLink).then(() => {
            // You could add a toast notification here
            console.log('Link copied to clipboard');
        });
    }

    close() {
        this.dialogRef.close();
    }
}
