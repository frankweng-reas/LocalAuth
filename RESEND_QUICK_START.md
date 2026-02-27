# Resend 快速開始指南

## 5 分鐘設定真實郵件服務 🚀

### 步驟 1: 註冊 Resend（1 分鐘）

1. 前往 [resend.com/signup](https://resend.com/signup)
2. 使用 GitHub 或 Google 帳號登入（最快）
3. 完成！

### 步驟 2: 取得 API Key（1 分鐘）

1. 登入後自動導向 Dashboard
2. 或前往 [resend.com/api-keys](https://resend.com/api-keys)
3. 點擊「Create API Key」
4. 名稱：`localauth-dev`
5. 權限：保持預設（Sending access）
6. 點擊「Create」
7. **複製** 顯示的 API Key（格式：`re_xxxxx...`）
   
   ⚠️ **重要**: 離開後就看不到了，請立即複製！

### 步驟 3: 更新環境變數（1 分鐘）

編輯 `.env` 檔案：

```bash
# 找到這幾行並修改：
EMAIL_PROVIDER=resend                          # 從 console 改成 resend
RESEND_API_KEY=re_你剛才複製的API_Key          # 貼上你的 API Key
EMAIL_FROM=onboarding@resend.dev               # 使用測試寄件者（或改成你的網域）
```

完整範例：
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_123abc456def789...
EMAIL_FROM=onboarding@resend.dev
```

### 步驟 4: 重啟應用程式（30 秒）

```bash
# 如果正在執行，先停止（Ctrl+C）

# 重新啟動
npm run start:dev
```

看到這行表示成功：
```
✅ Resend email service initialized
```

### 步驟 5: 測試發送（1 分鐘）

```bash
# 註冊測試用戶（改成你的真實 email）
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**檢查郵箱！** 📬 你應該會在幾秒內收到驗證郵件。

---

## ⚠️ 重要提醒

### 使用測試寄件者 `onboarding@resend.dev` 的限制：

- ✅ 可以發送到**任何你在 Resend 帳號中驗證過的 email**
- ❌ 無法發送到未驗證的隨機 email

### 如何驗證你的測試 Email：

1. 前往 [resend.com/settings/team](https://resend.com/settings/team)
2. 在「Team Members」區塊輸入你的測試 email
3. 你會收到一封驗證郵件
4. 點擊驗證連結
5. 完成！現在可以收到測試郵件了

---

## 🎯 想用自己的網域？

### 為什麼需要？
- 看起來更專業（`noreply@yourdomain.com`）
- 可以發送到任何 email
- 避免垃圾郵件問題

### 快速設定（5 分鐘）

1. **加入網域**
   - 前往 [resend.com/domains](https://resend.com/domains)
   - 點擊「Add Domain」
   - 輸入你的網域（例如：`example.com`）

2. **設定 DNS**
   
   Resend 會顯示需要加入的 DNS 記錄，前往你的網域註冊商（如 Cloudflare、GoDaddy）加入：

   ```
   類型: TXT
   名稱: resend._domainkey
   值: (Resend 提供的 DKIM 值)

   類型: TXT  
   名稱: @
   值: v=spf1 include:amazonses.com ~all
   ```

3. **驗證**
   - 回到 Resend，點擊「Verify DNS Records」
   - 通常 1-5 分鐘內完成驗證
   - 看到 ✅ 綠色勾勾就成功了！

4. **更新 .env**
   ```bash
   EMAIL_FROM=noreply@yourdomain.com
   ```

---

## 🔍 故障排除

### 問題：沒收到郵件

**檢查清單：**
```bash
# 1. 確認服務有初始化
# 查看啟動日誌，應該有：✅ Resend email service initialized

# 2. 確認寄件者正確
# 使用 onboarding@resend.dev 測試，或已驗證的自訂網域

# 3. 檢查垃圾郵件
# Gmail: 查看「促銷內容」或「垃圾郵件」資料夾

# 4. 查看 Resend 日誌
# 前往 https://resend.com/logs 查看發送記錄
```

### 問題：API Key 無效

```bash
# 重新生成 API Key
# 1. 前往 https://resend.com/api-keys
# 2. 刪除舊的 Key
# 3. 建立新的 Key
# 4. 更新 .env 檔案
# 5. 重啟應用程式
```

### 問題：401 Unauthorized

```bash
# 檢查 .env 檔案
cat .env | grep RESEND

# 應該顯示：
# RESEND_API_KEY=re_xxxxx...（不是空的）

# 確認沒有多餘的空格或引號
```

---

## 📊 查看發送記錄

1. 前往 [resend.com/logs](https://resend.com/logs)
2. 可以看到：
   - ✅ 成功發送的郵件
   - ❌ 失敗的郵件（含原因）
   - 📊 開啟率、點擊率
   - 🕐 發送時間

---

## 💡 小技巧

### 開發環境建議
```bash
# 本地開發：使用 Console 模式（免費、快速）
EMAIL_PROVIDER=console

# 需要測試真實郵件：切換到 Resend
EMAIL_PROVIDER=resend
```

### 一鍵切換
```bash
# 建立別名
alias email-console='sed -i "" "s/EMAIL_PROVIDER=.*/EMAIL_PROVIDER=console/" .env'
alias email-resend='sed -i "" "s/EMAIL_PROVIDER=.*/EMAIL_PROVIDER=resend/" .env'

# 使用
email-console && npm run start:dev  # Console 模式
email-resend && npm run start:dev   # Resend 模式
```

---

## ✅ 完成檢查清單

- [ ] 已註冊 Resend 帳號
- [ ] 已取得 API Key
- [ ] 已更新 `.env` 檔案
- [ ] 已重啟應用程式
- [ ] 看到「✅ Resend email service initialized」
- [ ] 成功發送測試郵件
- [ ] 收到驗證郵件
- [ ] （選擇性）已設定自訂網域

---

## 🎉 恭喜！

你的認證系統現在可以發送真實郵件了！

**接下來可以：**
- 🚀 部署到生產環境
- 📧 自訂郵件模板（使用 React Email）
- 📊 監控郵件發送狀況
- 🔒 加入更多安全功能

**需要幫助？**
- 📖 完整文檔：[EMAIL_SETUP.md](./EMAIL_SETUP.md)
- 🔗 Resend 文檔：[resend.com/docs](https://resend.com/docs)
- 💬 問題回報：GitHub Issues
