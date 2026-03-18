#!/bin/bash
# SMTP 寄信測試腳本
#
# 使用方式：
# 1. 在 .env 中加入 SMTP 設定後重啟 app：
#    EMAIL_PROVIDER=smtp
#    SMTP_HOST=smtp-relay.gmail.com
#    SMTP_PORT=587
#    SMTP_USER=developer@reas.com.tw
#    SMTP_PASS=your-app-password
#    EMAIL_FROM="Neurosme AI" <neurosme@reas.com.tw>
#
# 2. 重啟：docker compose up -d app
# 3. 執行：./test-smtp-email.sh [your-test-email@example.com]

set -e

# 嘗試載入 .env
[ -f .env ] && set -a && source .env && set +a

echo "========================================"
echo "SMTP Email 寄信測試"
echo "========================================"
echo ""

# 檢查是否使用 SMTP
if [ "${EMAIL_PROVIDER:-}" != "smtp" ]; then
  echo "⚠️  請先設定環境變數："
  echo "   export EMAIL_PROVIDER=smtp"
  echo "   export SMTP_HOST=smtp-relay.gmail.com"
  echo "   export SMTP_PORT=587"
  echo "   export SMTP_USER=developer@reas.com.tw"
  echo "   export SMTP_PASS=your-app-password"
  echo "   export EMAIL_FROM='\"Neurosme AI\" <neurosme@reas.com.tw>'"
  echo ""
  echo "或建立 .env 檔案後執行："
  echo "   source .env && ./test-smtp-email.sh"
  exit 1
fi

# 讀取要測試的 email（可從參數傳入）
TEST_EMAIL="${1:-smtptest@example.com}"

echo "測試寄送驗證郵件到: $TEST_EMAIL"
echo ""

# 清理測試用戶
docker exec localauth-db-1 psql -U postgres -d localauth -c "DELETE FROM \"User\" WHERE email = '$TEST_EMAIL';" > /dev/null 2>&1

# 註冊（會觸發寄送驗證郵件）
echo "1. 註冊新用戶（觸發寄信）"
REG=$(curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"pass123\",\"name\":\"SMTP Test\"}")

echo "$REG" | python3 -m json.tool 2>/dev/null || echo "$REG"
echo ""

if echo "$REG" | grep -q "Registration successful"; then
  echo "✅ 註冊成功！請檢查 $TEST_EMAIL 的收件匣（及垃圾郵件）是否收到驗證郵件。"
else
  echo "❌ 註冊失敗，請檢查應用程式日誌："
  echo "   docker compose logs app"
  exit 1
fi

echo ""
echo "========================================"
echo "測試完成"
echo "========================================"
