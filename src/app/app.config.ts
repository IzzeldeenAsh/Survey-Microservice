import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { abpResponseInterceptor } from './core/api/abp-response.interceptor';
import { surveySessionAuthInterceptor } from './core/api/survey-session-auth.interceptor';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { environment } from '../environments/environment';
import { provideApi } from './core/api/generated/provide-api';
import { LocalizationService } from './core/services/localization.service';
import { TranslatedTitleStrategy } from './core/services/translated-title.strategy';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([surveySessionAuthInterceptor, abpResponseInterceptor]),
    ),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideApi(environment.apiBaseUrl),
    provideTranslateService({
      lang: 'en',
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: 'i18n/', suffix: '.json' }),
    }),
    provideAppInitializer(() => inject(LocalizationService).initialize()),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
  ],
};
