import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpBackend, HttpHeaders } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  tap,
  catchError,
  of,
  switchMap,
  debounceTime,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AmbassadorPlatformApiResponse,
  AmbassadorPlatformInfo,
  AmbassadorListParams,
  AmbassadorListResponse,
  AmbassadorListDoc,
} from '../../models/ambassador-platform.model';

const REFID_KEY = 'refId';

function getRefIdFromStorage(): string {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(REFID_KEY) : null;
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { _id?: string };
    return parsed?._id ?? '';
  } catch {
    return '';
  }
}

@Injectable({
  providedIn: 'root',
})
export class AmbassadorPlatformService {
  private readonly http = inject(HttpClient);
  private readonly httpBackend = inject(HttpBackend);
  private readonly httpNoAuth = new HttpClient(this.httpBackend);
  private readonly apiBase = environment.apiUri;
  /** refId from login flow (localStorage); falls back to environment for dev if set */
  private get refId(): string {
    return getRefIdFromStorage() || (environment.ambassadorPlatform?.refId ?? '');
  }

  private readonly data$ = new BehaviorSubject<AmbassadorPlatformInfo | null>(null);
  private readonly loading$ = new BehaviorSubject<boolean>(false);
  private readonly error$ = new BehaviorSubject<string | null>(null);

  private fetchTriggered = false;

  /** Platform data – emits cached value or null until loaded */
  get platformData$(): Observable<AmbassadorPlatformInfo | null> {
    return this.data$.asObservable();
  }

  /** Loading state */
  get loading(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  /** Error message if fetch failed */
  get error(): Observable<string | null> {
    return this.error$.asObservable();
  }

  /**
   * Fetches platform data once. Subsequent calls are no-op; use platformData$ for data.
   * @param universitySlug e.g. 'pune-university'
   */
  fetchPlatformData(universitySlug: string): void {
    if (this.fetchTriggered) return;

    this.fetchTriggered = true;
    this.loading$.next(true);
    this.error$.next(null);

    const url = `${this.apiBase}/ambassador-platform/${universitySlug}/home`;

    this.httpNoAuth
      .get<AmbassadorPlatformApiResponse>(url)
      .pipe(
        tap((res) => {
          if (res.success && res.info) {
            this.data$.next(res.info);
          } else {
            this.error$.next('Invalid response from server');
          }
          this.loading$.next(false);
        }),
        catchError((err) => {
          this.loading$.next(false);
          this.error$.next(err?.message ?? 'Failed to load ambassador platform');
          this.fetchTriggered = false;
          return of(null);
        })
      )
      .subscribe();
  }

  /** Reset cache (e.g. when switching university) */
  reset(): void {
    this.fetchTriggered = false;
    this.data$.next(null);
    this.error$.next(null);
    this.listParams$.next(this.getDefaultListParams());
    this.listDocs$.next([]);
    this.listTotal$.next(0);
    this.listHasNext$.next(false);
  }

  // --- List API (filtered, paginated) ---
  private readonly listParams$ = new BehaviorSubject<AmbassadorListParams>({
    pageIndex: 1,
    pageSize: 10,
  });
  private readonly listDocs$ = new BehaviorSubject<AmbassadorListDoc[]>([]);
  private readonly listTotal$ = new BehaviorSubject<number>(0);
  private readonly listHasNext$ = new BehaviorSubject<boolean>(false);
  private readonly listLoading$ = new BehaviorSubject<boolean>(false);
  private universitySlugForList = '';

  private getDefaultListParams(): AmbassadorListParams {
    return { pageIndex: 1, pageSize: 10 };
  }

  /** Ambassadors from list API */
  get ambassadorList$(): Observable<AmbassadorListDoc[]> {
    return this.listDocs$.asObservable();
  }

  get listTotal(): Observable<number> {
    return this.listTotal$.asObservable();
  }

  get listHasNext(): Observable<boolean> {
    return this.listHasNext$.asObservable();
  }

  get listLoading(): Observable<boolean> {
    return this.listLoading$.asObservable();
  }

  /** Update list params (triggers fetch). Use for filters, search, reset. */
  setListParams(params: Partial<AmbassadorListParams>): void {
    const pageIndex = params.pageIndex ?? 1;
    if (pageIndex === 1) {
      this.listDocs$.next([]);
    }
    this.listParams$.next({
      ...this.listParams$.value,
      ...params,
      pageIndex,
    });
  }

  /** Append next page (See More) */
  loadNextPage(): void {
    const v = this.listParams$.value;
    if (this.listHasNext$.value) {
      this.listParams$.next({
        ...v,
        pageIndex: v.pageIndex + 1,
      });
    }
  }

  /** Fetch ambassador list - called when params change. Uses RxJS to minimize API calls. */
  fetchAmbassadorList(slug: string): void {
    this.universitySlugForList = slug;
    this.listParams$
      .pipe(
        debounceTime(150),
        switchMap((params) => {
          this.listLoading$.next(true);
          const q = new URLSearchParams();
          q.set('pageIndex', String(params.pageIndex));
          q.set('pageSize', String(params.pageSize));
          const url = `${this.apiBase}/api/ambassador-platform/${slug}/home/list?${q}`;
          const headerDict: Record<string, string> = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          };
          if (this.refId) headerDict['refId'] = this.refId;
          const headers = new HttpHeaders(headerDict);
          const body: Record<string, string | boolean> = {};
          if (params.search) body['search'] = params.search;
          if (params.ambassadorType) body['ambassadorType'] = params.ambassadorType;
          if (params.country) body['country'] = params.country;
          if (params.program) body['program'] = params.program;
          if (params.availableNow != null) body['availableNow'] = params.availableNow;

          return this.http.request<AmbassadorListResponse>('GET', url, { headers, body }).pipe(
            tap((res) => {
              this.listLoading$.next(false);
              if (res.success && res.info) {
                const docs = res.info.docs ?? [];
                const append = params.pageIndex > 1;
                this.listDocs$.next(
                  append ? [...this.listDocs$.value, ...docs] : docs
                );
                this.listTotal$.next(res.info.totalDocs ?? 0);
                this.listHasNext$.next(res.info.hasNextPage ?? false);
              }
            }),
            catchError((err) => {
              this.listLoading$.next(false);
              this.error$.next(err?.message ?? 'Failed to load ambassadors');
              return of({
              success: false,
              statusCode: 500,
              info: { docs: [], totalDocs: 0, limit: 0, page: 1, totalPages: 0, hasNextPage: false, hasPrevPage: false, nextPage: null, prevPage: null },
            } as AmbassadorListResponse);
            })
          );
        }),
      )
      .subscribe();
  }

  /** Trigger initial list fetch (call after setListParams or when slug is ready) */
  triggerListFetch(): void {
    if (this.universitySlugForList) {
      this.listParams$.next({ ...this.listParams$.value });
    }
  }
}
