import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SpecializationPayload, SpecializationRecord } from '../models/specialization.model';

@Injectable({
  providedIn: 'root',
})
export class SpecializationService {
  private apiUrl = environment.apiUrl;

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches all specializations
  getSpecializations(): Observable<SpecializationRecord[]> {
    return this.http.get<SpecializationRecord[]>(`${this.apiUrl}/Specializations`);
  }

  // creates a new specialization
  createSpecialization(payload: SpecializationPayload): Observable<SpecializationRecord> {
    return this.http.post<SpecializationRecord>(`${this.apiUrl}/Specializations`, payload);
  }

  // updates an existing specialization
  updateSpecialization(id: number, payload: SpecializationPayload): Observable<SpecializationRecord> {
    return this.http.put<SpecializationRecord>(`${this.apiUrl}/Specializations/${id}`, payload);
  }

  // deletes a specialization by id
  deleteSpecialization(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Specializations/${id}`);
  }
}