# ReadyQA 整合 LocalAuth 指南

## 🎯 整合目標

將 ReadyQA 從 Supabase 認證改為使用 LocalAuth。

---

## ⚙️ LocalAuth 設定（已完成）

### 目前配置
```bash
# .env
EMAIL_PROVIDER=console  # Console 模式，接受任意 email
BASE_URL=http://localhost:3000
```

✅ **好處**：
- 接受任意 email 註冊
- 不受 Resend 限制
- 適合開發測試

---

## 🔗 API 端點

### Base URL
```
http://localhost:3000
```

### 主要 API

#### 1. 註冊
```bash
POST /auth/register

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"  # 選填
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false
  },
  "message": "Registration successful..."
}
```

#### 2. 登入
```bash
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### 3. 取得用戶資料
```bash
GET /auth/profile
Headers: Authorization: Bearer {access_token}

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name"
}
```

#### 4. 刷新 Token
```bash
POST /auth/refresh

Request:
{
  "refresh_token": "eyJhbGc..."
}

Response:
{
  "access_token": "new_token...",
  "refresh_token": "new_refresh..."
}
```

#### 5. 登出
```bash
POST /auth/logout
Headers: Authorization: Bearer {access_token}

Response:
{
  "message": "Logged out successfully"
}
```

---

## 📝 整合步驟

### Step 1: 替換註冊 API

**原本（Supabase）：**
```javascript
// Supabase
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password
})
```

**改為（LocalAuth）：**
```javascript
// LocalAuth
const response = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    password: password,
    name: name  // 選填
  })
});

const data = await response.json();
// data.access_token
// data.refresh_token
// data.user
```

### Step 2: 替換登入 API

**原本（Supabase）：**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
})
```

**改為（LocalAuth）：**
```javascript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    password: password
  })
});

const data = await response.json();
// 儲存 token
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('refresh_token', data.refresh_token);
```

### Step 3: 替換取得用戶資料

**原本（Supabase）：**
```javascript
const { data: { user } } = await supabase.auth.getUser()
```

**改為（LocalAuth）：**
```javascript
const token = localStorage.getItem('access_token');
const response = await fetch('http://localhost:3000/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const user = await response.json();
```

### Step 4: 替換登出

**原本（Supabase）：**
```javascript
await supabase.auth.signOut()
```

**改為（LocalAuth）：**
```javascript
const token = localStorage.getItem('access_token');
await fetch('http://localhost:3000/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 清除本地 token
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');
```

### Step 5: Token 自動刷新（建議）

```javascript
// 攔截器：自動刷新過期的 token
async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('access_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  // 如果 token 過期（401），嘗試刷新
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    
    const refreshResponse = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // 重試原請求
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${data.access_token}`
        }
      });
    } else {
      // 刷新失敗，導向登入頁
      window.location.href = '/login';
    }
  }
  
  return response;
}
```

---

## 🧪 測試

### 快速測試腳本

```bash
# 1. 註冊
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "readyqa_user@test.com",
    "password": "testpass123",
    "name": "ReadyQA Test User"
  }'

# 2. 登入
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "readyqa_user@test.com",
    "password": "testpass123"
  }'

# 3. 取得 profile（替換 YOUR_TOKEN）
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ 注意事項

### 開發階段（目前）

1. **Email 驗證**
   - Console 模式：郵件輸出到日誌
   - `emailVerified` 會是 `false`
   - 可以選擇忽略驗證狀態

2. **跨域（CORS）**
   - LocalAuth 已啟用 CORS
   - ReadyQA 可以直接呼叫

3. **Token 儲存**
   - 使用 `localStorage` 或 `sessionStorage`
   - 注意 XSS 防護

### 生產環境（未來）

1. **真實郵件**
   - 需要設定網域
   - 或改用 `EMAIL_PROVIDER=resend`

2. **HTTPS**
   - 生產環境必須使用 HTTPS

3. **環境變數**
   - 不要硬編碼 API URL
   - 使用環境變數

---

## 🔄 遷移 Supabase 用戶（選擇性）

如果需要從 Supabase 遷移現有用戶：

1. 導出 Supabase 用戶資料
2. 使用批次 API 或直接插入資料庫
3. 通知用戶重設密碼（密碼無法遷移）

---

## 📚 完整 API 文檔

查看完整 API 清單：
```bash
cat README.md
```

測試所有 API：
```bash
./dev-test.sh  # 互動式測試工具
```

---

## 💡 常見問題

### Q: 如何處理 Email 驗證？

**開發階段（Console 模式）：**
- 忽略 `emailVerified` 狀態
- 或從日誌取得驗證 token 手動驗證

**生產環境（Resend 模式）：**
- 用戶會收到真實郵件
- 點擊連結自動驗證

### Q: Token 過期怎麼辦？

使用 Refresh Token：
```javascript
POST /auth/refresh
{ "refresh_token": "..." }
```

### Q: 如何登出所有裝置？

```javascript
POST /auth/revoke-all-sessions
```

### Q: 如何修改密碼？

```javascript
PATCH /auth/password
{
  "old_password": "...",
  "new_password": "..."
}
```

---

## 🚀 下一步

1. ✅ 在 ReadyQA 中整合註冊 API
2. ✅ 整合登入 API
3. ✅ 整合 Token 管理
4. ✅ 測試完整流程
5. 📝 考慮是否需要 Email 驗證
6. 🌐 生產環境設定網域

---

## 📞 技術支援

遇到問題？
- 查看日誌：應用程式 console
- 測試 API：`./dev-test.sh`
- 查看文檔：`README.md`
