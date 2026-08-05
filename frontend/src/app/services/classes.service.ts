import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClassPayload, ClassRecord } from '../models/classes.model';

@Injectable({
  providedIn: 'root',
})
export class ClassesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getClasses(): Observable<ClassRecord[]> {
    return this.http.get<ClassRecord[]>(`${this.apiUrl}/Classes`);
  }

  createClass(payload: ClassPayload): Observable<ClassRecord> {
    return this.http.post<ClassRecord>(`${this.apiUrl}/Classes`, payload);
  }

  updateClass(id: number, payload: ClassPayload): Observable<ClassRecord> {
    return this.http.put<ClassRecord>(`${this.apiUrl}/Classes/${id}`, payload);
  }

  deleteClass(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Classes/${id}`);
  }
}