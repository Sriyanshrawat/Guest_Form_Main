import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { FullConfigurationService } from '../../services/full-configuration.service';
import { LookupOption, SpecializationDetails, ConfigurationListItem } from '../../models/full-configuration.model';

@Component({
  selector: 'app-full-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './full-configuration.component.html',
  styleUrl: './full-configuration.component.css',
})
export class FullConfigurationComponent implements OnInit {
  private readonly api = inject(FullConfigurationService);
  private readonly router = inject(Router);

  boards: LookupOption[] = [];
  sessions: LookupOption[] = [];
  schools: LookupOption[] = [];
  classes: LookupOption[] = [];

  selectedBoardId: number | null = null;
  selectedSessionId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedClassId: number | null = null;

  loading = {
    boards: false,
    sessions: false,
    schools: false,
    classes: false,
    details: false,
  };
  errorMessage = '';
  saveErrorMessage = '';
  saving = false;
  savedSuccess = '';

  details: SpecializationDetails | null = null;

  savedConfigs: ConfigurationListItem[] = [];
  editingConfigId: number | null = null;

  // on init
  ngOnInit(): void {
    this.loadBoards();
    this.loadSavedConfigs();
  }

  // load boards
  loadBoards(): void {
    this.loading.boards = true;
    this.api.getBoards().subscribe({
      next: (items) => {
        this.boards = items;
        this.loading.boards = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading.boards = false;
        this.handleAuthError(err, 'Unable to load boards.');
      },
    });
  }

  // load saved configs
  loadSavedConfigs(): void {
    this.api.getSavedConfigurations().subscribe({
      next: (items) => {
        this.savedConfigs = items;
      },
    });
  }

  // config values
  configValues(value: string | null | undefined): string[] {
    if (!value) return [];
    return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
  }

  // reset downstream
  private resetDownstream(from: 'session' | 'school' | 'class'): void {
    if (from === 'session') {
      this.schools = [];
      this.classes = [];
      this.selectedSchoolId = null;
      this.selectedClassId = null;
    } else if (from === 'school') {
      this.classes = [];
      this.selectedClassId = null;
    }
    this.details = null;
  }

  // on board change
  onBoardChange(): void {
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.savedSuccess = '';
    this.selectedSessionId = null;
    this.selectedSchoolId = null;
    this.selectedClassId = null;
    this.sessions = [];
    this.schools = [];
    this.classes = [];
    this.details = null;

    if (this.selectedBoardId == null) return;

    this.loading.sessions = true;
    this.api.getSessions(this.selectedBoardId).subscribe({
      next: (items) => {
        this.sessions = items;
        this.loading.sessions = false;
      },
      error: () => {
        this.loading.sessions = false;
        this.errorMessage = 'Unable to load sessions for the selected board.';
      },
    });
  }

  // on session change
  onSessionChange(): void {
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.savedSuccess = '';
    this.resetDownstream('session');
    if (this.selectedBoardId == null || this.selectedSessionId == null) return;

    this.loading.schools = true;
    this.api
      .getSchools(this.selectedBoardId, this.selectedSessionId)
      .subscribe({
        next: (items) => {
          this.schools = items;
          this.loading.schools = false;
        },
        error: () => {
          this.loading.schools = false;
          this.errorMessage = 'Unable to load schools.';
        },
      });
  }

  // on school change
  onSchoolChange(): void {
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.savedSuccess = '';
    this.resetDownstream('school');
    if (
      this.selectedBoardId == null ||
      this.selectedSessionId == null ||
      this.selectedSchoolId == null
    )
      return;

    this.loading.classes = true;
    this.api
      .getClasses(this.selectedBoardId, this.selectedSessionId, this.selectedSchoolId)
      .subscribe({
        next: (items) => {
          this.classes = items;
          this.loading.classes = false;
        },
        error: () => {
          this.loading.classes = false;
          this.errorMessage = 'Unable to load classes.';
        },
      });
  }

