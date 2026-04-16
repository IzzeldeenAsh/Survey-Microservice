import { Injectable } from '@angular/core';

const SURVEY_SESSION_TOKEN_KEY = 'survey.session.token';

@Injectable({
  providedIn: 'root',
})
export class SurveySessionStoreService {
  getToken(): string | null {
    return this.storage?.getItem(SURVEY_SESSION_TOKEN_KEY) ?? null;
  }

  setToken(token: string): void {
    this.storage?.setItem(SURVEY_SESSION_TOKEN_KEY, token);
  }

  clearToken(): void {
    this.storage?.removeItem(SURVEY_SESSION_TOKEN_KEY);
  }

  private get storage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage;
  }
}
