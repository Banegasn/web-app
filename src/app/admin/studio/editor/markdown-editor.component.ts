import {
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    input,
    inject,
    output,
    viewChild,
} from '@angular/core';
import type Editor from '@toast-ui/editor';
import { MediaStore } from '../data/media.store';
@Component({
    selector: 'app-markdown-editor',
    template: '<div #editor></div>',
})
export class MarkdownEditorComponent implements AfterViewInit, OnDestroy {
    readonly value = input('');
    readonly changed = output<string>();
    readonly failure = output<string>();
    private readonly media = inject(MediaStore);
    readonly host = viewChild.required<ElementRef<HTMLDivElement>>('editor');
    private editor?: Editor;
    private destroyed = false;
    async ngAfterViewInit(): Promise<void> {
        try {
            if (!document.getElementById('editor-styles')) {
                const link = document.createElement('link');
                link.id = 'editor-styles';
                link.rel = 'stylesheet';
                link.href = '/editor/toastui-editor.css';
                document.head.append(link);
            }
            const { default: Editor } = await import('@toast-ui/editor');
            if (this.destroyed) return;
            this.editor = new Editor({
                el: this.host().nativeElement,
                initialValue: this.value(),
                height: '600px',
                autofocus: false,
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                usageStatistics: false,
                events: {
                    change: () =>
                        this.changed.emit(
                            this.editor?.getMarkdown() ?? this.value(),
                        ),
                },
                hooks: {
                    addImageBlobHook: (
                        blob: Blob,
                        callback: (url: string, alt: string) => void,
                    ) => {
                        this.media
                            .upload(blob)
                            .then((url) => callback(url, 'Imagen'))
                            .catch((e) => this.failure.emit(e.message));
                        return false;
                    },
                },
            });
        } catch {
            this.failure.emit(
                'No se pudo cargar el editor. Recarga la página.',
            );
        }
    }
    ngOnDestroy(): void {
        this.destroyed = true;
        this.editor?.destroy();
    }
}
