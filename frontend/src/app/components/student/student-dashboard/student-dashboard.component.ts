import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../services/auth.service';
import { StudentService } from '../../../services/student.service';
import { Student, StudentSubmission } from '../../../models/student.model';

type Notification = { text: string; type: 'success' | 'info' | 'warning' };

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css',
})
export class StudentDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private studentService = inject(StudentService);
  private destroyRef = inject(DestroyRef);

  user$ = this.authService.currentUser$;
  loading = true;
  loadError = false;
  student: StudentSubmission | null = null;
  registrationStatus = 'Not Registered';
  applicationNo = '—';
  profilePct = 0;
  notifications: Notification[] = [];

  // load own student data on init
  ngOnInit(): void {
    this.loadMyStudent();
  }

  // greeting based on the current hour
  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  // css tone class for the current approval status
  get statusTone(): string {
    switch (this.student?.status) {
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Pending':
        return 'pending';
      default:
        return 'none';
    }
  }

  // load the current user's submission from the API
  loadMyStudent(): void {
    this.loading = true;
    this.loadError = false;
    this.studentService.getMySubmissions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (students) => {
        this.student = students && students.length > 0 ? students[0] : null;
        this.buildStatus();
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      },
    });
  }

  // derive status, app no, profile % and notifications from the student
  private buildStatus(): void {
    const s = this.student;
    if (!s) {
      this.registrationStatus = 'Not Registered';
      this.applicationNo = '—';
      this.profilePct = 0;
      this.notifications = [
        { text: 'You have not submitted a registration yet.', type: 'warning' },
        { text: 'Fill the registration form to apply.', type: 'info' },
      ];
      return;
    }

    this.registrationStatus = this.statusLabel(s.status);
    this.applicationNo = this.makeAppNo(s);
    this.profilePct = this.calcProfilePct(s);

    const notifications: Notification[] = [];
    if (s.createdAt) {
      notifications.push({ text: 'Registration submitted successfully.', type: 'success' });
    }
    switch (s.status) {
      case 'Approved':
        notifications.push(
          { text: 'Your form was accepted! You are now registered.', type: 'success' },
          { text: 'Contact the school office for further steps.', type: 'info' },
        );
        break;
      case 'Rejected':
        notifications.push(
          { text: 'Sorry, your form got rejected.', type: 'warning' },
          ...(s.reviewNote
            ? [{ text: `Reason: ${s.reviewNote}`, type: 'warning' } as Notification]
            : []),
        );
        break;
      default:
        notifications.push({ text: 'Admin is reviewing your application.', type: 'info' });
    }
    if (s.schoolName || s.className) {
      const placement = [
        s.schoolName,
        s.className ? `${s.className}${s.classSection ? ` · ${s.classSection}` : ''}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      notifications.push({ text: `Applied for ${placement}.`, type: 'info' });
    }
    this.notifications = notifications;
  }

  // map a status code to a display label
  private statusLabel(status?: Student['status']): string {
    switch (status) {
      case 'Approved':
        return 'Registered';
      case 'Rejected':
        return 'Rejected';
      default:
        return 'Under Review';
    }
  }

  // build an application number from enrollment or generated id
  private makeAppNo(s: Student): string {
    if (s.enrollmentNumber) return s.enrollmentNumber;
    if (s.id == null) return '—';
    const year = new Date().getFullYear();
    return `${year}${String(s.id).padStart(5, '0')}`;
  }

  // percentage of required profile fields filled in
  private calcProfilePct(s: Student): number {
    const required = [
      s.firstName, s.lastName, s.gender, s.dateOfBirth, s.email,
      s.phoneNumber, s.address,
      s.fatherName, s.motherName, s.fatherPhone, s.motherPhone,
    ];
    const filled = required.filter((f) => !!f && String(f).trim() !== '').length;
    return Math.round((filled / required.length) * 100);
  }
}
