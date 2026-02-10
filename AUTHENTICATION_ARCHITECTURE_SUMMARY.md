# Authentication Architecture & Implementation Summary

## Overview
This document provides a comprehensive summary of the authentication architecture, login flows, and backend API integration for the Intoto web application. This implementation uses **Auth0** as the authentication provider with Angular as the frontend framework.

---

## 1. Architecture Overview

### Technology Stack
- **Frontend Framework**: Angular 20.2.0
- **Authentication Provider**: Auth0 (@auth0/auth0-angular v2.2.3)
- **HTTP Client**: Angular HttpClient with custom interceptors
- **State Management**: RxJS BehaviorSubjects and Signals
- **Storage**: 
  - `sessionStorage` for access tokens
  - `localStorage` for refId (user reference ID)

### Key Components
1. **Auth0 Module**: Configured in `app.config.ts`
2. **Auth Interceptor**: Automatically attaches tokens to API requests
3. **Auth Guard**: Protects routes requiring authentication
4. **Error Interceptor**: Handles 401 errors and redirects to login

---

## 2. Auth0 Configuration

### Environment Configuration
Auth0 is configured in environment files with different settings for dev, staging, and production:

**Development** (`environment.ts`):
```typescript
auth: {
  domain: 'dev-intoto.us.auth0.com',
  clientId: 'GkXHnvsdBdLdO8YHfb6i2jYtyiToudbW',
  authorizationParams: {
    audience: 'intotodev',
    redirect_uri: window.location.origin
  },
  errorPath: '/error',
},
httpInterceptor: {
  allowedList: ['https://dev.intoto.ca/*']
}
```

**Staging** (`environment.staging.ts`):
```typescript
auth: {
  domain: 'stage-intoto.us.auth0.com',
  clientId: 'E2j9EaOMg5PiU5SDSOwMPfCgFEsnp3Lz',
  authorizationParams: {
    audience: 'intotostage',
    redirect_uri: 'https://stage.edu.intoto.ca/'
  },
  errorPath: '/error',
},
httpInterceptor: {
  allowedList: ['https://stage.intoto.ca/*']
}
```

**Production** (`environment.prod.ts`):
```typescript
auth: {
  domain: 'intoto-edu.us.auth0.com',
  clientId: '8cMD41V6kw1hiaOajcAgOIlWsHYNmhso',
  authorizationParams: {
    audience: 'intotoprod',
    redirect_uri: 'https://dev.cdn.intoto.ca/'
  },
  errorPath: '/error',
},
httpInterceptor: {
  allowedList: ['https://apiedu.intoto.ca/*']
}
```

### Auth0 Module Setup
Located in `src/app/app.config.ts`:

```typescript
importProvidersFrom(
  AuthModule.forRoot({
    domain: environment.auth.domain,
    clientId: environment.auth.clientId,
    authorizationParams: environment.auth.authorizationParams,
    errorPath: environment.auth.errorPath,
    httpInterceptor: {
      allowedList: environment.httpInterceptor.allowedList,
    },
  })
)
```

---

## 3. Authentication Flow

### 3.1 Login Flow (Complete Journey)

#### Step 1: Initial Entry Point
- **Route**: `/` (Privacy Policy Component)
- **Component**: `src/app/login-pages/privacy-policy/privacy-policy.ts`
- **Action**: User clicks "Continue" button
- **Method**: `loginWithRedirect()` calls `this.auth.loginWithRedirect()`

#### Step 2: Auth0 Redirect
- User is redirected to Auth0 Universal Login page
- Auth0 handles:
  - Email/password authentication
  - Social login (if configured)
  - Sign-up for new users
  - Password reset (if configured in Auth0)

#### Step 3: Auth0 Callback
- After successful authentication, Auth0 redirects back to the app
- **Redirect URI**: `window.location.origin` (configured in environment)
- Auth0 SDK automatically handles the callback and stores tokens

