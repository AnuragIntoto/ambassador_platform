import {
  Component,
  model,
  inject,
  OnInit,
  computed,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { take } from 'rxjs';
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
import { Loader } from '../../shared/components/loader/loader';
import { FilterModal } from '../../shared/components/filter-modal/filter-modal';
import { environment } from '../../../environments/environment';
import type {
  AmbassadorApi,
  AmbassadorPlatformInfo,
  AmbassadorListDoc,
} from '../../core/models/ambassador-platform.model';

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

function mapAmbassador(api: AmbassadorApi): AmbassadorDisplay {
  const fallbackProgram = `${api.academicYear?.university ?? ''} - ${api.academicYear?.campus ?? ''}`.trim();
  const program =
    api.favouritePrograms?.[0] ?? (fallbackProgram || '—');
  const interests = (api.interests ?? []).map((label) => ({
    icon: interestToIcon(label),
    label,
  }));
  const typeRef = api.ambassadorType;
  const badge = typeRef?.displayName ?? typeRef?.name ?? 'Student';
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
    badge,
  };
}

function mapListDocToDisplay(doc: AmbassadorListDoc): AmbassadorDisplay {
  const f = doc.basicInfo;
  const a = doc.ambassadorInfo;
  const firstName = f?.firstName?.value ?? '';
  const lastName = f?.lastName?.value ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || '—';
  const country = f?.country?.value ?? '';
  const fallbackProgram = a?.academicYear
    ? `${a.academicYear.university ?? ''} - ${a.academicYear.campus ?? ''}`.trim()
    : '';
  const program = a?.favouritePrograms?.[0] ?? (fallbackProgram || '—');
  const interests = (a?.interest ?? []).map((label) => ({
    icon: interestToIcon(label),
    label,
  }));
  const typeRef = a?.ambassadorType;
  const badge = typeRef?.displayName ?? typeRef?.name ?? 'Student';
  return {
    id: doc._id,
    name,
    country,
    description: a?.about ?? '',
    program,
    interests,
    profileImage: doc.picture?.value ?? '',
    status: 'offline',
    statusText: 'Offline',
    badge,
  };
}

function getFilterLabels(filters: string[]): string[] {
  return (filters ?? []).filter((f) => typeof f === 'string' && !f.startsWith('http'));
}

const AMBASSADOR_TYPE_OPTIONS = [
  { id: 'STUDENT', label: 'Students' },
  { id: 'ALUMNI', label: 'Alumni' },
  { id: 'STAFF', label: 'Staff' },
] as const;

const PROGRAM_OPTIONS = [
  'Business & Management',
  'Computer Science & IT',
  'Engineering',
  'Arts & Humanities',
  'Social Sciences',
  'Hospitality & Tourism',
  'Medicine',
  'Finance',
  'Marketing',
  'Cultural Studies',
  'Psychology',
  'Philosophy',
  'AI & Robotics',
  'Cybersecurity',
  'International Business',
  'UX Design',
  'Software Engineering',
  'Game Development',
  'Health Sciences',
  'Biomedical Sciences',
  'Electrical Engineering',
  'Environmental Activism',
].map((label, i) => ({ id: label, label }));

