 // StudentReportComponent

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { StudentService } from '../../services/student.service';
import { Student } from '../../models/student.model';

@Component({
  selector: 'app-student-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-report.component.html',
  styleUrl: './student-report.component.css'
})
export class StudentReportComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly router = inject(Router);

  students: Student[] = [];
  filteredStudents: Student[] = [];
  loading = false;
  errorMessage = '';
  actionMessage = '';
  searchText = '';
  filterGender = '';
  filterBoard = '';
  filterSchool = '';
  filterClass = '';
  filterStatus = '';
  viewingStudent: Student | null = null;
  rejectingStudent: Student | null = null;
  rejectNote = '';
  submittingReview = false;

  readonly statusOptions = ['Pending', 'Approved', 'Rejected'] as const;

  readonly avatarPalette = [
    '#4f46e5', '#06b6d4', '#22c55e',
    '#f97316', '#ec4899', '#8b5cf6'
  ];

  // on init
  ngOnInit(): void {
    this.loadStudents();
  }

  // load students
  loadStudents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.studentService.getStudents().subscribe({
      next: data => {
        this.students = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.adminErrorMessage(error, 'load students');
        this.loading = false;
      }
    });
  }

  // total students
  get totalStudents(): number { return this.students.length; }
  // male count
  get maleCount(): number { return this.students.filter(s => s.gender === 'Male').length; }
  // female count
  get femaleCount(): number { return this.students.filter(s => s.gender === 'Female').length; }
  // unique schools
  get uniqueSchools(): number { return new Set(this.students.map(s => s.schoolId)).size; }

  // board options
  get boardOptions(): string[] {
    return [...new Set(this.students.map(s => s.boardName).filter((n): n is string => !!n))].sort();
  }

  // school options
  get schoolOptions(): string[] {
    const pool = this.filterBoard
      ? this.students.filter(s => s.boardName === this.filterBoard)
      : this.students;
    return [...new Set(pool.map(s => s.schoolName).filter((n): n is string => !!n))].sort();
  }

  // class options
  get classOptions(): string[] {
    let pool = this.students;
    if (this.filterBoard) pool = pool.filter(s => s.boardName === this.filterBoard);
    if (this.filterSchool) pool = pool.filter(s => s.schoolName === this.filterSchool);
    return [...new Set(pool.map(s =>
      s.className + (s.classSection ? ' - ' + s.classSection : '')
    ))].sort();
  }

  // clear filters
  clearFilters(): void {
    this.searchText = '';
    this.filterGender = '';
    this.filterBoard = '';
    this.filterSchool = '';
    this.filterClass = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  // apply filters
  applyFilters(): void {
    const text = this.searchText.trim().toLowerCase();
    this.filteredStudents = this.students.filter(s => {
      if (text && !`${s.firstName} ${s.lastName}`.toLowerCase().includes(text) &&
          !s.email.toLowerCase().includes(text) &&
          !`${s.fatherName} ${s.motherName}`.toLowerCase().includes(text) &&
          !(s.phoneNumber ?? '').includes(text) &&
          !(s.className ?? '').toLowerCase().includes(text) &&
          !(s.schoolName ?? '').toLowerCase().includes(text))
        return false;
      if (this.filterGender && s.gender !== this.filterGender) return false;
      if (this.filterBoard && s.boardName !== this.filterBoard) return false;
      if (this.filterSchool && s.schoolName !== this.filterSchool) return false;
      if (this.filterClass) {
        const label = s.className + (s.classSection ? ' - ' + s.classSection : '');
        if (label !== this.filterClass) return false;
      }
      if (this.filterStatus && s.status !== this.filterStatus) return false;
      return true;
    });
  }

  // pending submissions count
  get pendingCount(): number { return this.students.filter(s => s.status !== 'Approved').length; }

  // status badge class
  statusClass(s: Student): string {
    switch (s.status) {
      case 'Approved': return 'status-badge status-badge--approved';
      case 'Rejected': return 'status-badge status-badge--rejected';
      default: return 'status-badge status-badge--pending';
    }
  }

  // approve a submission
  approveStudent(s: Student): void {
    if (s.id == null) return;
    if (!confirm(`Approve "${s.firstName} ${s.lastName}"? The student will be notified.`)) return;
    this.actionMessage = '';
    this.studentService.approveStudent(s.id).subscribe({
      next: () => {
        this.actionMessage = `Approved ${s.firstName} ${s.lastName}.`;
        this.loadStudents();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.adminErrorMessage(error, 'approve the student');
      }
    });
  }

  // open reject modal
  openRejectModal(s: Student): void {
    this.rejectingStudent = s;
    this.rejectNote = s.reviewNote ?? '';
    this.actionMessage = '';
  }

  // close reject modal
  closeRejectModal(): void {
    if (this.submittingReview) return;
    this.rejectingStudent = null;
    this.rejectNote = '';
  }

  // confirm rejection with optional note
  confirmReject(): void {
    const s = this.rejectingStudent;
    if (!s || s.id == null) return;
    this.submittingReview = true;
    this.errorMessage = '';
    this.studentService.rejectStudent(s.id, this.rejectNote.trim() || undefined).subscribe({
      next: () => {
        this.submittingReview = false;
        this.actionMessage = `Rejected ${s.firstName} ${s.lastName}.`;
        this.rejectingStudent = null;
        this.rejectNote = '';
        this.loadStudents();
      },
      error: (error: HttpErrorResponse) => {
        this.submittingReview = false;
        this.errorMessage = this.adminErrorMessage(error, 'reject the student');
      }
    });
  }

  // initials
  initials(s: Student): string {
    return ((s.firstName[0] ?? '') + (s.lastName[0] ?? '')).toUpperCase();
  }

  // avatar color
  avatarColor(s: Student): string {
    const key = s.firstName + s.lastName;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  // view details
  viewDetails(s: Student): void {
    this.viewingStudent = s;
  }

  // edit student
  editStudent(s: Student): void {
    if (s.id == null) return;
    this.router.navigate(['/submit'], { queryParams: { edit: s.id } });
  }

  // delete student
  deleteStudent(s: Student): void {
    if (s.id == null) return;
    if (!confirm(`Delete student "${s.firstName} ${s.lastName}"?`)) return;
    this.studentService.deleteStudent(s.id).subscribe({
      next: () => this.loadStudents(),
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.status === 403
          ? 'You can only delete your own entry.'
          : this.adminErrorMessage(error, 'delete the student');
      }
    });
  }

  // close details
  closeDetails(): void {
    this.viewingStudent = null;
  }

  // admin error message
  private adminErrorMessage(error: HttpErrorResponse, action: string): string {
    if (error.status === 0) return 'Backend is offline.';
    if (error.status === 401) return 'Unauthorized.';
    if (error.status === 403) return 'Access denied.';
    return `Could not ${action}.`;
  }
}
