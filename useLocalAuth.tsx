/**
 * LocalAuth React Hooks
 * 
 * 使用方式：複製到你的專案 src/hooks/
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { authClient, User, LoginCredentials, RegisterData, ChangePasswordData } from './localauth-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - 包裹在你的 App 外層
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化：檢查是否已登入
  useEffect(() => {
    const initAuth = async () => {
      if (authClient.isAuthenticated()) {
        try {
          const profile = await authClient.getProfile();
          setUser(profile);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          authClient.clearTokens();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authClient.login(credentials);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authClient.register(data);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    try {
      setError(null);
      await authClient.changePassword(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    changePassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook - 在任何 component 中使用
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * 使用範例：
 * 
 * // 1. 在 App.tsx 包裹 AuthProvider
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * 
 * // 2. 在任何 component 中使用
 * function LoginPage() {
 *   const { login, loading, error } = useAuth();
 *   
 *   const handleLogin = async () => {
 *     try {
 *       await login({ email, password });
 *       navigate('/dashboard');
 *     } catch (err) {
 *       console.error(err);
 *     }
 *   };
 *   
 *   return <button onClick={handleLogin}>Login</button>;
 * }
 * 
 * // 3. 檢查登入狀態
 * function Dashboard() {
 *   const { user, isAuthenticated, logout } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" />;
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>Welcome {user?.name}</h1>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 */
