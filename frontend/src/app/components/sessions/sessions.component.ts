import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SessionPayload, SessionRecord } from '../../models/sessions.model';
import { SessionsService } from '../../services/sessions.service';
import { FilterGridAction, FilterGridColumn, FilterGridComponent } from '../shared/filter-grid/filter-grid.component';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterGridComponent],
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css'],
})
export class SessionsComponent implements OnInit {
  readonly gridColumns: FilterGridColumn[] = [{ header: 'Session', field: 'name', minWidth: 260 }];
  readonly gridActions: FilterGridAction[] = [{ id: 'edit', label: 'Update', icon: 'bi-pencil' }, { id: 'delete', label: 'Delete', icon: 'bi-trash3', danger: true }];
  private readonly sessionsService = inject(SessionsService);

  sessions: SessionRecord[] = [];
  sessionName = '';
  editingId: number | null = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';
  searchTerm = '';

  private static readonly SESSION_NAME_PATTERN = /^\d{4}\s*-\s*\d{4}$/;

  // get filtered sessions
  get filteredSessions(): SessionRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    return !term
      ? this.sessions
      : this.sessions.filter((item) => item.name.toLowerCase().includes(term));
  }

  // route grid action to edit or delete
  handleGridAction(event: { id: string; row: SessionRecord }): void {
    event.id === 'edit' ? this.editSession(event.row) : this.deleteSession(event.row);
  }

  // on init
  ngOnInit(): void {
    this.loadSessions();
  }

  // load sessions
  loadSessions(): void {
    this.loading = true;
    this.sessionsService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = this.sortNewestFirst(sessions);
        this.loading = false;
      },
      error: () => {
        this.errorMessage =
          'Unable to load sessions. Make sure the backend is running.';
        this.loading = false;
      },
    });
  }

  // auto-fill year
  autoFillSessionYear(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;
    const digitsOnly = rawValue.replace(/\D/g, '');

    if (digitsOnly.length === 4) {
      const startYear = Number.parseInt(digitsOnly, 10);
      this.sessionName = `${startYear} - ${startYear + 1}`;
      return;
    }

    if (digitsOnly.length > 4) {
      const startYear = Number.parseInt(digitsOnly.slice(0, 4), 10);
      this.sessionName = `${startYear} - ${startYear + 1}`;
      return;
    }

    this.sessionName = rawValue;
  }

  // save
  saveSession(): void {
    const name = this.normalizeSessionName(this.sessionName.trim());
    if (!name) {
      this.errorMessage = 'Enter a session name.';
      return;
    }

    if (!SessionsComponent.SESSION_NAME_PATTERN.test(name)) {
      this.errorMessage =
        'Session name must use the format 2001-2002, with four digits, a dash, then four digits.';
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const payload: SessionPayload = { name, isActive: true };

    const request =
      this.editingId == null
        ? this.sessionsService.createSession(payload)
        : this.sessionsService.updateSession(this.editingId, payload);

    request.subscribe({
      next: () => {
        this.message =
          this.editingId == null
            ? 'Session added successfully.'
            : 'Session updated successfully.';
        this.clearForm();
        this.loadSessions();
        this.saving = false;
      },
      error: (error: HttpErrorResponse) => {
        const serverMessage =
          error.error?.message ||
          (typeof error.error === 'string' ? error.error : undefined) ||
          error.message;

        if (error.status === 401) {
          this.errorMessage =
            'Unauthorized: please sign in again before saving a session.';
        } else if (error.status === 404) {
          this.errorMessage =
            'Session API not found. Make sure the backend is running and the URL is correct.';
        } else {
          this.errorMessage =
            serverMessage || 'Unable to save the session. Please try again.';
        }

        this.saving = false;
      },
    });
  }

  // edit
  editSession(item: SessionRecord): void {
    this.editingId = item.id ?? null;
    this.sessionName = this.formatSessionName(item.name);
    this.message = '';
    this.errorMessage = '';
  }

  // delete
  deleteSession(item: SessionRecord): void {
    if (item.id == null || !confirm(`Delete session "${item.name}"?`)) return;
    this.sessionsService.deleteSession(item.id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter((value) => value.id !== item.id);
        if (this.editingId === item.id) this.clearForm();
        this.message = 'Session deleted successfully.';
      },
      error: () =>
        (this.errorMessage = 'Unable to delete the session. Please try again.'),
    });
  }

  // clear form
  clearForm(): void {
    this.editingId = null;
    this.sessionName = '';
    this.errorMessage = '';
  }

  // normalize name
  private normalizeSessionName(value: string): string {
    const compactValue = value.replace(/\s+/g, '');
    const match = /^(\d{4})(?:-)?(\d{4})?$/.exec(compactValue);

    if (!match) {
      return value.trim();
    }

    const startYear = Number.parseInt(match[1], 10);
    const endYear = match[2] ? Number.parseInt(match[2], 10) : startYear + 1;
    return `${startYear}-${endYear}`;
  }

  // format name
  private formatSessionName(value: string): string {
    const normalized = this.normalizeSessionName(value);
    const match = /^(\d{4})-(\d{4})$/.exec(normalized);

    if (!match) {
      return value.trim();
    }

    return `${match[1]} - ${match[2]}`;
  }

  // sort newest first
  private sortNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
    return [...sessions].sort((a, b) => this.recordTime(b) - this.recordTime(a) || (b.id ?? 0) - (a.id ?? 0));
  }

  // record time
  private recordTime(item: SessionRecord): number {
    return item.insertedDate ? new Date(item.insertedDate).getTime() : 0;
  }
}
