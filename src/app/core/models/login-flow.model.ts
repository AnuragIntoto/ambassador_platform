/** GET /api/user/login */
export interface RoleItem {
  id: string;
  name: string;
  displayName: string;
}

export interface UserLoginResponse {
  success: boolean;
  statusCode: number;
  info: { roles: RoleItem[] };
}

/** POST /api/invitation/universities */
export interface UniversityDoc {
  _id: string;
  name: string;
  logo?: string;
  address?: { address?: string; city?: string; country?: string; postalCode?: string };
  slug?: string;
}

export interface UniversitiesResponse {
  success: boolean;
  statusCode: number;
  info: { docs: UniversityDoc[] };
}

/** POST /api/portfolio */
export interface PortfolioRef {
  _id: string;
  rolename: string;
  universityId: string;
}

export interface PortfolioResponse {
  success: boolean;
  statusCode: number;
  info: PortfolioRef;
}

/** POST /api/user/myProfile (setupProfile / fullProfile) */
export interface ProfileFieldValue<T = unknown> {
  value: T;
  label?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  isEditable?: boolean;
  visible?: boolean;
  prompt?: string;
  regexp?: string;
  fields?: Record<string, unknown>;
}

export interface MyProfileResponse {
  success: boolean;
  statusCode: number;
  info: {
    _id?: string;
    picture?: ProfileFieldValue<string>;
    basicDetails?: {
      fields?: Record<string, ProfileFieldValue>;
    };
    isFormSubmitted?: boolean;
  };
}

/** PUT /api/user - request body for setupProfile */
export interface UpdateProfileData {
  type: 'setupProfile';
  data: Record<string, { value?: unknown } | Record<string, unknown>>;
}

/** POST /api/countries */
export interface CountryDoc {
  _id: string;
  name: string;
  dialCode?: string;
  isoCode?: string;
}

export interface CountriesResponse {
  success: boolean;
  statusCode: number;
  info: {
    docs: CountryDoc[];
    totalDocs?: number;
    totalPages?: number;
    page?: number;
  };
}
