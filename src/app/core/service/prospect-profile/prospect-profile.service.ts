import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../../../../environments/environment';
import type {
  ProspectProfileLoginResponse,
  ProspectProfileLoginInfo,
} from '../../models/prospect-profile.model';

const PROSPECT_API =
  (environment as { prospectProfileApiUri?: string }).prospectProfileApiUri ??
  environment.apiUri;

const API = environment.apiUri;

/** Request body for PUT /api/user (type: setupProfile). */
export interface SetupProfilePayload {
  type: 'setupProfile';
  data: {
    firstName: { value: string };
    lastName: { value: string };
    email: { value: string };
    phoneNumber: {
      countryCode: string;
      phoneNumber: string;
      isMobile: boolean;
      isVerified: boolean;
    };
    country: { value: string };
  };
}

/** Response from POST /api/reference/filter (dataType: COUNTRY_NAME). */
export interface CountryReferenceDoc {
  _id: string;
  name: string;
}

export interface CountryReferenceResponse {
  success: boolean;
  statusCode: number;
  info: {
    docs: CountryReferenceDoc[];
    totalDocs?: number;
    totalPages?: number;
    page?: number;
  };
}

/** Doc from POST /api/reference/filter (generic dataType: COUNTRY_NAME, PROGRAM_NAME, etc.). */
export interface ReferenceFilterDoc {
  _id: string;
  name: string;
  dialCode?: string;
  isoCode?: string;
}

export interface ReferenceFilterResponse {
  success: boolean;
  statusCode: number;
  info: {
    docs: ReferenceFilterDoc[];
    totalDocs?: number;
    totalPages?: number;
    page?: number;
    hasNextPage?: boolean;
    nextPage?: number | null;
  };
}

/** Doc from POST /api/countries (for phone country code + flag). */
export interface CountryDoc {
  _id: string;
  name: string;
  dialCode: string;
  isoCode: string;
}

export interface CountriesResponse {
  success: boolean;
  statusCode: number;
  info: {
    docs: CountryDoc[];
    totalDocs?: number;
    totalPages?: number;
  };
}

/** Option for mcq/checkbox from OnboardingConfig. */
export interface OnboardingOption {
  label: string;
  value: string;
}

/** Single question from GET .../prospect-profile/OnboardingConfig. */
export interface OnboardingQuestion {
  _id: string;
  type: 'text' | 'textarea' | 'mcq' | 'checkbox' | 'boolean' | 'number' | 'date';
  question: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  order: number;
  options?: OnboardingOption[];
  validation?: { minLength?: number; maxLength?: number; min?: number; max?: number };
}

/** Response from GET .../prospect-profile/OnboardingConfig. */
export interface OnboardingConfigResponse {
  success: boolean;
  statusCode: number;
  info: {
    _id: string;
    universityId: string;
    title: string;
    description?: string;
    isEnabled: boolean;
    isMandatory: boolean;
    allowSkip: boolean;
    version: number;
    questions: OnboardingQuestion[];
  };
}

/** Single answer for POST .../prospect-profile/OnboardingResponse. */
export interface OnboardingAnswer {
  questionId: string;
  question: string;
  type: string;
  answer: string | number | boolean | string[];
}

/** Body for POST .../prospect-profile/OnboardingResponse. */
export interface OnboardingResponsePayload {
  configVersion: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  answers: OnboardingAnswer[];
}

/** Response from POST .../prospect-profile/OnboardingResponse. */
export interface OnboardingResponseApiResponse {
  success: boolean;
  statusCode: number;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProspectProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  /** Ensures we only call prospect-profile/login once per session (avoids multiple 404s on nav). */
  private prospectLoginChecked = false;

