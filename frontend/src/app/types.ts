export interface User {
  _id?: string;
  username: string;
  role: 'General User' | 'Admin';
  createdAt?: string;
}

export interface Record {
  _id?: string;
  title: string;
  description: string;
  category: string;
  value: number;
  owner: string;
  accessLevel: 'General User' | 'Admin';
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
}
