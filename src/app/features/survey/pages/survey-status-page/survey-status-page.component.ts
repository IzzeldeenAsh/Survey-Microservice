import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

const badgeToneClasses: Record<StatusTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
};

@Component({
  selector: 'app-survey-status-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './survey-status-page.component.html',
  styleUrl: './survey-status-page.component.css',
})
export class SurveyStatusPageComponent {
  readonly eyebrow = input('status.fallback.eyebrow');
  readonly badge = input('status.fallback.badge');
  readonly tone = input<StatusTone>('neutral');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly primaryActionLabel = input<string>();
  readonly primaryActionHref = input<string>();
  readonly secondaryActionLabel = input<string>();
  readonly secondaryActionHref = input<string>();

  protected readonly badgeClasses = computed(() => badgeToneClasses[this.tone()]);
  protected readonly hasPrimaryAction = computed(
    () => !!this.primaryActionLabel() && !!this.primaryActionHref(),
  );
  protected readonly hasSecondaryAction = computed(
    () => !!this.secondaryActionLabel() && !!this.secondaryActionHref(),
  );
}
