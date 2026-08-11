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
  @ViewChild('avatarFileInput') avatarFileInput?: ElementRef<HTMLInputElement>;
  passwordModalOpen = false;
  passwordForm: FormGroup;
  passwordSubmitting = false;
  passwordMessage = '';
  passwordMessageType: 'error' | 'success' = 'error';
  settingsOpen = false;
  avatarSubmitting = false;
  avatarMessage = '';
  avatarMessageType: 'error' | 'success' = 'error';
  usernameForm: FormGroup;
  usernameSubmitting = false;
  usernameMessage = '';
  usernameMessageType: 'error' | 'success' = 'error';

  // builds the password change reactive form
  constructor(public authService: AuthService, private router: Router, private fb: FormBuilder) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
    this.usernameForm = this.fb.group({
      newUsername: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      currentPassword: ['', Validators.required]
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
    if (this.settingsOpen) this.closeSettingsModal();
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

  // open settings modal
  openSettingsModal(): void {
    this.profileOpen = false;
    this.avatarMessage = '';
    this.usernameMessage = '';
    this.usernameForm.reset();
    this.settingsOpen = true;
  }

  // close settings modal
  closeSettingsModal(): void {
    this.settingsOpen = false;
    this.avatarMessage = '';
    this.usernameMessage = '';
    this.usernameForm.reset();
  }

  // change the account username
  changeUsername(): void {
    this.usernameMessage = '';
    const form = this.usernameForm;

    if (form.invalid) {
      form.markAllAsTouched();
      this.usernameMessage = 'Enter a username of 3-50 characters and your current password.';
      this.usernameMessageType = 'error';
      return;
    }

    this.usernameSubmitting = true;
    this.authService
      .updateUsername(form.value.newUsername, form.value.currentPassword)
      .subscribe({
        next: () => {
          this.usernameSubmitting = false;
          this.usernameMessage = 'Username updated successfully.';
          this.usernameMessageType = 'success';
          form.reset();
        },
        error: (err) => {
          this.usernameSubmitting = false;
          this.usernameMessage =
            err?.error?.message || err?.message || 'Could not change the username. Please try again.';
          this.usernameMessageType = 'error';
        }
      });
  }

  // trigger the hidden avatar file picker
  triggerAvatarUpload(): void {
    this.avatarFileInput?.nativeElement.click();
  }

  // handle the selected avatar file: validate, read as data URI, upload
  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      this.avatarMessage = 'Please choose a JPG, PNG, WEBP or GIF image.';
      this.avatarMessageType = 'error';
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.avatarMessage = 'The image must be smaller than 2 MB.';
      this.avatarMessageType = 'error';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      this.avatarSubmitting = true;
      this.avatarMessage = '';
      this.authService.updateProfilePicture(dataUri).subscribe({
        next: () => {
          this.avatarSubmitting = false;
          this.avatarMessage = 'Profile picture updated.';
          this.avatarMessageType = 'success';
        },
        error: (err) => {
          this.avatarSubmitting = false;
          this.avatarMessage =
            err?.error?.message || err?.message || 'Could not update the profile picture.';
          this.avatarMessageType = 'error';
        }
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // remove the profile picture
  removeProfilePicture(): void {
    this.avatarSubmitting = true;
    this.avatarMessage = '';
    this.authService.updateProfilePicture('').subscribe({
      next: () => {
        this.avatarSubmitting = false;
        this.avatarMessage = 'Profile picture removed.';
        this.avatarMessageType = 'success';
      },
      error: (err) => {
        this.avatarSubmitting = false;
        this.avatarMessage =
          err?.error?.message || err?.message || 'Could not remove the profile picture.';
        this.avatarMessageType = 'error';
      }
    });
  }

  // profile picture data URI, if any
  avatarSrc(user: AuthResponse): string {
    return user.profilePicture?.trim() ? user.profilePicture : '';
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
      this.router.url.startsWith('/my-application') ||
      this.router.url.startsWith('/dashboard') ||
      this.router.url.startsWith('/admin') ||
      this.router.url.startsWith('/applications') ||
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
