import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-intro',
    styleUrl: './intro.component.css',
    templateUrl: './intro.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntroComponent { }