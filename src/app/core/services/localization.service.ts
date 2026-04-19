import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguage = 'en' | 'ar';

const STORAGE_KEY = 'survey.lang';
const DEFAULT_LANG: SupportedLanguage = 'en';
const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  private readonly _current = signal<SupportedLanguage>(DEFAULT_LANG);
  readonly current = this._current.asReadonly();
  readonly isRtl = computed(() => RTL_LANGUAGES.includes(this._current()));

  initialize(): void {
    this.translate.addLangs(['en', 'ar']);
    this.translate.setFallbackLang(DEFAULT_LANG);

    const stored = this.readStored();
    const initial = stored ?? this.detectFromBrowser() ?? DEFAULT_LANG;
    this.use(initial);
  }

  use(lang: SupportedLanguage): void {
    this.translate.use(lang).subscribe({
      next: () => {
        this._current.set(lang);
        this.applyDocumentAttributes(lang);
        this.persist(lang);
      },
    });
  }

  toggle(): void {
    this.use(this._current() === 'en' ? 'ar' : 'en');
  }

  private applyDocumentAttributes(lang: SupportedLanguage): void {
    const html = this.document?.documentElement;
    if (!html) return;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
  }

  private readStored(): SupportedLanguage | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return value === 'en' || value === 'ar' ? value : null;
    } catch {
      return null;
    }
  }

  private persist(lang: SupportedLanguage): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage errors */
    }
  }

  private detectFromBrowser(): SupportedLanguage | null {
    const nav = this.document.defaultView?.navigator;
    const raw = nav?.language?.toLowerCase() ?? '';
    if (raw.startsWith('ar')) return 'ar';
    if (raw.startsWith('en')) return 'en';
    return null;
  }
}
