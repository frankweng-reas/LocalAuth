/**
 * LocalAuth Client - TypeScript 版本
 * 
 * 使用方式：複製到你的專案 src/lib/ 或 src/services/
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

const LOCALAUTH_URL = process.env.NEXT_PUBLIC_LOCALAUTH_URL || 'http://localhost:4000';

export class LocalAuthClient {
  private baseUrl: string;

  constructor(baseUrl: string = LOCALAUTH_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 註冊新用戶
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const result: AuthResponse = await response.json();
    
    // 自動儲存 token
    this.saveTokens(result.access_token, result.refresh_token);
    
    return result;
  }

  /**
   * 用戶登入
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const result: AuthResponse = await response.json();
    
    // 自動儲存 token
    this.saveTokens(result.access_token, result.refresh_token);
    
    return result;
  }

  /**
   * 取得當前用戶資料
   */
  async getProfile(): Promise<User> {
    return this.fetchWithAuth<User>(`${this.baseUrl}/auth/profile`);
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await this.fetchWithAuth(`${this.baseUrl}/auth/logout`, {
        method: 'POST'
      });
    } finally {
      this.clearTokens();
    }
  }

  /**
   * 修改密碼
   */
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    return this.fetchWithAuth(`${this.baseUrl}/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Refresh token expired');
    }

    const data: AuthResponse = await response.json();
    this.saveTokens(data.access_token, data.refresh_token);
    
    return data;
  }

  /**
   * 帶認證的 fetch（自動處理 token 過期）
   */
  private async fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
    let token = this.getAccessToken();

    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    // 如果 401，嘗試刷新 token
    if (response.status === 401) {
      try {
        await this.refreshToken();
        token = this.getAccessToken();
        
        // 重試原請求
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        // 刷新失敗，清除 token
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  /**
   * 檢查是否已登入
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * 取得當前 access token
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  /**
   * 取得當前 refresh token
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  /**
   * 儲存 tokens
   */
  private saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * 清除 tokens
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

// 建立單例實例
export const authClient = new LocalAuthClient();
