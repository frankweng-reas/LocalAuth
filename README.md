# Local Authentication System

最小化的 NestJS 本地認證系統，使用 PostgreSQL + JWT + Prisma。

## 技術棧

- NestJS
- PostgreSQL
- Prisma ORM
- JWT (JSON Web Tokens)
- bcrypt (密碼加密)
- class-validator (輸入驗證)

## 功能特性

- ✅ 用戶註冊
- ✅ 用戶登入
- ✅ JWT Token 認證
- ✅ 受保護的個人資料端點
- ✅ 密碼使用 bcrypt 加密 (10 rounds)
- ✅ 輸入驗證
- ✅ 清晰的模組化架構

## 專案結構

```
src/
├── auth/                  # 認證模組
│   ├── dto/              # 資料傳輸物件
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── jwt-auth.guard.ts
├── users/                 # 用戶模組
│   ├── users.repository.ts
│   ├── users.service.ts
│   └── users.module.ts
├── prisma/               # Prisma 服務
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── app.module.ts
└── main.ts
```

## 安裝與啟動

### 前置需求

- Node.js (v18+)
- PostgreSQL (v12+) 或 Docker
- npm 或 yarn

### 方法 1: 使用 Docker (推薦)

最簡單的方式是使用 Docker 啟動 PostgreSQL：

```bash
# 1. 啟動 PostgreSQL 容器
docker run -d \
  --name localauth-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=localauth \
  -p 5433:5432 \
  postgres:15-alpine

# 2. 安裝依賴
npm install

# 3. 執行資料庫遷移
npx prisma migrate dev --name init

# 4. 啟動開發伺服器
npm run start:dev
```

**注意**：`.env` 檔案已配置為使用 port 5433。

### 方法 2: 使用本地 PostgreSQL

如果你已經安裝 PostgreSQL：

```bash
npm install
```

### 方法 2: 使用本地 PostgreSQL

如果你已經安裝 PostgreSQL：

```bash
# 1. 創建資料庫
createdb localauth

# 2. 修改 .env 中的 DATABASE_URL
# DATABASE_URL="postgresql://your_username:your_password@localhost:5432/localauth"

# 3. 安裝依賴
npm install
```

### 2. 配置環境變數

複製 `.env.example` 到 `.env` 並修改資料庫連線資訊：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：

```
DATABASE_URL="postgresql://user:password@localhost:5432/localauth"
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

### 3. 執行資料庫遷移

```bash
npx prisma migrate dev --name init
```

### 4. 啟動開發伺服器

```bash
npm run start:dev
```

伺服器將在 `http://localhost:3000` 啟動。

### 5. 訪問管理介面

開啟瀏覽器訪問：**http://localhost:3000/admin**

管理介面功能：
- 👥 查看所有用戶列表
- ➕ 新增用戶
- 🗑️ 刪除用戶
- 📊 用戶統計

## ✅ 測試驗證

系統已通過完整測試，所有功能正常運作。查看 [TEST_REPORT.md](TEST_REPORT.md) 了解詳細測試結果。

**快速測試：**
```bash
./test-api.sh
```

測試涵蓋：
- ✅ 用戶註冊（包含輸入驗證）
- ✅ 用戶登入（包含錯誤密碼處理）
- ✅ JWT 認證（包含無效 token 處理）
- ✅ 受保護端點
- ✅ 密碼 bcrypt 加密
- ✅ 所有錯誤處理

## 🎨 管理介面

訪問 **http://localhost:3000/admin** 使用視覺化介面管理用戶：

### 功能特色

- **用戶列表** - 即時顯示所有用戶，包含：
  - Email、名稱、ID
  - 啟用狀態
  - 建立時間
  
- **新增用戶** - 簡單的表單介面：
  - Email（必填，自動驗證格式）
  - 密碼（必填，最少 6 字元）
  - 名稱（選填）
  
- **刪除用戶** - 一鍵刪除，含確認對話框

- **統計資訊** - 顯示總用戶數和活躍用戶數

- **自動重新整理** - 每 30 秒自動更新列表

### 截圖預覽

管理介面採用現代化設計：
- 響應式佈局（支援手機、平板、桌面）
- 漸層背景和卡片式設計
- 即時錯誤提示
- 操作成功反饋

---

## API 端點

### 註冊新用戶

**POST** `/auth/register`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### 用戶登入

**POST** `/auth/login`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### 取得個人資料 (受保護)

**GET** `/auth/profile`

Headers:
```
Authorization: Bearer <access_token>
```

Response:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### 管理端點

#### 列出所有用戶

**GET** `/users`

Response:
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isActive": true,
    "createdAt": "2026-02-11T12:44:42.719Z"
  }
]
```

#### 取得單一用戶

**GET** `/users/:id`

Response: 同上單一用戶物件

#### 刪除用戶

**DELETE** `/users/:id`

Response: 204 No Content

## 測試指令

### 使用測試腳本 (推薦)

專案包含一個自動化測試腳本：

```bash
./test-api.sh
```

這個腳本會自動測試：
1. 用戶註冊
2. 用戶登入
3. 取得個人資料（受保護端點）

### 使用 cURL 測試

#### 1. 註冊新用戶

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

#### 2. 登入

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 3. 取得個人資料

```bash
# 將 YOUR_ACCESS_TOKEN 替換為登入後取得的 token
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 資料庫 Schema

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
}
```

## 安全特性

- ✅ 密碼使用 bcrypt hash (salt rounds: 10)
- ✅ JWT secret 從環境變數讀取
- ✅ 永不返回 passwordHash 欄位
- ✅ 使用 class-validator 驗證輸入
- ✅ 401 錯誤處理（登入失敗、未授權）
- ✅ Email 唯一性約束

## 可擴展性

此架構支援未來擴展：

- **SSO/LDAP**: 在 AuthModule 新增認證策略
- **RBAC**: User 模型可新增 `role` 欄位
- **Multi-tenant**: 可新增 `tenantId` 欄位
- **Refresh Token**: 可新增 refresh token 機制
- **Email 驗證**: 可新增 email 驗證流程
- **密碼重設**: 可新增密碼重設功能

## 其他指令

```bash
# 建置專案
npm run build

# 啟動 production 模式
npm run start:prod

# 執行測試
npm run test

# 查看 Prisma Studio (資料庫 GUI)
npx prisma studio
```

## License

MIT
