import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';

export interface CaptchaValue {
  captchaId: string;
  captchaAnswer: string;
}

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="captcha">
      <label for="captcha-answer">Security check</label>
      <div class="captcha__image-row" *ngIf="imageBase64; else loading">
        <img class="captcha__image" [src]="'data:image/png;base64,' + imageBase64" alt="CAPTCHA characters" />
        <button type="button" class="captcha__refresh" (click)="refresh()" [disabled]="loading" aria-label="Generate a new CAPTCHA">Refresh</button>
      </div>
      <ng-template #loading><p class="captcha__loading">Loading CAPTCHA...</p></ng-template>
      <input id="captcha-answer" type="text" [formControl]="answer" (input)="emitValue()" autocomplete="off" autocapitalize="characters" />
      <small class="captcha__error" *ngIf="errorMessage">{{ errorMessage }}</small>
      <small class="captcha__error" *ngIf="answer.touched && answer.invalid">Enter the characters shown above.</small>
    </div>
  `,
  styles: [`
    .captcha { display: flex; flex-direction: column; gap: 0.45rem; }
    .captcha label { font-size: 0.82rem; font-weight: 700; color: #334155; }
    .captcha__image-row { display: flex; align-items: center; gap: 0.6rem; }
    .captcha__image { width: 180px; height: 60px; border: 1px solid #cbd5e1; border-radius: 0.5rem; }
    .captcha input { padding: 0.8rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 0.75rem; color: #0f172a; font-size: 0.95rem; text-transform: uppercase; }
    .captcha input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12); }
    .captcha__refresh { border: 1px solid #cbd5e1; border-radius: 0.75rem; padding: 0.65rem 0.8rem; background: #f8fafc; color: #1d4ed8; font-weight: 700; cursor: pointer; }
    .captcha__error { color: #dc2626; font-size: 0.82rem; }
    .captcha__loading { margin: 0; color: #64748b; font-size: 0.85rem; }
  `]
})
export class CaptchaComponent implements OnInit {
  @Output() valueChange = new EventEmitter<CaptchaValue>();

  answer = new FormControl('', Validators.required);
  imageBase64 = '';
  captchaId = '';
  loading = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  // on init
  ngOnInit(): void {
    this.refresh();
  }

  // refresh
  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.answer.reset('');
    this.valueChange.emit({ captchaId: '', captchaAnswer: '' });
    this.authService.getCaptcha().subscribe({
      next: (captcha) => {
        this.captchaId = captcha.captchaId;
        this.imageBase64 = captcha.imageBase64;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load CAPTCHA. Please refresh it.';
      }
    });
  }

  // on input
  emitValue(): void {
    this.valueChange.emit({ captchaId: this.captchaId, captchaAnswer: this.answer.value?.trim() ?? '' });
  }
}
