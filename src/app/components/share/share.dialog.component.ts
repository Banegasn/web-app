import { Clipboard } from '@angular/cdk/clipboard';
import { DIALOG_DATA, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

// Define an interface for the expected data
interface ShareDialogData {
    shareUrl: string;
}

@Component({
    selector: 'app-share-dialog',
    imports: [DialogModule],
    template: `
    <div class="p-5 bg-white rounded-lg shadow-xl max-w-md mx-auto">
      <h2 class="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Share</h2>
      <p class="text-sm text-gray-600 mb-3">Share this link via</p>

      <div class="flex justify-center gap-4 mb-5">
        <button (click)="share('facebook')" aria-label="Share on Facebook" class="p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition duration-150 ease-in-out">
          <svg class="w-7 h-7" fill="currentColor" viewBox="2 2 20 20"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.67 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.81C10.44 7.31 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>
        </button>
        <button (click)="share('twitter')" aria-label="Share on Twitter" class="p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-black transition duration-150 ease-in-out">
           <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 16 16"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/></svg>
        </button>
        <button (click)="share('linkedin')" aria-label="Share on LinkedIn" class="p-2 rounded-full text-gray-700 hover:bg-blue-100 hover:text-blue-800 transition duration-150 ease-in-out">
          <svg class="w-7 h-7" fill="currentColor" viewBox="2 2 20 20"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-3.1v8.37h3.1v-4.67c0-.9.6-1.63 1.65-1.63s1.65.73 1.65 1.63v4.67zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68zm1.56 9.94v-8.37H5.32v8.37z"/></svg>
        </button>
        <button (click)="share('whatsapp')" aria-label="Share on WhatsApp" class="p-2 rounded-full text-gray-700 hover:bg-green-100 hover:text-green-700 transition duration-150 ease-in-out">
            <svg class="w-7 h-7" fill="currentColor" viewBox="4 4 24 24">
                <!-- WhatsApp icon -->	
                <path d=" M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.73.244-1.088 0-.058 0-.144-.03-.215-.1-.172-2.434-1.39-2.678-1.39zm-2.908 7.593c-1.747 0-3.48-.53-4.942-1.49L7.793 24.41l1.132-3.337a8.955 8.955 0 0 1-1.72-5.272c0-4.955 4.04-8.995 8.997-8.995S25.2 10.845 25.2 15.8c0 4.958-4.04 8.998-8.998 8.998zm0-19.798c-5.96 0-10.8 4.842-10.8 10.8 0 1.964.53 3.898 1.546 5.574L5 27.176l5.974-1.92a10.807 10.807 0 0 0 16.03-9.455c0-5.958-4.842-10.8-10.802-10.8z"/>
            </svg>
        </button>
      </div>

      <p class="text-sm text-gray-600 mb-2">Or copy link</p>
      <div class="flex gap-2">
        <input
          type="text"
          readonly
          [value]="data.shareUrl"
          class="flex-grow p-2 border border-gray-300 rounded bg-gray-100 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Link to share"
        />
        <button
          (click)="copy()"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition duration-150 ease-in-out text-sm whitespace-nowrap"
          [class.bg-green-500]="status() === 'Copied!'"
          [class.hover:bg-green-600]="status() === 'Copied!'"
          [class.bg-red-500]="status() === 'Failed!'"
          [class.hover:bg-red-600]="status() === 'Failed!'"
          [disabled]="status() !== 'Copy Link'"
        >
          {{ status() }}
        </button>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
    button:disabled {
        cursor: not-allowed;
        opacity: 0.7;
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareDialogComponent {
    /** Data injected into the dialog. */
    readonly data: ShareDialogData = inject(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<string>);

    private clipboard = inject(Clipboard);
    /** Status message shown on the copy button. */
    readonly status = signal('Copy Link');

    copy(): void {
        if (this.status() !== 'Copy Link') return;
        const success = this.clipboard.copy(this.data.shareUrl);
        if (success) {
            this.status.set('Copied!');
            this.resetCopyStatusAfterDelay();
        } else {
            this.status.set('Failed!');
            this.resetCopyStatusAfterDelay();
        }
    }

    /** Resets the copy button status back to 'Copy Link' after a short delay. */
    private resetCopyStatusAfterDelay(): void {
        setTimeout(() => { this.status.set('Copy Link'); }, 2000);
    }

    /** Opens a new window to share the link on the specified social media platform. */
    share(platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp'): void {
        let url = '';

        const message = 'Check out this link!';
        const encodedUrl = encodeURIComponent(this.data.shareUrl);
        const text = encodeURIComponent(message);

        switch (platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(message + ' ' + this.data.shareUrl)}`;
                break;
        }

        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer,width=600,height=450');
        } else {
            console.warn(`Sharing platform "${platform}" is not configured.`);
        }
    }


    close(): void {
        this.dialogRef.close();
    }
}
