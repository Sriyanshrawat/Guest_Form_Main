import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolBoardService } from '../../services/school-board.service';
import { SchoolBoard, SchoolBoardCreatePayload, SchoolBoardUpdatePayload } from '../../models/school-board.model';

@Component({
  selector: 'app-education-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './education-board.component.html',
  styleUrl: './education-board.component.css'
})
export class EducationBoardComponent implements OnInit {
  private readonly schoolBoardService = inject(SchoolBoardService);

  schoolBoards: SchoolBoard[] = [];
  boardName = '';
  editingId: number | null = null;
  message = '';
  errorMessage = '';
  loading = false;
  saving = false;

  // on init
  ngOnInit(): void {
    this.loadSchoolBoards();
  }

  // load boards
  loadSchoolBoards(): void {
    this.loading = true;
    this.errorMessage = '';

    this.schoolBoardService.getSchoolBoards().subscribe({
      next: boards => {
        const uniqueBoards = new Map<string, SchoolBoard>();
        for (const board of boards) {
          const name = (board.universityName ?? board.name ?? '').trim().toUpperCase();
          uniqueBoards.set(name, board);
        }
        this.schoolBoards = this.sortNewestFirst([...uniqueBoards.values()]);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load school board data. Please sign in as Admin and try again.';
        this.loading = false;
      }
    });
  }

  // save
  saveBoard(): void {
    const trimmedName = this.boardName.trim();
    if (!trimmedName) {
      this.errorMessage = 'School Board Name is required.';
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const createPayload: SchoolBoardCreatePayload = { name: trimmedName };
    const updatePayload: SchoolBoardUpdatePayload = { name: trimmedName, isActive: true };

    const request = this.editingId != null
      ? this.schoolBoardService.updateSchoolBoard(this.editingId, updatePayload)
      : this.schoolBoardService.createSchoolBoard(createPayload);

    request.subscribe({
      next: savedBoard => {
        if (this.editingId != null) {
          const index = this.schoolBoards.findIndex(b => b.id === this.editingId);
          if (index > -1) {
            this.schoolBoards[index] = savedBoard;
          }
          this.message = 'School board updated successfully.';
        } else {
          this.schoolBoards = this.sortNewestFirst([...this.schoolBoards, savedBoard]);
          this.message = 'School board added successfully.';
        }
        this.clearForm();
        this.saving = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || err.message || 'Unable to save school board. Please try again.';
        this.saving = false;
      }
    });
  }

  // edit
  editBoard(board: SchoolBoard): void {
    this.editingId = board.id ?? null;
    this.boardName = board.universityName ?? board.name ?? '';
    this.message = '';
    this.errorMessage = '';
  }

  // delete
  deleteBoard(id?: number): void {
    if (id == null) {
      this.errorMessage = 'Unable to delete school board because the record is missing an id.';
      return;
    }

    if (!confirm('Delete this school board?')) {
      return;
    }

    this.schoolBoardService.deleteSchoolBoard(id).subscribe({
      next: () => {
        this.schoolBoards = this.schoolBoards.filter(board => board.id !== id);
        if (this.editingId === id) {
          this.clearForm();
        }
        this.message = 'School board deleted successfully.';
      },
      error: () => {
        this.errorMessage = 'Unable to delete school board. Please try again.';
      }
    });
  }

  // clear form
  clearForm(): void {
    this.boardName = '';
    this.editingId = null;
    this.errorMessage = '';
  }

  // sort newest first
  private sortNewestFirst(boards: SchoolBoard[]): SchoolBoard[] {
    return [...boards].sort((a, b) => this.recordTime(b) - this.recordTime(a) || (b.id ?? 0) - (a.id ?? 0));
  }

  // record time
  private recordTime(board: SchoolBoard): number {
    return board.insertedDate ? new Date(board.insertedDate).getTime() : 0;
  }
}
