# LocalAuth 交付說明

LocalAuth 是認證服務，作為 NeuroSme 的底層元件運行。不單獨銷售，隨 NeuroSme 一起交付。

---

## 1. 交付方式

LocalAuth **已整合進 NeuroSme 交付包**，不再獨立交付。

客戶收到的是一個壓縮檔 `neurosme-onprem-vX.X.X.tar.gz`，內含：

- `images/localauth.tar.gz`（認證服務 image）
- `images/neurosme-backend.tar.gz`
- `images/neurosme-frontend.tar.gz`
- `docker-compose.onprem.yml`（包含 localauth + localauth-db 服務定義）
- `nginx.conf`
- `QUICKSTART.md`

---

## 2. 產生交付包（REAS 工程師）

在 VM 上執行：

```bash
bash ~/scripts/build-onprem.sh v1.0.0
```

產出：`~/release/neurosme-onprem-v1.0.0.tar.gz`

---

## 3. 固定值對照表（工程師備查）

| 變數 | 值 | 用於 |
|------|-----|------|
| `POSTGRES_PASSWORD` | `ccb7e578...` | LocalAuth DB，固定，不需跨系統同步 |
| `JWT_SECRET` | `db0b7dde...` | LocalAuth + NeuroSme backend 共用 |
| `ADMIN_API_KEY` | `d21c4782...` | LocalAuth + NeuroSme backend 共用 |

---

## 4. 客戶維運

### 備份

建議每天排程執行，備份檔保留至少 7 天：

```bash
# 方式 A：目錄備份（服務運行中也可執行）
cp -r ./localauth_data ./localauth_data_backup_$(date +%Y%m%d)

# 方式 B：pg_dump（較小，推薦）
docker compose -f docker-compose.onprem.yml exec localauth-db \
  pg_dump -U localauth localauth > backup_$(date +%Y%m%d).sql
```

### 還原

**從目錄備份還原：**
```bash
docker compose -f docker-compose.onprem.yml down
rm -rf ./localauth_data
cp -r ./localauth_data_backup_20260411 ./localauth_data
docker compose -f docker-compose.onprem.yml up -d
```

**從 pg_dump 備份還原：**
```bash
docker compose -f docker-compose.onprem.yml stop localauth
docker compose -f docker-compose.onprem.yml exec localauth-db \
  psql -U localauth -c "DROP DATABASE localauth; CREATE DATABASE localauth;"
docker compose -f docker-compose.onprem.yml exec -T localauth-db \
  psql -U localauth localauth < backup_20260411.sql
docker compose -f docker-compose.onprem.yml up -d
```

### 升級

```bash
# 1. 先備份
cp -r ./localauth_data ./localauth_data_backup_$(date +%Y%m%d)
cp -r ./neurosme_data ./neurosme_data_backup_$(date +%Y%m%d)

# 2. 解壓縮新版交付包
tar xzf neurosme-onprem-新版本.tar.gz
cd neurosme-onprem-新版本

# 3. 載入新版 images
docker load < images/neurosme-backend.tar.gz
docker load < images/neurosme-frontend.tar.gz
docker load < images/localauth.tar.gz

# 4. 重啟
docker compose -f docker-compose.onprem.yml up -d
```

---

## 5. 客戶不需要做的事

- 修改任何設定檔
- 設定任何環境變數
- 接觸 `.env` 檔案
- 知道 JWT_SECRET 或 ADMIN_API_KEY 的值
- 直連資料庫（DB port 不對外）
