import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RecordService } from '../../services/record.service';
import { UserService } from '../../services/user.service';
import { Record, User } from '../../types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private recordService = inject(RecordService);
  private userService = inject(UserService);
  private router = inject(Router);

  // Active User Signal aliases
  currentUser = this.authService.currentUser;
  isAdmin = this.authService.isAdmin;

  // Active UI Navigation Tab
  activeTab = signal<'records' | 'admin'>('records');

  // Latency Selection Options
  latencyOptions = [
    { label: 'Instant (0 ms)', value: 0 },
    { label: 'Fast 3G (500 ms)', value: 500 },
    { label: 'Normal (1000 ms)', value: 1000 },
    { label: 'Slow Connection (2000 ms)', value: 2000 },
    { label: 'Ultra Latency (4000 ms)', value: 4000 }
  ];

  // Records state
  records = signal<Record[]>([]);
  isRecordsLoading = signal(false);
  recordsError = signal<string | null>(null);

  // Users state (Admin Only)
  users = signal<User[]>([]);
  isUsersLoading = signal(false);
  usersError = signal<string | null>(null);

  // User Form Modal state (Admin CRUD)
  isFormOpen = signal(false);
  isEditing = signal(false);
  formError = signal<string | null>(null);
  formSubmitting = signal(false);
  
  // Form Bindings
  formUserId = '';
  formUsername = '';
  formPassword = '';
  formRole: 'General User' | 'Admin' = 'General User';

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadRecords();
    
    // If admin, load system users proactively
    if (this.isAdmin()) {
      this.loadUsers();
    }
  }

  // Set the artificial delay (milliseconds)
  onLatencyChange(event: any): void {
    const value = parseInt(event.target.value, 10);
    this.authService.apiDelay.set(value);
    
    // Automatically reload active list to show loading skeletons
    if (this.activeTab() === 'records') {
      this.loadRecords();
    } else {
      this.loadUsers();
    }
  }

  loadRecords(): void {
    this.isRecordsLoading.set(true);
    this.recordsError.set(null);

    this.recordService.getRecords().subscribe({
      next: (data) => {
        this.records.set(data);
        this.isRecordsLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching records:', err);
        const errorText = err?.error?.error || 'Failed to load records.';
        this.recordsError.set(errorText);
        this.isRecordsLoading.set(false);
      }
    });
  }

  loadUsers(): void {
    if (!this.isAdmin()) return;
    
    this.isUsersLoading.set(true);
    this.usersError.set(null);

    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isUsersLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching users:', err);
        const errorText = err?.error?.error || 'Failed to load users list.';
        this.usersError.set(errorText);
        this.isUsersLoading.set(false);
      }
    });
  }

  switchTab(tab: 'records' | 'admin'): void {
    this.activeTab.set(tab);
    if (tab === 'records') {
      this.loadRecords();
    } else {
      this.loadUsers();
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ----------------------------------------------------
  // Admin User CRUD operations
  // ----------------------------------------------------
  openCreateForm(): void {
    this.isEditing.set(false);
    this.formUserId = '';
    this.formUsername = '';
    this.formPassword = '';
    this.formRole = 'General User';
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(user: User): void {
    this.isEditing.set(true);
    this.formUserId = user._id || '';
    this.formUsername = user.username;
    this.formPassword = ''; // keep empty unless updating
    this.formRole = user.role;
    this.formError.set(null);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.formError.set(null);
  }

  submitUserForm(): void {
    if (!this.formUsername.trim()) {
      this.formError.set('Username is required.');
      return;
    }
    
    if (!this.isEditing() && !this.formPassword.trim()) {
      this.formError.set('Password is required for new users.');
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    if (this.isEditing()) {
      // Edit User
      const updates: any = { role: this.formRole };
      if (this.formPassword.trim()) {
        updates.password = this.formPassword;
      }

      this.userService.updateUser(this.formUserId, updates).subscribe({
        next: (updatedUser) => {
          this.formSubmitting.set(false);
          this.isFormOpen.set(false);
          
          // Update local state list
          this.users.update(list => list.map(u => u._id === updatedUser._id ? updatedUser : u));
        },
        error: (err) => {
          this.formSubmitting.set(false);
          const errorText = err?.error?.error || 'Failed to update user.';
          this.formError.set(errorText);
        }
      });
    } else {
      // Create User
      const newUser = {
        username: this.formUsername.trim(),
        password: this.formPassword,
        role: this.formRole
      };

      this.userService.createUser(newUser).subscribe({
        next: (createdUser) => {
          this.formSubmitting.set(false);
          this.isFormOpen.set(false);
          
          // Append to local state list
          this.users.update(list => [...list, createdUser]);
        },
        error: (err) => {
          this.formSubmitting.set(false);
          const errorText = err?.error?.error || 'Failed to create user.';
          this.formError.set(errorText);
        }
      });
    }
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          // Remove from local list
          this.users.update(list => list.filter(u => u._id !== userId));
        },
        error: (err) => {
          console.error('Failed to delete user:', err);
          alert(err?.error?.error || 'Failed to delete user.');
        }
      });
    }
  }
}