  /**
   * GET .../ambassador-platform/:universitySlug/prospect-profile/login
   * Call immediately after Auth0 login to check if user has firstName/lastName.
   * Passes Bearer token so the backend can authenticate the user.
   */
  getProspectProfileLogin(
    universitySlug: string
  ): Observable<ProspectProfileLoginResponse> {
    if (this.prospectLoginChecked) {
      return EMPTY;
    }
    this.prospectLoginChecked = true;
    const url = `${PROSPECT_API}/ambassador-platform/${universitySlug}/prospect-profile/login`;
    return this.auth.getAccessTokenSilently().pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
        });
        return this.http.get<ProspectProfileLoginResponse>(url, { headers });
      }),
      tap(() => {
        // Request completed; keep prospectLoginChecked true so we don't call again.
      })
    );
  }

  /**
   * POST /api/user/profile – upload profile picture.
   * Body: FormData with file. Headers: Authorization Bearer, refId.
   */
  uploadProfilePicture(
    refId: string,
    file: File
  ): Observable<{ success?: boolean; statusCode?: number; info?: { picture?: string }; [key: string]: unknown }> {
    const url = `${API}/api/user/profile`;
    const formData = new FormData();
    formData.append('file', file);
    return this.auth.getAccessTokenSilently().pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          refId,
        });
        return this.http.post<{ success?: boolean; statusCode?: number; info?: { picture?: string }; [key: string]: unknown }>(
          url,
          formData,
          { headers }
        );
      })
    );
  }

  /**
   * PUT /api/user – update basic profile (setupProfile).
   * Headers: Authorization (from interceptor), refid, Content-Type.
   */
  putSetupProfile(
    refId: string,
    payload: SetupProfilePayload
  ): Observable<{ success?: boolean; statusCode?: number; [key: string]: unknown }> {
    const url = `${API}/api/user`;
    const headers = new HttpHeaders({
      refid: refId,
      'Content-Type': 'application/json',
    });
    return this.http.put<{ success?: boolean; statusCode?: number; [key: string]: unknown }>(
      url,
      payload,
      { headers }
    );
  }

  /**
   * POST /api/reference/filter – country names for country dropdown.
   * Body: { dataType: "COUNTRY_NAME" }. Headers: refId.
   */
  getCountryReference(
    refId: string,
    pageIndex = 1,
    pageSize = 10
  ): Observable<CountryReferenceResponse> {
    const url = `${API}/api/reference/filter?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    const headers = new HttpHeaders({
      refId,
      'Content-Type': 'application/json',
    });
    return this.http.post<CountryReferenceResponse>(url, { dataType: 'COUNTRY_NAME' }, { headers });
  }

  /**
   * POST /api/reference/filter – generic filter options (Bearer + refId).
   * dataType: "COUNTRY_NAME" | "PROGRAM_NAME" | "ROLE_NAME" | etc.
   * For PROGRAM_NAME, pass universityIds from login API response.
   */
  getReferenceFilter(
    refId: string,
    dataType: string,
    pageIndex = 1,
    pageSize = 10,
    options?: { universityIds?: string[]; textsearch?: string }
  ): Observable<ReferenceFilterResponse> {
    const url = `${API}/api/reference/filter?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    const body: { dataType: string; universityIds?: string[]; textsearch?: string } = {
      dataType,
      ...(options?.universityIds?.length ? { universityIds: options.universityIds } : undefined),
      ...(options?.textsearch !== undefined ? { textsearch: options.textsearch } : undefined),
    };
    return this.auth.getAccessTokenSilently().pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          refId,
          'Content-Type': 'application/json',
        });
        return this.http.post<ReferenceFilterResponse>(url, body, { headers });
      })
    );
  }

  /**
   * POST /api/countries – list for phone country code and flag.
   * Body: { name: "" }. Headers: refId.
   */
  getCountriesForPhone(
    refId: string,
    pageIndex = 1,
    pageSize = 10,
    name = ''
  ): Observable<CountriesResponse> {
    const url = `${API}/api/countries?pageIndex=${pageIndex}&pageSize=${pageSize}`;
    const headers = new HttpHeaders({
      refId,
      'Content-Type': 'application/json',
    });
    return this.http.post<CountriesResponse>(url, { name }, { headers });
  }

  /**
   * GET .../ambassador-platform/:universitySlug/prospect-profile/OnboardingConfig
   * Headers: Authorization Bearer, refId.
   */
  getOnboardingConfig(
    universitySlug: string,
    refId: string
  ): Observable<OnboardingConfigResponse> {
    const url = `${PROSPECT_API}/ambassador-platform/${universitySlug}/prospect-profile/OnboardingConfig`;
    return this.auth.getAccessTokenSilently().pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          refId,
        });
        return this.http.get<OnboardingConfigResponse>(url, { headers });
      })
    );
  }

  /**
   * POST .../ambassador-platform/:universitySlug/prospect-profile/OnboardingResponse
   * Headers: Authorization Bearer, refId, Content-Type application/json.
   */
  postOnboardingResponse(
    universitySlug: string,
    refId: string,
    payload: OnboardingResponsePayload
  ): Observable<OnboardingResponseApiResponse> {
    const url = `${PROSPECT_API}/ambassador-platform/${universitySlug}/prospect-profile/OnboardingResponse`;
    return this.auth.getAccessTokenSilently().pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          refId,
          'Content-Type': 'application/json',
        });
        return this.http.post<OnboardingResponseApiResponse>(url, payload, { headers });
      })
    );
  }
}
