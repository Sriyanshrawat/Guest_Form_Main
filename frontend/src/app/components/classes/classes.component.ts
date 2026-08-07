import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ClassPayload, ClassRecord } from '../../models/classes.model';
import { ClassesService } from '../../services/classes.service';
import { SchoolService } from '../../services/school.service';
import { SessionsService } from '../../services/sessions.service';
import { School } from '../../models/school.model';
import { SessionRecord } from '../../models/sessions.model';
import { FilterGridAction, FilterGridColumn, FilterGridComponent } from '../shared/filter-grid/filter-grid.component';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterGridComponent],
  templateUrl: './classes.component.html',
  styleUrl: './classes.component.css',
})
export class ClassesComponent implements OnInit {
  readonly gridColumns: FilterGridColumn[] = [{ header: 'School', field: 'schoolName' }, { header: 'Class', field: 'name' }, { header: 'Section', field: 'section' }, { header: 'Session', field: 'sessionName' }];
  readonly gridActions: FilterGridAction[] = [{ id: 'edit', label: 'Update', icon: 'bi-pencil' }, { id: 'delete', label: 'Delete', icon: 'bi-trash3', danger: true }];
  private readonly classesService = inject(ClassesService);
  private readonly schoolService = inject(SchoolService);
  private readonly sessionsService = inject(SessionsService);
  classes: ClassRecord[] = [];
  sessions: SessionRecord[] = [];

  // merge classes
  static mergeClasses(classes: ClassRecord[]): ClassRecord[] {
    const uniqueClasses = new Map<string, ClassRecord>();
    for (const classRecord of classes) {
      const key = `${classRecord.schoolId ?? 'no-school'}|${classRecord.name.trim().toUpperCase()}|${classRecord.section.trim().toUpperCase()}`;
      uniqueClasses.set(key, classRecord);
    }
    return [...uniqueClasses.values()];
  }
  schools: School[] = [];
  readonly classOptions = [
    'Play Group', 'Nursery', 'LKG', 'UKG',
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
  ];
  className = '';
  classSection = '';
  selectedSchoolId: number | null = null;
  selectedSessionId: number | null = null;
  searchTerm = '';
  editingId: number | null = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  // get filtered classes
  get filteredClasses(): ClassRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    return !term
      ? this.classes
      : this.classes.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            item.section.toLowerCase().includes(term) ||
            (item.schoolName ?? '').toLowerCase().includes(term),
        );
  }

  // route grid action to edit or delete
  handleGridAction(event: { id: string; row: ClassRecord }): void {
    event.id === 'edit' ? this.editClass(event.row) : this.deleteClass(event.row);
  }

  // on init
  ngOnInit(): void {
    this.loadClasses();
    this.loadSchools();
    this.loadSessions();
  }

  // load sessions
  loadSessions(): void {
    this.sessionsService.getSessions().subscribe({
      next: (data) => (this.sessions = data),
      error: () => {},
    });
  }

  // load schools
  loadSchools(): void {
    this.schoolService.getSchools().subscribe({
      next: (schools) => (this.schools = schools),
      error: () =>
        (this.errorMessage =
          'Unable to load schools. Add a school first, then try again.'),
    });
  }
  // load classes
  loadClasses(): void {
    this.loading = true;
    this.classesService.getClasses().subscribe({
      next: (classes) => {
        this.classes = this.sortNewestFirst(ClassesComponent.mergeClasses(classes));
        this.loading = false;
      },
      error: () => {
        this.errorMessage =
          'Unable to load classes. Make sure the backend is running.';
        this.loading = false;
      },
    });
  }
  // save
  saveClass(): void {
    const name = this.className.trim();
    const section = this.classSection.trim();
    if (!this.selectedSchoolId || !name || !section || !this.selectedSessionId) {
      this.errorMessage = 'Select a school, class, section, and session.';
      return;
    }
    this.saving = true;
    this.message = '';
    this.errorMessage = '';
    const payload: ClassPayload = {
      schoolId: this.selectedSchoolId,
      sessionId: this.selectedSessionId,
      name,
      section,
      isActive: true,
    };
    const request =
      this.editingId == null
        ? this.classesService.createClass(payload)
        : this.classesService.updateClass(this.editingId, payload);
    request.subscribe({
      next: () => {
        this.message =
          this.editingId == null
            ? 'Class added successfully.'
            : 'Class updated successfully.';
        this.clearForm();
        this.loadClasses();
        this.saving = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.error?.message || 'Unable to save the class. Please try again.';
        this.saving = false;
      },
    });
  }
  // edit
  editClass(item: ClassRecord): void {
    this.editingId = item.id ?? null;
    this.selectedSchoolId = item.schoolId;
    this.selectedSessionId = item.sessionId ?? null;
    this.className = item.name;
    this.classSection = item.section;
    this.message = '';
    this.errorMessage = '';
  }
  // delete
  deleteClass(item: ClassRecord): void {
    if (item.id == null || !confirm(`Delete ${item.name}?`)) return;
    this.classesService.deleteClass(item.id).subscribe({
      next: () => {
        this.classes = this.classes.filter((value) => value.id !== item.id);
        if (this.editingId === item.id) this.clearForm();
        this.message = 'Class deleted successfully.';
      },
      error: () =>
        (this.errorMessage = 'Unable to delete the class. Please try again.'),
    });
  }
  // clear form
  clearForm(): void {
    this.editingId = null;
    this.selectedSchoolId = null;
    this.selectedSessionId = null;
    this.className = '';
    this.classSection = '';
    this.errorMessage = '';
  }

  // sort newest first
  private sortNewestFirst(classes: ClassRecord[]): ClassRecord[] {
    return [...classes].sort((a, b) => this.recordTime(b) - this.recordTime(a) || (b.id ?? 0) - (a.id ?? 0));
  }

  // record time
  private recordTime(item: ClassRecord): number {
    return item.insertedDate ? new Date(item.insertedDate).getTime() : 0;
  }
}
