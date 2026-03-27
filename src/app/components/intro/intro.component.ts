import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-intro',
    imports: [RouterLink],
    styleUrl: './intro.component.css',
    templateUrl: './intro.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntroComponent { }