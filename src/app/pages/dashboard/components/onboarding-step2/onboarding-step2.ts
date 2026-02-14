import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProspectProfileService,
  type OnboardingQuestion,
  type OnboardingConfigResponse,
  type OnboardingAnswer,
  type OnboardingResponsePayload,
} from '../../../../core/service/prospect-profile/prospect-profile.service';

@Component({
  selector: 'app-onboarding-step2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding-step2.html',
  styleUrl: './onboarding-step2.scss',
})
export class OnboardingStep2 implements OnInit {
  private readonly prospectProfile = inject(ProspectProfileService);

  universitySlug = input.required<string>();
  refId = input.required<string>();

  complete = output<void>();
  /** Emitted when user clicks Back – parent should logout and redirect to home. */
  back = output<void>();

  config = signal<OnboardingConfigResponse['info'] | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  submitting = signal(false);
  submitError = signal<string | null>(null);

  /** Keyed by question _id; value depends on type (string, number, boolean, string[]). */
  formValues = signal<Record<string, string | number | boolean | string[]>>({});

  /** Validation errors: question _id -> error message. */
  validationErrors = signal<Record<string, string>>({});

  /** Marketing checkbox (not from API). */
  marketingConsent = signal(false);

  readonly REQUIRED_MSG = 'This field is required';

  /** Sorted questions from config. */
  questions = computed(() => {
    const info = this.config();
    if (!info?.questions?.length) return [];
    return [...info.questions].sort((a, b) => a.order - b.order);
  });

  /** When true, user can skip onboarding without submitting (show Skip button). When false (isMandatory), must submit. */
  allowSkip = computed(() => this.config()?.allowSkip ?? false);

  ngOnInit(): void {
    const slug = this.universitySlug();
    const refId = this.refId();
    if (!slug || !refId) {
      this.loadError.set('Missing university or refId');
      this.loading.set(false);
      return;
    }
    this.prospectProfile.getOnboardingConfig(slug, refId).subscribe({
      next: (res) => {
        if (res.success && res.info) {
          this.config.set(res.info);
          this.validationErrors.set({});
          const initial: Record<string, string | number | boolean | string[]> = {};
          res.info.questions.forEach((q) => {
            if (q.type === 'checkbox') initial[q._id] = [];
            else if (q.type === 'boolean') initial[q._id] = false;
            else if (q.type === 'number') initial[q._id] = '';
            else initial[q._id] = '';
          });
          this.formValues.set(initial);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'Failed to load form');
        this.loading.set(false);
      },
    });
  }

  getValue(q: OnboardingQuestion): string | number | boolean | string[] {
    return this.formValues()[q._id] ?? (q.type === 'checkbox' ? [] : q.type === 'boolean' ? false : '');
  }

  setValue(q: OnboardingQuestion, value: string | number | boolean | string[]): void {
    this.formValues.update((prev) => ({ ...prev, [q._id]: value }));
    this.clearFieldError(q._id);
  }

  toggleCheckboxOption(q: OnboardingQuestion, value: string): void {
    const current = (this.formValues()[q._id] as string[]) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.formValues.update((prev) => ({ ...prev, [q._id]: next }));
    this.clearFieldError(q._id);
  }

  clearFieldError(questionId: string): void {
    this.validationErrors.update((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  /** Validate a single question; returns error message or null. */
  private validateQuestion(q: OnboardingQuestion, value: string | number | boolean | string[]): string | null {
    const v = value;
    const val = q.validation;

    if (q.required) {
      if (q.type === 'checkbox') {
        const arr = Array.isArray(v) ? v : [];
        if (arr.length === 0) return this.REQUIRED_MSG;
      } else if (q.type === 'boolean') {
        // Boolean always has a value (true/false)
      } else if (q.type === 'number') {
        if (v === '' || v === undefined || v === null) return this.REQUIRED_MSG;
        const n = Number(v);
        if (Number.isNaN(n)) return this.REQUIRED_MSG;
      } else {
        const s = typeof v === 'string' ? v.trim() : '';
        if (s === '') return this.REQUIRED_MSG;
      }
    }

    // Type-specific validation
    if (q.type === 'text' || q.type === 'textarea') {
      const s = typeof v === 'string' ? v : String(v ?? '');
      if (val?.minLength != null && s.length < val.minLength) {
        return `Minimum ${val.minLength} characters required`;
      }
      if (val?.maxLength != null && s.length > val.maxLength) {
        return `Maximum ${val.maxLength} characters allowed`;
      }
    }

    if (q.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) return null; // already handled above
      if (val?.min != null && n < val.min) {
        return `Minimum value is ${val.min}`;
      }
      if (val?.max != null && n > val.max) {
        return `Maximum value is ${val.max}`;
      }
    }

    return null;
  }

  /** Run validation on all questions; returns true if valid. */
  private validateForm(): boolean {
    const questions = this.questions();
    const errors: Record<string, string> = {};
    questions.forEach((q) => {
      const value = this.getValue(q);
      const err = this.validateQuestion(q, value);
      if (err) errors[q._id] = err;
    });
    this.validationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  isCheckboxChecked(q: OnboardingQuestion, value: string): boolean {
    const arr = this.formValues()[q._id] as string[] | undefined;
    return Array.isArray(arr) && arr.includes(value);
  }

  onSubmit(): void {
    const info = this.config();
    const slug = this.universitySlug();
    const refId = this.refId();
    if (!info || !slug || !refId) return;
    if (!this.validateForm()) return;
    this.submitError.set(null);
    this.submitting.set(true);
    const answers: OnboardingAnswer[] = info.questions.map((q) => {
      const raw = this.formValues()[q._id];
      let answer: string | number | boolean | string[];
      if (q.type === 'date' && typeof raw === 'string') {
        answer = raw;
      } else if (q.type === 'number') {
        const n = raw === '' || raw === undefined ? 0 : Number(raw);
        answer = Number.isNaN(n) ? 0 : n;
      } else if (q.type === 'boolean') {
        answer = raw === true || raw === 'true';
      } else {
        answer = raw ?? (q.type === 'checkbox' ? [] : '');
      }
      return {
        questionId: q._id,
        question: q.question,
        type: q.type,
        answer,
      };
    });
    const payload: OnboardingResponsePayload = {
      configVersion: info.version ?? 1,
      status: 'completed',
      answers,
    };
    this.prospectProfile.postOnboardingResponse(slug, refId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.complete.emit();
      },
      error: (err) => {
        this.submitError.set(err?.message ?? 'Submit failed');
        this.submitting.set(false);
      },
    });
  }

  onBack(): void {
    this.back.emit();
  }

  onSkip(): void {
    const info = this.config();
    const slug = this.universitySlug();
    const refId = this.refId();
    if (!info || !slug || !refId || !this.allowSkip()) return;
    this.submitError.set(null);
    this.submitting.set(true);
    const payload: OnboardingResponsePayload = {
      configVersion: info.version ?? 1,
      status: 'skipped',
      answers: [],
    };
    this.prospectProfile.postOnboardingResponse(slug, refId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.complete.emit();
      },
      error: (err) => {
        this.submitError.set(err?.message ?? 'Skip failed');
        this.submitting.set(false);
      },
    });
  }
}
