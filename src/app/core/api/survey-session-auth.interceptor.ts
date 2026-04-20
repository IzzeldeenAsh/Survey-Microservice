import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SurveySessionStoreService } from '../../features/survey/services/survey-session-store.service';

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export const surveySessionAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }

  const token = inject(SurveySessionStoreService).getToken();

  if (!token || req.headers.has('Authorization')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