#### Step 4: Post-Authentication
- **Component**: `PrivacyPolicy` subscribes to `auth.user$` observable
- When user data is received:
  - Shows verification dialog with user email
  - After 2 seconds, navigates to `/intoto-logo`

#### Step 5: Logo Screen
- **Route**: `/intoto-logo`
- **Component**: `src/app/login-pages/intoto-logo/intoto-logo.ts`
- Displays Intoto logo
- After 2 seconds, navigates to `/select-role`

#### Step 6: Role Selection
- **Route**: `/select-role`
- **Component**: `src/app/login-pages/select-role/select-role.ts`
- **API Call**: `GET /api/user/login` to fetch available roles
- User selects a role (only `university_super_admin` and `intoto_admin` are allowed)
- **API Call**: `POST /api/invitation/universities` to fetch universities for selected role
- User selects a university

#### Step 7: Profile Setup (If Required)
- **API Call**: `POST /api/portfolio` to get user profile reference (refId)
  - Stores refId in `localStorage` as JSON
- **API Call**: `POST /api/user/myProfile` with `type: 'setupProfile'` to check if profile is complete
- If profile is incomplete:
  - Shows profile setup dialog
  - User fills: picture, firstName, lastName, email, phoneNumber, country
  - **API Call**: `PUT /api/user` to update profile
- If profile is complete:
  - Navigates directly to dashboard

#### Step 8: Dashboard Access
- **Route**: `/dashboard-layout`
- **Guard**: `authGuard` validates authentication
- User can now access protected routes

---

## 4. Signup Flow

### Implementation
- **Signup is handled entirely by Auth0**
- No separate signup component in the application
- When a new user clicks "Continue" on the privacy policy page:
  - Auth0 Universal Login page provides a "Sign Up" option
  - User creates account through Auth0
  - After signup, Auth0 redirects back to the app
  - Flow continues from Step 4 above (Post-Authentication)

### Auth0 Signup Configuration
- Signup settings are configured in Auth0 Dashboard
- Email verification can be enabled/disabled in Auth0
- The app shows a verification dialog after login (regardless of verification status)

---

## 5. Forgot Password Flow

### Current Implementation
- **Status**: Not implemented in the application
- **UI**: "Forget Password?" link exists in `log-in.html` but has no functionality
- **Note**: The `log-in` component is not actively used in the current flow

### Auth0 Password Reset
- Password reset is handled by Auth0 Universal Login page
- Users can click "Forgot Password?" on Auth0 login page
- Auth0 sends password reset email
- User resets password through Auth0

### To Implement Forgot Password in App
If you want to add forgot password functionality:
1. Add click handler to "Forget Password?" link
2. Call `this.auth.loginWithRedirect({ authorizationParams: { screen_hint: 'forgot_password' } })`
3. Or use Auth0 Management API to send password reset email

---

## 6. Token Management

### Access Token Storage
- **Location**: `sessionStorage`
- **Key**: `'accessToken'`
- **Format**: JSON stringified token
- **Retrieval**: Automatically fetched by Auth0 SDK via `getAccessTokenSilently()`

### Token Attachment
- **Interceptor**: `src/app/auth/auth-interceptor.ts`
- **Process**:
  1. Checks if user is authenticated via `auth.isAuthenticated$`
  2. If authenticated, gets access token silently
  3. Attaches token to request header: `Authorization: Bearer ${token}`
  4. Stores token in sessionStorage for future use
  5. Only applies to URLs in `allowedList` (configured in environment)

### Token Refresh
- Auth0 SDK automatically handles token refresh
- Uses silent authentication to refresh expired tokens
- No manual refresh logic required

### RefId (User Reference ID)
- **Location**: `localStorage`
- **Key**: `'refId'`
- **Format**: JSON stringified object with `{ _id, rolename, universityId }`
- **Retrieval**: Fetched from backend API after role/university selection
- **Usage**: Sent in headers for API requests requiring user context

---

## 7. Backend API Integration

