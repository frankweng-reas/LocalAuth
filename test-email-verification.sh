#!/bin/bash

echo "========================================"
echo "完整測試 Email 驗證流程"
echo "========================================"
echo ""

# 清理測試用戶
docker exec localauth-db-1 psql -U postgres -d localauth -c "DELETE FROM \"User\" WHERE email = 'emailverify@example.com';" > /dev/null 2>&1

# 1. 註冊
echo "1. 註冊新用戶"
REG=$(curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"emailverify@example.com","password":"pass123","name":"Email Verify Test"}')

echo "$REG" | python3 -m json.tool 2>/dev/null || echo "$REG"
echo ""

# 從資料庫取得驗證 token
echo "2. 從資料庫取得驗證 token"
VERIFICATION_TOKEN=$(docker exec localauth-db-1 psql -U postgres -d localauth -t -c "SELECT \"verificationToken\" FROM \"User\" WHERE email = 'emailverify@example.com';" | tr -d '[:space:]')

echo "Token: ${VERIFICATION_TOKEN:0:40}..."
echo ""

# 檢查 email 驗證狀態（應該是 false）
echo "3. 檢查 email 驗證狀態（驗證前）"
docker exec localauth-db-1 psql -U postgres -d localauth -c "SELECT email, \"emailVerified\" FROM \"User\" WHERE email = 'emailverify@example.com';"
echo ""

# 驗證 email
echo "4. 驗證 email"
VERIFY=$(curl -s -X POST http://localhost:4000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$VERIFICATION_TOKEN\"}")

echo "$VERIFY" | python3 -m json.tool
echo ""

# 檢查 email 驗證狀態（應該是 true）
echo "5. 檢查 email 驗證狀態（驗證後）"
docker exec localauth-db-1 psql -U postgres -d localauth -c "SELECT email, \"emailVerified\", \"verificationToken\" FROM \"User\" WHERE email = 'emailverify@example.com';"
echo ""

# 測試重新發送驗證郵件（應該失敗，因為已驗證）
echo "6. 測試重新發送驗證郵件（應該失敗）"
RESEND=$(curl -s -X POST http://localhost:4000/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"emailverify@example.com"}')

echo "$RESEND" | python3 -m json.tool
echo ""

echo "========================================"
echo "✅ Email 驗證流程測試完成！"
echo "========================================"