  // on class change
  onClassChange(): void {
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.savedSuccess = '';
    this.details = null;
    if (this.selectedSessionId == null || this.selectedClassId == null) return;

    this.loading.details = true;
    this.api
      .getDetails(this.selectedSessionId, this.selectedClassId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.loading.details = false;
          this.errorMessage =
            err.error?.message || 'Unable to load the details for the selected class.';
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.details = data;
        this.loading.details = false;
      });
  }

  // save
  onSave(): void {
    if (!this.details) return;

    const duplicate = this.savedConfigs.some(config =>
      config.id !== this.editingConfigId &&
      config.boardId === this.details!.boardId &&
      config.sessionId === this.details!.sessionId &&
      config.schoolId === this.details!.schoolId &&
      config.classId === this.details!.classId,
    );
    if (duplicate) {
      this.saveErrorMessage = 'This board, session, school, and class configuration is already saved.';
      this.errorMessage = '';
      this.savedSuccess = '';
      return;
    }

    this.saving = true;
    this.saveErrorMessage = '';
    this.errorMessage = '';
    this.savedSuccess = '';

    const payload = {
      boardId: this.details.boardId,
      boardName: this.details.boardName,
      sessionId: this.details.sessionId,
      sessionName: this.details.sessionName,
      schoolId: this.details.schoolId,
      schoolName: this.details.schoolName,
      classId: this.details.classId,
      className: this.details.className,
      classSection: this.details.classSection,
    };

    const request = this.editingConfigId != null
      ? this.api.updateConfiguration(this.editingConfigId, payload)
      : this.api.saveConfiguration(payload);

    request.subscribe({
      next: (saved) => {
        if (this.editingConfigId != null) {
          const idx = this.savedConfigs.findIndex(c => c.id === this.editingConfigId);
          if (idx !== -1) this.savedConfigs[idx] = saved;
          this.editingConfigId = null;
        } else {
          this.savedConfigs.unshift(saved);
        }
        this.saving = false;
        this.savedSuccess = 'Configuration saved successfully.';
        this.saveErrorMessage = '';
        this.errorMessage = '';
        this.selectedBoardId = null;
        this.selectedSessionId = null;
        this.selectedSchoolId = null;
        this.selectedClassId = null;
        this.sessions = [];
        this.schools = [];
        this.classes = [];
        this.details = null;
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        if (err.status === 409) {
          this.saveErrorMessage = err.error?.message || 'This configuration is already saved.';
        } else {
          this.saveErrorMessage = err.error?.message || 'Failed to save configuration.';
        }
        this.savedSuccess = '';
        this.errorMessage = '';
      },
    });
  }

  // edit configuration
  editConfiguration(item: ConfigurationListItem): void {
    this.editingConfigId = item.id;
    this.errorMessage = '';
    this.saveErrorMessage = '';
    this.savedSuccess = '';

    this.selectedBoardId = null;
    this.selectedSessionId = null;
    this.selectedSchoolId = null;
    this.selectedClassId = null;
    this.sessions = [];
    this.schools = [];
    this.classes = [];
    this.details = null;

    this.selectedBoardId = item.boardId;
    this.loading.sessions = true;
    this.api.getSessions(item.boardId).subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading.sessions = false;
        this.selectedSessionId = item.sessionId;

        this.loading.schools = true;
        this.api.getSchools(item.boardId, item.sessionId).subscribe({
          next: (schools) => {
            this.schools = schools;
            this.loading.schools = false;
            this.selectedSchoolId = item.schoolId;

            this.loading.classes = true;
            this.api.getClasses(item.boardId, item.sessionId, item.schoolId).subscribe({
              next: (classes) => {
                this.classes = classes;
                this.loading.classes = false;
                this.selectedClassId = item.classId;
                this.onClassChange();
              },
              error: () => { this.loading.classes = false; this.errorMessage = 'Unable to load classes.'; },
            });
          },
          error: () => { this.loading.schools = false; this.errorMessage = 'Unable to load schools.'; },
        });
      },
      error: () => { this.loading.sessions = false; this.errorMessage = 'Unable to load sessions.'; },
    });
  }

  // delete configuration
  deleteConfiguration(item: ConfigurationListItem): void {
    if (item.id == null || !confirm(`Delete saved configuration "${item.boardName} — ${item.className} ${item.classSection}"?`)) return;
    this.api.deleteConfiguration(item.id).subscribe({
      next: () => {
        this.savedConfigs = this.savedConfigs.filter(c => c.id !== item.id);
        if (this.editingConfigId === item.id) {
          this.editingConfigId = null;
          this.reset();
        }
        this.savedSuccess = 'Configuration deleted successfully.';
      },
      error: () => this.errorMessage = 'Unable to delete the configuration. Please try again.',
    });
  }

  // handle auth error
  private handleAuthError(err: HttpErrorResponse, fallback: string): void {
    if (err.status === 401 || err.status === 403) {
      this.errorMessage = 'Please sign in again as an admin to use this module.';
      this.router.navigate(['/login']);
    } else {
      this.errorMessage = fallback;
    }
  }

  // reset
  reset(): void {
    this.editingConfigId = null;
    this.selectedBoardId = null;
    this.selectedSessionId = null;
    this.selectedSchoolId = null;
    this.selectedClassId = null;
    this.sessions = [];
    this.schools = [];
    this.classes = [];
    this.details = null;
    this.errorMessage = '';
    this.savedSuccess = '';
  }
}
