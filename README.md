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

- ✅ 用戶註冊（含 Email 驗證；可選 on-prem 模式略過驗證信）
- ✅ 用戶登入
- ✅ JWT Access + Refresh Token
- ✅ 忘記密碼 / 重設密碼（可透過環境變數停用）
- ✅ 密碼 90 天到期強制變更
- ✅ 受保護的個人資料端點
- ✅ OIDC 風格 `/auth/userinfo`
- ✅ 密碼使用 bcrypt 加密 (10 rounds)
- ✅ 輸入驗證
- ✅ **Admin REST API**（`/admin/users`，供其他應用程式建帳 / 列表 / 刪除，須 `x-admin-api-key`）
- ✅ 靜態管理介面（`/admin/index.html`，需設定 `ADMIN_API_KEY` 後於頁面輸入）
- ✅ On-prem 開關：`REQUIRE_EMAIL_VERIFICATION`、`REGISTRATION_DISABLED`、`FORGOT_PASSWORD_ENABLED`
- ✅ 清晰的模組化架構

## 規劃中（尚未實作）

- ⏳ 企業 AD（Active Directory）整合

---

## 專案結構

```
src/
├── admin/                 # Admin API（API Key 保護）
│   ├── admin.controller.ts
│   ├── admin.module.ts
│   └── admin-api-key.guard.ts
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
│   └── users.controller.ts  # 僅 PATCH/DELETE /users/me（需 JWT）
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
| `REQUIRE_EMAIL_VERIFICATION` | `true`（預設）走驗證信；`false` 註冊後直接可登入 |
| `REGISTRATION_DISABLED` | `true` 時禁止 `/auth/register`，僅能透過 Admin API 建帳 |
| `FORGOT_PASSWORD_ENABLED` | `false` 時停用忘記密碼寄信 |
| `ADMIN_API_KEY` | Admin API 密鑰；HTTP 標頭 `x-admin-api-key` 須與此相同 |
| `AD_ENABLED` | `true` 時改走 AD provider（AD 驗證本身仍為規劃中） |

`docker-compose.yml` 會從專案根目錄 `.env` 代入上述變數；變更程式碼後需 `docker compose up --build`。

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

### 4. 管理介面與 Admin API

靜態頁：**http://localhost:4000/admin/**（或 `index.html`）。頁面會提示輸入 **`ADMIN_API_KEY`**，之後列表 / 新增 / 刪除皆透過 **`/admin/users`**。

其他應用程式請直接呼叫 REST API（勿把 API Key 寫進前端 bundle）：

```http
GET    /admin/users
POST   /admin/users
DELETE /admin/users/:id
Header: x-admin-api-key: <與 .env 中 ADMIN_API_KEY 相同>
```

`POST /admin/users` 可選 `mustChangePassword: true`，首登將被要求變更密碼。

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
| **Admin** | GET | `/admin/users` | 列出所有用戶 | API Key |
| | POST | `/admin/users` | 建立用戶（已驗證 email，可選強制改密） | API Key |
| | DELETE | `/admin/users/:id` | 刪除用戶 | API Key |
| **用戶** | PATCH | `/users/me` | 更新個人資料 | ✅ |
| | DELETE | `/users/me` | 刪除自己的帳號 | ✅ |

### 認證端點範例

#### 註冊

**POST** `/auth/register`

```json
// Request
{ "email": "user@example.com", "password": "Str0ng!Pass", "name": "John Doe" }

// Response（含 Email 驗證時；密碼須符合政策，見 class-validator / IsPasswordPolicy）
{ "message": "Registration successful. Please check your email to verify your account." }

// Response（REQUIRE_EMAIL_VERIFICATION=false 時）
{ "message": "Registration successful. You can now log in." }
```

完成驗證信後才可登入（on-prem 略過驗證時則註冊後即可登入）。

#### 登入

**POST** `/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "Str0ng!Pass" }

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

// Response（成功時皆為同一訊息，避免枚舉信箱）
{ "message": "若該信箱已註冊，您將收到密碼重設郵件" }
```

`FORGOT_PASSWORD_ENABLED=false` 時會回傳 503。

#### 重設密碼

**POST** `/auth/reset-password`

```json
// Request（new_password 須符合密碼政策）
{ "token": "reset_token_from_email", "new_password": "Str0ng!New2" }

// Response
{ "message": "密碼已重設成功，請使用新密碼登入" }
```

#### Admin：建立用戶（供其他後端／腳本呼叫）

**POST** `/admin/users` — Header 必填：`x-admin-api-key: <ADMIN_API_KEY>`

```json
// Request（name、mustChangePassword 可省略）
{
  "email": "newuser@company.com",
  "password": "TempStr0ng!",
  "name": "王小明",
  "mustChangePassword": true
}
```

```json
// Response（成功，HTTP 200）
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@company.com",
  "name": "王小明",
  "mustChangePassword": true
}
```

- `mustChangePassword: true`：建立後會將 `passwordChangedAt` 清空，使用者**首次登入**會被要求走 **POST** `/auth/change-password-expired`（或密碼政策允許的流程）變更密碼。
- `mustChangePassword` 省略或 `false`：行為與一般帳號相同（密碼視為剛設定，90 天內不需強制變更）。
- Email 已存在時回 **409**，格式或密碼不符政策時回 **400**，API Key 錯誤時回 **401**。

**GET** `/admin/users` — 同樣帶 `x-admin-api-key`，回傳陣列（欄位與內部 `UserResponse` 一致，不含 `passwordHash`）。

**DELETE** `/admin/users/:id` — 成功回 **204**，找不到用戶回 **404**。

```bash
# cURL：建立用戶（請替換 YOUR_ADMIN_API_KEY）
curl -X POST http://localhost:4000/admin/users \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: YOUR_ADMIN_API_KEY" \
  -d '{"email":"ops@company.com","password":"TempStr0ng!","name":"營運帳號","mustChangePassword":true}'
```

---

## 測試

### 自動化測試腳本

```bash
./test-api.sh
```

### cURL 快速測試

```bash
# 註冊（密碼須至少 8 碼且含大寫/小寫/數字/符號其中三種）
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Str0ng!Pass","name":"Test User"}'

# 登入
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Str0ng!Pass"}'

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
- ✅ 帳號列表 / 刪除僅能透過 Admin API（須 `ADMIN_API_KEY`），避免公開 `/users` 端點

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
