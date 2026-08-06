import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { AuthResponse } from './models/auth.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Guest-profile-app';
  masterOpen = true;
  isDarkMode = false;
  profileOpen = false;

  @ViewChild('profileWrap') profileWrap?: ElementRef<HTMLDivElement>;
  passwordModalOpen = false;
  passwordForm: FormGroup;
  passwordSubmitting = false;
  passwordMessage = '';
  passwordMessageType: 'error' | 'success' = 'error';

  constructor(public authService: AuthService, private router: Router, private fb: FormBuilder) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  // document click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.profileOpen && this.profileWrap && !this.profileWrap.nativeElement.contains(event.target as Node)) {
      this.profileOpen = false;
    }
  }

  // escape
  @HostListener('document:keydown.escape', [])
  onEscape(): void {
    this.profileOpen = false;
    if (this.passwordModalOpen) this.closePasswordModal();
  }

  // init
  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
  }

  // toggle theme
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  // apply theme
  private applyTheme(): void {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  // toggle profile
  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
  }

  // open password modal
  openPasswordModal(): void {
    this.profileOpen = false;
    this.passwordMessage = '';
    this.passwordModalOpen = true;
  }

  // close password modal
  closePasswordModal(): void {
    this.passwordModalOpen = false;
    this.passwordMessage = '';
    this.passwordForm.reset();
  }

  // change password
  changePassword(): void {
    this.passwordMessage = '';
    const form = this.passwordForm;

    if (form.invalid) {
      form.markAllAsTouched();
      this.passwordMessage = 'Please fill in all fields (new password must be at least 6 characters).';
      this.passwordMessageType = 'error';
      return;
    }

    if (form.value.newPassword !== form.value.confirmPassword) {
      this.passwordMessage = 'The new passwords do not match.';
      this.passwordMessageType = 'error';
      return;
    }

    this.passwordSubmitting = true;
    this.authService.changePassword(form.value.currentPassword, form.value.newPassword).subscribe({
      next: (res) => {
        this.passwordSubmitting = false;
        this.passwordMessage = res?.message || 'Password changed successfully.';
        this.passwordMessageType = 'success';
        form.reset();
      },
      error: (err) => {
        this.passwordSubmitting = false;
        this.passwordMessage =
          err?.error?.message ||
          err?.message ||
          'Could not change the password. Please try again.';
        this.passwordMessageType = 'error';
      }
    });
  }

  // close profile
  closeProfile(): void {
    this.profileOpen = false;
  }

  // profile initials
  profileInitials(user: AuthResponse): string {
    const name = user.username.trim();
    const parts = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  // role label
  roleLabel(user: AuthResponse): string {
    return user.role === 'Admin' ? 'Administrator' : 'Student';
  }

  // avatar color
  avatarColor(initials: string): string {
    const palette = ['#96702f', '#2f46a5', '#0f7b8c', '#3f7d44', '#8c3b3b', '#6b4f9e'];
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
      hash = initials.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }

  // show shell
  showShell(): boolean {
    return !['/login', '/signup'].includes(this.router.url);
  }

  // show sidebar
  showSidebar(): boolean {
    return this.authService.isLoggedIn() && this.isSidebarRoute();
  }

  // sidebar route
  isSidebarRoute(): boolean {
    return this.router.url.startsWith('/submit') ||
      this.router.url.startsWith('/student-dashboard') ||
      this.router.url.startsWith('/dashboard') ||
      this.router.url.startsWith('/admin') ||
      this.router.url.startsWith('/master-report') ||
      this.router.url.startsWith('/education-board') ||
      this.router.url.startsWith('/school') ||
      this.router.url.startsWith('/classes') ||
      this.router.url.startsWith('/sessions') ||
      this.router.url.startsWith('/streams') ||
      this.router.url.startsWith('/specializations');
  }

  // toggle master
  toggleMaster(): void {
    this.masterOpen = !this.masterOpen;
  }

  // logout
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
