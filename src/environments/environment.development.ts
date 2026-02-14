export const environment = {
  production: true,
  apiUri: 'https://dev.intoto.ca',
  prospectProfileApiUri: 'https://dev.intoto.ca/api',
  s3BaseUrl: 'https://dev.cdn.intoto.ca/',
  ambassadorPlatform: {
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
    allowedList: ['https://dev.intoto.ca/*'],
  },
};
