import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudentService } from '../../../services/student.service';
import { StudentSubmission } from '../../../models/student.model';

@Component({
  selector: 'app-my-application',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-application.component.html',
  styleUrls: ['./my-application.component.css']
})
export class MyApplicationComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly destroyRef = inject(DestroyRef);

  submission: StudentSubmission | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadMyApplication();
  }

  loadMyApplication(): void {
    this.loading = true;
    this.errorMessage = '';
    this.studentService.getMySubmissions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.submission = data.length ? data[0] : null;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load your application. Please try again.';
        this.loading = false;
      }
    });
  }

  get applicationNumber(): string {
    if (!this.submission) return '—';
    if (this.submission.enrollmentNumber) return this.submission.enrollmentNumber;
    if (this.submission.id == null) return '—';
    return `${new Date().getFullYear()}${String(this.submission.id).padStart(5, '0')}`;
  }

  statusClass(): string {
    switch (this.submission?.status) {
      case 'Approved': return 'status--approved';
      case 'Rejected': return 'status--rejected';
      default: return 'status--pending';
    }
  }

  get submissionDate(): string {
    return this.submission?.createdAt ? new Date(this.submission.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }

  get statusLabel(): string {
    switch (this.submission?.status) {
      case 'Approved': return 'Approved';
      case 'Rejected': return 'Rejected';
      default: return 'Pending';
    }
  }
}
