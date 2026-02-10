import { Component } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-login',
  imports: [
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    CheckboxModule,
    ButtonModule,
    PasswordModule,
    FormsModule,
    DialogModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  visible: boolean = false;

  showDialog() {
    this.visible = true;
  }
}
