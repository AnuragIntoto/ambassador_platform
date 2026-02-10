export const environment = {
  production: false,
  apiUri: 'https://dev.intoto.ca',
  s3BaseUrl: 'https://dev.cdn.intoto.ca/',
  ambassadorPlatform: {
    refId: '68175f0b56147e83225f3a31',
    defaultUniversitySlug: 'pune-university',
  },
  auth: {
    domain: 'dev-intoto.us.auth0.com',
    clientId: 'GkXHnvsdBdLdO8YHfb6i2jYtyiToudbW',
    get authorizationParams() {
      return {
        audience: 'intotodev',
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
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
