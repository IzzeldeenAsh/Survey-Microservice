import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'survey/start',
  },
  {
    path: 'survey',
    loadChildren: () =>
      import('./features/survey/survey.routes').then((m) => m.SURVEY_ROUTES),
  },
  {
    path: 'test/upload',
    title: 'route.uploadTest',
    loadComponent: () =>
      import('./features/test/upload-test-page/upload-test-page.component').then(
        (m) => m.UploadTestPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'survey/error',
  },
];
