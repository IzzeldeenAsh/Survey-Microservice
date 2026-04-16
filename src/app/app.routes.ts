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
    path: '**',
    redirectTo: 'survey/error',
  },
];
