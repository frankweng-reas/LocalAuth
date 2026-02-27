# ReadyQA 整合 LocalAuth

## 📦 三步驟整合

### 1️⃣ 複製檔案
```bash
cp localauth-client.ts src/lib/
cp useLocalAuth.tsx src/hooks/
```

### 2️⃣ 設定環境變數
```bash
# .env
VITE_LOCALAUTH_URL=http://localhost:4000
```

### 3️⃣ 包裹 AuthProvider
```tsx
// main.tsx
import { AuthProvider } from './hooks/useLocalAuth';

<AuthProvider>
  <App />
</AuthProvider>
```

## 🚀 使用方式

### 登入
```tsx
const { login } = useAuth();
await login({ email, password });
```

### 取得用戶
```tsx
const { user, isAuthenticated } = useAuth();
```

### 登出
```tsx
const { logout } = useAuth();
await logout();
```

## 🔄 Supabase 遷移對照

| Supabase | LocalAuth |
|----------|-----------|
| `supabase.auth.signInWithPassword()` | `login({ email, password })` |
| `supabase.auth.getUser()` | `user` |
| `supabase.auth.signOut()` | `logout()` |

## 完整範例在 `useLocalAuth.tsx` 最下方
