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

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches the list of education boards
  getBoards(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/FullConfiguration/boards`);
  }

  // fetches sessions for the given board
  getSessions(boardId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/FullConfiguration/boards/${boardId}/sessions`);
  }

  // fetches schools for the given board and session
  getSchools(boardId: number, sessionId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/FullConfiguration/boards/${boardId}/sessions/${sessionId}/schools`
    );
  }

  // fetches classes for the given board, session, and school
  getClasses(boardId: number, sessionId: number, schoolId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/FullConfiguration/boards/${boardId}/sessions/${sessionId}/schools/${schoolId}/classes`
    );
  }

  // fetches specialization details for a session and class
  getDetails(sessionId: number, classId: number): Observable<SpecializationDetails> {
    return this.http.get<SpecializationDetails>(
      `${this.apiUrl}/FullConfiguration/details?sessionId=${sessionId}&classId=${classId}`
    );
  }

  // saves a new configuration record
  saveConfiguration(payload: SaveConfigurationPayload): Observable<ConfigurationListItem> {
    return this.http.post<ConfigurationListItem>(`${this.apiUrl}/FullConfiguration/save`, payload);
  }

  // updates an existing configuration record
  updateConfiguration(id: number, payload: SaveConfigurationPayload): Observable<ConfigurationListItem> {
    return this.http.put<ConfigurationListItem>(`${this.apiUrl}/FullConfiguration/${id}`, payload);
  }

  // fetches all saved configurations
  getSavedConfigurations(): Observable<ConfigurationListItem[]> {
    return this.http.get<ConfigurationListItem[]>(`${this.apiUrl}/FullConfiguration/saved`);
  }

  // deletes a configuration by id
  deleteConfiguration(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/FullConfiguration/${id}`);
  }
}