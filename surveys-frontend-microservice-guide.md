# Surveys Frontend Microservice Guide

This document is for the Angular team building the standalone surveys frontend microservice that serves survey experiences for both:

- `B12 Core`
- `Industry / b12fork12backendhost`

The backend survey domain and APIs live in the Industry backend. The frontend should behave as a separate survey application that can be opened directly from generated launch links and can also support authenticated management screens if needed later.

## 1. Purpose

The surveys frontend is a dedicated Angular application responsible for:

- opening recipient survey links
- redeeming secure launch links
- rendering survey questions and conditional behavior
- saving in-progress answers
- submitting completed surveys
- showing clear invalid / expired / completed states

It must not rely on an Industry reusable login token for recipient survey participation.

Instead, recipients open a generated launch URL:

```text
/survey/start?dk=<opaque-key>
```

The frontend exchanges that key once for a survey-bound session, removes the key from the browser URL, and uses the returned session token for all later calls.

## 2. High-Level Architecture

### Systems

- `Core`
  - may be the system from which users and workflows originate
- `Industry / b12fork12backendhost`
  - owns the survey backend, survey distribution generation, survey session enforcement, and results
- `Survey Frontend`
  - separate Angular microservice
  - public-facing survey experience
  - talks to Industry survey APIs only

### Trust Model

- The survey frontend trusts the Industry backend for all authorization decisions.
- The frontend never authorizes by `distributionId` or `surveyId` alone.
- The backend authorizes access using the redeemed survey session.

## 3. Launch Link Model

When a survey distribution is created, the backend generates recipient-specific launch links.

Example:

```text
https://survey.example.com/survey/start?dk=YJy38aBNPH1W-IDP_wNvg8E54Ayxy5d0JCPjQlK9XRQ
```

Important rules:

- `dk` is opaque.
- `dk` is not a user id or survey id.
- backend stores only a hash of the raw key.
- the raw key is returned only at generation time.
- the frontend must not log or persist the raw key longer than needed.

The backend generates this URL using:

- config key: `Survey:LinksSecurityBaseUrl`
- path: `/survey/start?dk=<rawKey>`

If the config is missing, backend currently falls back to `http://localhost:4200`.

## 4. Recommended Angular Application Shape

Recommended route structure:

```text
/survey/start
/survey/invalid
/survey/completed
/survey/error
```

Recommended feature modules:

- `survey-shell`
- `survey-session`
- `survey-renderer`
- `survey-submit`
- `survey-shared`

Recommended main services:

- `SurveyLinksSecurityApiService`
- `SurveySessionStore`
- `SurveyAnswerMapperService`
- `SurveyConditionalVisibilityService`

## 5. Required Backend APIs

The recipient-facing APIs are exposed from:

- [SurveyDistributionLinksSecurityAppService.cs](C:/Users/aramh/RiderProjects/B12ForK12Backend/B12ForK12.ApplicationV3/Surveys/SurveyDistributionLinksSecurityAppService.cs)

In the current Angular workspace, these endpoints are generated into:

- [survey-distribution-links-security.service.ts](C:/Users/user/Desktop/Survey-MicroFrontend/src/app/core/api/generated/api/survey-distribution-links-security.service.ts)

The frontend should consume that generated client through a small wrapper service so feature code can use stable method names such as `redeem`, `getCurrentBootstrap`, `saveProgress`, and `submit`.

### 5.1 Redeem launch key

Method:

```text
POST /api/surveyDistributionLinksSecurity/redeem
```

Request:

```json
{
  "distributionKey": "<dk>"
}
```

Response:

```json
{
  "surveySessionToken": "<session-token>",
  "distributionId": "guid",
  "surveyId": "guid",
  "targetUserId": 123,
  "sessionCreatedAtUtc": "2026-04-02T10:00:00Z",
  "sessionExpiresAtUtc": "2026-04-02T18:00:00Z",
  "submissionAllowed": true,
  "isSubmitted": false,
  "distribution": {
    "distributionId": "guid",
    "title": "Survey title",
    "introHtml": "<p>Welcome</p>",
    "startUtc": "2026-04-02T10:00:00Z",
    "endUtc": "2026-04-09T10:00:00Z",
    "oneAttemptNoEdit": false,
    "isSubmitted": false,
    "canEditSubmission": true,
    "submittedAtUtc": null,
    "sections": []
  }
}
```

### 5.2 Get current bootstrap

Method:

```text
GET /api/surveyDistributionLinksSecurity/currentBootstrap?SurveySessionToken=<session-token>
```

Current generated Swagger and Angular client use a query parameter for this call.

Note:

- this differs from the earlier POST-with-body version of this guide
- if backend changes are still possible, moving the session token out of the URL is preferred
- until then, the frontend should follow the generated client contract so implementation matches the real backend surface

Use this when:

- reloading the page after redeem
- restoring state from local storage or session storage
- recovering after refresh

### 5.3 Save progress

Method:

```text
POST /api/surveyDistributionLinksSecurity/saveProgress
```

Request:

```json
{
  "surveySessionToken": "<session-token>",
  "answers": [
    {
      "questionInstanceId": "guid",
      "ratingValue": 4,
      "textValue": null,
      "selectedChoiceIds": [],
      "attachmentIds": []
    }
  ]
}
```

### 5.4 Submit survey

Method:

```text
POST /api/surveyDistributionLinksSecurity/submit
```

Request:

```json
{
  "surveySessionToken": "<session-token>",
  "answers": [
    {
      "questionInstanceId": "guid",
      "ratingValue": 4,
      "textValue": null,
      "selectedChoiceIds": [],
      "attachmentIds": []
    }
  ]
}
```

Response:

```json
{
  "responseId": "guid",
  "isLocked": false,
  "submittedAtUtc": "2026-04-02T11:00:00Z"
}
```

## 6. Frontend Open-to-Submit Flow

### Step 1: User opens launch URL

Example:

```text
https://survey.example.com/survey/start?dk=<opaque-key>
```

### Step 2: Read `dk` from the query string

On first component load:

- read `dk`
- if missing, try restoring an existing session token from browser storage
- if neither exists, show invalid state

### Step 3: Redeem the key

Call:

```text
POST SurveyDistributionLinksSecurity/Redeem
```

with:

```json
{
  "distributionKey": "<dk>"
}
```

### Step 4: Store returned session token

Store:

- `surveySessionToken`
- minimal survey metadata needed for resume

Recommended storage:

- `sessionStorage` by default
- `localStorage` only if product explicitly wants browser-close resume

Do not store:

- raw `dk`

### Step 5: Remove `dk` from the URL

Immediately remove the key from the browser URL after successful redeem.

Recommended Angular approach:

```ts
this.router.navigate([], {
  queryParams: {},
  replaceUrl: true
});
```

or use:

```ts
window.history.replaceState({}, document.title, '/survey/start');
```

`replaceUrl` is preferred so the raw key is not left in browser history.

### Step 6: Render the survey

Use the returned `distribution` object to render:

- title
- intro HTML
- sections
- questions
- question choices
- existing answers
- submission state

### Step 7: Save progress

On explicit save or autosave:

- map the current visible answers to the backend payload
- send `surveySessionToken`
- send answers using `questionInstanceId`

### Step 8: Submit

On submit:

- validate mandatory visible questions in the UI
- call `Submit`
- handle response
- refresh bootstrap if needed
- move to completed or editable state depending on returned flags

## 7. Session and Resume Rules

The backend supports a redeemed session model.

Meaning:

- the raw launch link is not the ongoing authorization mechanism
- the session token is

Current backend behavior:

- if `OneAttemptNoEdit = true`
  - first successful submit locks the survey
  - future edits are not allowed
- if `OneAttemptNoEdit = false`
  - recipient can reopen and resubmit while policy allows it
- raw link reuse is controlled by `LinksSecurityMaxUses`

Frontend implications:

- resume should rely on `surveySessionToken`
- not on keeping the raw `dk`
- after submit, call `GetCurrentBootstrap` if the UI needs final state confirmation

## 8. UI State Machine

Recommended recipient states:

- `loading`
- `redeeming`
- `ready`
- `saving`
- `submitting`
- `submitted-editable`
- `submitted-locked`
- `invalid-link`
- `expired-link`
- `revoked-link`
- `already-used-link`
- `session-expired`
- `server-error`

Recommended behavior:

- invalid / expired / revoked / already-used should have dedicated user-friendly pages
- completed locked surveys should show a clear completion message
- editable submitted surveys should show that the submission was saved and can still be updated

## 9. Rendering Rules

The survey payload structure comes from:

- [RecipientSurveyDtos.cs](C:/Users/aramh/RiderProjects/B12ForK12Backend/B12ForK12.ApplicationV3.Shared/Surveys/SurveyDtos/RecipientSurveyDtos.cs)