### Base URLs
- **Development**: `https://dev.intoto.ca`
- **Staging**: `https://stage.intoto.ca`
- **Production**: `https://apiedu.intoto.ca`

### Authentication Endpoints

#### 1. Get User Roles
- **Endpoint**: `GET /api/user/login`
- **Headers**: None (public endpoint)
- **Response**: 
  ```json
  {
    "success": true,
    "statusCode": 200,
    "info": {
      "roles": [
        {
          "id": "role-id",
          "name": "university_super_admin",
          "displayName": "University Super Admin"
        }
      ]
    }
  }
  ```
- **Usage**: Fetched on role selection page to show available roles

#### 2. Get Universities for Role
- **Endpoint**: `POST /api/invitation/universities`
- **Headers**: 
  ```
  rolename: <role_name>
  ```
- **Body**:
  ```json
  {
    "textsearch": ""
  }
  ```
- **Response**: List of universities with `_id`, `name`, `logo`, `address`
- **Usage**: Fetched after role selection to show universities

#### 3. Get User Profile Reference (refId)
- **Endpoint**: `POST /api/portfolio`
- **Headers**: 
  ```
  Authorization: Bearer <access_token>
  ```
- **Body**:
  ```json
  {
    "rolename": "<role_name>",
    "universityId": "<university_id>"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "info": {
      "_id": "ref_id",
      "rolename": "university_super_admin",
      "universityId": "university_id"
    }
  }
  ```
- **Usage**: Gets the user's reference ID for subsequent API calls
- **Storage**: Stored in `localStorage` as `refId`

#### 4. Get User Profile Data
- **Endpoint**: `POST /api/user/myProfile`
- **Headers**: 
  ```
  refId: <ref_id>
  ```
- **Body**:
  ```json
  {
    "type": "setupProfile"
  }
  ```
- **Response**: User profile data including:
  - `picture`: Profile picture
  - `basicDetails.fields`: firstName, lastName, email, phoneNumber, country
  - Field configurations: required, minLength, maxLength, regexp, isEditable, visible
- **Usage**: 
  - Check if profile is complete
  - Load profile data for editing
  - Determine which fields to show in profile setup form

#### 5. Update User Profile
- **Endpoint**: `PUT /api/user`
- **Headers**: 
  ```
  rolename: <role_name>
  universityid: <university_id>
  refid: <ref_id>
  ```
- **Body**:
  ```json
  {
    "type": "setupProfile",
    "data": {
      "firstName": { "value": "John" },
      "lastName": { "value": "Doe" },
      "email": { "value": "john@example.com" },
      "phoneNumber": {
        "countryCode": "+1",
        "phoneNumber": "1234567890",
        "isMobile": true,
        "isVerified": true
      },
      "country": { "value": "Canada" }
    }
  }
  ```
- **Usage**: Updates user profile during initial setup or profile editing

#### 6. Get Countries Data
- **Endpoint**: `POST /api/countries?pageIndex=1&pageSize=20`
- **Headers**: 
  ```
  rolename: <role_name>
  universityid: <university_id>
  ```
- **Body**:
  ```json
  {
    "name": "<search_term>"
  }
  ```
- **Response**: Paginated list of countries with `_id`, `name`, `dialCode`, `isoCode`
- **Usage**: Used in profile setup for country and phone code selection

#### 7. Get Dashboard Data
- **Endpoint**: `GET /api/dashboard/`
- **Headers**: 
  ```
  Authorization: Bearer <access_token>
  refId: <ref_id>
  ```
- **Usage**: Fetches dashboard content after authentication

#### 8. Get Bottom Navigation Icons
- **Endpoint**: `GET /api/dashboard/webBaseicon`
- **Headers**: 
  ```
  Authorization: Bearer <access_token>
  refId: <ref_id>
  ```
- **Usage**: Fetches navigation menu items for dashboard

---

## 8. Route Protection

### Auth Guard
**Location**: `src/app/guards/auth-guard.ts`

