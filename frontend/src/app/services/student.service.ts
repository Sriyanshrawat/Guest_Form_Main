import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LookupOption, Student, StudentSubmission } from '../models/student.model';

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private apiUrl = environment.apiUrl;

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches a list of students
  getStudents(includeInactive = false): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.apiUrl}/Students?includeInactive=${includeInactive}`);
  }

  // fetches a single student by id
  getStudent(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/Students/${id}`);
  }

  // fetches students owned by the current user
  getMyStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.apiUrl}/Students/my`);
  }

  // creates a new student record
  createStudent(payload: Partial<Student>): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/Students`, payload);
  }

  // updates an existing student record
  updateStudent(id: number, payload: Partial<Student>): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/Students/${id}`, payload);
  }

  // deletes a student by id
  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Students/${id}`);
  }

  // approves a student record
  approveStudent(id: number): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/Students/${id}/approve`, {});
  }

  // rejects a student record with an optional note
  rejectStudent(id: number, note?: string): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/Students/${id}/reject`, { note });
  }

  // ---- StudentSubmissions (application queue) ----

  // fetches a list of submissions
  getSubmissions(includeInactive = false): Observable<StudentSubmission[]> {
    return this.http.get<StudentSubmission[]>(
      `${this.apiUrl}/StudentSubmissions?includeInactive=${includeInactive}`
    );
  }

  // fetches a single submission by id
  getSubmission(id: number): Observable<StudentSubmission> {
    return this.http.get<StudentSubmission>(`${this.apiUrl}/StudentSubmissions/${id}`);
  }

  // fetches submissions owned by the current user
  getMySubmissions(): Observable<StudentSubmission[]> {
    return this.http.get<StudentSubmission[]>(`${this.apiUrl}/StudentSubmissions/my`);
  }

  // creates a new student submission
  createSubmission(payload: Partial<StudentSubmission>): Observable<StudentSubmission> {
    return this.http.post<StudentSubmission>(`${this.apiUrl}/StudentSubmissions`, payload);
  }

  // updates an existing submission
  updateSubmission(id: number, payload: Partial<StudentSubmission>): Observable<StudentSubmission> {
    return this.http.put<StudentSubmission>(`${this.apiUrl}/StudentSubmissions/${id}`, payload);
  }

  // deletes a submission by id
  deleteSubmission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/StudentSubmissions/${id}`);
  }

  // approves a submission record
  approveSubmission(id: number): Observable<StudentSubmission> {
    return this.http.post<StudentSubmission>(`${this.apiUrl}/StudentSubmissions/${id}/approve`, {});
  }

  // rejects a submission with an optional note
  rejectSubmission(id: number, note?: string): Observable<StudentSubmission> {
    return this.http.post<StudentSubmission>(`${this.apiUrl}/StudentSubmissions/${id}/reject`, { note });
  }

  // fetches the list of education boards
  getBoards(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/boards`);
  }

  // fetches sessions for the given board
  getSessions(boardId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/boards/${boardId}/sessions`);
  }

  // fetches schools for the given board and session
  getSchools(boardId: number, sessionId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/Students/boards/${boardId}/sessions/${sessionId}/schools`
    );
  }

  // fetches classes for the given board, session, and school
  getClasses(boardId: number, sessionId: number, schoolId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(
      `${this.apiUrl}/Students/boards/${boardId}/sessions/${sessionId}/schools/${schoolId}/classes`
    );
  }

  // fetches streams for the given class
  getStreams(classId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/classes/${classId}/streams`);
  }

  // fetches specializations for the given class
  getSpecializations(classId: number): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.apiUrl}/Students/classes/${classId}/specializations`);
  }
}