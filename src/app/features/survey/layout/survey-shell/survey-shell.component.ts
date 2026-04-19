import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageToggleComponent } from '../../../../shared/components/language-toggle/language-toggle.component';

@Component({
  selector: 'app-survey-shell',
  imports: [RouterOutlet, LanguageToggleComponent],
  templateUrl: './survey-shell.component.html',
  styleUrl: './survey-shell.component.css',
})
export class SurveyShellComponent {}
