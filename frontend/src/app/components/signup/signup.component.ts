import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CaptchaComponent, CaptchaValue } from '../captcha.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CaptchaComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  form: FormGroup;
  submitting = false;
  errorMessage = '';
  captcha: CaptchaValue = { captchaId: '', captchaAnswer: '' };
  @ViewChild(CaptchaComponent) captchaComponent?: CaptchaComponent;

  // on init
  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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
    this.authService.register({ ...this.form.value, ...this.captcha }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/submit']);
      },
      error: (err) => {
        this.submitting = false;
        this.captchaComponent?.refresh();
        this.errorMessage = err?.error?.message || 'Could not create account. Try a different username.';
      }
    });
  }
}
