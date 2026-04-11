# LocalAuth 交付說明

LocalAuth 是認證服務，作為 NeuroSme 的底層元件運行。不單獨銷售，隨 NeuroSme 一起交付。

---

## 1. 我們要做什麼

### Build Image
```bash
# 在 LocalAuth repo 根目錄
docker build -t localauth:1.x.x .
docker save localauth:1.x.x -o localauth-1.x.x.tar
```

### 交付物
提供給客戶以下兩個檔案：
- `localauth-1.x.x.tar`
- `docker-compose.onprem.yml`

### 整合進 NeuroSme backend
NeuroSme backend 的 `.env` 需要設定兩個值（與 `docker-compose.onprem.yml` 固定值對齊）：

```bash
JWT_SECRET=db0b7dde5c731381ba4aac77eb2640a9f74bf2efb20cdf9b3e51e9280b3faeb8
LOCALAUTH_ADMIN_API_KEY=d21c4782231ea69c3223597d6d7df6d8210b0cae7c3c4e36ce11327d9aac7752
LOCALAUTH_ADMIN_URL=http://localhost:4000
```

---

## 2. 客戶要做什麼

### 安裝（一次性）

**Step 1：載入 image**
```bash
docker load -i localauth-1.x.x.tar
```

**Step 2：啟動**
```bash
docker compose -f docker-compose.onprem.yml up -d
```

**Step 3：首次登入**

查看啟動 log 取得預設帳號：
```bash
docker compose -f docker-compose.onprem.yml logs localauth | grep -A5 "Default admin"
```

預設帳號：
- Email：`admin@local.dev`
- 密碼：`Admin1234!`

登入後立即修改密碼。

---

### 日常維運

**備份（唯一的日常責任）**

建議每天排程執行，備份檔保留至少 7 天：

```bash
# 方式 A：目錄備份（服務運行中也可執行）
cp -r ./localauth_data ./localauth_data_backup_$(date +%Y%m%d)

# 方式 B：pg_dump（較小，推薦）
docker compose -f docker-compose.onprem.yml exec localauth-db \
  pg_dump -U localauth localauth > backup_$(date +%Y%m%d).sql
```

---

### 還原

**情況 A：從目錄備份還原**
```bash
# 1. 停止服務
docker compose -f docker-compose.onprem.yml down

# 2. 清除損壞資料，還原備份
rm -rf ./localauth_data
cp -r ./localauth_data_backup_20260411 ./localauth_data

# 3. 重新啟動
docker compose -f docker-compose.onprem.yml up -d
```

**情況 B：從 pg_dump 備份還原**
```bash
# 1. 停止 app（保留 DB 容器運行）
docker compose -f docker-compose.onprem.yml stop localauth

# 2. 清空資料庫
docker compose -f docker-compose.onprem.yml exec localauth-db \
  psql -U localauth -c "DROP DATABASE localauth; CREATE DATABASE localauth;"

# 3. 還原備份
docker compose -f docker-compose.onprem.yml exec -T localauth-db \
  psql -U localauth localauth < backup_20260411.sql

# 4. 重新啟動
docker compose -f docker-compose.onprem.yml up -d
```

**情況 C：沒有備份，DB 損壞**
```bash
# 1. 停止服務
docker compose -f docker-compose.onprem.yml down

# 2. 清除損壞資料
rm -rf ./localauth_data

# 3. 重新啟動（LocalAuth 會自動重建空的 DB）
docker compose -f docker-compose.onprem.yml up -d

# 結果：所有使用者帳號消失，需要重新建立
# 預設 admin 帳號會自動重新建立（admin@local.dev / Admin1234!）
```

---

### DB 除錯（需要直接查看資料庫時）

DB port 不對外，透過 `docker exec` 進入容器操作：

```bash
# 進入 DB 容器
docker exec -it localauth-db-1 psql -U localauth localauth

# 常用指令
\dt          -- 列出所有資料表
\q           -- 離開
SELECT count(*) FROM "User";   -- 查看使用者數量
```

---

### 升級
```bash
# 1. 先備份
cp -r ./localauth_data ./localauth_data_backup_$(date +%Y%m%d)

# 2. 載入新版 image
docker load -i localauth-新版本.tar

# 3. 重啟
docker compose -f docker-compose.onprem.yml up -d
```

---

## 3. 客戶不需要做的事

- 修改任何設定檔
- 設定任何環境變數
- 接觸 `.env` 檔案
- 知道 JWT_SECRET 或 ADMIN_API_KEY 的值
- 直連資料庫（DB port 不對外）

---

## 4. 固定值對照表（工程師備查）

| 變數 | 值 | 用於 |
|------|-----|------|
| `POSTGRES_PASSWORD` | `ccb7e578...` | LocalAuth DB，固定，不需跨系統同步 |
| `JWT_SECRET` | `db0b7dde...` | LocalAuth + NeuroSme backend 共用 |
| `ADMIN_API_KEY` | `d21c4782...` | LocalAuth + NeuroSme backend 共用 |
