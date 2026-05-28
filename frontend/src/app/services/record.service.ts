import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Record } from '../types';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = 'http://localhost:3000/api';

  getRecords(): Observable<Record[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<Record[]>(`${this.API_URL}/records`, { headers });
  }
}
