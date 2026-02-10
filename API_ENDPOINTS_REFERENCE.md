# API Endpoints Reference

Quick reference guide for all authentication and user-related API endpoints used in the login flow.

## Base URLs

- **Development**: `https://dev.intoto.ca`
- **Staging**: `https://stage.intoto.ca`
- **Production**: `https://apiedu.intoto.ca`

---

## Authentication & User Management Endpoints

### 1. Get User Roles
**Endpoint**: `GET /api/user/login`

**Description**: Fetches all available roles for the authenticated user.

**Headers**: None (public endpoint, but Auth0 token may be attached by interceptor)

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "roles": [
      {
        "id": "role-id-1",
        "name": "university_super_admin",
        "displayName": "University Super Admin"
      },
      {
        "id": "role-id-2",
        "name": "intoto_admin",
        "displayName": "Intoto Admin"
      }
    ]
  }
}
```

**Usage**: Called on `/select-role` page to display available roles.

---

### 2. Get Universities for Role
**Endpoint**: `POST /api/invitation/universities`

**Description**: Fetches list of universities available for a specific role.

**Headers**:
```
rolename: university_super_admin
```

**Request Body**:
```json
{
  "textsearch": ""
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "docs": [
      {
        "_id": "university-id-1",
        "name": "University Name",
        "logo": "https://cdn.example.com/logo.png",
        "address": {
          "address": "123 Main St",
          "city": "Toronto",
          "country": "Canada",
          "postalCode": "M5H 2N2"
        }
      }
    ]
  }
}
```

**Usage**: Called after role selection to show universities.

---

### 3. Get User Profile Reference (refId)
**Endpoint**: `POST /api/portfolio`

**Description**: Gets the user's reference ID (refId) for the selected role and university combination.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "rolename": "university_super_admin",
  "universityId": "university-id-1"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "_id": "ref-id-123",
    "rolename": "university_super_admin",
    "universityId": "university-id-1"
  }
}
```

**Usage**: 
- Called after university selection
- Stores refId in localStorage for subsequent API calls
- Required for all profile-related operations

---

### 4. Get User Profile Data
**Endpoint**: `POST /api/user/myProfile`

**Description**: Fetches user profile data including field configurations.

**Headers**:
```
refId: ref-id-123
```

**Request Body**:
```json
{
  "type": "setupProfile"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "_id": "user-id",
    "picture": {
      "value": "https://cdn.example.com/profile.jpg",
      "label": "Profile Picture",
      "required": true,
      "visible": true
    },
    "basicDetails": {
      "fields": {
        "firstName": {
          "value": "John",
          "label": "First Name",
          "required": true,
          "minLength": 2,
          "maxLength": 50,
          "isEditable": true,
          "visible": true,
          "prompt": "Enter your first name"
        },
        "lastName": {
          "value": "Doe",
          "label": "Last Name",
          "required": true,
          "minLength": 2,
          "maxLength": 50,
          "isEditable": true,
          "visible": true,
          "prompt": "Enter your last name"
        },
        "email": {
          "value": "john@example.com",
          "label": "Email",
          "required": true,
          "isEditable": false,
          "visible": true,
          "prompt": "Enter your email"
        },
        "phoneNumber": {
          "value": {
            "countryCode": "+1",
            "phoneNumber": "1234567890",
            "isMobile": true,
            "isVerified": true
          },
          "label": "Phone Number",
          "required": true,
          "fields": {
            "countryCode": {
              "label": "Country Code",
              "required": true,
              "isEditable": true,
              "visible": true
            },
            "phoneNumber": {
              "label": "Phone Number",
              "required": true,
              "minLength": 10,
              "maxLength": 15,
              "isEditable": true,
              "visible": true
            }
          }
        },
        "country": {
          "value": "Canada",
          "label": "Country",
          "required": true,
          "isEditable": true,
          "visible": true,
          "prompt": "Select your country"
        }
      }
    },
    "isFormSubmitted": false
  }
}
```

**Usage**: 
- Check if profile is complete (firstName, lastName, email present)
- Load profile data for editing
- Get field configurations for dynamic form generation

---

### 5. Update User Profile
**Endpoint**: `PUT /api/user`

**Description**: Updates user profile information.

**Headers**:
```
rolename: university_super_admin
universityid: university-id-1
refid: ref-id-123
```

**Request Body**:
```json
{
  "type": "setupProfile",
  "data": {
    "firstName": {
      "value": "John"
    },
    "lastName": {
      "value": "Doe"
    },
    "email": {
      "value": "john@example.com"
    },
    "phoneNumber": {
      "countryCode": "+1",
      "phoneNumber": "1234567890",
      "isMobile": true,
      "isVerified": true
    },
    "country": {
      "value": "Canada"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "info": {
    "_id": "user-id",
    "basicDetails": {
      "fields": {
        "firstName": { "value": "John" },
        "lastName": { "value": "Doe" },
        "email": { "value": "john@example.com" }
      }
    }
  }
}
```