**Implementation**:
```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('accessToken');
  const refId = localStorage.getItem('refId');
  let isAuthenticated = false;

  try {
    if (token && refId) {
      const parsedToken = JSON.parse(token);
      const parsedRefId = JSON.parse(refId);
      if (parsedToken && parsedRefId?._id) {
        isAuthenticated = true;
      }
    }
  } catch (e) {
    console.error('Invalid authentication data in storage', e);
  }

  if (!isAuthenticated) {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refId');
    router.navigate(['/select-role']);
    return false;
  }

  return true;
};
```

**Protected Routes**:
- `/dashboard-layout` and all child routes
- Applied in `app.routes.ts`:
  ```typescript
  {
    path: 'dashboard-layout',
    component: DashboardLayout,
    canActivate: [authGuard],
    children: [...]
  }
  ```

---

## 9. HTTP Interceptors

### 1. Auth Interceptor (Token Attachment)
**Location**: `src/app/auth/auth-interceptor.ts`

**Purpose**: Automatically attaches Auth0 access token to API requests

**Implementation**:
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return auth.isAuthenticated$.pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (isAuthenticated) {
        return auth.getAccessTokenSilently().pipe(
          switchMap((token) => {
            const cloned = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            sessionStorage.setItem('accessToken', JSON.stringify(token));
            return next(cloned);
          }),
          catchError((error) => {
            console.error('Error getting access token:', error);
            return next(req);
          })
        );
      } else {
        return next(req);
      }
    })
  );
};
```

**Configuration**: Registered in `app.config.ts`:
```typescript
provideHttpClient(
  withInterceptors([authInterceptor])
)
```

### 2. Error Interceptor (401 Handling)
**Location**: `src/app/interceptors/auth-interceptor.ts`

**Purpose**: Handles 401 Unauthorized errors and redirects to login

**Implementation**:
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('refId');
        router.navigate([''], {
          queryParams: { returnUrl: router.url }
        });
      }
      return throwError(() => error);
    })
  );
};
```

**Note**: There are two interceptors with the same name in different directories. The one in `auth/` handles token attachment, while the one in `interceptors/` handles error responses.

---

## 10. Logout Flow

### Implementation
**Location**: `src/app/dashboard-layout/dashboard-layout.ts`

**Process**:
1. User clicks logout button
2. Confirmation dialog appears
3. On confirmation:
   - Removes `accessToken` from sessionStorage
   - Calls `auth.logout()` with return URL
   - Auth0 handles logout and redirects to home page

**Code**:
```typescript
logout() {
  this.showLogoutDialog = false;
  sessionStorage.removeItem('accessToken');
  this.auth.logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
}
```

---

## 11. Storage Management

### Session Storage
- **accessToken**: Auth0 access token (JSON stringified)
- **userName**: User's full name (JSON stringified)
- **userImage**: User's profile picture URL (JSON stringified)
- **selectedRole**: Selected role object (JSON stringified)

### Local Storage
- **refId**: User reference ID object with `{ _id, rolename, universityId }` (JSON stringified)
- **roleData**: Cached role data (optional, can be removed)

### Cleanup
- On logout: Removes `accessToken` from sessionStorage
- On 401 error: Removes both `accessToken` and `refId`
- On guard failure: Removes both `accessToken` and `refId`

---

## 12. Key Services

### 1. ProfileSetup Service
**Location**: `src/app/services/profile-setup.ts`

**Methods**:
- `getRoleData()`: Fetches available roles
- `getUniversityData(roleName)`: Fetches universities for a role
- `getMyProfileData(refId)`: Fetches user profile data
- `getCountriesData(roleName, universityId, searchKey)`: Fetches countries
- `post(roleName, universityid, userData)`: Updates user profile
- `getMyFullProfileData(refId)`: Fetches complete profile
- `uploadProfilePicture(refId, file)`: Uploads profile picture
- `updateProfile(refId, profileData)`: Updates profile
- `deleteProfilePicture(refId)`: Deletes profile picture

