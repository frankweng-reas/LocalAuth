# LocalAuth

最小化的 NestJS 自架認證系統，使用 PostgreSQL + JWT + Prisma。

**GitHub**: [frankweng-reas/LocalAuth](https://github.com/frankweng-reas/LocalAuth) | `git@github.com:frankweng-reas/LocalAuth.git`

---

## 技術棧

- NestJS
- PostgreSQL
- Prisma ORM
- JWT (Access + Refresh Token)
- bcrypt（密碼加密）
- class-validator（輸入驗證）
- Nodemailer / Resend（Email 寄送）

## 功能特性

- ✅ 用戶註冊（含 Email 驗證）
- ✅ 用戶登入
- ✅ JWT Access + Refresh Token
- ✅ 忘記密碼 / 重設密碼
- ✅ 密碼 90 天到期強制變更
- ✅ 受保護的個人資料端點
- ✅ OIDC 風格 `/auth/userinfo`
- ✅ 密碼使用 bcrypt 加密 (10 rounds)
- ✅ 輸入驗證
- ✅ 管理介面（`/admin`）
- ✅ 清晰的模組化架構

## 規劃中（尚未實作）

- ⏳ 企業 AD（Active Directory）整合

---

## 專案結構

```
src/
├── auth/                  # 認證模組
│   ├── dto/
│   ├── providers/         # 認證策略（local, AD）
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── jwt-auth.guard.ts
├── users/                 # 用戶模組
│   ├── users.repository.ts
│   ├── users.service.ts
│   └── users.controller.ts
├── email/                 # Email 模組（驗證信、重設密碼信）
│   ├── email.service.ts
│   └── email.module.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── app.module.ts
└── main.ts
```

---

## 快速開始

### 前置需求

- Node.js (v18+)
- PostgreSQL (v12+) 或 Docker
- npm 或 yarn

### 1. 配置環境變數

複製 `.env.example` 到 `.env` 並修改：

```bash
cp .env.example .env
```

主要設定項：

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `JWT_SECRET` | JWT 簽章密鑰 |
| `JWT_ACCESS_EXPIRES_IN` | Access token 有效期（預設 1h） |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token 有效期（預設 7d） |
| `PORT` | 服務埠號（預設 4000） |
| `BASE_URL` | 前端網址（驗證信、重設密碼連結用） |
| `EMAIL_PROVIDER` | `resend` / `smtp` / `console`（console 僅輸出到 log） |
| `EMAIL_FROM` | 寄件者 email |

### 2. 啟動資料庫

**方法 A：Docker（推薦）**

```bash
docker run -d \
  --name localauth-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=localauth \
  -p 5433:5432 \
  postgres:15-alpine
```

`.env` 中 `DATABASE_URL` 請使用 port 5433。

**方法 B：本地 PostgreSQL**

```bash
createdb localauth
# 修改 .env 中的 DATABASE_URL
```

### 3. 安裝與啟動

```bash
npm install
npx prisma migrate dev --name init
npm run start:dev
```

伺服器預設在 `http://localhost:4000` 啟動。

### 4. 管理介面

開啟 **http://localhost:4000/admin** 使用視覺化介面管理用戶：

- 👥 查看所有用戶列表
- ➕ 新增用戶
- 🗑️ 刪除用戶
- 📊 用戶統計

---

## API 端點

### 端點總覽

| 分類 | 方法 | 端點 | 說明 | 需登入 |
|------|------|------|------|--------|
| **認證** | POST | `/auth/register` | 註冊新用戶 | ❌ |
| | POST | `/auth/login` | 登入 | ❌ |
| | POST | `/auth/refresh` | 刷新 access token | ❌ |
| | POST | `/auth/validate-token` | 驗證 token 是否有效 | ❌ |
| | GET | `/auth/profile` | 取得個人資料 | ✅ |
| | GET | `/auth/userinfo` | 取得用戶資訊（OIDC 風格） | ✅ |
| | PATCH | `/auth/password` | 修改密碼 | ✅ |
| | POST | `/auth/change-password-expired` | 密碼到期強制變更 | ✅ |
| | POST | `/auth/logout` | 登出 | ✅ |
| | POST | `/auth/revoke-all-sessions` | 撤銷所有 session | ✅ |
| | POST | `/auth/verify-email` | 驗證 Email | ❌ |
| | GET | `/auth/verify-email?token=xxx` | 驗證 Email（GET） | ❌ |
| | POST | `/auth/resend-verification` | 重新發送驗證信 | ❌ |
| | POST | `/auth/forgot-password` | 忘記密碼（發送重設信） | ❌ |
| | POST | `/auth/reset-password` | 重設密碼 | ❌ |
| | GET | `/auth/reset-password?token=xxx` | 重設密碼頁（GET） | ❌ |
| **用戶** | GET | `/users` | 列出所有用戶 | ❌ |
| | GET | `/users/:id` | 取得單一用戶 | ❌ |
| | DELETE | `/users/:id` | 刪除用戶 | ❌ |
| | PATCH | `/users/me` | 更新個人資料 | ✅ |
| | DELETE | `/users/me` | 刪除自己的帳號 | ✅ |

### 認證端點範例

#### 註冊

**POST** `/auth/register`

```json
// Request
{ "email": "user@example.com", "password": "password123", "name": "John Doe" }

// Response
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { "id": "uuid", "email": "...", "name": "...", "emailVerified": false },
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### 登入

**POST** `/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "password123" }

// Response
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { "id": "uuid", "email": "...", "name": "..." }
}
```

#### 忘記密碼

**POST** `/auth/forgot-password`

```json
// Request
{ "email": "user@example.com" }

// Response
{ "message": "If the email exists, a password reset link has been sent." }
```

#### 重設密碼

**POST** `/auth/reset-password`

```json
// Request
{ "token": "reset_token_from_email", "new_password": "newPassword123" }

// Response
{ "message": "Password reset successfully" }
```

---

## 測試

### 自動化測試腳本

```bash
./test-api.sh
```

### cURL 快速測試

```bash
# 註冊
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 登入
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 取得個人資料（需替換 YOUR_ACCESS_TOKEN）
curl http://localhost:4000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

詳細測試報告請參考 [TEST_REPORT.md](TEST_REPORT.md)。

---

## 資料庫 Schema

```prisma
model User {
  id                        String    @id @default(uuid())
  email                     String    @unique
  passwordHash              String
  name                      String?
  isActive                  Boolean   @default(true)
  emailVerified             Boolean   @default(false)
  verificationToken         String?
  verificationTokenExpires  DateTime?
  createdAt                 DateTime  @default(now())
  refreshToken              String?
  passwordChangedAt         DateTime?  // 密碼 90 天到期檢查
  passwordResetToken        String?
  passwordResetTokenExpires DateTime?
}

model PendingRegistration {
  id                        String    @id @default(uuid())
  email                     String    @unique
  passwordHash              String
  name                      String?
  verificationToken         String
  verificationTokenExpires  DateTime
  createdAt                 DateTime  @default(now())
}
```

---

## 安全特性

- ✅ 密碼使用 bcrypt hash (salt rounds: 10)
- ✅ JWT secret 從環境變數讀取
- ✅ 永不返回 passwordHash 欄位
- ✅ class-validator 驗證輸入
- ✅ 401 錯誤處理（登入失敗、未授權）
- ✅ Email 唯一性約束
- ✅ 密碼 90 天到期強制變更

---

## 常用指令

```bash
npm run build          # 建置專案
npm run start:prod     # 啟動 production 模式
npm run test           # 執行單元測試
npx prisma studio      # 資料庫 GUI
```

---

## License

MIT