const COUNTRY_OPTIONS = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Bahrain', 'Bangladesh',
  'Bulgaria', 'Cambodia', 'Canada', 'China', 'Egypt', 'Ethiopia', 'France',
  'Germany', 'India', 'Indonesia', 'Iran', 'Iraq', 'Italy', 'Japan', 'Jordan',
  'Kenya', 'Malaysia', 'Mexico', 'Morocco', 'Nigeria', 'Pakistan', 'Philippines',
  'Poland', 'Romania', 'Russia', 'Saudi Arabia', 'South Africa', 'South Korea',
  'Spain', 'Thailand', 'Turkey', 'Uganda', 'Ukraine', 'United Kingdom', 'USA',
  'Vietnam', 'Yemen', 'Zimbabwe',
].map((label) => ({ id: label, label }));

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
    FilterModal,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  readonly getInitials = getInitials;

  private readonly route = inject(ActivatedRoute);
  private readonly platformService = inject(AmbassadorPlatformService);
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

  programModalVisible = signal(false);
  countryModalVisible = signal(false);

  selectedPrograms = signal<string[]>([]);
  selectedCountries = signal<string[]>([]);

  listDocs = signal<AmbassadorListDoc[]>([]);
  listHasNext = signal(false);
  listLoading = signal(false);

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

  /** Pre-login: Home API ambassadors. Post-login: List API docs. */
  ambassadors = computed(() => {
    if (this.isAuthenticated()) {
      return this.listDocs().map(mapListDocToDisplay);
    }
    const homeList = this.platformData()?.ambassadors?.list ?? [];
    return homeList.map(mapAmbassador);
  });

  visibleAmbassadors = computed(() =>
    this.ambassadors().slice(0, this.displayedCount())
  );

  hasMoreAmbassadors = computed(() => {
    const total = this.ambassadors().length;
    const displayed = this.displayedCount();
    if (this.isAuthenticated()) {
      return this.listHasNext() || total > displayed;
    }
    return total > displayed;
  });

  header = computed(() => this.platformData()?.header ?? null);
  ambassadorsSection = computed(() => this.platformData()?.ambassadors ?? null);
  faqsSection = computed(() => this.platformData()?.faqs ?? null);
  university = computed(() => this.platformData()?.university ?? null);

  readonly programOptions = PROGRAM_OPTIONS;
  readonly countryOptions = COUNTRY_OPTIONS;

  ngOnInit(): void {
    const slug =
      this.route.snapshot.paramMap.get('universitySlug') ??
      environment.ambassadorPlatform?.defaultUniversitySlug ??
      'pune-university';

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
      if (v?.filters?.length) {
        const labels = getFilterLabels(v.filters);
        if (labels[0] && this.activeFilter() === 'All Ambassadors') {
          this.activeFilter.set(labels[0]);
        }
      }
      this.cdr.markForCheck();
    });

    this.platformService.ambassadorList$.subscribe((docs) => {
      this.listDocs.set(docs);
      this.cdr.markForCheck();
    });
    this.platformService.listHasNext.subscribe((v) => {
      this.listHasNext.set(v);
      this.cdr.markForCheck();
    });
    this.platformService.listLoading.subscribe((v) => {
      this.listLoading.set(v);
      this.cdr.markForCheck();
    });

    this.auth.isAuthenticated$.subscribe((authenticated) => {
      this.isAuthenticated.set(authenticated);
      if (authenticated) {
        this.platformService.fetchAmbassadorList(slug);
      }
      this.cdr.markForCheck();
    });

    this.platformService.fetchPlatformData(slug);
  }

  onLoginSignup(e: Event): void {
    e.preventDefault();
    this.auth.loginWithRedirect();
  }

  /** Pre-login: clicking anywhere on the dashboard redirects to Auth0 login */
  onPageClickToLogin(): void {
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

  setActiveFilter(filter: string): void {
    this.requireAuthAction(() => {
      this.activeFilter.set(filter);
      if (filter === 'By Program') {
        this.programModalVisible.set(true);
        return;
      }
      if (filter === 'By Country') {
        this.countryModalVisible.set(true);
        return;
      }
      if (filter === 'All Ambassadors') {
        this.platformService.setListParams({
          pageIndex: 1,
          search: undefined,
          ambassadorType: undefined,
          country: undefined,
          program: undefined,
          availableNow: undefined,
        });
        this.platformService.triggerListFetch();
        this.displayedCount.set(4);
      } else if (filter === 'Available Now') {
        this.platformService.setListParams({ pageIndex: 1, availableNow: true });
        this.platformService.triggerListFetch();
        this.displayedCount.set(4);
      } else if (filter === 'Students' || filter === 'Alumni' || filter === 'Staff') {
        const map: Record<string, string> = { Students: 'STUDENT', Alumni: 'ALUMNI', Staff: 'STAFF' };
        this.platformService.setListParams({ pageIndex: 1, ambassadorType: map[filter] });
        this.platformService.triggerListFetch();
        this.displayedCount.set(4);
      }
    });
  }

  onSearch(): void {
    this.requireAuthAction(() => {
      this.platformService.setListParams({
        pageIndex: 1,
        search: this.searchQuery.trim() || undefined,
      });
      this.platformService.triggerListFetch();
      this.displayedCount.set(4);
    });
  }

  showMore(e: Event): void {
    e.preventDefault();
    this.requireAuthAction(() => {
      const total = this.ambassadors().length;
      const current = this.displayedCount();
      if (current < total) {
        this.displayedCount.update((c) => Math.min(c + 4, total));
      } else if (this.listHasNext()) {
        this.platformService.loadNextPage();
        this.displayedCount.update((c) => c + 4);
      }
    });
  }

  onProgramModalApply(ids: string[]): void {
    this.selectedPrograms.set(ids);
    this.programModalVisible.set(false);
    this.activeFilter.set('By Program');
    this.platformService.setListParams({
      pageIndex: 1,
      program: ids[0],
    });
    this.platformService.triggerListFetch();
    this.displayedCount.set(4);
  }

  onCountryModalApply(ids: string[]): void {
    this.selectedCountries.set(ids);
    this.countryModalVisible.set(false);
    this.activeFilter.set('By Country');
    this.platformService.setListParams({
      pageIndex: 1,
      country: ids[0],
    });
    this.platformService.triggerListFetch();
    this.displayedCount.set(4);
  }

  closeProgramModal(): void {
    this.programModalVisible.set(false);
  }

  closeCountryModal(): void {
    this.countryModalVisible.set(false);
  }

  onCardClick(): void {
    this.requireAuthAction();
  }

  onChatClick(): void {
    this.requireAuthAction();
  }

  logout(e: Event): void {
    e.preventDefault();
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refId');
    this.auth.logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : '',
      },
    });
  }

  onRefresh(): void {
    this.requireAuthAction(() => {
      this.activeFilter.set('All Ambassadors');
      this.selectedPrograms.set([]);
      this.selectedCountries.set([]);
      this.searchQuery = '';
      this.platformService.setListParams({
        pageIndex: 1,
        search: undefined,
        ambassadorType: undefined,
        country: undefined,
        program: undefined,
        availableNow: undefined,
      });
      this.platformService.triggerListFetch();
      this.displayedCount.set(4);
    });
  }
}
