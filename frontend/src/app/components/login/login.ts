import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form Fields
  username = '';
  password = '';
  role: 'General User' | 'Admin' = 'General User';

  // State signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage.set('Please fill out all fields.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Call authentication service
    this.authService.login(this.username.trim(), this.password, this.role).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          console.log('Login successful! Redirecting to dashboard...');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Login error response:', err);
        const errorText = err?.error?.error || 'An error occurred during login. Please try again.';
        this.errorMessage.set(errorText);
      }
    });
  }

  // Pre-fill helper for quick testing
  fillCredentials(role: 'General User' | 'Admin'): void {
    this.role = role;
    if (role === 'Admin') {
      this.username = 'admin';
      this.password = 'admin123';
    } else {
      this.username = 'user1';
      this.password = 'user123';
    }
  }
}
