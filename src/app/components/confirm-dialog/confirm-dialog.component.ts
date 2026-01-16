import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

export interface ConfirmDialogData {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [],
    templateUrl: './confirm-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
    readonly dialogRef = inject(DialogRef<boolean>);
    readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

    readonly title = this.data.title || 'Confirmation';
    readonly message = this.data.message;
    readonly confirmText = this.data.confirmText || 'Confirm';
    readonly cancelText = this.data.cancelText || 'Cancel';

    confirm() {
        this.dialogRef.close(true);
    }

    cancel() {
        this.dialogRef.close(false);
    }
} 