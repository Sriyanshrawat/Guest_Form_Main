import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { StudentService } from '../../services/student.service';
import { StudentSubmission } from '../../models/student.model';

@Component({
  selector: 'app-application-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './application-review.component.html',
  styleUrl: './application-review.component.css'
})
export class ApplicationReviewComponent implements OnInit {
  private readonly studentService = inject(StudentService);

  submissions: StudentSubmission[] = [];
  loading = false;
  errorMessage = '';
  actionMessage = '';

  activeTab: 'Pending' | 'Approved' | 'Rejected' | 'All' = 'Pending';
  searchText = '';
  filterBoard = '';
  filterSchool = '';
  filterClass = '';

  viewingSubmission: StudentSubmission | null = null;
  rejectingSubmission: StudentSubmission | null = null;
  rejectNote = '';
  submittingReview = false;

  readonly tabs = [
    { key: 'Pending', label: 'Pending', icon: 'bi-hourglass-split' },
    { key: 'Approved', label: 'Approved', icon: 'bi-check2-circle' },
    { key: 'Rejected', label: 'Rejected', icon: 'bi-x-circle' },
    { key: 'All', label: 'All Applications', icon: 'bi-card-list' }
  ] as const;

  readonly avatarPalette = [
    '#4f46e5', '#06b6d4', '#22c55e',
    '#f97316', '#ec4899', '#8b5cf6'
  ];

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.loading = true;
    this.errorMessage = '';
    this.studentService.getSubmissions().subscribe({
      next: data => {
        this.submissions = data;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.adminErrorMessage(error, 'load applications');
        this.loading = false;
      }
    });
  }

  get filtered(): StudentSubmission[] {
    let pool = this.submissions;
    if (this.activeTab !== 'All') {
      pool = pool.filter(s => s.status === this.activeTab);
    }
    const text = this.searchText.trim().toLowerCase();
    if (text) {
      pool = pool.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(text) ||
        s.email.toLowerCase().includes(text) ||
        (s.schoolName ?? '').toLowerCase().includes(text) ||
        (s.className ?? '').toLowerCase().includes(text) ||
        (s.rollNumber ?? '').toLowerCase().includes(text)
      );
    }
    if (this.filterBoard) pool = pool.filter(s => s.boardName === this.filterBoard);
    if (this.filterSchool) pool = pool.filter(s => s.schoolName === this.filterSchool);
    if (this.filterClass) {
      pool = pool.filter(s => `${s.className}${s.classSection ? ' - ' + s.classSection : ''}` === this.filterClass);
    }
    return pool;
  }

  get countByStatus(): Record<string, number> {
    const map: Record<string, number> = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const s of this.submissions) {
      const st = s.status || 'Pending';
      if (st in map) map[st]++;
    }
    return map;
  }

  get boardOptions(): string[] {
    return [...new Set(this.submissions.map(s => s.boardName).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b));
  }

  get schoolOptions(): string[] {
    const pool = this.filterBoard
      ? this.submissions.filter(s => s.boardName === this.filterBoard)
      : this.submissions;
    return [...new Set(pool.map(s => s.schoolName).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b));
  }

  get classOptions(): string[] {
    let pool = this.submissions;
    if (this.filterBoard) pool = pool.filter(s => s.boardName === this.filterBoard);
    if (this.filterSchool) pool = pool.filter(s => s.schoolName === this.filterSchool);
    return [...new Set(pool.map(s =>
      `${s.className}${s.classSection ? ' - ' + s.classSection : ''}`
    ).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  setTab(tab: ApplicationReviewComponent['activeTab']): void {
    this.activeTab = tab;
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterBoard = '';
    this.filterSchool = '';
    this.filterClass = '';
  }

  initials(s: StudentSubmission): string {
    return ((s.firstName[0] ?? '') + (s.lastName[0] ?? '')).toUpperCase();
  }

  avatarColor(s: StudentSubmission): string {
    const key = s.firstName + s.lastName;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  statusClass(s: StudentSubmission): string {
    switch (s.status) {
      case 'Approved': return 'status-badge status-badge--approved';
      case 'Rejected': return 'status-badge status-badge--rejected';
      default: return 'status-badge status-badge--pending';
    }
  }

  approveSubmission(s: StudentSubmission): void {
    if (s.id == null) return;
    if (!confirm(`Approve "${s.firstName} ${s.lastName}"? The student will be registered.`)) return;
    this.actionMessage = '';
    this.errorMessage = '';
    this.studentService.approveSubmission(s.id).subscribe({
      next: () => {
        this.actionMessage = `Approved ${s.firstName} ${s.lastName}.`;
        this.loadSubmissions();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.adminErrorMessage(error, 'approve the application');
      }
    });
  }

  openRejectModal(s: StudentSubmission): void {
    this.rejectingSubmission = s;
    this.rejectNote = s.reviewNote ?? '';
    this.actionMessage = '';
  }

  closeRejectModal(): void {
    if (this.submittingReview) return;
    this.rejectingSubmission = null;
    this.rejectNote = '';
  }

  confirmReject(): void {
    const s = this.rejectingSubmission;
    if (!s || s.id == null) return;
    this.submittingReview = true;
    this.errorMessage = '';
    this.studentService.rejectSubmission(s.id, this.rejectNote.trim() || undefined).subscribe({
      next: () => {
        this.submittingReview = false;
        this.actionMessage = `Rejected ${s.firstName} ${s.lastName}.`;
        this.rejectingSubmission = null;
        this.rejectNote = '';
        this.loadSubmissions();
      },
      error: (error: HttpErrorResponse) => {
        this.submittingReview = false;
        this.errorMessage = this.adminErrorMessage(error, 'reject the application');
      }
    });
  }

  viewDetails(s: StudentSubmission): void {
    this.viewingSubmission = s;
  }

  closeDetails(): void {
    this.viewingSubmission = null;
  }

  reviewedLabel(s: StudentSubmission): string {
    if (!s.reviewedBy) return '—';
    return s.reviewedBy + (s.reviewedDate ? ' · ' + new Date(s.reviewedDate).toLocaleDateString() : '');
  }

  private adminErrorMessage(error: HttpErrorResponse, action: string): string {
    if (error.status === 0) return 'Backend is offline.';
    if (error.status === 401) return 'Unauthorized.';
    if (error.status === 403) return 'Access denied.';
    return `Could not ${action}.`;
  }
}
