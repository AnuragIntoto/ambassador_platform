import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  UserLoginResponse,
  UniversitiesResponse,
  PortfolioResponse,
  MyProfileResponse,
  CountriesResponse,
  UpdateProfileData,
  PortfolioRef,
} from '../../models/login-flow.model';

const REFID_KEY = 'refId';
const API = environment.apiUri;

@Injectable({
  providedIn: 'root',
})
export class LoginFlowService {
  private readonly http = inject(HttpClient);

  /** GET /api/user/login - available roles for the user */
  getRoles(): Observable<UserLoginResponse> {
    return this.http.get<UserLoginResponse>(`${API}/api/user/login`);
  }

  /** POST /api/invitation/universities - universities for selected role */
  getUniversities(roleName: string, textSearch = ''): Observable<UniversitiesResponse> {
    const headers = new HttpHeaders({ rolename: roleName });
    return this.http.post<UniversitiesResponse>(
      `${API}/api/invitation/universities`,
      { textsearch: textSearch },
      { headers },
    );
  }

  /** POST /api/portfolio - get refId for role + university (token attached by interceptor) */
  getRefId(rolename: string, universityId: string): Observable<PortfolioResponse> {
    return this.http
      .post<PortfolioResponse>(`${API}/api/portfolio`, { rolename, universityId })
      .pipe(
        tap((res) => {
          if (res?.success && res?.info) {
            this.setStoredRefId(res.info);
          }
        }),
      );
  }

  /** POST /api/user/myProfile with type: setupProfile */
  getMyProfileSetup(refId: string): Observable<MyProfileResponse> {
    const headers = new HttpHeaders({ refId });
    return this.http.post<MyProfileResponse>(
      `${API}/api/user/myProfile`,
      { type: 'setupProfile' },
      { headers },
    );
  }

  /** PUT /api/user - update profile during setup */
  updateProfile(
    rolename: string,
    universityId: string,
    refId: string,
    data: UpdateProfileData['data'],
  ): Observable<{ success: boolean; statusCode: number; message?: string; info?: unknown }> {
    const headers = new HttpHeaders({
      rolename,
      universityid: universityId,
      refid: refId,
    });
    return this.http.put<{ success: boolean; statusCode: number; message?: string; info?: unknown }>(
      `${API}/api/user`,
      { type: 'setupProfile', data } as UpdateProfileData,
      { headers },
    );
  }

  /** POST /api/countries - paginated countries with search */
  getCountries(
    roleName: string,
    universityId: string,
    searchName = '',
    pageIndex = 1,
    pageSize = 20,
  ): Observable<CountriesResponse> {
    const headers = new HttpHeaders({
      rolename: roleName,
      universityid: universityId,
    });
    const params = { pageIndex: String(pageIndex), pageSize: String(pageSize) };
    return this.http.post<CountriesResponse>(
      `${API}/api/countries?pageIndex=${pageIndex}&pageSize=${pageSize}`,
      { name: searchName },
      { headers },
    );
  }

  setStoredRefId(ref: PortfolioRef): void {
    localStorage.setItem(REFID_KEY, JSON.stringify(ref));
  }

  getStoredRefId(): PortfolioRef | null {
    try {
      const raw = localStorage.getItem(REFID_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PortfolioRef;
      return parsed?._id ? parsed : null;
    } catch {
      return null;
    }
  }

  clearStoredRefId(): void {
    localStorage.removeItem(REFID_KEY);
  }
}
