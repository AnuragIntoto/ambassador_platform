import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  ViewChildren,
  ViewChild,
  QueryList,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { ProspectProfileService } from '../../../../core/service/prospect-profile/prospect-profile.service';
import type { ProspectProfileLoginInfo } from '../../../../core/models/prospect-profile.model';
import type { CountryReferenceDoc, CountryDoc } from '../../../../core/service/prospect-profile/prospect-profile.service';

@Component({
  selector: 'app-basic-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InfiniteScrollDirective],
  templateUrl: './basic-info-modal.html',
  styleUrl: './basic-info-modal.scss',
})
export class BasicInfoModal {
  private readonly prospectProfile = inject(ProspectProfileService);

  @ViewChildren('dropdownWrapper') dropdownWrappers?: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  /** When true, the modal is visible. */
  visible = input.required<boolean>();
  /** Pre-fill and field config from prospect-profile/login response. */
  profile = input<ProspectProfileLoginInfo | null>(null);
  /** When true, parent is calling submit API; keep button disabled. */
  submitting = input<boolean>(false);

  close = output<void>();
  submit = output<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    countryCode: string;
    country: string;
    pictureFile?: File;
  }>();

  firstName = signal('');
  lastName = signal('');
  email = signal('');
  countryCode = signal('+1');
  phoneNumber = signal('');
  country = signal('');

  readonly PAGE_SIZE = 10;

  isSubmitting = signal(false);
  countryOptions = signal<CountryReferenceDoc[]>([]);
  phoneCountryOptions = signal<CountryDoc[]>([]);
  loadingCountries = signal(false);
  countryPageIndex = signal(1);
  countryHasMore = signal(true);
  countryLoadingMore = signal(false);
  countryOpen = signal(false);
  phonePageIndex = signal(1);
  phoneHasMore = signal(true);
  phoneLoadingMore = signal(false);
  phoneOpen = signal(false);
  countrySearchTerm = signal('');
  phoneSearchTerm = signal('');
  /** When true, phone dropdown opens above the input (viewport-aware). */
  phoneDropdownAbove = signal(false);
  /** When true, country dropdown opens above the input (viewport-aware). */
  countryDropdownAbove = signal(false);

  private readonly DROPDOWN_HEIGHT = 220;

  filteredCountryOptions = computed(() => {
    const list = this.countryOptions();
    const q = this.countrySearchTerm().trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  });
  filteredPhoneCountryOptions = computed(() => {
    const list = this.phoneCountryOptions();
    const q = this.phoneSearchTerm().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q)
    );
  });

  /** Whether the modal should be shown (visible and not closed by backdrop). */
  showModal = computed(() => this.visible());

  /** Selected file for upload (user chose a new picture). */
  selectedPictureFile = signal<File | null>(null);
  /** Data URL for preview of selected file. */
  selectedPicturePreviewUrl = signal<string | null>(null);

  /** Display URL: selected preview, else existing profile picture from API. */
  profilePictureUrl = computed(() => {
    const preview = this.selectedPicturePreviewUrl();
    if (preview) return preview;
    return this.profile()?.picture?.value ?? null;
  });

  /** Validation errors: field name -> error message. */
  validationErrors = signal<Record<string, string>>({});

  readonly REQUIRED_MSG = 'This field is required';

  constructor() {
    effect(() => {
      const p = this.profile();
      if (!p?.basicDetails?.fields) return;
      const fields = p.basicDetails.fields;
      if (fields.firstName?.value) this.firstName.set(fields.firstName.value);
      if (fields.lastName?.value) this.lastName.set(fields.lastName.value);
      if (fields.email?.value) this.email.set(fields.email.value);
      if (fields.country?.value) this.country.set(String(fields.country.value));
      const phone = fields.phoneNumber as { value?: { countryCode?: string; phoneNumber?: string } } | undefined;
      if (phone?.value?.countryCode) this.countryCode.set(phone.value.countryCode);
      if (phone?.value?.phoneNumber) this.phoneNumber.set(phone.value.phoneNumber);
    });

    effect(() => {
      const v = this.visible();
      if (!v) {
        this.selectedPictureFile.set(null);
        this.selectedPicturePreviewUrl.set(null);
        this.validationErrors.set({});
        return;
      }
      const refId = this.profile()?.refId;
      if (!refId) return;
      this.countryPageIndex.set(1);
      this.countryHasMore.set(true);
      this.phonePageIndex.set(1);
      this.phoneHasMore.set(true);
      this.loadingCountries.set(true);
      this.prospectProfile.getCountryReference(refId, 1, this.PAGE_SIZE).subscribe({
        next: (res) => {
          if (res.success && res.info?.docs) {
            this.countryOptions.set(res.info.docs);
          }
          const totalPages = res.info?.totalPages ?? 1;
          this.countryHasMore.set(1 < totalPages);
          this.loadingCountries.set(false);
        },
        error: () => this.loadingCountries.set(false),
      });
      this.prospectProfile.getCountriesForPhone(refId, 1, this.PAGE_SIZE).subscribe({
        next: (res) => {
          if (res.success && res.info?.docs) {
            this.phoneCountryOptions.set(res.info.docs);
          }
          const totalPages = res.info?.totalPages ?? 1;
          this.phoneHasMore.set(1 < totalPages);
        },
      });
    });
  }

  get refId(): string {
    return this.profile()?.refId ?? '';
  }

  private readonly scrollThreshold = 80;

  onCountryScroll(): void {
    console.log('[BasicInfo] onCountryScroll', {
      loadingMore: this.countryLoadingMore(),
      hasMore: this.countryHasMore(),
      pageIndex: this.countryPageIndex(),
    });
    if (this.countryLoadingMore() || !this.countryHasMore() || !this.refId) return;
    this.loadMoreCountries();
  }

  onCountryScrollEvent(e: Event): void {
    const el = e.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - this.scrollThreshold;
    if (nearBottom) this.onCountryScroll();
  }

  onPhoneScroll(): void {
    console.log('[BasicInfo] onPhoneScroll', {
      loadingMore: this.phoneLoadingMore(),
      hasMore: this.phoneHasMore(),
      pageIndex: this.phonePageIndex(),
    });
    if (this.phoneLoadingMore() || !this.phoneHasMore() || !this.refId) return;
    this.loadMorePhoneCountries();
  }

  onPhoneScrollEvent(e: Event): void {
    const el = e.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - this.scrollThreshold;
    if (nearBottom) this.onPhoneScroll();
  }

  loadMoreCountries(): void {
    if (this.countryLoadingMore() || !this.countryHasMore()) return;
    const refId = this.refId;
    if (!refId) return;
    const nextPage = this.countryPageIndex() + 1;
    console.log('[BasicInfo] loadMoreCountries', { nextPage });
    this.countryLoadingMore.set(true);
    this.prospectProfile.getCountryReference(refId, nextPage, this.PAGE_SIZE).subscribe({
      next: (res) => {
        const added = res.info?.docs?.length ?? 0;
        if (res.success && res.info?.docs?.length) {
          this.countryOptions.update((prev) => [...prev, ...res.info!.docs]);
        }
        this.countryPageIndex.set(nextPage);
        const totalPages = res.info?.totalPages ?? 1;
        this.countryHasMore.set(nextPage < totalPages);
        this.countryLoadingMore.set(false);
        console.log('[BasicInfo] loadMoreCountries done', { nextPage, added, totalPages, hasMore: nextPage < totalPages });
      },
      error: (err) => {
        this.countryLoadingMore.set(false);
        console.warn('[BasicInfo] loadMoreCountries error', err);
      },
    });
  }

  loadMorePhoneCountries(): void {
    if (this.phoneLoadingMore() || !this.phoneHasMore()) return;
    const refId = this.refId;
    if (!refId) return;
    const nextPage = this.phonePageIndex() + 1;
    console.log('[BasicInfo] loadMorePhoneCountries', { nextPage });
    this.phoneLoadingMore.set(true);
    this.prospectProfile.getCountriesForPhone(refId, nextPage, this.PAGE_SIZE).subscribe({
      next: (res) => {
        if (res.success && res.info?.docs?.length) {
          this.phoneCountryOptions.update((prev) => [...prev, ...res.info!.docs]);
        }
        this.phonePageIndex.set(nextPage);
        const totalPages = res.info?.totalPages ?? 1;
        this.phoneHasMore.set(nextPage < totalPages);
        this.phoneLoadingMore.set(false);
        console.log('[BasicInfo] loadMorePhoneCountries done', { nextPage, totalPages, hasMore: nextPage < totalPages });
      },
      error: (err) => {
        this.phoneLoadingMore.set(false);
        console.warn('[BasicInfo] loadMorePhoneCountries error', err);
      },
    });
  }

  toggleCountryOpen(): void {
    this.countryOpen.update((v) => !v);
    if (this.phoneOpen()) this.phoneOpen.set(false);
    if (this.countryOpen()) {
      console.log('[BasicInfo] country dropdown opened', { count: this.countryOptions().length, pageIndex: this.countryPageIndex(), hasMore: this.countryHasMore() });
      setTimeout(() => this.updateCountryDropdownPosition(), 0);
    } else {
      this.countryDropdownAbove.set(false);
    }
  }

  togglePhoneOpen(): void {
    this.phoneOpen.update((v) => !v);
    if (this.countryOpen()) this.countryOpen.set(false);
    if (this.phoneOpen()) {
      console.log('[BasicInfo] phone dropdown opened', { count: this.phoneCountryOptions().length, pageIndex: this.phonePageIndex(), hasMore: this.phoneHasMore() });
      setTimeout(() => this.updatePhoneDropdownPosition(), 0);
    } else {
      this.phoneDropdownAbove.set(false);
    }
  }

  private updatePhoneDropdownPosition(): void {
    const wrappers = this.dropdownWrappers;
    const wrapper = wrappers?.get(0)?.nativeElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    this.phoneDropdownAbove.set(spaceBelow < this.DROPDOWN_HEIGHT && spaceAbove > spaceBelow);
  }

  private updateCountryDropdownPosition(): void {
    const wrappers = this.dropdownWrappers;
    const wrapper = wrappers?.get(1)?.nativeElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    this.countryDropdownAbove.set(spaceBelow < this.DROPDOWN_HEIGHT && spaceAbove > spaceBelow);
  }

  selectCountry(opt: CountryReferenceDoc): void {
    this.country.set(opt.name);
    this.countryOpen.set(false);
    this.clearFieldError('country');
  }

  selectPhoneCountry(opt: CountryDoc): void {
    this.countryCode.set(opt.dialCode);
    this.phoneOpen.set(false);
  }

  clearFieldError(field: string): void {
    this.validationErrors.update((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  closeDropdowns(): void {
    this.countryOpen.set(false);
    this.phoneOpen.set(false);
  }

  /** Close dropdowns when clicking outside any dropdown wrapper. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showModal() || (!this.countryOpen() && !this.phoneOpen())) return;
    const target = event.target as Node;
    const wrappers = this.dropdownWrappers;
    if (!wrappers?.length) return;
    const clickedInside = wrappers.some((w) => w.nativeElement.contains(target));
    if (!clickedInside) this.closeDropdowns();
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }
    this.selectedPictureFile.set(file);
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedPicturePreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  onBack(): void {
    this.close.emit();
  }

  onBackdropClick(e: Event): void {
    const t = e.target as HTMLElement;
    if (t.classList.contains('basic-info-backdrop')) this.close.emit();
  }

  onSubmit(): void {
    const f = this.firstName().trim();
    const l = this.lastName().trim();
    const e = this.email().trim();
    const p = this.phoneNumber().trim();
    const c = this.country().trim();
    const errors: Record<string, string> = {};
    if (!f) errors['firstName'] = this.REQUIRED_MSG;
    if (!l) errors['lastName'] = this.REQUIRED_MSG;
    if (!e) errors['email'] = this.REQUIRED_MSG;
    if (!p) errors['phoneNumber'] = this.REQUIRED_MSG;
    if (!c) errors['country'] = this.REQUIRED_MSG;
    this.validationErrors.set(errors);
    if (Object.keys(errors).length > 0) return;
    this.submit.emit({
      firstName: f,
      lastName: l,
      email: e,
      phoneNumber: p,
      countryCode: this.countryCode().trim(),
      country: c,
      pictureFile: this.selectedPictureFile() ?? undefined,
    });
  }
}
