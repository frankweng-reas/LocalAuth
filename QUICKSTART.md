# 快速啟動指南

## 前置需求

- Node.js (v18+)
- PostgreSQL (v12+)
- npm 或 yarn

## 快速開始

### 1. 設置資料庫

確保 PostgreSQL 正在運行，然後創建資料庫：

```bash
# 使用 psql
createdb localauth

# 或使用 SQL
psql -c "CREATE DATABASE localauth;"
```

### 2. 配置環境變數

編輯 `.env` 檔案，修改資料庫連線資訊：

```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/localauth"
JWT_SECRET=your-secret-key-here-change-this-in-production
JWT_EXPIRES_IN=7d
```

**⚠️ 重要**：在生產環境中，請使用強密碼和隨機的 JWT_SECRET！

### 3. 執行資料庫遷移

```bash
npx prisma migrate dev --name init
```

這會：
- 創建 `users` 表
- 生成 Prisma Client

### 4. 啟動伺服器

```bash
npm run start:dev
```

伺服器將在 `http://localhost:3000` 啟動。

### 5. 測試 API

使用提供的測試腳本：

```bash
./test-api.sh
```

## 常見問題

### 資料庫連線失敗

確認：
1. PostgreSQL 正在運行：`pg_isready`
2. 資料庫已創建：`psql -l | grep localauth`
3. `.env` 中的連線資訊正確

### Prisma 錯誤

如果遇到 Prisma 相關錯誤，嘗試：

```bash
npx prisma generate
npx prisma migrate reset
```

### Port 已被佔用

修改 `.env` 加入：

```env
PORT=3001
```

## 資料庫管理

查看資料庫內容（使用 Prisma Studio）：

```bash
npx prisma studio
```

瀏覽器會開啟 `http://localhost:5555`

## 開發指令

```bash
# 開發模式（自動重載）
npm run start:dev

# 建置
npm run build

# 生產模式
npm run start:prod

# Lint
npm run lint

# 格式化程式碼
npm run format
```

## 下一步

- 修改 JWT_SECRET 為強密碼
- 根據需求調整 JWT 過期時間
- 加入更多業務邏輯
- 實作 refresh token
- 加入 email 驗證
- 實作密碼重設功能
- 加入角色權限系統 (RBAC)
