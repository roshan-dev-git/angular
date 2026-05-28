import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../types';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = 'https://angular-qmyv.onrender.com/api';

  getUsers(): Observable<User[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<User[]>(`${this.API_URL}/users`, { headers });
  }

  createUser(user: Partial<User> & { password?: string }): Observable<User> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<User>(`${this.API_URL}/users`, user, { headers });
  }

  updateUser(id: string, updates: Partial<User> & { password?: string }): Observable<User> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put<User>(`${this.API_URL}/users/${id}`, updates, { headers });
  }

  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/users/${id}`, { headers });
  }
}
