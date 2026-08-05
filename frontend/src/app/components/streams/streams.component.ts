import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { StreamPayload, StreamRecord } from '../../models/streams.model';
import { StreamsService } from '../../services/streams.service';
import { ClassesService } from '../../services/classes.service';
import { SchoolService } from '../../services/school.service';
import { SessionsService } from '../../services/sessions.service';
import { ClassRecord } from '../../models/classes.model';
import { School } from '../../models/school.model';
import { SessionRecord } from '../../models/sessions.model';
import { FilterGridAction, FilterGridColumn, FilterGridComponent } from '../shared/filter-grid/filter-grid.component';

const STREAM_ELIGIBLE = new Set(['VIII', 'IX', 'X', 'XI', 'XII']);

@Component({
  selector: 'app-streams',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterGridComponent],
  templateUrl: './streams.component.html',
  styleUrl: './streams.component.css',
})
export class StreamsComponent implements OnInit {
  readonly gridColumns: FilterGridColumn[] = [{ header: 'School', field: 'schoolName' }, { header: 'Class', field: 'className' }, { header: 'Section', field: 'classSection' }, { header: 'Stream', field: 'name' }, { header: 'Acronym', field: 'acronym' }];
  readonly gridActions: FilterGridAction[] = [{ id: 'edit', label: 'Update', icon: 'bi-pencil' }, { id: 'delete', label: 'Delete', icon: 'bi-trash3', danger: true }];
  private readonly streamsService = inject(StreamsService);
  private readonly classesService = inject(ClassesService);
  private readonly schoolService = inject(SchoolService);
  private readonly sessionsService = inject(SessionsService);
  private readonly router = inject(Router);

  streams: StreamRecord[] = [];
  schools: School[] = [];
  allClasses: ClassRecord[] = [];
  sessions: SessionRecord[] = [];
  eligibleClasses: ClassRecord[] = [];

  selectedSchoolId: number | null = null;
  selectedClassId: number | null = null;
  streamName = '';
  acronym = '';
  searchTerm = '';
  editingId: number | null = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  // get filtered streams
  get filteredStreams(): StreamRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.streams;
    return this.streams.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.acronym ?? '').toLowerCase().includes(term) ||
        (item.className ?? '').toLowerCase().includes(term) ||
        (item.classSection ?? '').toLowerCase().includes(term) ||
        (item.schoolName ?? '').toLowerCase().includes(term),
    );
  }

  // on init
  ngOnInit(): void {
    this.loadStreams();
    this.loadSchools();
    this.loadClasses();
    this.loadSessions();
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
    this.classesService.getClasses().subscribe({
      next: (classes) => {
        this.allClasses = classes;
        this.updateEligibleClasses();
      },
      error: () => {},
    });
  }

  // load sessions
  loadSessions(): void {
    this.sessionsService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.updateEligibleClasses();
      },
      error: () => {},
    });
  }

  // load streams
  loadStreams(): void {
    this.loading = true;
    this.streamsService.getStreams().subscribe({
      next: (streams) => {
        this.streams = this.sortNewestFirst(streams);
        this.updateEligibleClasses();
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.errorMessage =
            'Please sign in again as an admin to view streams.';
          this.router.navigate(['/login']);
        } else {
          this.errorMessage =
            'Unable to load streams. Make sure the backend is running.';
        }
        this.loading = false;
      },
    });
  }

  // on school change
  onSchoolChange(): void {
    this.selectedClassId = null;
    this.streamName = '';
    this.updateEligibleClasses();
  }

  // update eligible classes
  private updateEligibleClasses(): void {
    if (!this.selectedSchoolId) {
      this.eligibleClasses = [];
      return;
    }

    this.eligibleClasses = this.allClasses.filter(
      (c) =>
        c.schoolId === this.selectedSchoolId &&
        c.name &&
        STREAM_ELIGIBLE.has(c.name) &&
        c.id != null,
    );
  }

  // save
  saveStream(): void {
    const name = this.streamName.trim();
    if (!this.selectedClassId || !name) {
      this.errorMessage =
        'Select a class and enter a stream name.';
      return;
    }
    this.saving = true;
    this.message = '';
    this.errorMessage = '';
    const payload: StreamPayload = {
      classId: this.selectedClassId,
      name,
      acronym: this.acronym?.trim() || undefined,
      isActive: true,
    };
    const request =
      this.editingId == null
        ? this.streamsService.createStream(payload)
        : this.streamsService.updateStream(this.editingId, payload);
    request.subscribe({
      next: () => {
        this.message =
          this.editingId == null
            ? 'Stream added successfully.'
            : 'Stream updated successfully.';
        this.clearForm();
        this.loadStreams();
        this.saving = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.error?.message ||
          'Unable to save the stream. Please try again.';
        this.saving = false;
      },
    });
  }

  // edit
  editStream(item: StreamRecord): void {
    this.editingId = item.id ?? null;
    this.selectedSchoolId =
      this.findClassSchoolId(item.classId) ?? null;
    this.selectedClassId = item.classId;
    this.updateEligibleClasses();
    this.streamName = item.name;
    this.acronym = item.acronym ?? '';
    this.message = '';
    this.errorMessage = '';
  }

  // find class school id
  private findClassSchoolId(classId: number): number | undefined {
    const cls = this.allClasses.find((c) => c.id === classId);
    return cls?.schoolId ?? undefined;
  }

  // delete
  deleteStream(item: StreamRecord): void {
    if (item.id == null || !confirm(`Delete stream "${item.name}"?`))
      return;
    this.streamsService.deleteStream(item.id).subscribe({
      next: () => {
        this.streams = this.streams.filter(
          (value) => value.id !== item.id,
        );
        if (this.editingId === item.id) this.clearForm();
        this.message = 'Stream deleted successfully.';
      },
      error: () =>
        (this.errorMessage =
          'Unable to delete the stream. Please try again.'),
    });
  }

  // clear form
  clearForm(): void {
    this.editingId = null;
    this.selectedSchoolId = null;
    this.selectedClassId = null;
    this.streamName = '';
    this.acronym = '';
    this.eligibleClasses = [];
    this.errorMessage = '';
  }

  // sort newest first
  private sortNewestFirst(streams: StreamRecord[]): StreamRecord[] {
    return [...streams].sort((a, b) => this.recordTime(b) - this.recordTime(a) || (b.id ?? 0) - (a.id ?? 0));
  }

  // record time
  private recordTime(item: StreamRecord): number {
    return item.insertedDate ? new Date(item.insertedDate).getTime() : 0;
  }

  handleGridAction(event: { id: string; row: StreamRecord }): void { event.id === 'edit' ? this.editStream(event.row) : this.deleteStream(event.row); }
}
