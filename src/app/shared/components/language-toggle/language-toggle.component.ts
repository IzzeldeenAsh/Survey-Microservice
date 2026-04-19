import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LocalizationService } from '../../../core/services/localization.service';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <button
      type="button"
      (click)="toggle()"
      [attr.aria-label]="'language.switchTo' | translate"
      class="inline-flex items-center gap-1.5 rounded-full border border-[#DCE4EE] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#344054] shadow-sm transition-colors duration-150 hover:border-[#2F80ED] hover:text-[#2F80ED] active:scale-[0.98]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-4 w-4"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-1.5c-.6 0-1.4-.6-2.1-2-.5-1.1-.9-2.6-1-4.25h6.2c-.1 1.65-.5 3.15-1 4.25-.7 1.4-1.5 2-2.1 2Zm-3.35-7.75c.1-1.65.5-3.15 1-4.25.7-1.4 1.5-2 2.1-2s1.4.6 2.1 2c.5 1.1.9 2.6 1 4.25H6.65Zm-1.5 1.5c.1 1.65.45 3.1.95 4.25a6.5 6.5 0 0 1-3.5-4.25h2.55Zm0-1.5H2.6a6.5 6.5 0 0 1 3.5-4.25c-.5 1.15-.85 2.6-.95 4.25Zm9.7 1.5h2.55a6.5 6.5 0 0 1-3.5 4.25c.5-1.15.85-2.6.95-4.25Zm0-1.5c-.1-1.65-.45-3.1-.95-4.25a6.5 6.5 0 0 1 3.5 4.25h-2.55Z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ isEnglish() ? ('language.arabic' | translate) : ('language.english' | translate) }}</span>
    </button>
  `,
})
export class LanguageToggleComponent {
  private readonly localization = inject(LocalizationService);

  readonly isEnglish = () => this.localization.current() === 'en';

  toggle(): void {
    this.localization.toggle();
  }
}
