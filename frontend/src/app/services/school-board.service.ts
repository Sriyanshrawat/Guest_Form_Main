import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SchoolBoard,
  SchoolBoardCreatePayload,
  SchoolBoardUpdatePayload,
} from '../models/school-board.model';

@Injectable({
  providedIn: 'root',
})
export class SchoolBoardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSchoolBoards(): Observable<SchoolBoard[]> {
    return this.http.get<SchoolBoard[]>(`${this.apiUrl}/SchoolBoards`);
  }

  createSchoolBoard(payload: SchoolBoardCreatePayload): Observable<SchoolBoard> {
    return this.http.post<SchoolBoard>(`${this.apiUrl}/SchoolBoards`, payload);
  }

  updateSchoolBoard(id: number, payload: SchoolBoardUpdatePayload): Observable<SchoolBoard> {
    return this.http.put<SchoolBoard>(`${this.apiUrl}/SchoolBoards/${id}`, payload);
  }

  deleteSchoolBoard(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/SchoolBoards/${id}`);
  }
}