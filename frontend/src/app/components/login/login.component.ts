import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CaptchaComponent, CaptchaValue } from '../captcha.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CaptchaComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  form: FormGroup;
  submitting = false;
  errorMessage = '';
  captcha: CaptchaValue = { captchaId: '', captchaAnswer: '' };
  @ViewChild(CaptchaComponent) captchaComponent?: CaptchaComponent;

  // on init
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // get form controls
  get f() {
    return this.form.controls;
  }

  // on submit
  onSubmit(): void {
    this.errorMessage = '';

    if (this.form.invalid || !this.captcha.captchaId || !this.captcha.captchaAnswer) {
      this.form.markAllAsTouched();
      if (!this.captcha.captchaId || !this.captcha.captchaAnswer) {
        this.errorMessage = 'Please complete the security check.';
      }
      return;
    }

    this.submitting = true;
    this.authService.login({ ...this.form.value, ...this.captcha }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.router.navigate([res.role === 'Admin' ? '/dashboard' : '/submit']);
      },
      error: (err) => {
        this.submitting = false;
        this.captchaComponent?.refresh();
        if (err?.status === 0) {
          this.errorMessage = 'Cannot reach the backend API. Make sure the .NET server is running on port 5059 or 7097.';
          return;
        }

        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'Login failed. Check your username and password.';
      }
    });
  }
}
