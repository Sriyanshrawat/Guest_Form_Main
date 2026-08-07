import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { School, SchoolPayload } from '../models/school.model';

@Injectable({
  providedIn: 'root',
})
export class SchoolService {
  private apiUrl = environment.apiUrl;

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches all schools
  getSchools(): Observable<School[]> {
    return this.http.get<School[]>(`${this.apiUrl}/Schools`);
  }

  // creates a new school
  createSchool(payload: SchoolPayload): Observable<School> {
    return this.http.post<School>(`${this.apiUrl}/Schools`, payload);
  }

  // updates an existing school
  updateSchool(id: number, payload: SchoolPayload): Observable<School> {
    return this.http.put<School>(`${this.apiUrl}/Schools/${id}`, payload);
  }

  // deletes a school by id
  deleteSchool(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Schools/${id}`);
  }
}