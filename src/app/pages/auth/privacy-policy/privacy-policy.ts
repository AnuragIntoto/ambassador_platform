import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
@Component({
  selector: 'app-privacy-policy',
  imports: [CardModule, ButtonModule],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
})
export class PrivacyPolicy {
  private readonly router = inject(Router);

  continueToDashboard(): void {
    this.router.navigate(['/']);
  }
}
