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

  constructor(private http: HttpClient) {}

  getSpecializations(): Observable<SpecializationRecord[]> {
    return this.http.get<SpecializationRecord[]>(`${this.apiUrl}/Specializations`);
  }

  createSpecialization(payload: SpecializationPayload): Observable<SpecializationRecord> {
    return this.http.post<SpecializationRecord>(`${this.apiUrl}/Specializations`, payload);
  }

  updateSpecialization(id: number, payload: SpecializationPayload): Observable<SpecializationRecord> {
    return this.http.put<SpecializationRecord>(`${this.apiUrl}/Specializations/${id}`, payload);
  }

  deleteSpecialization(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Specializations/${id}`);
  }
}