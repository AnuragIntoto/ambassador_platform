export const environment = {
  production: false,
  apiUri: 'https://dev.intoto.ca',
  /** BaseUrl2: dashboard home API. {{BaseUrl2}}/ambassador-platform/:slug/home. Falls back to apiUri if not set. */
  ambassadorPlatformBaseUri: 'https://dev.intoto.ca',
  /** BaseUrl for prospect-profile/login: must include /api so URL is {{BaseUrl}}/ambassador-platform/:slug/prospect-profile/login */
  prospectProfileApiUri: 'https://dev.intoto.ca/api',
  s3BaseUrl: 'https://dev.cdn.intoto.ca/',
  ambassadorPlatform: {
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
    allowedList: ['https://dev.intoto.ca/*', 'http://localhost:3000/*'],
  },
};
