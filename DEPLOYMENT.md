# LocalAuth 部署指南

## 前置需求

- Node.js 18+
- PostgreSQL 14+
- 或使用 Docker

---

## 方式一：傳統 VPS（推薦）

### 1. 準備 PostgreSQL

```bash
# 建立資料庫
createdb localauth

# 或使用 Docker
docker run -d --name localauth-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=localauth \
  -p 5432:5432 \
  postgres:16
```

### 2. 部署應用

```bash
# 複製專案到伺服器
git clone <your-repo> localauth && cd localauth

# 安裝依賴
npm ci --omit=dev

# 設定環境變數
cp .env.example .env
# 編輯 .env，填入正確的 DATABASE_URL、JWT_SECRET、BASE_URL 等

# 建置
npm run build

# 執行資料庫遷移
npx prisma migrate deploy

# 產生 Prisma Client
npx prisma generate
```

### 3. 使用 PM2 常駐執行

```bash
npm install -g pm2
pm2 start dist/main.js --name localauth
pm2 save
pm2 startup  # 設定開機自啟
```

### 4. Nginx 反向代理（選用，建議）

```nginx
server {
    listen 80;
    server_name auth.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. HTTPS（Let's Encrypt）

```bash
sudo certbot --nginx -d auth.yourdomain.com
```

---

## 方式二：Docker Compose（On-prem 推薦）

資料庫使用 **Bind Mount**（`./postgres_data`），方便備份、還原與售後支持。

建立 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/localauth
      JWT_SECRET: ${JWT_SECRET}
      BASE_URL: ${BASE_URL}
      PORT: 4000
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: localauth
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

建立 `Dockerfile`：

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

執行：

```bash
# 建立 .env 並設定 JWT_SECRET、BASE_URL
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

### postgres_data 目錄說明

`./postgres_data` 由容器內的 postgres 使用者（UID 999）管理，初始化後權限為 `drwx------`，這是 PostgreSQL 的安全設計，屬於正常現象。

若需要在主機端瀏覽該目錄（例如確認資料存在、手動備份），執行：

```bash
sudo chmod o+rx ./postgres_data
```

> **備份建議**：直接備份 `./postgres_data` 目錄，或使用 `pg_dump`：
> ```bash
> docker compose exec db pg_dump -U postgres localauth > backup.sql
> ```

### 模擬外部系統測試（Docker）

當 LocalAuth 在 Docker 中運行時，可用以下方式模擬外部系統（如 ReadyQA）呼叫 API：

**方式 A：auth-test.html（跨域測試）**

1. 啟動 LocalAuth：`docker compose up -d`
2. 另開終端，在 `public` 目錄啟動簡易 HTTP 伺服器：
   ```bash
   cd public && python3 -m http.server 3000
   ```
3. 瀏覽器開啟：`http://localhost:3000/auth-test.html?api=http://localhost:4000`
4. 此頁面會從 `localhost:3000` 發送請求到 `localhost:4000`（Docker LocalAuth），模擬跨域情境

**方式 B：Node.js 腳本**

```bash
node readyqa-example.js   # 已設定連到 http://localhost:4000
```

**方式 C：curl**

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test"}'
```

---

## 方式三：雲端平台

### Railway / Render / Fly.io

1. 連接 Git 倉庫
2. 新增 PostgreSQL 服務（平台會提供 `DATABASE_URL`）
3. 設定環境變數：`JWT_SECRET`、`BASE_URL`、`EMAIL_PROVIDER` 等
4. 建置指令：`npm run build`
5. 啟動指令：`npx prisma migrate deploy && node dist/main.js`

---

## 環境變數檢查清單

| 變數 | 說明 | 生產環境 |
|------|------|----------|
| DATABASE_URL | PostgreSQL 連線 | 必填 |
| JWT_SECRET | JWT 簽章密鑰 | 必填，至少 32 字元 |
| BASE_URL | 對外網址 | 如 `https://auth.yourdomain.com` |
| PORT | 監聽埠 | 預設 4000 |
| EMAIL_PROVIDER | 郵件服務 | `resend` 或 `console` |
| RESEND_API_KEY | Resend API Key | 若用 resend 則必填 |

---

## 部署後驗證

```bash
# 健康檢查
curl https://auth.yourdomain.com/users

# 註冊測試
curl -X POST https://auth.yourdomain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
```

---

## 注意事項

1. **JWT_SECRET**：生產環境務必使用強隨機字串
2. **HTTPS**：生產環境必須啟用
3. **CORS**：若前端在不同網域，需在 `main.ts` 設定 `origin`
4. **資料庫備份**：定期備份 PostgreSQL
