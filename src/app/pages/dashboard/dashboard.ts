import {
  Component,
  model,
  inject,
  OnInit,
  computed,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { take, filter, switchMap, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AuthService } from '@auth0/auth0-angular';
import { AmbassadorPlatformService } from '../../core/service/ambassador-platform/ambassador-platform.service';
import {
  ProspectProfileService,
  type SetupProfilePayload,
} from '../../core/service/prospect-profile/prospect-profile.service';
import { Loader } from '../../shared/components/loader/loader';
import { BasicInfoModal } from './components/basic-info-modal/basic-info-modal';
import { OnboardingStep2 } from './components/onboarding-step2/onboarding-step2';
import { FilterModal, type FilterOption } from '../../shared/components/filter-modal/filter-modal';
import { environment } from '../../../environments/environment';
import { needsBasicInfo, shouldShowOnboarding } from '../../core/models/prospect-profile.model';
import type {
  AmbassadorApi,
  AmbassadorPlatformInfo,
  HomeListParams,
} from '../../core/models/ambassador-platform.model';
import {
  homeListDocToAmbassadorApi,
} from '../../core/models/ambassador-platform.model';
import type { ProspectProfileLoginInfo } from '../../core/models/prospect-profile.model';

export interface AmbassadorDisplay {
  id: string;
  name: string;
  country: string;
  description: string;
  program: string;
  interests: { icon: string; label: string }[];
  profileImage: string;
  status: 'online' | 'offline';
  statusText: string;
  badge: string;
}

const INTEREST_ICON_MAP: Record<string, string> = {
  music: 'pi-music',
  traveling: 'pi-send',
  travel: 'pi-send',
  photography: 'pi-camera',
  'photo & videography': 'pi-camera',
  art: 'pi-palette',
  coding: 'pi-code',
  gaming: 'pi-gamepad',
  reading: 'pi-book',
  'public speaking': 'pi-microphone',
  entrepreneurship: 'pi-briefcase',
  'environmental activism': 'pi-globe',
};

function interestToIcon(label: string): string {
  const key = label.toLowerCase().trim();
  return INTEREST_ICON_MAP[key] ?? 'pi-tag';
}

/** Resolve badge string; /home API may return ambassadorType as object, causing [object Object]. */
function getBadgeString(api: AmbassadorApi): string {
  const t = api.ambassadorType;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') {
    const o = t as { displayName?: string; name?: string };
    return o.displayName ?? o.name ?? 'Student';
  }
  return 'Student';
}

function mapAmbassador(api: AmbassadorApi): AmbassadorDisplay {
  const fallbackProgram = `${api.academicYear?.university ?? ''} - ${api.academicYear?.campus ?? ''}`.trim();
  const program =
    api.favouritePrograms?.[0] ?? (fallbackProgram || '—');
  const interests = (api.interests ?? []).map((label) => ({
    icon: interestToIcon(label),
    label,
  }));
  return {
    id: api._id,
    name: api.name ?? '',
    country: api.country ?? '',
    description: api.about ?? '',
    program,
    interests,
    profileImage: api.picture ?? '',
    status: 'offline',
    statusText: 'Offline',
    badge: getBadgeString(api),
  };
}

function getFilterLabels(filters: string[]): string[] {
  return (filters ?? []).filter((f) => typeof f === 'string' && !f.startsWith('http'));
}

const REFID_KEY = 'refId';

interface RefStorage {
  _id?: string;
  universityId?: string;
}

function getRefIdFromStorage(): string {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(REFID_KEY) : null;
    if (!raw) return '';
    const parsed = JSON.parse(raw) as RefStorage;
    return parsed?._id ?? '';
  } catch {
    return '';
  }
}

function getUniversityIdFromStorage(): string {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(REFID_KEY) : null;
    if (!raw) return '';
    const parsed = JSON.parse(raw) as RefStorage;
    return parsed?.universityId ?? '';
  } catch {
    return '';
  }
}

