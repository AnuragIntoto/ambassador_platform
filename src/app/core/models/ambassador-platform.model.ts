export interface AmbassadorPlatformApiResponse {
  success: boolean;
  statusCode: number;
  info: AmbassadorPlatformInfo;
}

export interface AmbassadorPlatformInfo {
  university: University;
  header: Header;
  filters: string[];
  ambassadors: AmbassadorsSection;
  faqs: FaqsSection;
}

export interface University {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  picture: string;
  about: string;
  themeColor: string;
}

export interface Header {
  title: string;
  message: string;
}

export interface AmbassadorsSection {
  title: string;
  list: AmbassadorApi[];
}

export interface AmbassadorApi {
  _id: string;
  name: string;
  picture: string;
  about: string;
  slug: string;
  academicYear: AcademicYear;
  interests: string[];
  favouritePrograms: string[];
  clubsAndSocieties: string[];
  country: string;
  languages: string[];
  /** e.g. "STUDENT", "ALUMNI" from home/list API */
  ambassadorType?: string;
}

export interface AcademicYear {
  university: string;
  campus: string;
  startYear: number;
  endYear: number;
}

export interface FaqsSection {
  title: string;
  list: FaqApi[];
}

export interface FaqApi {
  _id: string;
  question: string;
  answer: string;
  order: number;
  viewCount: number;
}

/** Query params / body for GET .../home/list */
export interface HomeListParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  ambassadorType?: 'STUDENT' | 'ALUMNI' | 'STAFF';
  country?: string;
  program?: string;
  availableNow?: boolean;
}

/** Single doc from home/list API response (info.docs[]) */
export interface HomeListDoc {
  _id: string;
  slug?: string;
  basicInfo?: {
    firstName?: { value?: string };
    lastName?: { value?: string };
    country?: { value?: string };
    languages?: { value?: string[] };
  };
  picture?: { value?: string };
  ambassadorInfo?: {
    about?: string;
    academicYear?: AcademicYear;
    prevQualifications?: unknown;
    favouritePrograms?: string[];
    clubsAndSocieties?: string[];
    interest?: string[];
    ambassadorType?: { _id: string; name: string; displayName?: string };
  };
}

export interface HomeListResponse {
  success: boolean;
  statusCode: number;
  info: {
    docs: HomeListDoc[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}

/** Map home/list doc to AmbassadorApi for reuse with existing card UI. */
export function homeListDocToAmbassadorApi(doc: HomeListDoc): AmbassadorApi {
  const first = doc.basicInfo?.firstName?.value ?? '';
  const last = doc.basicInfo?.lastName?.value ?? '';
  const name = [first, last].filter(Boolean).join(' ');
  const typeName = doc.ambassadorInfo?.ambassadorType?.displayName ?? doc.ambassadorInfo?.ambassadorType?.name;
  return {
    _id: doc._id,
    name,
    picture: doc.picture?.value ?? '',
    about: doc.ambassadorInfo?.about ?? '',
    slug: doc.slug ?? '',
    academicYear: doc.ambassadorInfo?.academicYear ?? { university: '', campus: '', startYear: 0, endYear: 0 },
    interests: doc.ambassadorInfo?.interest ?? [],
    favouritePrograms: doc.ambassadorInfo?.favouritePrograms ?? [],
    clubsAndSocieties: doc.ambassadorInfo?.clubsAndSocieties ?? [],
    country: doc.basicInfo?.country?.value ?? '',
    languages: doc.basicInfo?.languages?.value ?? [],
    ambassadorType: typeName ?? undefined,
  };
}
