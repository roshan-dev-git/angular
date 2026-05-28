import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api';

  // Signals for reactive application state
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');

  // Simulated latency for API calls
  readonly apiDelay = signal<number>(1000); // default to 1 second delay

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    if (username && role && userId) {
      this.currentUser.set({
        _id: userId,
        username,
        role: role as 'General User' | 'Admin'
      });
    }
  }

  login(username: string, password: string, role: 'General User' | 'Admin'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, {
      username,
      password,
      role
    }).pipe(
      tap((res) => {
        if (res.success && res.user) {
          localStorage.setItem('username', res.user.username);
          localStorage.setItem('role', res.user.role);
          if (res.user._id) {
            localStorage.setItem('userId', res.user._id);
          }
          this.currentUser.set(res.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    this.currentUser.set(null);
  }

  // Returns auth headers for API calls
  getAuthHeaders(): HttpHeaders {
    const user = this.currentUser();
    let headers = new HttpHeaders();
    if (user) {
      headers = headers
        .set('x-username', user.username)
        .set('x-role', user.role)
        .set('x-delay', this.apiDelay().toString());
    }
    return headers;
  }
}
