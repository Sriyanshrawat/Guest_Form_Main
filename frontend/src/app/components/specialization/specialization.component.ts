import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SpecializationRecord, SpecializationPayload } from '../../models/specialization.model';
import { SpecializationService } from '../../services/specialization.service';
import { ClassesService } from '../../services/classes.service';
import { SchoolService } from '../../services/school.service';
import { StreamsService } from '../../services/streams.service';
import { ClassRecord } from '../../models/classes.model';
import { School } from '../../models/school.model';
import { StreamRecord } from '../../models/streams.model';

@Component({
  selector: 'app-specialization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './specialization.component.html',
  styleUrl: './specialization.component.css',
})
export class SpecializationComponent implements OnInit {
  private readonly specializationService = inject(SpecializationService);
  private readonly classesService = inject(ClassesService);
  private readonly schoolService = inject(SchoolService);
  private readonly streamsService = inject(StreamsService);
  private readonly router = inject(Router);

  specializations: SpecializationRecord[] = [];
  schools: School[] = [];
  allClasses: ClassRecord[] = [];
  streams: StreamRecord[] = [];
  eligibleClasses: ClassRecord[] = [];
  classStreams: StreamRecord[] = [];

  selectedSchoolId: number | null = null;
  selectedClassId: number | null = null;
  selectedStreamId: number | null = null;
  specName = '';
  searchTerm = '';
  editingId: number | null = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  // get filtered specializations
  get filteredSpecializations(): SpecializationRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.specializations;
    return this.specializations.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.className ?? '').toLowerCase().includes(term) ||
        (item.classSection ?? '').toLowerCase().includes(term) ||
        (item.schoolName ?? '').toLowerCase().includes(term) ||
        (item.streamName ?? '').toLowerCase().includes(term) ||
        (item.streamAcronym ?? '').toLowerCase().includes(term),
    );
  }

  // on init
  ngOnInit(): void {
    this.loadSpecializations();
    this.loadSchools();
    this.loadClasses();
    this.loadStreams();
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

  // load streams
  loadStreams(): void {
    this.streamsService.getStreams().subscribe({
      next: (streams) => {
        this.streams = streams;
        this.updateEligibleClasses();
      },
      error: () => {},
    });
  }

  // load specializations
  loadSpecializations(): void {
    this.loading = true;
    this.specializationService.getSpecializations().subscribe({
      next: (items) => {
        this.specializations = this.sortNewestFirst(items);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.errorMessage =
            'Please sign in again as an admin to view specializations.';
          this.router.navigate(['/login']);
        } else {
          this.errorMessage =
            'Unable to load specializations. Make sure the backend is running.';
        }
        this.loading = false;
      },
    });
  }

  // on school change
  onSchoolChange(): void {
    this.selectedClassId = null;
    this.selectedStreamId = null;
    this.classStreams = [];
    this.specName = '';
    this.updateEligibleClasses();
  }

  // on class change
  onClassChange(): void {
    this.specName = '';
    this.selectedStreamId = null;

    if (!this.selectedClassId) {
      this.classStreams = [];
      return;
    }

    this.classStreams = this.streams.filter(
      (s) => s.classId === this.selectedClassId,
    );

    if (this.classStreams.length === 1) {
      this.selectedStreamId = this.classStreams[0].id ?? null;
    }
  }

  // on stream change
  onStreamChange(): void {
  }

  // update eligible classes
  private updateEligibleClasses(): void {
    if (!this.selectedSchoolId) {
      this.eligibleClasses = [];
      return;
    }

    const classIdsWithStreams = new Set<number>(
      this.streams
        .filter((s) => s.classId != null)
        .map((s) => s.classId as number),
    );

    this.eligibleClasses = this.allClasses.filter(
      (c) =>
        c.schoolId === this.selectedSchoolId &&
        this.isSeniorSecondaryClass(c.name) &&
        c.id != null &&
        classIdsWithStreams.has(c.id),
    );
  }

  // is senior secondary
  private isSeniorSecondaryClass(className: string): boolean {
    const normalizedName = className.trim().toUpperCase();
    return normalizedName === 'XI' || normalizedName === 'XII';
  }

  // save
  saveSpecialization(): void {
    const name = this.specName.trim();
    if (!this.selectedClassId || !name) {
      this.errorMessage = 'Select Class XI or XII and enter a specialization name.';
      return;
    }
    if (this.classStreams.length > 1 && this.selectedStreamId == null) {
      this.errorMessage = 'Please select a stream for this class.';
      return;
    }
    this.saving = true;
    this.message = '';
    this.errorMessage = '';
    const payload: SpecializationPayload = {
      classId: this.selectedClassId,
      streamId: this.selectedStreamId ?? null,
      name,
      isActive: true,
    };
    const request =
      this.editingId == null
        ? this.specializationService.createSpecialization(payload)
        : this.specializationService.updateSpecialization(this.editingId, payload);
    request.subscribe({
      next: () => {
        this.message =
          this.editingId == null
            ? 'Specialization added successfully.'
            : 'Specialization updated successfully.';
        this.clearForm();
        this.loadSpecializations();
        this.saving = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.error?.message ||
          'Unable to save the specialization. Please try again.';
        this.saving = false;
      },
    });
  }

  // edit
  editSpecialization(item: SpecializationRecord): void {
    this.editingId = item.id ?? null;
    this.selectedSchoolId = this.findClassSchoolId(item.classId) ?? null;
    this.selectedClassId = item.classId;
    this.updateEligibleClasses();
    this.specName = item.name;
    this.message = '';
    this.errorMessage = '';
    this.onClassChange();
    if (item.streamId != null && this.classStreams.some((s) => s.id === item.streamId)) {
      this.selectedStreamId = item.streamId;
    }
  }

  // find class school id
  private findClassSchoolId(classId: number): number | undefined {
    const cls = this.allClasses.find((c) => c.id === classId);
    return cls?.schoolId ?? undefined;
  }

  // delete
  deleteSpecialization(item: SpecializationRecord): void {
    if (item.id == null || !confirm(`Delete specialization "${item.name}"?`))
      return;
    this.specializationService.deleteSpecialization(item.id).subscribe({
      next: () => {
        this.specializations = this.specializations.filter(
          (value) => value.id !== item.id,
        );
        if (this.editingId === item.id) this.clearForm();
        this.message = 'Specialization deleted successfully.';
      },
      error: () =>
        (this.errorMessage =
          'Unable to delete the specialization. Please try again.'),
    });
  }

  // clear form
  clearForm(): void {
    this.editingId = null;
    this.selectedSchoolId = null;
    this.selectedClassId = null;
    this.selectedStreamId = null;
    this.classStreams = [];
    this.specName = '';
    this.eligibleClasses = [];
    this.errorMessage = '';
  }

  // sort newest first
  private sortNewestFirst(items: SpecializationRecord[]): SpecializationRecord[] {
    return [...items].sort((a, b) => this.recordTime(b) - this.recordTime(a) || (b.id ?? 0) - (a.id ?? 0));
  }

  // record time
  private recordTime(item: SpecializationRecord): number {
    return item.insertedDate ? new Date(item.insertedDate).getTime() : 0;
  }
}
