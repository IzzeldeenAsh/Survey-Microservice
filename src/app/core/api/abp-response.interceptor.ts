import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

interface AbpResponseEnvelope {
  result: unknown;
  success: boolean;
  error: { message: string; details?: string } | null;
  __abp: boolean;
}

function isAbpEnvelope(body: unknown): body is AbpResponseEnvelope {
  return (
    body !== null &&
    typeof body === 'object' &&
    '__abp' in body &&
    (body as { __abp: unknown }).__abp === true
  );
}

export const abpResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event) => {
      if (!(event instanceof HttpResponse) || !isAbpEnvelope(event.body)) {
        return event;
      }
      return event.clone({ body: event.body.result });
    }),
  );
};
