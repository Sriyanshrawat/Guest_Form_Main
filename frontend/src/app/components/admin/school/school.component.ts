import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolBoardService } from '../../../services/school-board.service';
import { SchoolService } from '../../../services/school.service';
import { SchoolBoard } from '../../../models/school-board.model';
import { School, SchoolPayload } from '../../../models/school.model';

@Component({
  selector: 'app-school',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './school.component.html',
  styleUrl: './school.component.css'
})
export class SchoolComponent implements OnInit {
  private readonly boardService = inject(SchoolBoardService);
  private readonly schoolService = inject(SchoolService);

  boards: SchoolBoard[] = [];
  schools: School[] = [];
  selectedBoardId: number | null = null;
  filterBoardId: number | null = null;
  filterActive: 'all' | 'active' | 'inactive' = 'all';
  schoolName = '';
  searchTerm = '';
  editingId: number | null = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  // get filtered schools
  get filteredSchools(): School[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.schools
      .filter(school => {
        if (this.filterBoardId != null && school.schoolBoardId !== this.filterBoardId) return false;
        if (this.filterActive === 'active' && !school.isActive) return false;
        if (this.filterActive === 'inactive' && !!school.isActive) return false;
        if (!term) return true;
        return (
          school.name.toLowerCase().includes(term) ||
          (school.schoolBoardName ?? '').toLowerCase().includes(term)
        );
      });
  }

  // on init
  ngOnInit(): void {
    this.loadBoards();
    this.loadSchools();
  }

  // load boards
  loadBoards(): void {
    this.boardService.getSchoolBoards().subscribe({
      next: boards => this.boards = boards,
      error: () => this.errorMessage = 'Unable to load school boards. Add a board first, then try again.'
    });
  }

  // load schools
  loadSchools(): void {
    this.loading = true;
    this.schoolService.getSchools().subscribe({
      next: schools => {
        const uniqueSchools = new Map<string, School>();
        for (const school of schools) {
          uniqueSchools.set(`${school.schoolBoardId}|${school.name.trim().toUpperCase()}`, school);
        }
        this.schools = this.sortNewestFirst([...uniqueSchools.values()]);
        this.loading = false;
      },
      error: () => { this.errorMessage = 'Unable to load schools. Make sure the backend is running.'; this.loading = false; }
    });
  }

  // save
  saveSchool(): void {
    const name = this.schoolName.trim();
    if (!this.selectedBoardId || !name) {
      this.errorMessage = 'Choose a board and enter the school name.';
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';
    const payload: SchoolPayload = { schoolBoardId: this.selectedBoardId, name, isActive: true };
    const request = this.editingId == null
      ? this.schoolService.createSchool(payload)
      : this.schoolService.updateSchool(this.editingId, payload);

    request.subscribe({
      next: (saved: School) => {
        const selectedBoard = this.boards.find(b => b.id === saved.schoolBoardId);
        if (selectedBoard && !saved.schoolBoardName) {
          saved.schoolBoardName = selectedBoard.universityName || selectedBoard.name;
        }

        if (this.editingId == null) {
          if (!this.schools.some(s => s.id === saved.id)) {
            this.schools = this.sortNewestFirst([...this.schools, saved]);
          }
        } else {
          const idx = this.schools.findIndex(s => s.id === saved.id);
          if (idx > -1) this.schools[idx] = saved;
        }
        this.message = this.editingId == null ? 'School added successfully.' : 'School updated successfully.';
        this.clearForm();
        this.saving = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Unable to save the school. Please try again.';
        this.saving = false;
      }
    });
  }

  // edit
  editSchool(school: School): void {
    this.editingId = school.id ?? null;
    this.selectedBoardId = school.schoolBoardId;
    this.schoolName = school.name;
    this.message = '';
    this.errorMessage = '';
  }

  // delete
  deleteSchool(school: School): void {
    if (school.id == null || !confirm(`Delete ${school.name}?`)) return;
    this.schoolService.deleteSchool(school.id).subscribe({
      next: () => {
        this.schools = this.schools.filter(item => item.id !== school.id);
        if (this.editingId === school.id) this.clearForm();
        this.message = 'School deleted successfully.';
      },
      error: () => this.errorMessage = 'Unable to delete the school. Please try again.'
    });
  }

  // clear form
  clearForm(): void {
    this.editingId = null;
    this.selectedBoardId = null;
    this.schoolName = '';
    this.errorMessage = '';
  }

  // sort newest first
  private sortNewestFirst(schools: School[]): School[] {
    return [...schools].sort((a, b) => this.recordTime(b) - this.recordTime(a) || (b.id ?? 0) - (a.id ?? 0));
  }

  // record time
  private recordTime(school: School): number {
    return school.insertedDate ? new Date(school.insertedDate).getTime() : 0;
  }
}
