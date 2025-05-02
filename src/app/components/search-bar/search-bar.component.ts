import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-search-bar',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './search-bar.component.html',
    styleUrl: './search-bar.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent {
    readonly search = model<string>('');
} 