import { Component, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-login-signup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, CheckboxModule, ButtonModule],
  templateUrl: './login-signup-modal.html',
  styleUrl: './login-signup-modal.scss',
})
export class LoginSignupModal {
  visible = input<boolean>(false);
  mode = input<'login' | 'signup'>('login');

  continueClick = output<void>();
  close = output<void>();
  switchToSignup = output<void>();
  switchToLogin = output<void>();

  rememberMe = false;
  email = '';
  name = '';

  onContinue(): void {
    this.continueClick.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  onSwitchToSignup(): void {
    this.switchToSignup.emit();
  }

  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }

  onBackdropClick(e: Event): void {
    if ((e.target as HTMLElement).classList.contains('login-modal-backdrop')) {
      this.onClose();
    }
  }
}