/** First letter of first name + first letter of last name. e.g. "Rajendra Doe" → "RD", "Shiva Raj Doe" → "SD" */
function getInitials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    AccordionModule,
    InputGroupModule,
    InputGroupAddonModule,
    Loader,
    BasicInfoModal,
    OnboardingStep2,
    FilterModal,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  readonly getInitials = getInitials;

  private readonly route = inject(ActivatedRoute);
  private readonly platformService = inject(AmbassadorPlatformService);
  private readonly prospectProfileService = inject(ProspectProfileService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  searchQuery = '';
  activeFilter = signal('All Ambassadors');
  activeFaqIndex = model<number[] | number | undefined>([0]);
  displayedCount = signal(4);

  platformData = signal<AmbassadorPlatformInfo | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  isAuthenticated = signal(false);
  /** Ambassador list from home/list API (when authenticated). Replaces platformData.ambassadors.list when set. */
  ambassadorListFromApi = signal<AmbassadorApi[]>([]);
  listLoading = signal(false);
  listPage = signal(1);
  listHasMore = signal(false);
  listTotalDocs = signal(0);
  /** Shown when prospect-profile/login indicates missing firstName or lastName. */
  showBasicInfoModal = signal(false);
  prospectProfileForModal = signal<ProspectProfileLoginInfo | null>(null);
  /** True while PUT /api/user (submit) is in progress. */
  basicInfoSubmitting = signal(false);
  /** After basic info submit success, show Step 2/2 onboarding form. */
  showOnboardingStep2 = signal(false);
  /** Slug and refId passed to onboarding (set when opening step 2). */
  onboardingSlug = signal('');
  onboardingRefId = signal('');
  /** Current dashboard university slug (from route). */
  dashboardSlug = signal('');
  /** By Country / By Program modal state and options */
  showCountryFilterModal = signal(false);
  showProgramFilterModal = signal(false);
  countryFilterItems = signal<FilterOption[]>([]);
  programFilterItems = signal<FilterOption[]>([]);
  countryFilterLoading = signal(false);
  programFilterLoading = signal(false);
  /** Infinite scroll: country */
  countryFilterPage = signal(1);
  countryFilterHasMore = signal(true);
  countryFilterLoadingMore = signal(false);
  /** Infinite scroll: program */
  programFilterPage = signal(1);
  programFilterHasMore = signal(true);
  programFilterLoadingMore = signal(false);
  /** Selected filter values sent to home/list (when respective filter is active). */
  selectedCountry = signal<string | undefined>(undefined);
  selectedProgram = signal<string | undefined>(undefined);
  /** Pre-selected ids when reopening modal (e.g. selectedCountryIds from last apply). */
  selectedCountryIds = signal<string[]>([]);
  selectedProgramIds = signal<string[]>([]);
  /** Current user's profile picture URL from prospect-profile/login (info.picture.value). Shown in header when authenticated; cleared on logout. */
  userProfilePicture = signal<string | null>(null);
  /** Current user's first and last name (for initials when no profile picture). */
  userFirstName = signal<string>('');
  userLastName = signal<string>('');
  /** Full name for getInitials. */
  userDisplayName = computed(() => {
    const first = this.userFirstName().trim();
    const last = this.userLastName().trim();
    if (!first && !last) return '';
    return `${first} ${last}`.trim();
  });

  filters = computed(() => {
    const info = this.platformData();
    if (!info?.filters) return ['All Ambassadors'];
    return getFilterLabels(info.filters);
  });

  refreshIconUrl = computed(() => {
    const raw = this.platformData()?.filters ?? [];
    const url = raw.find((f) => typeof f === 'string' && f.startsWith('http'));
    return url ?? null;
  });

  ambassadors = computed(() => {
    const fromApi = this.ambassadorListFromApi();
    // When authenticated, always use API list (even if empty) so empty search/filter results show correctly
    if (this.isAuthenticated()) {
      return fromApi.map(mapAmbassador);
    }
    const info = this.platformData();
    const list = info?.ambassadors?.list ?? [];
    return list.map(mapAmbassador);
  });

  visibleAmbassadors = computed(() =>
    this.ambassadors().slice(0, this.displayedCount())
  );

  hasMoreAmbassadors = computed(
    () =>
      this.listHasMore() ||
      this.displayedCount() < this.ambassadors().length
  );

  header = computed(() => this.platformData()?.header ?? null);
  ambassadorsSection = computed(() => this.platformData()?.ambassadors ?? null);
  faqsSection = computed(() => this.platformData()?.faqs ?? null);
  university = computed(() => this.platformData()?.university ?? null);

  ngOnInit(): void {
    const slug =
      this.route.snapshot.paramMap.get('universitySlug') ??
      environment.ambassadorPlatform?.defaultUniversitySlug ??
      'pune-university';
    this.dashboardSlug.set(slug);
    console.log('[Dashboard] ngOnInit, slug:', slug);

    // ─── Flow (1) Dashboard page loads: {{BaseUrl2}}/ambassador-platform/:slug/home ───
    this.platformService.loading.subscribe((v) => {
      this.loading.set(v);
      this.cdr.markForCheck();
    });
    this.platformService.error.subscribe((v) => {
      this.error.set(v);
      this.cdr.markForCheck();
    });
    this.platformService.platformData$.subscribe((v) => {
      this.platformData.set(v);
      console.log('[Dashboard] platformData received', v ? { hasFilters: !!v.filters?.length, hasAmbassadors: !!v.ambassadors?.list?.length } : null);
      if (v?.filters?.length) {
        const labels = getFilterLabels(v.filters);
        if (labels[0] && this.activeFilter() === 'All Ambassadors') {
          this.activeFilter.set(labels[0]);
        }
      }
      this.cdr.markForCheck();
    });
    this.platformService.fetchPlatformData(slug);

    // Flow (2) User clicks Login or anywhere requiring auth → Auth0 (onLoginSignup / requireAuthAction).
    this.auth.isAuthenticated$.subscribe((authenticated) => {
      this.isAuthenticated.set(authenticated);
      console.log('[Dashboard] isAuthenticated:', authenticated);
      this.cdr.markForCheck();
    });

    // ─── Direct navigate / refresh: when user is already logged in (refId in localStorage), load home/list ───
    this.auth.isAuthenticated$.pipe(filter(Boolean)).subscribe(() => {
      const refId = getRefIdFromStorage();
      console.log('[Dashboard] isAuthenticated=true, refId from storage:', refId ? `${refId.slice(0, 8)}...` : '(empty)');
      if (refId) {
        console.log('[Dashboard] Direct navigate/refresh: calling fetchAmbassadorList(1, false)');
        this.fetchAmbassadorList(1, false);
      }
      this.cdr.markForCheck();
    });

    // ─── Flow (3) After Auth0 login: {{BaseUrl}}/ambassador-platform/:slug/prospect-profile/login ───
    // If firstName and lastName exist → stay on dashboard. If either missing → open basic-info-modal.
    this.auth.isAuthenticated$
      .pipe(
        filter(Boolean),
        take(1),
        switchMap(() =>
          this.prospectProfileService.getProspectProfileLogin(slug)
        )
      )
      .subscribe({
        next: (res) => {
          console.log('[Dashboard] prospect-profile/login response', res?.success, res?.info ? { refId: !!res.info.refId, needsBasicInfo: needsBasicInfo(res.info), shouldShowOnboarding: shouldShowOnboarding(res.info) } : null);
          if (res.success && res.info) {
            this.userProfilePicture.set(res.info.picture?.value ?? null);
            const fields = res.info.basicDetails?.fields;
            if (fields?.firstName?.value) this.userFirstName.set(fields.firstName.value);
            if (fields?.lastName?.value) this.userLastName.set(fields.lastName.value);
            if (res.info.refId) {
              const stored: RefStorage = { _id: res.info.refId };
              if (res.info.universityId) stored.universityId = res.info.universityId;
              localStorage.setItem(REFID_KEY, JSON.stringify(stored));
              console.log('[Dashboard] refId (and universityId) saved to localStorage');
              // Call home/list after login whenever we have refId (basic info, onboarding, or direct dashboard).
              this.fetchAmbassadorList(1, false);
            }
            if (needsBasicInfo(res.info)) {
              console.log('[Dashboard] Opening basic info modal');
              this.prospectProfileForModal.set(res.info);
              this.showBasicInfoModal.set(true);
              this.cdr.markForCheck();
            } else if (shouldShowOnboarding(res.info)) {
              console.log('[Dashboard] Opening onboarding step 2');
              this.onboardingRefId.set(res.info.refId);
              this.onboardingSlug.set(slug);
              this.showOnboardingStep2.set(true);
              this.cdr.markForCheck();
            } else {
              console.log('[Dashboard] Login handler: user on dashboard');
              this.cdr.markForCheck();
            }
          }
        },
        error: (err) => {
          console.warn('[Dashboard] prospect-profile/login error', err);
          // Non-fatal: do not block dashboard; user can still use the app.
        },
      });
  }

  /** Back/close without submit: basic info is mandatory, so log out and return to login page. */
  onBasicInfoClose(): void {
    this.showBasicInfoModal.set(false);
    this.prospectProfileForModal.set(null);
    this.userProfilePicture.set(null);
    this.userFirstName.set('');
    this.userLastName.set('');
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refId');
    this.auth.logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : '',
      },
    });
  }

  /** Close modal only (after successful submit); do not log out. */
  private closeBasicInfoModalOnly(): void {
    this.showBasicInfoModal.set(false);
    this.prospectProfileForModal.set(null);
  }

  onBasicInfoSubmit(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    countryCode: string;
    country: string;
    pictureFile?: File;
  }): void {
    const refId = this.prospectProfileForModal()?.refId;
    if (!refId) return;
    this.basicInfoSubmitting.set(true);
    const body: SetupProfilePayload = {
      type: 'setupProfile',
      data: {
        firstName: { value: payload.firstName },
        lastName: { value: payload.lastName },
        email: { value: payload.email },
        phoneNumber: {
          countryCode: payload.countryCode,
          phoneNumber: payload.phoneNumber,
          isMobile: true,
          isVerified: true,
        },
        country: { value: payload.country },
      },
    };
    const slug =
      this.route.snapshot.paramMap.get('universitySlug') ??
      environment.ambassadorPlatform?.defaultUniversitySlug ??
      'pune-university';
    this.prospectProfileService
      .putSetupProfile(refId, body)
      .pipe(
        switchMap(() =>
          payload.pictureFile
            ? this.prospectProfileService.uploadProfilePicture(refId, payload.pictureFile)
            : of({ success: true })
        )
      )
      .subscribe({
      next: () => {
        this.userFirstName.set(payload.firstName);
        this.userLastName.set(payload.lastName);
        this.basicInfoSubmitting.set(false);
        this.onboardingRefId.set(refId);
        this.onboardingSlug.set(slug);
        this.closeBasicInfoModalOnly();
        this.showOnboardingStep2.set(true);
        this.cdr.markForCheck();
      },
        error: () => {
          this.basicInfoSubmitting.set(false);
        },
      });
  }

  onOnboardingComplete(): void {
    console.log('[Dashboard] onOnboardingComplete: closing step 2, calling fetchAmbassadorList(1, false)');
    this.showOnboardingStep2.set(false);
    this.onboardingRefId.set('');
    this.onboardingSlug.set('');
    this.fetchAmbassadorList(1, false);
    this.cdr.markForCheck();
  }

  /** Back from onboarding: logout and redirect to home (no direct access to dashboard). */
  onOnboardingBack(): void {
    this.logout();
  }

  onLoginSignup(e: Event): void {
    e.preventDefault();
    this.auth.loginWithRedirect();
  }

  requireAuthAction(fn?: () => void): void {
    this.auth.isAuthenticated$.pipe(take(1)).subscribe((authenticated) => {
      if (authenticated) {
        fn?.();
      } else {
        this.auth.loginWithRedirect();
      }
    });
  }

  /** Build home/list API params from current filter and search. */
  private listParams(page: number): HomeListParams {
    const filter = this.activeFilter()?.toLowerCase()?.trim();
    let ambassadorType: 'STUDENT' | 'ALUMNI' | 'STAFF' | undefined;
    switch (filter) {
    case 'student':
    case 'students':
      ambassadorType = 'STUDENT';
      break;
    case 'alumni':
      ambassadorType = 'ALUMNI';
      break;
    case 'staff':
      ambassadorType = 'STAFF';
      break;
    default:
      ambassadorType = undefined;
  }

  const country =
    this.activeFilter() === 'By Country' ? (this.selectedCountry() ?? undefined) : undefined;
  const program =
    this.activeFilter() === 'By Program' ? (this.selectedProgram() ?? undefined) : undefined;

  return {
    pageIndex: page,
    pageSize: 10,
    search: this.searchQuery?.trim() || undefined,
    ambassadorType,
    country,
    program,
  };
}


  /** Fetch ambassador list from home/list API; replace (page 1) or append (next page). */
  fetchAmbassadorList(page: number, append: boolean): void {
    const slug = this.dashboardSlug();
    const params = this.listParams(page);
    console.log('[Dashboard] fetchAmbassadorList', { page, append, slug, params });
    if (!slug) {
      console.warn('[Dashboard] fetchAmbassadorList skipped: no slug');
      return;
    }
    this.listLoading.set(true);
    this.platformService.getHomeList(slug, params).subscribe({
      next: (res) => {
        this.listLoading.set(false);
        if (res?.success && res.info) {
          const docs = res.info.docs ?? [];
          const mapped = docs.map(homeListDocToAmbassadorApi);
          console.log('[Dashboard] home/list success', { docsCount: docs.length, totalDocs: res.info.totalDocs, page: res.info.page, hasNextPage: res.info.hasNextPage });
          if (append) {
            this.ambassadorListFromApi.update((prev) => [...prev, ...mapped]);
          } else {
            this.ambassadorListFromApi.set(mapped);
          }
          this.listPage.set(res.info.page ?? page);
          this.listHasMore.set(!!res.info.hasNextPage);
          this.listTotalDocs.set(res.info.totalDocs ?? 0);
          if (append) {
            this.displayedCount.update((c) =>
              Math.min(c + 4, this.ambassadorListFromApi().length)
            );
          } else {
            this.displayedCount.set(4);
          }
        } else {
          console.log('[Dashboard] home/list response empty or not success', res);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.listLoading.set(false);
        console.warn('[Dashboard] home/list error', err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Handle filter button: open By Country / By Program modal or set tab filter. */
  onFilterClick(filter: string): void {
    if (filter === 'By Country') {
      this.requireAuthAction(() => this.openCountryFilter());
      return;
    }
    if (filter === 'By Program') {
      this.requireAuthAction(() => this.openProgramFilter());
      return;
    }
    this.setActiveFilter(filter);
  }

  setActiveFilter(filter: string): void {
    this.requireAuthAction(() => {
      this.activeFilter.set(filter);
      this.fetchAmbassadorList(1, false);
    });
  }

  openCountryFilter(): void {
    const refId = getRefIdFromStorage();
    if (!refId) {
      console.warn('[Dashboard] openCountryFilter: no refId');
      return;
    }
    this.showCountryFilterModal.set(true);
    this.countryFilterLoading.set(true);
    this.countryFilterItems.set([]);
    this.countryFilterPage.set(1);
    this.countryFilterHasMore.set(true);
    this.prospectProfileService
      .getReferenceFilter(refId, 'COUNTRY_NAME', 1, 10)
      .subscribe({
        next: (res) => {
          this.countryFilterLoading.set(false);
          if (res?.success && res.info?.docs) {
            const items: FilterOption[] = res.info.docs.map((d) => ({
              id: d._id,
              label: d.name,
            }));
            this.countryFilterItems.set(items);
            this.countryFilterHasMore.set(
              res.info.hasNextPage ?? (res.info.page ?? 1) < (res.info.totalPages ?? 0)
            );
            const current = this.selectedCountry();
            const ids = current
              ? items.filter((i) => i.label === current).map((i) => i.id)
              : [];
            this.selectedCountryIds.set(ids);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.countryFilterLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onCountryFilterLoadMore(): void {
    if (!this.countryFilterHasMore() || this.countryFilterLoadingMore()) return;
    const refId = getRefIdFromStorage();
    if (!refId) return;
    const nextPage = this.countryFilterPage() + 1;
    this.countryFilterLoadingMore.set(true);
    this.prospectProfileService
      .getReferenceFilter(refId, 'COUNTRY_NAME', nextPage, 10)
      .subscribe({
        next: (res) => {
          this.countryFilterLoadingMore.set(false);
          if (res?.success && res.info?.docs) {
            const newItems: FilterOption[] = res.info.docs.map((d) => ({
              id: d._id,
              label: d.name,
            }));
            this.countryFilterItems.update((prev) => [...prev, ...newItems]);
            this.countryFilterPage.set(res.info.page ?? nextPage);
            this.countryFilterHasMore.set(
              res.info.hasNextPage ?? (res.info.page ?? nextPage) < (res.info.totalPages ?? nextPage)
            );
          } else {
            this.countryFilterHasMore.set(false);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.countryFilterLoadingMore.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  openProgramFilter(): void {
    const refId = getRefIdFromStorage();
    const universityId = getUniversityIdFromStorage();
    this.showProgramFilterModal.set(true);
    this.programFilterItems.set([]);
    this.programFilterPage.set(1);
    this.programFilterHasMore.set(true);
    if (!refId) {
      console.warn('[Dashboard] openProgramFilter: no refId');
      this.programFilterLoading.set(false);
      this.selectedProgramIds.set([]);
      this.cdr.markForCheck();
      return;
    }
    this.programFilterLoading.set(true);
    const opts = universityId ? { universityIds: [universityId], textsearch: '' } : { textsearch: '' };
    this.prospectProfileService
      .getReferenceFilter(refId, 'PROGRAM_NAME', 1, 10, opts)
      .subscribe({
        next: (res) => {
          this.programFilterLoading.set(false);
          if (res?.success && res.info?.docs) {
            const items: FilterOption[] = res.info.docs.map((d) => ({
              id: d._id,
              label: d.name,
            }));
            this.programFilterItems.set(items);
            this.programFilterHasMore.set(
              res.info.hasNextPage ?? (res.info.page ?? 1) < (res.info.totalPages ?? 0)
            );
            const current = this.selectedProgram();
            const ids = current
              ? items.filter((i) => i.label === current).map((i) => i.id)
              : [];
            this.selectedProgramIds.set(ids);
          } else {
            this.programFilterHasMore.set(false);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.programFilterLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onProgramFilterLoadMore(): void {
    if (!this.programFilterHasMore() || this.programFilterLoadingMore()) return;
    const refId = getRefIdFromStorage();
    const universityId = getUniversityIdFromStorage();
    if (!refId) return;
    const nextPage = this.programFilterPage() + 1;
    const opts = universityId ? { universityIds: [universityId], textsearch: '' } : { textsearch: '' };
    this.programFilterLoadingMore.set(true);
    this.prospectProfileService
      .getReferenceFilter(refId, 'PROGRAM_NAME', nextPage, 10, opts)
      .subscribe({
        next: (res) => {
          this.programFilterLoadingMore.set(false);
          if (res?.success && res.info?.docs) {
            const newItems: FilterOption[] = res.info.docs.map((d) => ({
              id: d._id,
              label: d.name,
            }));
            this.programFilterItems.update((prev) => [...prev, ...newItems]);
            this.programFilterPage.set(res.info.page ?? nextPage);
            this.programFilterHasMore.set(
              res.info.hasNextPage ?? (res.info.page ?? nextPage) < (res.info.totalPages ?? nextPage)
            );
          } else {
            this.programFilterHasMore.set(false);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.programFilterLoadingMore.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onCountryFilterClose(): void {
    this.showCountryFilterModal.set(false);
  }

  onCountryFilterApply(ids: string[]): void {
    const items = this.countryFilterItems();
    const name = ids.length > 0 ? items.find((i) => i.id === ids[0])?.label : undefined;
    this.selectedCountry.set(name);
    this.selectedCountryIds.set(ids);
    this.activeFilter.set('By Country');
    this.showCountryFilterModal.set(false);
    this.fetchAmbassadorList(1, false);
    this.cdr.markForCheck();
  }

  onProgramFilterClose(): void {
    this.showProgramFilterModal.set(false);
  }

  onProgramFilterApply(ids: string[]): void {
    const items = this.programFilterItems();
    const name = ids.length > 0 ? items.find((i) => i.id === ids[0])?.label : undefined;
    this.selectedProgram.set(name);
    this.selectedProgramIds.set(ids);
    this.activeFilter.set('By Program');
    this.showProgramFilterModal.set(false);
    this.fetchAmbassadorList(1, false);
    this.cdr.markForCheck();
  }

  onSearch(): void {
    this.requireAuthAction(() => this.fetchAmbassadorList(1, false));
  }

  showMore(e: Event): void {
    e.preventDefault();
    this.requireAuthAction(() => {
      if (this.listHasMore()) {
        this.fetchAmbassadorList(this.listPage() + 1, true);
      } else {
        this.displayedCount.update((c) =>
          Math.min(c + 4, this.ambassadors().length)
        );
      }
    });
  }

  onCardClick(): void {
    this.requireAuthAction();
  }

  onChatClick(): void {
    this.requireAuthAction();
  }

  logout(e?: Event): void {
    e?.preventDefault();
    console.log('[Dashboard] logout: clearing token, refId and ambassador list');
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refId');
    this.userProfilePicture.set(null);
    this.userFirstName.set('');
    this.userLastName.set('');
    this.ambassadorListFromApi.set([]);
    this.auth.logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : '',
      },
    });
  }

  onRefresh(): void {
    this.requireAuthAction(() => {
      this.activeFilter.set('All Ambassadors');
      this.searchQuery = '';
      this.selectedCountry.set(undefined);
      this.selectedProgram.set(undefined);
      this.selectedCountryIds.set([]);
      this.selectedProgramIds.set([]);
      this.fetchAmbassadorList(1, false);
      this.cdr.markForCheck();
    });
  }
}
