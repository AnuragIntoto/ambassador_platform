import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptor/auth-interceptor';
import { AuthModule } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({ theme: { preset: Aura } }),
    importProvidersFrom(
      AuthModule.forRoot({
        domain: environment.auth.domain,
        clientId: environment.auth.clientId,
        authorizationParams: environment.auth.authorizationParams,
        errorPath: environment.auth.errorPath,
        httpInterceptor: {
          allowedList: environment.httpInterceptor.allowedList,
        },
      }),
    ),
    MessageService,
  ],
};
