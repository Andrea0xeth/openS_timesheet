/**
 * Gestione autenticazione e sessione utente
 */

import { User } from './api';

const USER_STORAGE_KEY = 'timesheet_user';
const TOKEN_STORAGE_KEY = 'timesheet_token';

export function saveUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'authenticated');
  }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TOKEN_STORAGE_KEY) === 'authenticated';
}

export function isManager(): boolean {
  const user = getUser();
  return user?.ruolo === 'manager';
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

