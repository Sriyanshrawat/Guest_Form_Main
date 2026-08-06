import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LookupOption, Student } from '../models/student.model';

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStudents(includeInactive = false): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.apiUrl}/Students?includeInactive=${includeInactive}`);
  }

  getStudent(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/Students/${id}`);
  }

  getMyStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.apiUrl}/Students/my`);
  }

  createStudent(payload: Partial<Student>): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/Students`, payload);
  }

  updateStudent(id: number, payload: Partial<Student>): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/Students/${id}`, payload);
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Students/${id}`);
  }

  approveStudent(id: number): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/Students/${id}/approve`, {});
  }

  rejectStudent(id: number, note?: string): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/Students/${id}/reject`, { note });
  }

  getBoards(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/boards`);
  }

  getSessions(boardId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/boards/${boardId}/sessions`);
  }

  getSchools(boardId: number, sessionId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/Students/boards/${boardId}/sessions/${sessionId}/schools`
    );
  }

  getClasses(boardId: number, sessionId: number, schoolId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/Students/boards/${boardId}/sessions/${sessionId}/schools/${schoolId}/classes`
    );
  }

  getStreams(classId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/classes/${classId}/streams`);
  }

  getSpecializations(classId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/classes/${classId}/specializations`);
  }
}