Key rendering fields:

- `distribution.sections[]`
- `sections[].questions[]`
- `questions[].questionInstanceId`
- `questions[].templateQuestionId`
- `questions[].questionOriginId`
- `questions[].type`
- `questions[].isMandatory`
- `questions[].ratingMax`
- `questions[].maxAttachments`
- `questions[].choices[]`
- `questions[].conditions[]`
- `questions[].existingAnswer`

Use `questionInstanceId` for answer submission.

Do not submit using:

- `templateQuestionId`
- `questionOriginId`

Those are useful for comparison or UI identity, but the backend answer binding uses `questionInstanceId`.

## 10. Conditional Question Rules

Conditions are defined only against previous multiple-choice questions in the same section/topic.

Frontend behavior:

- evaluate conditional visibility client-side
- when a parent question answer changes:
  - recompute visibility of dependent questions
  - clear hidden question answers in the form state unless product wants temporary retention

Recommended rule:

- hidden answers should not be submitted

Use:

- `conditions[].dependsOnQuestionInstanceId`
- `conditions[].triggerChoiceIds[]`

## 11. Question Type Mapping

Backend enum source:

- [QuestionType.cs](C:/Users/aramh/RiderProjects/B12ForK12Backend/src/B12ForK12.Core/V3/Surveys/Entities/Enums/QuestionType.cs)

Values:

- `0 = Rating`
- `1 = MultipleChoiceSingle`
- `2 = MultipleChoiceMultiple`
- `3 = Text`
- `4 = Attachment`

Recommended UI controls:

- `Rating`
  - radio group, segmented buttons, or clickable scale
- `MultipleChoiceSingle`
  - radio list
- `MultipleChoiceMultiple`
  - checkbox list
- `Text`
  - multi-line textarea
- `Attachment`
  - uploader with file count enforcement

## 12. Attachments

Attachment question answers submit:

- `attachmentIds: number[]`

This means uploads should happen before final survey submit through the existing attachment infrastructure, then the resulting attachment ids are included in the survey answer payload.

Angular team should confirm with backend/mobile conventions:

- upload endpoint to use
- file size limits
- MIME restrictions
- whether anonymous survey sessions need any attachment-specific token path

At the moment, survey session authorization exists for answer submit, but upload flow itself is a separate concern.

## 13. Error Handling Contract

The backend returns user-friendly errors for cases such as:

- invalid distribution key
- expired key
- revoked key
- already-used key
- invalid survey session
- expired survey session
- closed survey session
- inactive distribution

Frontend should map backend errors to stable UI states rather than showing raw server text directly.

Recommended mapping:

- `"Invalid distribution key."` -> `invalid-link`
- `"This launch link has already been used."` -> `already-used-link`
- `"Survey session has expired."` -> `session-expired`
- `"Survey session is closed."` -> `submitted-locked`

## 14. Security Rules for Frontend

The frontend must:

- remove `dk` from URL after redeem
- never log raw `dk`
- never log `surveySessionToken` in console in production
- never authorize by `distributionId` from the client
- never trust client-side survey state as final
- always use backend session responses as source of truth

The frontend must not:

- keep sending `dk` after redeem
- expose internal ids in route URLs
- assume a user is authenticated in Industry

## 15. Serving Core and Industry

The same Angular app can serve both systems if it is treated as a survey-only frontend.

Recommended model:

- Core and Industry both generate or route users to the same survey frontend origin
- only the backend API base changes per environment
- launch links always point to the survey frontend, not directly to the backend

Recommended environment variables:

```ts
surveyFrontendOrigin
industryApiBaseUrl
coreBaseUrl
appName
```

Recommended deployment patterns:

- separate environments per tenant group
- or a single frontend with environment-based API routing

If multi-tenant hostnames are used, make the survey frontend capable of deriving API base URL from hostname or tenant bootstrap config.

## 16. Suggested Angular Service Contract

```ts
export interface RedeemSurveyDistributionKeyDto {
  distributionKey: string;
}

export interface SurveySessionRequestDto {
  surveySessionToken: string;
}

export interface SubmitSurveyAnswerDto {
  questionInstanceId: string;
  ratingValue?: number | null;
  textValue?: string | null;
  selectedChoiceIds: string[];
  attachmentIds: number[];
}

export interface SaveSurveySessionProgressDto extends SurveySessionRequestDto {
  answers: SubmitSurveyAnswerDto[];
}

export interface SubmitSurveySessionResponseDto extends SurveySessionRequestDto {
  answers: SubmitSurveyAnswerDto[];
}
```

