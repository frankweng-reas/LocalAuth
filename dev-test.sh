#!/bin/bash

# Mac 開發環境快速測試腳本
# 專為單一開發者設計

DEV_EMAIL="fweng55@gmail.com"
BASE_URL="http://localhost:3000"

echo "========================================="
echo "🍎 Mac 開發環境測試"
echo "========================================="
echo ""
echo "開發者 Email: $DEV_EMAIL"
echo ""

# 選單
echo "請選擇操作："
echo "1) 註冊新用戶（會刪除舊的）"
echo "2) 登入"
echo "3) 查看個人資料"
echo "4) 重新發送驗證郵件"
echo "5) 修改密碼"
echo "6) 登出"
echo "7) 查看所有用戶"
echo "8) 查看資料庫狀態"
echo "0) 退出"
echo ""
read -p "選擇 (0-8): " choice

case $choice in
  1)
    echo ""
    echo "📝 註冊新用戶..."
    docker exec localauth-postgres psql -U postgres -d localauth -c "DELETE FROM \"User\" WHERE email = '$DEV_EMAIL';" > /dev/null 2>&1
    echo "✅ 清理完成"
    echo ""
    
    curl -s -X POST "$BASE_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$DEV_EMAIL\",
        \"password\": \"devpass123\",
        \"name\": \"Fred Dev\"
      }" | python3 -m json.tool
    
    echo ""
    echo "💡 密碼: devpass123"
    echo "📧 請檢查郵箱驗證"
    ;;
    
  2)
    echo ""
    echo "🔐 登入..."
    read -p "密碼 (預設: devpass123): " password
    password=${password:-devpass123}
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$DEV_EMAIL\",
        \"password\": \"$password\"
      }")
    
    echo "$RESPONSE" | python3 -m json.tool
    
    # 儲存 token
    TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)
    if [ -n "$TOKEN" ]; then
      echo "$TOKEN" > /tmp/dev_token.txt
      echo ""
      echo "✅ Token 已儲存到 /tmp/dev_token.txt"
    fi
    ;;
    
  3)
    echo ""
    echo "👤 查看個人資料..."
    if [ ! -f /tmp/dev_token.txt ]; then
      echo "❌ 請先登入 (選項 2)"
      exit 1
    fi
    
    TOKEN=$(cat /tmp/dev_token.txt)
    curl -s "$BASE_URL/auth/profile" \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
    ;;
    
  4)
    echo ""
    echo "📧 重新發送驗證郵件..."
    curl -s -X POST "$BASE_URL/auth/resend-verification" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$DEV_EMAIL\"}" | python3 -m json.tool
    ;;
    
  5)
    echo ""
    echo "🔑 修改密碼..."
    if [ ! -f /tmp/dev_token.txt ]; then
      echo "❌ 請先登入 (選項 2)"
      exit 1
    fi
    
    read -p "舊密碼: " old_pass
    read -p "新密碼: " new_pass
    
    TOKEN=$(cat /tmp/dev_token.txt)
    curl -s -X PATCH "$BASE_URL/auth/password" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"old_password\": \"$old_pass\",
        \"new_password\": \"$new_pass\"
      }" | python3 -m json.tool
    ;;
    
  6)
    echo ""
    echo "👋 登出..."
    if [ ! -f /tmp/dev_token.txt ]; then
      echo "❌ 請先登入 (選項 2)"
      exit 1
    fi
    
    TOKEN=$(cat /tmp/dev_token.txt)
    curl -s -X POST "$BASE_URL/auth/logout" \
      -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
    
    rm -f /tmp/dev_token.txt
    echo ""
    echo "✅ 已登出，Token 已清除"
    ;;
    
  7)
    echo ""
    echo "👥 查看所有用戶..."
    curl -s "$BASE_URL/users" | python3 -m json.tool
    ;;
    
  8)
    echo ""
    echo "💾 資料庫狀態..."
    docker exec localauth-postgres psql -U postgres -d localauth -c "SELECT email, \"emailVerified\", \"isActive\", \"createdAt\" FROM \"User\";"
    ;;
    
  0)
    echo "👋 再見！"
    exit 0
    ;;
    
  *)
    echo "❌ 無效選項"
    exit 1
    ;;
esac

echo ""
echo "========================================="
echo "完成！"
echo "========================================="
