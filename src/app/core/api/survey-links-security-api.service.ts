import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SurveyDistributionLinksSecurityService } from './generated/api/survey-distribution-links-security.service';
import { SaveSurveyProgressResultDto } from './generated/model/save-survey-progress-result-dto';
import { SaveSurveySessionProgressDto } from './generated/model/save-survey-session-progress-dto';
import { SubmitSurveyResponseResultDto } from './generated/model/submit-survey-response-result-dto';
import { SubmitSurveySessionResponseDto } from './generated/model/submit-survey-session-response-dto';
import { SurveySessionBootstrapDto } from './generated/model/survey-session-bootstrap-dto';

@Injectable({
  providedIn: 'root',
})
export class SurveyLinksSecurityApiService {
  private readonly surveyLinksSecurityApi = inject(
    SurveyDistributionLinksSecurityService,
  );

  redeem(distributionKey: string): Observable<SurveySessionBootstrapDto> {
    return this.surveyLinksSecurityApi.apiSurveyDistributionLinksSecurityRedeemPost(
      {
        input: { distributionKey },
      },
    );
  }

  getCurrentBootstrap(
    surveySessionToken: string,
  ): Observable<SurveySessionBootstrapDto> {
    // This mirrors the current generated backend contract, which expects the
    // session token as a query parameter on the bootstrap request.
    return this.surveyLinksSecurityApi.apiSurveyDistributionLinksSecurityCurrentBootstrapGet(
      {
        surveySessionToken,
      },
    );
  }

  saveProgress(
    payload: SaveSurveySessionProgressDto,
  ): Observable<SaveSurveyProgressResultDto> {
    return this.surveyLinksSecurityApi.apiSurveyDistributionLinksSecuritySaveProgressPost(
      {
        input: payload,
      },
    );
  }

  submit(
    payload: SubmitSurveySessionResponseDto,
  ): Observable<SubmitSurveyResponseResultDto> {
    return this.surveyLinksSecurityApi.apiSurveyDistributionLinksSecuritySubmitPost(
      {
        input: payload,
      },
    );
  }
}
