import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intoto-logo',
  imports: [],
  templateUrl: './intoto-logo.html',
  styleUrl: './intoto-logo.scss',
})
export class IntotoLogo {
  private router = inject(Router);
  constructor() {
    setTimeout(() => {
      this.router.navigate(['/select-role']);
    }, 2000);
  }
}
