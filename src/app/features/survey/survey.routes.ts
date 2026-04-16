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
        title: 'Start Survey | Survey Frontend',
        loadComponent: loadSurveyStartPage,
      },
      {
        path: 'invalid',
        title: 'Invalid Survey Link | Survey Frontend',
        loadComponent: loadSurveyStatusPage,
        data: {
          eyebrow: 'Link state',
          badge: 'Invalid link',
          tone: 'warning',
          title: "This survey link can't be used.",
          description:
            'This link may be invalid, expired, revoked, or already used. Please contact the sender if you need a new survey invitation.',
        },
      },
      {
        path: 'completed',
        title: 'Survey Completed | Survey Frontend',
        loadComponent: loadSurveyStatusPage,
        data: {
          eyebrow: 'Submission state',
          badge: 'Submitted',
          tone: 'success',
          title: 'This survey has already been submitted.',
          description:
            'Your responses are already locked and there is nothing else you need to do for this survey.',
        },
      },
      {
        path: 'error',
        title: 'Survey Error | Survey Frontend',
        loadComponent: loadSurveyStatusPage,
        data: {
          eyebrow: 'Recovery state',
          badge: 'Server or session error',
          tone: 'danger',
          title: "We couldn't open this survey.",
          description:
            'An unexpected problem interrupted the survey flow. Please try opening the original survey link again. If the problem continues, contact the sender.',
        },
      },
      {
        path: '**',
        redirectTo: 'error',
      },
    ],
  },
];
