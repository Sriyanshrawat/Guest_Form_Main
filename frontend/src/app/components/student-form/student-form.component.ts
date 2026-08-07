// StudentFormComponent

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { CellClickedEvent, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { StudentSubmission, LookupOption } from '../../models/student.model';
import { StudentService } from '../../services/student.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridAngular
  ],
  templateUrl: './student-form.component.html',
  styleUrl: './student-form.component.css'
})
export class StudentFormComponent implements OnInit {

  private readonly studentService = inject(StudentService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  submitting = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  editingId: number | null = null;
  viewingStudent: StudentSubmission | null = null;
  termsModalOpen = false;

  boards: LookupOption[] = [];
  sessions: LookupOption[] = [];
  schools: LookupOption[] = [];
  classes: LookupOption[] = [];
  streams: LookupOption[] = [];
  specializations: LookupOption[] = [];

  students: StudentSubmission[] = [];
  filteredStudents: StudentSubmission[] = [];
  searchText = '';
  displayedStudentCount = 0;
  private gridApi?: GridApi<StudentSubmission>;

  readonly defaultColDef: ColDef<StudentSubmission> = {
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 80
  };

  readonly studentColumnDefs: ColDef<StudentSubmission>[] = [
    {
      headerName: 'Student',
      minWidth: 190,
      cellRenderer: (params: { data?: StudentSubmission }) => this.studentCellRenderer(params.data),
      filterValueGetter: (params: { data?: StudentSubmission }) => `${params.data?.firstName ?? ''} ${params.data?.lastName ?? ''} ${params.data?.email ?? ''}`
    },
    {
      field: 'gender',
      headerName: 'Gender',
      minWidth: 100,
      cellRenderer: (params: { value?: string }) => this.genderCellRenderer(params.value ?? '')
    },
    {
      field: 'dateOfBirth',
      headerName: 'DOB',
      minWidth: 100,
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      field: 'phoneNumber',
      headerName: 'Phone',
      minWidth: 105,
      cellRenderer: (params: { value?: string }) => this.phoneCellRenderer(params.value ?? '')
    },
    {
      field: 'fatherName',
      headerName: 'Parents',
      minWidth: 150,
      cellRenderer: (params: { data?: StudentSubmission }) => this.parentCellRenderer(params.data),
      filterValueGetter: (params: { data?: StudentSubmission }) => `${params.data?.fatherName ?? ''} ${params.data?.motherName ?? ''} ${params.data?.fatherPhone ?? ''} ${params.data?.motherPhone ?? ''}`
    },
    {
      headerName: 'Class',
      width: 130,
      minWidth: 130,
      maxWidth: 130,
      flex: 0,
      valueGetter: params => `${params.data?.className ?? ''}${params.data?.classSection ? ' - ' + params.data.classSection : ''}`,
      cellRenderer: (params: { value?: string }) => this.classCellRenderer(params.value ?? ''),
      filterValueGetter: params => `${params.data?.className ?? ''} ${params.data?.classSection ?? ''}`
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      filter: false,
      sortable: false,
      floatingFilter: false,
      width: 230,
      minWidth: 230,
      maxWidth: 230,
      flex: 0,
      cellRenderer: () => '<div class="grid-actions"><button type="button" class="grid-action" data-action="view" title="View student details"><i class="bi bi-eye"></i><span>View</span></button><button type="button" class="grid-action" data-action="edit" title="Edit student"><i class="bi bi-pencil"></i><span>Edit</span></button><button type="button" class="grid-action delete" data-action="delete" title="Delete student"><i class="bi bi-trash3"></i><span>Delete</span></button></div>'
    }
  ];
  // calendar widget state
  calendarOpen = false;
  calendarView = new Date();
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly calendarMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  // year picker range
  readonly calendarYears = Array.from({ length: new Date().getFullYear() - 1919 }, (_, index) => new Date().getFullYear() - index);

  // avatar colour palette
  readonly avatarPalette = [
    '#4f46e5', '#06b6d4', '#22c55e',
    '#f97316', '#ec4899', '#8b5cf6'
  ];

  // reactive form with validation
  form = this.fb.group({

    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    gender: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    address: ['', Validators.required],
    bloodGroup: [''],
    fatherName: ['', Validators.required],
    motherName: ['', Validators.required],
    fatherPhone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    motherPhone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    emergencyContactName: [''],
    emergencyContactPhone: ['', Validators.pattern('^[0-9]{10}$')],
    aadhaarNumber: ['', Validators.pattern('^[0-9]{12}$')],
    nationality: ['Indian'],
    religion: [''],
    motherTongue: [''],
    category: [''],
    enrollmentNumber: [''],
    rollNumber: [''],
    termsAccepted: [false, Validators.requiredTrue],

    boardId: [null as number | null, Validators.required],
    sessionId: [null as number | null, Validators.required],
    schoolId: [null as number | null, Validators.required],
    classId: [null as number | null, Validators.required],
    streamId: [null as number | null],
    specializationId: [null as number | null]

  });

  // calendar month label
  get calendarMonthLabel(): string {
    return this.calendarView.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // calendar day grid
  get calendarDays(): Array<Date | null> {
    const year = this.calendarView.getFullYear();
    const month = this.calendarView.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<Date | null> = Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  // toggle calendar popup
  toggleCalendar(): void {
    this.calendarOpen = !this.calendarOpen;
    if (this.calendarOpen) {
      const selected = this.parseDate(this.f.dateOfBirth.value);
      this.calendarView = selected ?? new Date();
    }
  }

  // change calendar month
  changeCalendarMonth(offset: number): void {
    this.calendarView = new Date(this.calendarView.getFullYear(), this.calendarView.getMonth() + offset, 1);
  }

  // set calendar month
  setCalendarMonth(month: string): void {
    this.calendarView = new Date(this.calendarView.getFullYear(), Number(month), 1);
  }

  // set calendar year
  setCalendarYear(year: string): void {
    this.calendarView = new Date(Number(year), this.calendarView.getMonth(), 1);
  }

  // select calendar date
  selectCalendarDate(date: Date): void {
    this.f.dateOfBirth.setValue(this.toDateValue(date));
    this.f.dateOfBirth.markAsTouched();
    this.calendarOpen = false;
  }

  // clear calendar date
  clearCalendarDate(): void {
    this.f.dateOfBirth.setValue('');
    this.f.dateOfBirth.markAsTouched();
    this.calendarOpen = false;
  }

  // select today
  selectToday(): void {
    this.selectCalendarDate(new Date());
  }

  // highlight selected calendar day
  isSelectedCalendarDate(date: Date): boolean {
    return this.f.dateOfBirth.value === this.toDateValue(date);
  }

  // display date for read-only field
  displayDate(value: string): string {
    const date = this.parseDate(value);
    return date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }

  // parse yyyy-MM-dd to Date
  private parseDate(value: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
  }

  // format Date to yyyy-MM-dd
  private toDateValue(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  // on init
  ngOnInit(): void {
    this.loadBoards();
    this.loadStudents();
  }

  // auto edit when a non-admin has one record
  private autoEditIfOwnRecord(): void {
    if (this.isAdmin) return;
    if (this.students.length === 1) {
      this.startEdit(this.students[0]);
    }
  }

  // form controls shorthand
  get f() {
    return this.form.controls;
  }

  // is editing mode
  get isEditing(): boolean {
    return this.editingId != null;
  }

  // is admin user
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // labels for invalid fields
  get invalidFieldLabels(): string[] {
    const labels: Record<string, string> = {
      firstName: 'First Name', lastName: 'Last Name', gender: 'Gender',
      dateOfBirth: 'Date of Birth', email: 'Email Address', phoneNumber: 'Phone Number',
      address: 'Address', fatherName: 'Father Name', motherName: 'Mother Name',
      fatherPhone: 'Father Phone', motherPhone: 'Mother Phone',
      boardId: 'Education Board', sessionId: 'Session', schoolId: 'School', classId: 'Class',
      termsAccepted: 'Terms & Conditions'
    };

    return Object.entries(this.form.controls)
      .filter(([, control]) => control.invalid)
      .map(([name]) => labels[name])
      .filter((label): label is string => !!label);
  }

  // open terms modal
  openTerms(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.termsModalOpen = true;
  }

  // close terms modal
  closeTerms(): void {
    this.termsModalOpen = false;
  }

  // load boards
  loadBoards(): void {
    this.studentService.getBoards().subscribe({
      next: (data) => {
        this.boards = data;
      },
      error: () => {
        this.errorMessage = 'Unable to load boards. Please try again.';
      }
    });
  }

  // load students (admin: all, user: own)
  loadStudents(): void {
    this.loading = true;
    const obs = this.authService.isAdmin()
      ? this.studentService.getSubmissions()
      : this.studentService.getMySubmissions();
    obs.subscribe({
      next: (data) => {
        this.students = data;
        this.filteredStudents = [...data];
        this.displayedStudentCount = data.length;
        this.loading = false;

        const editId = Number(this.route.snapshot.queryParamMap.get('edit'));
        const target = editId ? data.find(s => s.id === editId) : null;
        if (target) {
          this.startEdit(target);
        } else {
          this.autoEditIfOwnRecord();
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // live filter the student table
  searchStudents(): void {
    const text = this.searchText.trim().toLowerCase();
    if (!text) {
      this.filteredStudents = [...this.students];
      return;
    }
    this.filteredStudents = this.students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(text) ||
      s.email.toLowerCase().includes(text) ||
      `${s.fatherName} ${s.motherName}`.toLowerCase().includes(text) ||
      (s.phoneNumber ?? '').includes(text)
    );
  }

  // capture the grid api when the grid is ready
  onGridReady(event: GridReadyEvent<StudentSubmission>): void {
    this.gridApi = event.api;
    this.updateDisplayedStudentCount();
  }

  // refresh displayed count when grid filters change
  onGridFilterChanged(): void {
    this.updateDisplayedStudentCount();
  }

  // route action button clicks in the grid
  onGridCellClicked(event: CellClickedEvent<StudentSubmission>): void {
    if (event.column.getColId() !== 'actions' || !event.data) return;
    const action = ((event.event?.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-action]'))?.dataset['action'];
    if (action === 'view') this.viewDetails(event.data);
    if (action === 'edit') this.startEdit(event.data);
    if (action === 'delete') this.deleteStudent(event.data);
  }

  // sync the displayed row count from the grid
  private updateDisplayedStudentCount(): void {
    this.displayedStudentCount = this.gridApi?.getDisplayedRowCount() ?? this.students.length;
  }

  // avatar initials
  initials(s: StudentSubmission): string {
    return ((s.firstName[0] ?? '') + (s.lastName[0] ?? '')).toUpperCase();
  }

  // deterministic avatar colour from name
  avatarColor(s: StudentSubmission): string {
    const key = s.firstName + s.lastName;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  // escape html for cell renderers
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // render the student cell with avatar and name
  private studentCellRenderer(s?: StudentSubmission): string {
    const name = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim();
    const color = s ? this.avatarColor(s) : '#96702f';
    const initials = s ? this.escapeHtml(this.initials(s)) : '';
    return `<div class="grid-student-cell"><div class="grid-avatar" style="background:${color}">${initials}</div><div class="grid-student-info"><strong>${this.escapeHtml(name)}</strong><small>${this.escapeHtml(s?.email ?? '')}</small></div></div>`;
  }

  // render the gender cell as a coloured badge
  private genderCellRenderer(value: string): string {
    const v = value ?? '';
    if (!v) return '';
    const badge = v === 'Male' ? 'grid-badge-male' : v === 'Female' ? 'grid-badge-female' : 'grid-badge-other';
    const icon = v === 'Male' ? 'bi-gender-male' : v === 'Female' ? 'bi-gender-female' : 'bi-gender-ambiguous';
    return `<span class="grid-badge ${badge}"><i class="bi ${icon}"></i>${this.escapeHtml(v)}</span>`;
  }

  // render the phone cell in monospace
  private phoneCellRenderer(value: string): string {
    return value ? `<span class="grid-mono">${this.escapeHtml(value)}</span>` : '—';
  }

  // render the parents cell with guardian lines
  private parentCellRenderer(s?: StudentSubmission): string {
    const father = s?.fatherName ? `<div class="grid-guardian-line"><i class="bi bi-gender-male"></i><span>${this.escapeHtml(s.fatherName)}</span></div>` : '';
    const mother = s?.motherName ? `<div class="grid-guardian-line"><i class="bi bi-gender-female"></i><span>${this.escapeHtml(s.motherName)}</span></div>` : '';
    return `<div class="grid-guardian-info">${father}${mother}</div>`;
  }

  // render the class cell as a badge
  private classCellRenderer(value: string): string {
    return value ? `<span class="grid-badge grid-badge-class">${this.escapeHtml(value)}</span>` : '';
  }

  // open details modal
  viewDetails(s: StudentSubmission): void {
    this.viewingStudent = s;
  }

  // close details modal
  closeDetails(): void {
    this.viewingStudent = null;
  }

  // enter edit mode for a student
  startEdit(s: StudentSubmission): void {
    this.editingId = s.id ?? null;
    this.errorMessage = '';
    this.successMessage = '';

    this.sessions = [];
    this.schools = [];
    this.classes = [];
    this.streams = [];
    this.specializations = [];

    this.loadCascadeForEdit(s);
  }

  // reload cascading lookups for editing
  private loadCascadeForEdit(s: StudentSubmission): void {
    forkJoin({
      sessions: this.studentService.getSessions(s.boardId),
      schools: this.studentService.getSchools(s.boardId, s.sessionId),
      classes: this.studentService.getClasses(s.boardId, s.sessionId, s.schoolId),
      streams: this.studentService.getStreams(s.classId),
      specializations: this.studentService.getSpecializations(s.classId),
    }).subscribe({
      next: (data) => {
        this.sessions = data.sessions;
        this.schools = data.schools;
        this.classes = data.classes;
        this.streams = data.streams;
        this.specializations = data.specializations;
        this.patchStudentForm(s);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage =
            'Unable to load student data for editing. Make sure the backend is running.';
          this.cancelEdit();
        }
      },
    });
  }

  // fill the form from a student
  private patchStudentForm(s: StudentSubmission): void {
    this.form.patchValue({
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      dateOfBirth: this.toDateInputValue(s.dateOfBirth),
      email: s.email,
      phoneNumber: s.phoneNumber ?? '',
      address: s.address,
      bloodGroup: s.bloodGroup ?? '',
      fatherName: s.fatherName,
      motherName: s.motherName,
      fatherPhone: s.fatherPhone,
      motherPhone: s.motherPhone,
      emergencyContactName: s.emergencyContactName ?? '',
      emergencyContactPhone: s.emergencyContactPhone ?? '',
      aadhaarNumber: s.aadhaarNumber ?? '',
      nationality: s.nationality ?? 'Indian',
      religion: s.religion ?? '',
      motherTongue: s.motherTongue ?? '',
      category: s.category ?? '',
      enrollmentNumber: s.enrollmentNumber ?? '',
      rollNumber: s.rollNumber ?? '',
      termsAccepted: false,
      boardId: s.boardId,
      sessionId: s.sessionId,
      schoolId: s.schoolId,
      classId: s.classId,
      streamId: s.streamId ?? null,
      specializationId: s.specializationId ?? null
    });
  }

  // normalise backend date to yyyy-MM-dd
  private toDateInputValue(date: string): string {
    if (!date) return '';
    return date.substring(0, 10);
  }

  // exit edit mode
  cancelEdit(): void {
    this.editingId = null;
    this.resetForm();
  }

  // delete a student
  deleteStudent(student: StudentSubmission): void {
    if (student.id == null) return;
    if (!confirm(`Delete student "${student.firstName} ${student.lastName}"?`)) return;
    this.studentService.deleteSubmission(student.id).subscribe({
      next: () => {
        this.students = this.students.filter(s => s.id !== student.id);
        this.searchStudents();
        if (this.editingId === student.id) {
          this.cancelEdit();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.status === 403
          ? 'You can only delete your own entry.'
          : 'Unable to delete student. Please try again.';
      }
    });
  }

  // on board change (level 1)
  onBoardChange(): void {
    this.resetDownstream('board');
    const boardId = this.form.value.boardId;
    if (!boardId) return;
    this.studentService.getSessions(boardId).subscribe({
      next: (data) => {
        this.sessions = data;
      },
      error: () => { this.errorMessage = 'Unable to load sessions.'; }
    });
  }

  // on session change (level 2)
  onSessionChange(): void {
    this.resetDownstream('session');
    const boardId = this.form.value.boardId;
    const sessionId = this.form.value.sessionId;
    if (!boardId || !sessionId) return;
    this.studentService.getSchools(boardId, sessionId).subscribe({
      next: (data) => {
        this.schools = data;
      },
      error: () => { this.errorMessage = 'Unable to load schools.'; }
    });
  }

  // on school change (level 3)
  onSchoolChange(): void {
    this.resetDownstream('school');
    const boardId = this.form.value.boardId;
    const sessionId = this.form.value.sessionId;
    const schoolId = this.form.value.schoolId;
    if (!boardId || !sessionId || !schoolId) return;
    this.studentService.getClasses(boardId, sessionId, schoolId).subscribe({
      next: (data) => {
        this.classes = data;
      },
      error: () => { this.errorMessage = 'Unable to load classes.'; }
    });
  }

  // currently selected class
  get selectedClass(): LookupOption | undefined {
    const classId = this.form.value.classId;
    return this.classes.find(c => c.id === classId);
  }

  // only XI/XII classes have specializations
  get canHaveSpecialization(): boolean {
    const cls = this.selectedClass;
    return cls?.name === 'XI' || cls?.name === 'XII';
  }

  // on class change (level 4)
  onClassChange(): void {
    this.resetDownstream('class');
    const classId = this.form.value.classId;
    if (!classId) return;
    this.studentService.getStreams(classId).subscribe({
      next: (data) => {
        this.streams = data;
      }
    });
    if (this.canHaveSpecialization) {
      this.studentService.getSpecializations(classId).subscribe({
        next: (data) => {
          this.specializations = data;
        }
      });
    } else {
      this.specializations = [];
      this.form.patchValue({ specializationId: null });
    }
  }

  // clear downstream dropdowns and values
  private resetDownstream(from: 'board' | 'session' | 'school' | 'class'): void {
    if (from === 'board') {
      this.sessions = []; this.schools = []; this.classes = []; this.streams = []; this.specializations = [];
      this.form.patchValue({ sessionId: null, schoolId: null, classId: null, streamId: null, specializationId: null });
    } else if (from === 'session') {
      this.schools = []; this.classes = []; this.streams = []; this.specializations = [];
      this.form.patchValue({ schoolId: null, classId: null, streamId: null, specializationId: null });
    } else if (from === 'school') {
      this.classes = []; this.streams = []; this.specializations = [];
      this.form.patchValue({ classId: null, streamId: null, specializationId: null });
    } else if (from === 'class') {
      this.streams = []; this.specializations = [];
      this.form.patchValue({ streamId: null, specializationId: null });
    }
  }

  // pack form values into a student DTO
  private buildStudentFromForm(): Partial<StudentSubmission> {
    const val = this.form.value;
    return {
      firstName: val.firstName ?? '',
      lastName: val.lastName ?? '',
      gender: val.gender ?? '',
      dateOfBirth: val.dateOfBirth ?? '',
      email: val.email ?? '',
      phoneNumber: val.phoneNumber ?? '',
      address: val.address ?? '',
      bloodGroup: val.bloodGroup || undefined,
      fatherName: val.fatherName ?? '',
      motherName: val.motherName ?? '',
      fatherPhone: val.fatherPhone ?? '',
      motherPhone: val.motherPhone ?? '',
      emergencyContactName: val.emergencyContactName || undefined,
      emergencyContactPhone: val.emergencyContactPhone || undefined,
      aadhaarNumber: val.aadhaarNumber || undefined,
      nationality: val.nationality || undefined,
      religion: val.religion || undefined,
      motherTongue: val.motherTongue || undefined,
      category: val.category || undefined,
      enrollmentNumber: val.enrollmentNumber || undefined,
      rollNumber: val.rollNumber || undefined,
      boardId: val.boardId ?? 0,
      sessionId: val.sessionId ?? 0,
      schoolId: val.schoolId ?? 0,
      classId: val.classId ?? 0,
      streamId: val.streamId || null,
      specializationId: val.specializationId || null
    };
  }

  // submit the student form
  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const student = this.buildStudentFromForm();
    this.submitting = true;

    if (this.isEditing && this.editingId != null) {
      this.studentService.updateSubmission(this.editingId, student).subscribe({
        next: (updated) => {
          this.successMessage = 'Student updated successfully.';
          this.submitting = false;
          this.students = this.students.map(s => s.id === this.editingId ? updated : s);
          this.filteredStudents = this.filteredStudents.map(s => s.id === this.editingId ? updated : s);
          this.cancelEdit();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.submitErrorMessage(error);
          this.submitting = false;
        }
      });
    } else {
      this.studentService.createSubmission(student).subscribe({
        next: () => {
          this.successMessage = 'Student registered successfully.';
          this.submitting = false;
          this.resetForm();
          this.streams = [];
          this.specializations = [];
          this.loadStudents();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.submitErrorMessage(error);
          this.submitting = false;
        }
      });
    }
  }

  // reset the form
  private resetForm(): void {
    this.form.reset({
      firstName: '', lastName: '', gender: '', dateOfBirth: '',
      email: '', phoneNumber: '', address: '', bloodGroup: '',
      fatherName: '', motherName: '', fatherPhone: '', motherPhone: '',
      emergencyContactName: '', emergencyContactPhone: '',
      aadhaarNumber: '', nationality: 'Indian', religion: '',
      motherTongue: '', category: '', enrollmentNumber: '', rollNumber: '',
      termsAccepted: false,
      boardId: null, sessionId: null, schoolId: null, classId: null,
      streamId: null, specializationId: null
    });
    this.sessions = [];
    this.schools = [];
    this.classes = [];
    this.streams = [];
    this.specializations = [];
  }

  // map an HTTP failure to a user-friendly message
  private submitErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = this.backendMessage(error.error);
    if (backendMessage) return backendMessage;
    switch (error.status) {
      case 0: return 'Unable to connect to the server.';
      case 400: return 'Please check all student details.';
      case 401: return 'Please login first.';
      case 409: return 'A student with this email already exists.';
      default: return 'Something went wrong. Please try again.';
    }
  }

  // safely extract the backend error message
  private backendMessage(errorBody: unknown): string {
    if (!errorBody) return '';
    if (typeof errorBody === 'string') {
      try { return this.backendMessage(JSON.parse(errorBody)); } catch { return errorBody; }
    }
    if (typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody) {
      const message = (errorBody as { message?: unknown }).message;
      return typeof message === 'string' ? message : '';
    }
    return '';
  }

}
