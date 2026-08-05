import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConfigurationListItem,
  LookupOption,
  SaveConfigurationPayload,
  SpecializationDetails,
} from '../models/full-configuration.model';

@Injectable({
  providedIn: 'root',
})
export class FullConfigurationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getBoards(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/FullConfiguration/boards`);
  }

  getSessions(boardId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/FullConfiguration/boards/${boardId}/sessions`);
  }

  getSchools(boardId: number, sessionId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/FullConfiguration/boards/${boardId}/sessions/${sessionId}/schools`
    );
  }

  getClasses(boardId: number, sessionId: number, schoolId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/FullConfiguration/boards/${boardId}/sessions/${sessionId}/schools/${schoolId}/classes`
    );
  }

  getDetails(sessionId: number, classId: number): Observable<SpecializationDetails> {
    return this.http.get<SpecializationDetails>(
      `${this.apiUrl}/FullConfiguration/details?sessionId=${sessionId}&classId=${classId}`
    );
  }

  saveConfiguration(payload: SaveConfigurationPayload): Observable<ConfigurationListItem> {
    return this.http.post<ConfigurationListItem>(`${this.apiUrl}/FullConfiguration/save`, payload);
  }

  updateConfiguration(id: number, payload: SaveConfigurationPayload): Observable<ConfigurationListItem> {
    return this.http.put<ConfigurationListItem>(`${this.apiUrl}/FullConfiguration/${id}`, payload);
  }

  getSavedConfigurations(): Observable<ConfigurationListItem[]> {
    return this.http.get<ConfigurationListItem[]>(`${this.apiUrl}/FullConfiguration/saved`);
  }

  deleteConfiguration(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/FullConfiguration/${id}`);
  }
}