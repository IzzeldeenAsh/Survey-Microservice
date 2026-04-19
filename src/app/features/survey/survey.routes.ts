import { Routes } from '@angular/router';

const loadSurveyStartPage = () =>
  import('./pages/survey-start-page/survey-start-page.component').then(
    (m) => m.SurveyStartPageComponent,
  );

const loadSurveyStatusPage = () =>
  import('./pages/survey-status-page/survey-status-page.component').then(
    (m) => m.SurveyStatusPageComponent,
  );

export const SURVEY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/survey-shell/survey-shell.component').then(
        (m) => m.SurveyShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'start',
      },
      {
        path: 'start',
        title: 'route.surveyStart',
        loadComponent: loadSurveyStartPage,
      },
      {
        path: 'invalid',
        title: 'status.invalid.title',
        loadComponent: loadSurveyStatusPage,
        data: {
          eyebrow: 'status.invalid.eyebrow',
          badge: 'status.invalid.badge',
          tone: 'warning',
          title: 'status.invalid.heading',
          description: 'status.invalid.description',
        },
      },
      {
        path: 'completed',
        title: 'status.completed.title',
        loadComponent: loadSurveyStatusPage,
        data: {
          eyebrow: 'status.completed.eyebrow',
          badge: 'status.completed.badge',
          tone: 'success',
          title: 'status.completed.heading',
          description: 'status.completed.description',
        },
      },
      {
        path: 'error',
        title: 'status.error.title',
        loadComponent: loadSurveyStatusPage,
        data: {
          eyebrow: 'status.error.eyebrow',
          badge: 'status.error.badge',
          tone: 'danger',
          title: 'status.error.heading',
          description: 'status.error.description',
        },
      },
      {
        path: '**',
        redirectTo: 'error',
      },
    ],
  },
];
