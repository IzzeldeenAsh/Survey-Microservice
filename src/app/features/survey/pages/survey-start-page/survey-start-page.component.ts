import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SurveyLinksSecurityApiService } from '../../../../core/api/survey-links-security-api.service';
import { RecipientSurveyChoiceDto } from '../../../../core/api/generated/model/recipient-survey-choice-dto';
import { RecipientSurveyConditionDto } from '../../../../core/api/generated/model/recipient-survey-condition-dto';
import { RecipientSurveyDistributionDto } from '../../../../core/api/generated/model/recipient-survey-distribution-dto';
import { RecipientSurveyExistingAnswerDto } from '../../../../core/api/generated/model/recipient-survey-existing-answer-dto';
import { RecipientSurveyQuestionDto } from '../../../../core/api/generated/model/recipient-survey-question-dto';
import { RecipientSurveySectionDto } from '../../../../core/api/generated/model/recipient-survey-section-dto';
import { SurveySessionBootstrapDto } from '../../../../core/api/generated/model/survey-session-bootstrap-dto';
import { SurveySessionStoreService } from '../../services/survey-session-store.service';
import { AwsService } from '../../../../core/services/aws.service';
import { AttachmentModelDTO } from '../../../../core/api/generated/model/attachment-model-dto';

type QuestionAnswerState = {
  attachmentIds: number[];
  ratingValue: number | null;
  selectedChoiceIds: string[];
  textValue: string;
};

type StartPageState = 'loading' | 'ready';

const QUESTION_TYPE = {
  rating: 0,
  multipleChoiceSingle: 1,
  multipleChoiceMultiple: 2,
  text: 3,
  attachment: 4,
} as const;

@Component({
  selector: 'app-survey-start-page',
  templateUrl: './survey-start-page.component.html',
  styleUrl: './survey-start-page.component.css',
})
export class SurveyStartPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(SurveyLinksSecurityApiService);
  private readonly sessionStore = inject(SurveySessionStoreService);
  private readonly awsService = inject(AwsService);

  protected readonly pageState = signal<StartPageState>('loading');
  protected readonly loadingLabel = signal('Loading survey...');
  protected readonly bootstrap = signal<SurveySessionBootstrapDto | null>(null);
  protected readonly answers = signal<Record<string, QuestionAnswerState>>({});
  protected readonly currentSectionIndex = signal(0);
  protected readonly resumedSession = signal(false);
  protected readonly uploadingQuestions = signal<Set<string>>(new Set());
  protected readonly questionAttachmentDtos = signal<Record<string, AttachmentModelDTO[]>>({});

  protected readonly distribution = computed(
    () => this.bootstrap()?.distribution ?? null,
  );
  protected readonly sections = computed(() =>
    this.sortSections(this.distribution()?.sections),
  );
  protected readonly currentSection = computed(() => {
    const sections = this.sections();
    const index = this.currentSectionIndex();
    return sections[index] ?? null;
  });
  protected readonly visibleQuestions = computed(() => {
    const section = this.currentSection();

    if (!section?.questions?.length) {
      return [];
    }

    return this.sortQuestions(section.questions).filter((question) =>
      this.isQuestionVisible(question),
    );
  });
  protected readonly currentSectionLabel = computed(() => {
    const section = this.currentSection();

    if (!section) {
      return 'Survey Section';
    }

    return `Section ${this.currentSectionIndex() + 1}`;
  });
  protected readonly introHtml = computed(
    () => this.distribution()?.introHtml?.trim() ?? '',
  );
  protected readonly statusMessage = computed(() => {
    const bootstrap = this.bootstrap();
    const distribution = this.distribution();

    if (bootstrap?.isSubmitted && distribution?.canEditSubmission) {
      return 'This survey was already submitted and can still be updated.';
    }

    if (this.resumedSession()) {
      return 'Your survey was restored from the current browser session.';
    }

    return '';
  });
  protected readonly pageCount = computed(() => this.sections().length);
  protected readonly canGoToPreviousSection = computed(
    () => this.currentSectionIndex() > 0,
  );
  protected readonly canGoToNextSection = computed(() => {
    const sections = this.sections();
    return this.currentSectionIndex() < sections.length - 1;
  });

  constructor() {
    effect(() => {
      const sections = this.sections();
      const index = this.currentSectionIndex();

      if (!sections.length && index !== 0) {
        this.currentSectionIndex.set(0);
        return;
      }

      if (sections.length && index > sections.length - 1) {
        this.currentSectionIndex.set(sections.length - 1);
      }
    });

    void this.initialize();
  }

  protected getRatingValues(question: RecipientSurveyQuestionDto): number[] {
    const max = Math.max(question.ratingMax ?? 5, 1);
    return Array.from({ length: max }, (_, index) => index + 1);
  }

  protected getChoices(
    question: RecipientSurveyQuestionDto,
  ): RecipientSurveyChoiceDto[] {
    return [...(question.choices ?? [])].sort((left, right) => left.order - right.order);
  }

  protected getQuestionAnswer(questionId: string): QuestionAnswerState {
    return (
      this.answers()[questionId] ?? {
        attachmentIds: [],
        ratingValue: null,
        selectedChoiceIds: [],
        textValue: '',
      }
    );
  }

  protected isRatingQuestion(question: RecipientSurveyQuestionDto): boolean {
    return question.type === QUESTION_TYPE.rating;
  }

  protected isSingleChoiceQuestion(question: RecipientSurveyQuestionDto): boolean {
    return question.type === QUESTION_TYPE.multipleChoiceSingle;
  }

  protected isMultipleChoiceQuestion(
    question: RecipientSurveyQuestionDto,
  ): boolean {
    return question.type === QUESTION_TYPE.multipleChoiceMultiple;
  }

  protected isTextQuestion(question: RecipientSurveyQuestionDto): boolean {
    return question.type === QUESTION_TYPE.text;
  }

  protected isAttachmentQuestion(question: RecipientSurveyQuestionDto): boolean {
    return question.type === QUESTION_TYPE.attachment;
  }

  protected isSelected(
    questionId: string,
    choiceId: string,
  ): boolean {
    return this.getQuestionAnswer(questionId).selectedChoiceIds.includes(choiceId);
  }

  protected setRating(questionId: string, ratingValue: number): void {
    this.updateAnswer(questionId, { ratingValue });
  }

  protected setSingleChoice(questionId: string, choiceId: string): void {
    this.updateAnswer(questionId, {
      selectedChoiceIds: [choiceId],
    });
  }

  protected toggleMultipleChoice(questionId: string, choiceId: string): void {
    const currentSelection = this.getQuestionAnswer(questionId).selectedChoiceIds;
    const selectedChoiceIds = currentSelection.includes(choiceId)
      ? currentSelection.filter((selectedId) => selectedId !== choiceId)
      : [...currentSelection, choiceId];

    this.updateAnswer(questionId, { selectedChoiceIds });
  }

  protected updateTextValue(questionId: string, textValue: string): void {
    this.updateAnswer(questionId, { textValue });
  }

  protected getQuestionAttachmentDtos(questionId: string): AttachmentModelDTO[] {
    return this.questionAttachmentDtos()[questionId] ?? [];
  }

  protected isQuestionUploading(questionId: string): boolean {
    return this.uploadingQuestions().has(questionId);
  }

  protected canUploadMore(question: RecipientSurveyQuestionDto): boolean {
    if (!question.maxAttachments) return true;
    return (
      this.getQuestionAnswer(question.questionInstanceId).attachmentIds.length <
      question.maxAttachments
    );
  }

  protected getPreExistingAttachmentCount(questionId: string): number {
    const totalIds = this.getQuestionAnswer(questionId).attachmentIds.length;
    const uploadedCount = this.getQuestionAttachmentDtos(questionId).length;
    return Math.max(0, totalIds - uploadedCount);
  }

  protected async uploadAttachmentFiles(
    questionId: string,
    event: Event,
    maxAttachments?: number,
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const currentIds = this.getQuestionAnswer(questionId).attachmentIds;
    const remaining = maxAttachments ? maxAttachments - currentIds.length : Infinity;
    const filesToUpload = Array.from(input.files).slice(0, remaining);

    if (!filesToUpload.length) return;

    this.uploadingQuestions.update((set) => new Set([...set, questionId]));

    try {
      const fileWrappers = filesToUpload.map((f) => ({ file: { rawFile: f } }));
      const attachments = await this.awsService.uploadFileToB12(fileWrappers);

      console.log('[Upload] Attachments registered for question', questionId, attachments);

      this.questionAttachmentDtos.update((current) => ({
        ...current,
        [questionId]: [...(current[questionId] ?? []), ...attachments],
      }));

      const newIds = attachments
        .map((a) => a.id)
        .filter((id): id is number => id != null);
      this.updateAnswer(questionId, { attachmentIds: [...currentIds, ...newIds] });
    } catch (error) {
      console.error('[Upload] Failed for question', questionId, error);
    } finally {
      this.uploadingQuestions.update((set) => {
        const next = new Set(set);
        next.delete(questionId);
        return next;
      });
      input.value = '';
    }
  }

  protected removeAttachmentFromQuestion(questionId: string, attachmentId: number): void {
    this.questionAttachmentDtos.update((current) => ({
      ...current,
      [questionId]: (current[questionId] ?? []).filter((a) => a.id !== attachmentId),
    }));

    const currentIds = this.getQuestionAnswer(questionId).attachmentIds;
    this.updateAnswer(questionId, {
      attachmentIds: currentIds.filter((id) => id !== attachmentId),
    });
  }

  protected goToSection(sectionIndex: number): void {
    if (sectionIndex < 0 || sectionIndex >= this.sections().length) {
      return;
    }

    this.currentSectionIndex.set(sectionIndex);
  }

  protected goToPreviousSection(): void {
    if (!this.canGoToPreviousSection()) {
      return;
    }

    this.currentSectionIndex.update((currentIndex) => currentIndex - 1);
  }

  protected goToNextSection(): void {
    if (!this.canGoToNextSection()) {
      return;
    }

    this.currentSectionIndex.update((currentIndex) => currentIndex + 1);
  }

  private async initialize(): Promise<void> {
    const distributionKey = this.route.snapshot.queryParamMap.get('dk')?.trim();

    try {
      if (distributionKey) {
        this.loadingLabel.set('Opening survey link...');
        const bootstrap = await firstValueFrom(this.api.redeem(distributionKey));
        const bootstrapSucceeded = await this.handleResolvedBootstrap(bootstrap, false);

        if (bootstrapSucceeded) {
          await this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
        }
        return;
      }

      const surveySessionToken = this.sessionStore.getToken();
      if (!surveySessionToken) {
        await this.navigateToInvalid();
        return;
      }

      this.loadingLabel.set('Restoring your survey...');
      const bootstrap = await firstValueFrom(
        this.api.getCurrentBootstrap(surveySessionToken),
      );
      await this.handleResolvedBootstrap(bootstrap, true);
    } catch (error) {
      await this.handleBootstrapError(error);
    }
  }

  private async handleResolvedBootstrap(
    bootstrap: SurveySessionBootstrapDto,
    resumedSession: boolean,
  ): Promise<boolean> {
    const surveySessionToken = bootstrap.surveySessionToken?.trim();
    if (!surveySessionToken || !bootstrap.distribution) {
      await this.navigateToError();
      return false;
    }

    this.sessionStore.setToken(surveySessionToken);

    if (bootstrap.isSubmitted && !bootstrap.distribution.canEditSubmission) {
      await this.navigateToCompleted();
      return false;
    }

    this.resumedSession.set(resumedSession);
    this.bootstrap.set(bootstrap);
    this.answers.set(this.buildInitialAnswers(bootstrap.distribution));
    this.currentSectionIndex.set(0);
    this.pageState.set('ready');
    return true;
  }

  private buildInitialAnswers(
    distribution: RecipientSurveyDistributionDto,
  ): Record<string, QuestionAnswerState> {
    const entries = (distribution.sections ?? []).flatMap((section) =>
      (section.questions ?? []).map((question) => [
        question.questionInstanceId,
        this.mapExistingAnswer(question.existingAnswer),
      ] as const),
    );

    return Object.fromEntries(entries);
  }

  private mapExistingAnswer(
    answer?: RecipientSurveyExistingAnswerDto,
  ): QuestionAnswerState {
    return {
      attachmentIds: [...(answer?.attachmentIds ?? [])],
      ratingValue: answer?.ratingValue ?? null,
      selectedChoiceIds: [...(answer?.selectedChoiceIds ?? [])],
      textValue: answer?.textValue ?? '',
    };
  }

  private sortSections(
    sections: RecipientSurveySectionDto[] | undefined,
  ): RecipientSurveySectionDto[] {
    return [...(sections ?? [])].sort((left, right) => left.order - right.order);
  }

  private sortQuestions(
    questions: RecipientSurveyQuestionDto[],
  ): RecipientSurveyQuestionDto[] {
    return [...questions].sort((left, right) => left.order - right.order);
  }

  private isQuestionVisible(question: RecipientSurveyQuestionDto): boolean {
    const conditions = question.conditions ?? [];

    if (!conditions.length) {
      return true;
    }

    return conditions.every((condition) =>
      this.isConditionSatisfied(condition),
    );
  }

  private isConditionSatisfied(condition: RecipientSurveyConditionDto): boolean {
    const selectedChoiceIds =
      this.getQuestionAnswer(condition.dependsOnQuestionInstanceId).selectedChoiceIds;
    const triggerChoiceIds = condition.triggerChoiceIds ?? [];

    if (!triggerChoiceIds.length) {
      return true;
    }

    return selectedChoiceIds.some((choiceId) => triggerChoiceIds.includes(choiceId));
  }

  private updateAnswer(
    questionId: string,
    patch: Partial<QuestionAnswerState>,
  ): void {
    const nextAnswers = {
      ...this.answers(),
      [questionId]: {
        ...this.getQuestionAnswer(questionId),
        ...patch,
      },
    };

    this.answers.set(this.clearHiddenAnswers(nextAnswers));
  }

  private clearHiddenAnswers(
    answers: Record<string, QuestionAnswerState>,
  ): Record<string, QuestionAnswerState> {
    const distribution = this.distribution();

    if (!distribution?.sections?.length) {
      return answers;
    }

    const nextAnswers = { ...answers };

    for (const section of distribution.sections) {
      for (const question of this.sortQuestions(section.questions ?? [])) {
        const conditions = question.conditions ?? [];

        if (!conditions.length) {
          continue;
        }

        const isVisible = conditions.every((condition) => {
          const selectedChoiceIds =
            nextAnswers[condition.dependsOnQuestionInstanceId]?.selectedChoiceIds ?? [];
          const triggerChoiceIds = condition.triggerChoiceIds ?? [];

          if (!triggerChoiceIds.length) {
            return true;
          }

          return selectedChoiceIds.some((choiceId) =>
            triggerChoiceIds.includes(choiceId),
          );
        });

        if (!isVisible) {
          nextAnswers[question.questionInstanceId] = {
            attachmentIds: [],
            ratingValue: null,
            selectedChoiceIds: [],
            textValue: '',
          };
        }
      }
    }

    return nextAnswers;
  }

  private async handleBootstrapError(error: unknown): Promise<void> {
    const message = this.extractErrorMessage(error).toLowerCase();

    if (
      message.includes('survey session is closed') ||
      message.includes('closed survey session')
    ) {
      this.sessionStore.clearToken();
      await this.navigateToCompleted();
      return;
    }

    if (
      message.includes('invalid distribution key') ||
      message.includes('already been used') ||
      message.includes('expired key') ||
      message.includes('revoked key') ||
      message.includes('inactive distribution') ||
      message.includes('invalid survey session') ||
      message.includes('survey session has expired')
    ) {
      this.sessionStore.clearToken();
      await this.navigateToInvalid();
      return;
    }

    await this.navigateToError();
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const candidate = error as {
        error?: {
          error?: { message?: string };
          message?: string;
        };
        message?: string;
      };

      return (
        candidate.error?.error?.message ??
        candidate.error?.message ??
        candidate.message ??
        ''
      );
    }

    return '';
  }

  private navigateToInvalid(): Promise<boolean> {
    return this.router.navigate(['/survey/invalid'], { replaceUrl: true });
  }

  private navigateToCompleted(): Promise<boolean> {
    return this.router.navigate(['/survey/completed'], { replaceUrl: true });
  }

  private navigateToError(): Promise<boolean> {
    return this.router.navigate(['/survey/error'], { replaceUrl: true });
  }
}
