# Email 服務設定指南

本系統支援多種郵件服務提供商，預設使用 Console 模式（開發用）。

## 📧 支援的郵件服務

- **Console** - 開發模式，郵件輸出到 console（預設）
- **Resend** - 推薦！免費 3,000 封/月 ✨
- **SendGrid** - 免費 100 封/天
- **SMTP** - 自訂 SMTP 伺服器

---

## 🎯 Resend 設定（推薦）

### 優點
- ✅ 免費額度大（3,000 封/月）
- ✅ API 簡單易用
- ✅ 專為開發者設計
- ✅ 支援多個網域
- ✅ 提供詳細的發送記錄

### 設定步驟

#### 1. 註冊 Resend 帳號

前往 [resend.com](https://resend.com) 註冊帳號（可用 GitHub 登入）

#### 2. 取得 API Key

1. 登入後進入 [API Keys](https://resend.com/api-keys)
2. 點擊「Create API Key」
3. 命名（例如：localauth-dev）
4. 權限選擇「Sending access」
5. 複製生成的 API Key（格式：`re_xxxxx...`）

#### 3. 設定網域（選擇性）

**選項 A: 使用 Resend 測試網域（快速測試）**
- 使用 `onboarding@resend.dev` 作為寄件者
- 只能發送到已驗證的 email
- 適合開發測試

**選項 B: 使用自己的網域（生產環境）**
1. 進入 [Domains](https://resend.com/domains)
2. 點擊「Add Domain」
3. 輸入你的網域（例如：`yourdomain.com`）
4. 在 DNS 設定中加入提供的記錄：
   - SPF 記錄
   - DKIM 記錄
   - DMARC 記錄（選擇性）
5. 等待驗證（通常幾分鐘內完成）

#### 4. 更新環境變數

編輯 `.env` 檔案：

```bash
# Email Service
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=noreply@yourdomain.com  # 或使用 onboarding@resend.dev

# Application
BASE_URL=http://localhost:3000  # 開發環境
# BASE_URL=https://yourapp.com  # 生產環境
```

#### 5. 重啟應用程式

```bash
npm run start:dev
```

#### 6. 測試發送

```bash
# 註冊新用戶測試
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@yourdomain.com",
    "password": "password123",
    "name": "Test User"
  }'
```

檢查你的郵箱（或 Resend Dashboard 的 [Logs](https://resend.com/logs)）

---

## 📮 其他郵件服務設定

### SendGrid

1. 註冊 [SendGrid](https://sendgrid.com)
2. 建立 API Key
3. 安裝套件：`npm install @sendgrid/mail`
4. 更新 `email.service.ts` 加入 SendGrid 支援

```typescript
// 範例實作
private async sendViaSendGrid(to: string, subject: string, html: string) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
  
  await sgMail.send({
    to,
    from: this.configService.get('EMAIL_FROM'),
    subject,
    html,
  });
}
```

### Gmail SMTP

⚠️ 不推薦用於生產環境（容易被標記為垃圾郵件）

1. 啟用 Gmail「低安全性應用程式存取」或使用應用程式密碼
2. 安裝套件：`npm install nodemailer`
3. 更新 `.env`：

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

---

## 🧪 測試郵件功能

### 方式 1: 使用測試腳本

```bash
./test-email-verification.sh
```

### 方式 2: 手動測試

```bash
# 1. 註冊用戶
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","name":"Test"}'

# 2. 檢查郵箱或 console 日誌取得驗證 token

# 3. 驗證 email
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"your-verification-token"}'

# 4. 重新發送驗證郵件
curl -X POST http://localhost:3000/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🔧 故障排除

### 問題：郵件沒有收到

**檢查清單：**
1. ✅ 確認 `EMAIL_PROVIDER` 設定正確
2. ✅ 確認 API Key 正確且有效
3. ✅ 檢查垃圾郵件資料夾
4. ✅ 查看應用程式日誌
5. ✅ 查看郵件服務的 Dashboard（如 Resend Logs）
6. ✅ 確認寄件者 email 格式正確

### 問題：Resend 回傳錯誤

**常見錯誤：**

- `401 Unauthorized` - API Key 錯誤或過期
- `403 Forbidden` - API Key 權限不足
- `422 Unprocessable Entity` - 寄件者 email 未驗證（需使用已驗證網域）

**解決方式：**
1. 重新生成 API Key
2. 確認 API Key 有 "Sending access" 權限
3. 使用 `onboarding@resend.dev` 測試，或驗證自己的網域

### 問題：開發環境想用 Console 模式

```bash
# .env
EMAIL_PROVIDER=console
```

重啟應用程式即可。

---

## 📊 生產環境建議

### 基本設定
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_live_xxxx...  # 使用生產環境 API Key
EMAIL_FROM=noreply@yourdomain.com
BASE_URL=https://yourapp.com
```

### 安全考量
- ✅ 使用環境變數，不要把 API Key 寫在程式碼中
- ✅ 不要提交 `.env` 到 Git
- ✅ 生產環境使用已驗證的網域
- ✅ 定期輪換 API Key
- ✅ 監控郵件發送量和失敗率

### 監控與日誌
- 使用 Resend Dashboard 查看發送記錄
- 設定郵件發送失敗的告警
- 追蹤郵件開啟率和點擊率（選擇性）

---

## 💡 最佳實踐

1. **開發環境**: 使用 Console 模式或 Resend 測試網域
2. **測試環境**: 使用 Resend 免費額度
3. **生產環境**: 使用已驗證的自訂網域
4. **備份方案**: 設定多個郵件服務提供商作為備援

---

## 🔗 相關連結

- [Resend 官方文檔](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/introduction)
- [Resend Node.js SDK](https://github.com/resend/resend-node)
- [Email 最佳實踐](https://resend.com/docs/best-practices)

---

## 📝 附註

- Resend 免費方案適合中小型應用
- 超過免費額度後價格為 $1/1000 封
- 支援 Webhooks 追蹤郵件狀態
- 可整合 React Email 建立精美郵件模板