### 2. DashboardService
**Location**: `src/app/services/dashboard.ts`

**Methods**:
- `getProfileData(role, roleName)`: Gets refId for selected role/university
- `getUserData()`: Gets user authentication data
- `getDashboardData(refId)`: Gets dashboard content
- `getBottomIcons(roleName, universityId, refId)`: Gets navigation icons
- `selectedRoleData(role, roleName)`: Sets selected role and fetches refId

**Observables**:
- `selectedRole$`: Currently selected role
- `refId$`: Current user reference ID

---

## 13. Route Structure

### Public Routes
- `/` - Privacy Policy (Login entry point)
- `/intoto-logo` - Logo screen (transitional)
- `/select-role` - Role and university selection

### Protected Routes (Require Auth Guard)
- `/dashboard-layout` - Main dashboard layout
  - `/dashboard-layout/home` - Dashboard home
  - `/dashboard-layout/community` - Community page
  - `/dashboard-layout/chats` - Chats page
  - `/dashboard-layout/profile` - User profile
  - `/dashboard-layout/myUniversity` - University management
  - `/dashboard-layout/addCampus` - Add campus
  - `/dashboard-layout/campus-details/:id` - Campus details
  - `/dashboard-layout/configuration` - Configurations
  - `/dashboard-layout/manage-user` - User management
  - `/dashboard-layout/view-full-details` - View details
  - `/dashboard-layout/total-students` - Students list
  - `/dashboard-layout/active-universities` - Universities list

---

## 14. Implementation Checklist for New Project

### Required Dependencies
```json
{
  "@auth0/auth0-angular": "^2.2.3",
  "@angular/core": "^20.2.0",
  "@angular/common": "^20.2.0",
  "@angular/router": "^20.2.0"
}
```

### Files to Copy/Recreate

1. **Environment Configuration**
   - `src/environments/environment.ts`
   - `src/environments/environment.staging.ts`
   - `src/environments/environment.prod.ts`

2. **Auth Configuration**
   - `src/app/app.config.ts` (Auth0 module setup)

3. **Interceptors**
   - `src/app/auth/auth-interceptor.ts` (Token attachment)
   - `src/app/interceptors/auth-interceptor.ts` (Error handling)

4. **Guards**
   - `src/app/guards/auth-guard.ts`

5. **Components**
   - `src/app/login-pages/privacy-policy/` (Login entry)
   - `src/app/login-pages/intoto-logo/` (Transition screen)
   - `src/app/login-pages/select-role/` (Role/university selection)

6. **Services**
   - `src/app/services/profile-setup.ts`
   - `src/app/services/dashboard.ts`

7. **Routes**
   - `src/app/app.routes.ts` (Route configuration)

### Configuration Steps

1. **Install Dependencies**
   ```bash
   npm install @auth0/auth0-angular
   ```

2. **Configure Auth0 Module in app.config.ts**
   - Import `AuthModule` from `@auth0/auth0-angular`
   - Configure with environment variables
   - Set up HTTP interceptor allowed list

3. **Set Up Environment Variables**
   - Add Auth0 domain, clientId, audience
   - Configure API base URLs
   - Set redirect URIs

4. **Implement Interceptors**
   - Register auth interceptor for token attachment
   - Register error interceptor for 401 handling

5. **Create Auth Guard**
   - Check for accessToken and refId
   - Redirect to login if not authenticated

6. **Set Up Routes**
   - Define public routes (login, select-role)
   - Define protected routes with authGuard
   - Configure redirects

7. **Implement Services**
   - Create ProfileSetup service for API calls
   - Create DashboardService for user data
   - Configure HTTP headers with tokens and refId

8. **Test Authentication Flow**
   - Test login redirect
   - Test callback handling
   - Test token storage
   - Test API calls with tokens
   - Test logout

---

## 15. Important Notes

