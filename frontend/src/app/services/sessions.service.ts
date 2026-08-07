import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionPayload, SessionRecord } from '../models/sessions.model';

@Injectable({
  providedIn: 'root',
})
export class SessionsService {
  private apiUrl = environment.apiUrl;

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches all sessions
  getSessions(): Observable<SessionRecord[]> {
    return this.http.get<SessionRecord[]>(`${this.apiUrl}/Sessions`);
  }

  // creates a new session
  createSession(payload: SessionPayload): Observable<SessionRecord> {
    return this.http.post<SessionRecord>(`${this.apiUrl}/Sessions`, payload);
  }

  // updates an existing session
  updateSession(id: number, payload: SessionPayload): Observable<SessionRecord> {
    return this.http.put<SessionRecord>(`${this.apiUrl}/Sessions/${id}`, payload);
  }

  // deletes a session by id
  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Sessions/${id}`);
  }
}