**Usage**: 
- Update profile during initial setup
- Update profile from profile page

---

### 6. Get Full Profile Data
**Endpoint**: `POST /api/user/myProfile`

**Description**: Fetches complete user profile with all fields.

**Headers**:
```
refId: ref-id-123
```

**Request Body**:
```json
{
  "type": "fullProfile"
}
```

**Response**: Similar to setupProfile but includes all profile fields.

**Usage**: Used in profile page to load complete profile data.

---

### 7. Get Countries Data
**Endpoint**: `POST /api/countries?pageIndex=1&pageSize=20`

**Description**: Fetches paginated list of countries with search functionality.

**Headers**:
```
rolename: university_super_admin
universityid: university-id-1
```

**Request Body**:
```json
{
  "name": "canada"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "docs": [
      {
        "_id": "country-id-1",
        "name": "Canada",
        "dialCode": "+1",
        "isoCode": "CA"
      }
    ],
    "totalDocs": 195,
    "totalPages": 10,
    "page": 1
  }
}
```

**Query Parameters**:
- `pageIndex`: Page number (default: 1)
- `pageSize`: Items per page (default: 20)

**Usage**: 
- Country selection dropdown in profile setup
- Phone country code selection

---

### 8. Get Dashboard Data
**Endpoint**: `GET /api/dashboard/`

**Description**: Fetches dashboard content and widgets.

**Headers**:
```
Authorization: Bearer <access_token>
refId: ref-id-123
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "universityDetails": {
      "_id": "university-id",
      "name": "University Name",
      "logo": "https://cdn.example.com/logo.png"
    },
    "headers": {
      "title": "Dashboard",
      "roleInfo": {
        "role": "University Super Admin",
        "adminRoleIcon": "icon-url",
        "downArrowIcon": "icon-url"
      }
    },
    "notification": {
      "_id": "notification-id",
      "actionId": "action-id",
      "name": "Notifications",
      "icon": "icon-url",
      "redDotIcon": "icon-url",
      "backgroundColor": "#FF0000"
    },
    "quickWay": {
      "name": "Quick Way",
      "items": [...]
    },
    "features": {
      "name": "Features",
      "items": [...]
    },
    "activities": {
      "name": "Activities",
      "items": [...]
    }
  }
}
```

**Usage**: Loads dashboard content after authentication.

---

### 9. Get Bottom Navigation Icons
**Endpoint**: `GET /api/dashboard/webBaseicon`

**Description**: Fetches navigation menu items for bottom navigation.

**Headers**:
```
Authorization: Bearer <access_token>
refId: ref-id-123
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": [
    {
      "id": "home",
      "name": "Home",
      "selectedIcons": "icon-url-selected",
      "unselectedIcons": "icon-url-unselected"
    },
    {
      "id": "community",
      "name": "Community",
      "selectedIcons": "icon-url-selected",
      "unselectedIcons": "icon-url-unselected"
    }
  ]
}
```

**Usage**: Loads navigation menu items for dashboard layout.

---

### 10. Get Profile Page Configuration
**Endpoint**: `GET /api/user/profile_page`

**Description**: Fetches profile page configuration and field settings.

**Headers**:
```
refId: ref-id-123
```

**Response**: Profile page configuration object.

**Usage**: Used in profile page to determine which fields to display.

---

### 11. Upload Profile Picture
**Endpoint**: `POST /api/user/profile`

**Description**: Uploads user profile picture.

**Headers**:
```
Authorization: Bearer <access_token>
refId: ref-id-123
```

**Request Body**: FormData with file
```
file: <File>
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "info": {
    "picture": "https://cdn.example.com/profile.jpg"
  }
}
```

**Usage**: Upload profile picture from profile page.

---

### 12. Delete Profile Picture
**Endpoint**: `GET /api/user/removedprofile`

**Description**: Removes user profile picture.

**Headers**:
```
Authorization: Bearer <access_token>
refId: ref-id-123
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile picture removed"
}
```

**Usage**: Remove profile picture from profile page.

---

## Header Patterns

### Standard Headers for Authenticated Requests
```
Authorization: Bearer <access_token>
refId: <ref_id>
```

### Headers for Role/University Specific Requests
```
rolename: <role_name>
universityid: <university_id>
refid: <ref_id>
```

### Headers for Profile Operations
```
Authorization: Bearer <access_token>
refId: <ref_id>
Content-Type: application/json
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message here"
}
```

**Common Status Codes**:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized (token invalid/expired)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes

1. **Access Token**: Automatically attached by `authInterceptor` for URLs in `allowedList`
2. **refId**: Must be obtained from `/api/portfolio` before making profile-related calls
3. **Pagination**: Countries endpoint supports pagination with `pageIndex` and `pageSize`
4. **Search**: Countries endpoint supports search via `name` field in request body
5. **Field Configuration**: Profile endpoints return field configurations (required, minLength, maxLength, regexp, isEditable, visible) for dynamic form generation
