import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../../../../environments/environment';
import type {
  AmbassadorPlatformApiResponse,
  AmbassadorPlatformInfo,
  HomeListParams,
  HomeListResponse,
} from '../../models/ambassador-platform.model';

const REFID_KEY = 'refId';
/** BaseUrl2 for dashboard home: {{BaseUrl2}}/ambassador-platform/:slug/home */
const HOME_API_BASE =
  (environment as { ambassadorPlatformBaseUri?: string }).ambassadorPlatformBaseUri ??
  environment.apiUri;
/** Base for home/list (Bearer + refId): {{BaseUrl}}/ambassador-platform/:slug/home/list */
const LIST_API_BASE =
  (environment as { prospectProfileApiUri?: string }).prospectProfileApiUri ??
  `${environment.apiUri}/api`;

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
  private readonly auth = inject(AuthService);
  private readonly apiBase = HOME_API_BASE;
  private readonly listApiBase = LIST_API_BASE;
  /** refId from prospect-profile/login response (stored in localStorage); dynamic only. */
  private get refId(): string {
    return getRefIdFromStorage();
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

    this.http
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
  }

  /**
   * POST .../ambassador-platform/:slug/home/list with Bearer token and refId header.
   * URL: query params pageIndex, pageSize. Body: optional search, ambassadorType, country, program, availableNow.
   */
  getHomeList(
    universitySlug: string,
    params: HomeListParams = {}
  ): Observable<HomeListResponse | null> {
    const refId = this.refId;
    if (!refId) {
      console.warn('[AmbassadorPlatformService] getHomeList: refId missing, skipping request');
      return of(null);
    }
    const {
      pageIndex = 1,
      pageSize = 10,
      search,
      ambassadorType,
      country,
      program,
      availableNow,
    } = params;
    const query = new URLSearchParams();
    query.set('pageIndex', String(pageIndex));
    query.set('pageSize', String(pageSize));
    const url = `${this.listApiBase}/ambassador-platform/${universitySlug}/home/list?${query.toString()}`;
    const body: Record<string, string | number | boolean | undefined> = {};
    if (search != null && search !== '') body['search'] = search;
    if (ambassadorType) body['ambassadorType'] = ambassadorType;
    if (country) body['country'] = country;
    if (program) body['program'] = program;
    if (availableNow != null) body['availableNow'] = availableNow;
    console.log('[AmbassadorPlatformService] getHomeList: POST', url, { body, refId: refId.slice(0, 8) + '...' });
    return this.auth.getAccessTokenSilently().pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          refId,
          'Content-Type': 'application/json',
        });
        return this.http.post<HomeListResponse>(url, body, { headers });
      }),
      catchError((err) => {
        console.warn('[AmbassadorPlatformService] getHomeList error', err);
        return of(null);
      })
    );
  }
}
