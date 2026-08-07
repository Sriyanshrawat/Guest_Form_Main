import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { StreamPayload, StreamRecord } from '../models/streams.model';

@Injectable({
  providedIn: 'root',
})
export class StreamsService {
  private apiUrl = environment.apiUrl;

  // injects HttpClient
  constructor(private http: HttpClient) {}

  // fetches all streams
  getStreams(): Observable<StreamRecord[]> {
    return this.http.get<StreamRecord[]>(`${this.apiUrl}/Streams`);
  }

  // creates a new stream
  createStream(payload: StreamPayload): Observable<StreamRecord> {
    return this.http.post<StreamRecord>(`${this.apiUrl}/Streams`, payload);
  }

  // updates an existing stream
  updateStream(id: number, payload: StreamPayload): Observable<StreamRecord> {
    return this.http.put<StreamRecord>(`${this.apiUrl}/Streams/${id}`, payload);
  }

  // deletes a stream by id
  deleteStream(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Streams/${id}`);
  }
}