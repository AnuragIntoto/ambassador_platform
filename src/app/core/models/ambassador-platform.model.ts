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

/** Ambassador type from API */
export interface AmbassadorTypeRef {
  _id: string;
  name: string;
  displayName: string;
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
  ambassadorType?: AmbassadorTypeRef;
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

/** List API - request query params */
export interface AmbassadorListParams {
  pageIndex: number;
  pageSize: number;
  search?: string;
  ambassadorType?: string;
  country?: string;
  program?: string;
  availableNow?: boolean;
}

/** List API - doc structure */
export interface AmbassadorListDoc {
  _id: string;
  slug: string;
  basicInfo?: {
    firstName?: { value?: string };
    lastName?: { value?: string };
    country?: { value?: string };
    languages?: { value?: string[] };
  };
  picture?: { value?: string };
  ambassadorInfo?: {
    about?: string;
    favouritePrograms?: string[];
    interest?: string[];
    academicYear?: AcademicYear;
    ambassadorType?: AmbassadorTypeRef;
  };
}

/** List API - response */
export interface AmbassadorListResponse {
  success: boolean;
  statusCode: number;
  info: {
    docs: AmbassadorListDoc[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}