### Auth0 Configuration Requirements
1. **Allowed Callback URLs**: Must include your app's origin URL
2. **Allowed Logout URLs**: Must include your app's origin URL
3. **Allowed Web Origins**: Must include your app's origin URL
4. **API Audience**: Must match the `audience` in authorizationParams

### Token Handling
- Tokens are automatically managed by Auth0 SDK
- Access tokens are stored in sessionStorage
- Tokens are automatically refreshed by Auth0 SDK
- No manual token refresh logic needed

### API Request Headers
- **Authorization**: `Bearer <access_token>` (added by interceptor)
- **refId**: User reference ID (added manually in services)
- **rolename**: Role name (added manually in services)
- **universityid**: University ID (added manually in services)

### Error Handling
- 401 errors automatically clear storage and redirect to login
- Token fetch errors are logged but don't block requests
- Invalid authentication data in guard redirects to select-role

### Security Considerations
- Access tokens stored in sessionStorage (cleared on tab close)
- RefId stored in localStorage (persists across sessions)
- Tokens only attached to requests in allowedList
- Auth0 handles all password-related operations

---

## 16. API Endpoints Summary

| Endpoint | Method | Auth Required | Headers | Purpose |
|----------|--------|---------------|---------|---------|
| `/api/user/login` | GET | No | None | Get available roles |
| `/api/invitation/universities` | POST | No | `rolename` | Get universities for role |
| `/api/portfolio` | POST | Yes | `Authorization` | Get user refId |
| `/api/user/myProfile` | POST | Yes | `refId` | Get user profile |
| `/api/user` | PUT | Yes | `rolename`, `universityid`, `refid` | Update profile |
| `/api/countries` | POST | Yes | `rolename`, `universityid` | Get countries list |
| `/api/dashboard/` | GET | Yes | `Authorization`, `refId` | Get dashboard data |
| `/api/dashboard/webBaseicon` | GET | Yes | `Authorization`, `refId` | Get navigation icons |

---

## 17. Flow Diagram

```
User visits app (/)
    ↓
Privacy Policy Page
    ↓
Click "Continue"
    ↓
Auth0 Login Redirect
    ↓
User authenticates (login/signup)
    ↓
Auth0 Callback
    ↓
Show verification dialog
    ↓
Navigate to /intoto-logo
    ↓
Navigate to /select-role
    ↓
Fetch roles (GET /api/user/login)
    ↓
User selects role
    ↓
Fetch universities (POST /api/invitation/universities)
    ↓
User selects university
    ↓
Get refId (POST /api/portfolio)
    ↓
Check profile (POST /api/user/myProfile)
    ↓
Profile complete? ──No──→ Show profile setup dialog
    │                      ↓
    │                  User fills form
    │                      ↓
    │                  Update profile (PUT /api/user)
    │                      ↓
    Yes                     Yes
    ↓                       ↓
Navigate to /dashboard-layout
    ↓
Auth Guard validates
    ↓
Access granted
```

---

## 18. Troubleshooting

### Common Issues

1. **Token not attached to requests**
   - Check if URL is in `allowedList` in environment
   - Verify Auth0 interceptor is registered
   - Check if user is authenticated

2. **401 errors on API calls**
   - Verify token is valid
   - Check if refId is present
   - Verify API endpoint accepts the token

3. **Redirect loop**
   - Check Auth0 callback URL configuration
   - Verify redirect_uri matches Auth0 settings
   - Check if guard is properly checking authentication

4. **Profile setup not showing**
   - Verify API returns correct profile data
   - Check if firstName, lastName, email are missing
   - Verify formData is properly set

5. **Roles not loading**
   - Check `/api/user/login` endpoint
   - Verify CORS settings
   - Check network tab for errors

---

## Conclusion

This authentication system provides a complete, secure authentication flow using Auth0 with seamless integration with the backend API. The implementation handles login, signup (via Auth0), role selection, university selection, profile setup, and protected route access. All tokens are managed automatically by the Auth0 SDK, and the system includes proper error handling and cleanup mechanisms.
