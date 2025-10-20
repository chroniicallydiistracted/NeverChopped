// Token storage utilities for Sleeper JWT authentication

const JWT_TOKEN_KEY = 'sleeper_jwt_token';
const REFRESH_TOKEN_KEY = 'sleeper_refresh_token';
const USER_DATA_KEY = 'sleeper_user_data';
const TOKEN_EXPIRY_KEY = 'sleeper_token_expiry';

export interface StoredUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
}

/**
 * Store JWT access token
 */
export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(JWT_TOKEN_KEY, token);
    // Try to parse JWT exp claim for accurate expiry
    let expiryMs = Date.now() + (60 * 60 * 1000); // fallback 1h
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload && typeof payload.exp === 'number') {
          expiryMs = payload.exp * 1000; // seconds -> ms
        }
      }
    } catch {}
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryMs));
  } catch (error) {
    console.error('Failed to store access token:', error);
  }
}

/**
 * Get JWT access token
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(JWT_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Store refresh token
 */
export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store refresh token:', error);
  }
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Store user data
 */
export function setUserData(user: StoredUser): void {
  try {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
}

/**
 * Get user data
 */
export function getUserData(): StoredUser | null {
  try {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(): boolean {
  try {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;
    
    const expiry = parseInt(expiryStr, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    return now >= (expiry - fiveMinutes);
  } catch (error) {
    console.error('Failed to check token expiry:', error);
    return true;
  }
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  try {
    localStorage.removeItem(JWT_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return !!token && !isTokenExpired();
}
