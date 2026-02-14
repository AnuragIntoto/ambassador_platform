/**
 * GET .../ambassador-platform/:universitySlug/prospect-profile/login
 * Response type for prospect profile after Auth0 login.
 */

export interface ProspectProfileOnboarding {
  isMandatory: boolean;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  version: number;
  isEnabled: boolean;
}

export interface ProspectProfileFieldMeta {
  label: string;
  required?: boolean;
  prompt?: string;
  minLength?: number;
  maxLength?: number;
  regexp?: string;
  visible?: boolean;
  isEditable?: boolean;
  value?: string;
  possibleValues?: unknown[];
}

export interface ProspectProfilePhoneFields {
  countryCode?: ProspectProfileFieldMeta;
  phoneNumber?: ProspectProfileFieldMeta;
  isMobile?: ProspectProfileFieldMeta;
}

export interface ProspectProfileBasicDetailsFields {
  firstName?: ProspectProfileFieldMeta;
  lastName?: ProspectProfileFieldMeta;
  email?: ProspectProfileFieldMeta;
  secondaryEmail?: ProspectProfileFieldMeta;
  phoneNumber?: {
    displayName?: string;
    visible?: boolean;
    fields?: ProspectProfilePhoneFields;
  };
  dateOfBirth?: ProspectProfileFieldMeta;
  gender?: ProspectProfileFieldMeta;
  country?: ProspectProfileFieldMeta;
}

export interface ProspectProfileBasicDetails {
  displayName?: string;
  fields?: ProspectProfileBasicDetailsFields;
  visible?: boolean;
}

export interface ProspectProfilePicture {
  label?: string;
  required?: boolean;
  prompt?: string;
  visible?: boolean;
  isEditable?: boolean;
  value?: string;
}

export interface ProspectProfileLoginInfo {
  _id: string;
  refId: string;
  universityId?: string;
  onboarding?: ProspectProfileOnboarding;
  basicDetails?: ProspectProfileBasicDetails;
  picture?: ProspectProfilePicture;
}

export interface ProspectProfileLoginResponse {
  success: boolean;
  statusCode: number;
  info: ProspectProfileLoginInfo;
}

/** Whether the user needs to complete basic info (missing firstName or lastName). */
export function needsBasicInfo(
  info: ProspectProfileLoginInfo | null | undefined
): boolean {
  if (!info?.basicDetails?.fields) return true;
  const first = info.basicDetails.fields.firstName?.value;
  const last = info.basicDetails.fields.lastName?.value;
  return !first?.trim() || !last?.trim();
}

/**
 * Whether to show the onboarding (Step 2) form.
 * True when: basic info is complete (firstName & lastName exist), onboarding is enabled, and not completed.
 * If completed === true or isEnabled === false, do not show onboarding.
 */
export function shouldShowOnboarding(
  info: ProspectProfileLoginInfo | null | undefined
): boolean {
  if (!info) return false;
  if (needsBasicInfo(info)) return false;
  const ob = info.onboarding;
  return ob?.isEnabled === true && ob?.completed === false;
}
