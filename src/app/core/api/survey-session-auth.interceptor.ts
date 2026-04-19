import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SurveySessionStoreService } from '../../features/survey/services/survey-session-store.service';

export const surveySessionAuthInterceptor: HttpInterceptorFn = (req, next) => {
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
