#!/bin/bash

echo "======================================"
echo "快速 API 測試"
echo "======================================"
echo ""

# 1. 註冊
echo "📝 1. 註冊新用戶..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "quicktest@example.com",
    "password": "password123",
    "name": "快速測試用戶"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ 註冊成功！"
  echo ""
  
  # 2. 使用 token 取得個人資料
  echo "👤 2. 取得個人資料..."
  PROFILE_RESPONSE=$(curl -s http://localhost:3000/auth/profile \
    -H "Authorization: Bearer $TOKEN")
  
  echo "$PROFILE_RESPONSE" | jq '.'
  echo "✅ 取得成功！"
  echo ""
  
  # 3. 登入
  echo "🔐 3. 重新登入..."
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "quicktest@example.com",
      "password": "password123"
    }')
  
  echo "$LOGIN_RESPONSE" | jq '.'
  echo "✅ 登入成功！"
  
  echo ""
  echo "======================================"
  echo "✅ 所有測試完成！"
  echo "======================================"
  echo ""
  echo "你的 Token："
  echo "$TOKEN"
  echo ""
  echo "可以用這個 token 來測試 API："
  echo "curl http://localhost:3000/auth/profile \\"
  echo "  -H \"Authorization: Bearer $TOKEN\""
else
  echo "❌ 註冊失敗（可能 email 已存在）"
  echo ""
  echo "嘗試登入已有的用戶..."
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "quicktest@example.com",
      "password": "password123"
    }')
  
  echo "$LOGIN_RESPONSE" | jq '.'
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
  
  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "✅ 登入成功！"
    echo ""
    echo "你的 Token："
    echo "$TOKEN"
  fi
fi
