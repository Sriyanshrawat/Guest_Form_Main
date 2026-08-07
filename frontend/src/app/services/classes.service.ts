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

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches all classes
  getClasses(): Observable<ClassRecord[]> {
    return this.http.get<ClassRecord[]>(`${this.apiUrl}/Classes`);
  }

  // creates a new class
  createClass(payload: ClassPayload): Observable<ClassRecord> {
    return this.http.post<ClassRecord>(`${this.apiUrl}/Classes`, payload);
  }

  // updates an existing class
  updateClass(id: number, payload: ClassPayload): Observable<ClassRecord> {
    return this.http.put<ClassRecord>(`${this.apiUrl}/Classes/${id}`, payload);
  }

  // deletes a class by id
  deleteClass(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Classes/${id}`);
  }
}