Recommended Angular API service methods:

```ts
redeem(distributionKey: string)
getCurrentBootstrap(surveySessionToken: string)
saveProgress(payload: SaveSurveySessionProgressDto)
submit(payload: SubmitSurveySessionResponseDto)
```

Current workspace wrapper:

- [survey-links-security-api.service.ts](C:/Users/user/Desktop/Survey-MicroFrontend/src/app/core/api/survey-links-security-api.service.ts)

Current generated client method mapping:

```ts
redeem(distributionKey) =>
  apiSurveyDistributionLinksSecurityRedeemPost({
    input: { distributionKey }
  })

getCurrentBootstrap(surveySessionToken) =>
  apiSurveyDistributionLinksSecurityCurrentBootstrapGet({
    surveySessionToken
  })

saveProgress(payload) =>
  apiSurveyDistributionLinksSecuritySaveProgressPost({
    input: payload
  })

submit(payload) =>
  apiSurveyDistributionLinksSecuritySubmitPost({
    input: payload
  })
```

## 17. Minimal Component Flow Example

```ts
async ngOnInit(): Promise<void> {
  const dk = this.route.snapshot.queryParamMap.get('dk');

  if (dk) {
    const bootstrap = await this.api.redeem(dk);
    this.sessionStore.setToken(bootstrap.surveySessionToken);
    this.model = bootstrap.distribution;

    await this.router.navigate([], {
      queryParams: {},
      replaceUrl: true
    });

    return;
  }

  const sessionToken = this.sessionStore.getToken();
  if (!sessionToken) {
    this.state = 'invalid-link';
    return;
  }

  const bootstrap = await this.api.getCurrentBootstrap(sessionToken);
  this.model = bootstrap.distribution;
}
```

Submit example:

```ts
async submit(): Promise<void> {
  const payload = {
    surveySessionToken: this.sessionStore.getToken(),
    answers: this.answerMapper.buildAnswers(this.form, this.model)
  };

  const result = await this.api.submit(payload);
  this.submission = result;

  const refreshed = await this.api.getCurrentBootstrap(payload.surveySessionToken);
  this.model = refreshed.distribution;
}
```

## 18. Management Side APIs

Survey management and results APIs are exposed from:

- [SurveyAppService.cs](C:/Users/aramh/RiderProjects/B12ForK12Backend/B12ForK12.ApplicationV3/Surveys/SurveyAppService.cs)

These include:

- create survey
- list surveys
- preview survey
- update survey
- distribute survey
- list distributions
- get distribution header
- get participation
- get section results
- compare distributions
- export results

If the Angular microservice later includes authoring or reporting screens, this app service is the starting point.

## 19. Test and Swagger Support

For backend-integrated testing, a Swagger-runnable helper exists:

- `SurveyAppService.RunLinksSecurityFullCycleTestAsync`

It creates a survey, distributes it, redeems one guardian link, submits answers, and returns results/checks. This is useful for:

- backend verification
- frontend contract testing
- UAT smoke testing

## 20. Recommended Delivery Order

Build in this order:

1. recipient survey open/redeem flow
2. survey rendering for rating, text, single-choice, multi-choice
3. save progress
4. submit
5. invalid/expired/completed pages
6. attachment support
7. polish, localization, accessibility, analytics

## 21. Open Items to Confirm

Before production rollout, confirm:

- exact attachment upload API for anonymous survey sessions
- whether session token should use `sessionStorage` or `localStorage`
- survey frontend hostname per environment
- whether Core should deep-link directly to survey frontend or redirect through an intermediate route
- localization requirements for Arabic and English
- whether management/reporting screens also belong in this microservice

## 22. Final Recipient Flow Summary

1. Distribution is created in Industry backend.
2. Backend generates secure recipient launch links.
3. Recipient opens `/survey/start?dk=<opaque-key>`.
4. Angular app reads `dk` and calls redeem.
5. Backend returns a distribution-bound survey session token and survey bootstrap.
6. Angular app stores the session token and removes `dk` from the URL.
7. User fills the survey.
8. Angular app saves progress and submits using only the session token.
9. Backend validates session and distribution on every save/submit.
10. Distribution/response state is updated and results become available in Industry.
