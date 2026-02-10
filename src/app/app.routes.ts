import { Routes } from '@angular/router';
import { PrivacyPolicy } from './pages/auth/privacy-policy/privacy-policy';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'dashboard', component: Dashboard },
  { path: 'dashboard/:universitySlug', component: Dashboard },
  { path: 'privacy-policy', component: PrivacyPolicy },
];
