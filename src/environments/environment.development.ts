export const environment = {
  production: true,
  apiUri: 'https://dev.intoto.ca',
  s3BaseUrl: 'https://dev.cdn.intoto.ca/',
  ambassadorPlatform: {
    refId: '68175f0b56147e83225f3a31',
    defaultUniversitySlug: 'pune-university',
  },
  auth: {
    domain: 'intoto-edu.us.auth0.com',
    clientId: '8cMD41V6kw1hiaOajcAgOIlWsHYNmhso',
    get authorizationParams() {
      return {
        audience: 'intotoprod',
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'https://dev.cdn.intoto.ca/',
      };
    },
    errorPath: '/error',
  },
  httpInterceptor: {
    allowedList: [
      'https://dev.intoto.ca/api/user/*',
      'https://dev.intoto.ca/api/portfolio*',
      'https://dev.intoto.ca/api/dashboard*',
      'https://dev.intoto.ca/api/invitation/*',
      'https://dev.intoto.ca/api/countries*',
      'https://dev.intoto.ca/api/ambassador-platform/*',
    ],
  },
};
