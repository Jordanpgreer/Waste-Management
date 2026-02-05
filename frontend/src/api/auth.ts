import { apiClient } from './client';
import { User, LoginResponse } from '../types';

export interface LoginInput {
  email: string;
  password: string;
  orgId?: string;
}

export interface RegisterInput {
  orgId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const authApi = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', input);
    if (response.data) {
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    }
    throw new Error('Login failed');
  },

  async register(input: RegisterInput): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/register', input);
    if (response.data) {
      localStorage.setItem('access_token', response.data.tokens.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    }
    throw new Error('Registration failed');
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    if (response.data) {
      return response.data.user;
    }
    throw new Error('Failed to get user');
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};
