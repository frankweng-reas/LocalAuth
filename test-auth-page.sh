#!/bin/bash
# 全面測試 Auth 測試頁面相關 API
set -e
API="http://localhost:4000"
EMAIL="authtest$(date +%s)@test.com"
PASS="pass123"

echo "=== 1. 註冊 ==="
REG=$(curl -s -X POST $API/auth/register -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Test\"}")
echo "$REG" | head -c 200
echo "..."

if echo "$REG" | grep -q "access_token"; then
  echo "✅ 註冊成功"
else
  echo "❌ 註冊失敗"
  exit 1
fi

echo ""
echo "=== 2. 登入（錯誤密碼）==="
LOGIN_FAIL=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}")
echo "$LOGIN_FAIL"
if echo "$LOGIN_FAIL" | grep -q "Invalid credentials"; then
  echo "✅ 錯誤密碼正確拒絕"
else
  echo "❌ 應回傳 Invalid credentials"
fi

echo ""
echo "=== 3. 登入（正確密碼）==="
LOGIN=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
REFRESH=$(echo "$LOGIN" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ 登入成功，取得 token"
else
  echo "❌ 登入失敗"
  echo "$LOGIN"
  exit 1
fi

echo ""
echo "=== 4. 取得個人資料 ==="
PROFILE=$(curl -s -H "Authorization: Bearer $TOKEN" $API/auth/profile)
echo "$PROFILE"
if echo "$PROFILE" | grep -q "$EMAIL"; then
  echo "✅ 取得個人資料成功"
else
  echo "❌ 取得個人資料失敗"
fi

echo ""
echo "=== 5. 修改密碼 ==="
CHANGE=$(curl -s -X PATCH $API/auth/password -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"old_password\":\"$PASS\",\"new_password\":\"newpass123\"}")
echo "$CHANGE"
if echo "$CHANGE" | grep -q "message"; then
  echo "✅ 修改密碼成功"
else
  echo "❌ 修改密碼失敗"
fi

echo ""
echo "=== 6. 用新密碼登入 ==="
LOGIN2=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"newpass123\"}")
if echo "$LOGIN2" | grep -q "access_token"; then
  echo "✅ 新密碼登入成功"
else
  echo "❌ 新密碼登入失敗"
fi

echo ""
echo "=== 全部測試完成 ==="
