#!/bin/bash

# 註冊功能測試腳本

EMAIL="${1:-fweng55@gmail.com}"  # 預設使用你的 email，也可以傳入參數
PASSWORD="${2:-testpass123}"
NAME="${3:-Test User}"

echo "========================================="
echo "📝 測試用戶註冊"
echo "========================================="
echo ""
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Name: $NAME"
echo ""

# 詢問是否要刪除舊用戶
read -p "是否刪除舊用戶重新測試？(y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  刪除舊用戶..."
    docker exec localauth-postgres psql -U postgres -d localauth -c "DELETE FROM \"User\" WHERE email = '$EMAIL';" > /dev/null 2>&1
    echo "✅ 清理完成"
    echo ""
fi

# 註冊
echo "📤 發送註冊請求..."
RESULT=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

echo ""
echo "📋 回應："
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
echo ""

# 檢查結果
if echo "$RESULT" | grep -q "access_token"; then
    echo "========================================="
    echo "✅ 註冊成功！"
    echo "========================================="
    echo ""
    echo "📧 驗證郵件已發送到: $EMAIL"
    echo ""
    echo "🔑 登入資訊："
    echo "  Email: $EMAIL"
    echo "  Password: $PASSWORD"
    echo ""
    
    # 顯示資料庫狀態
    echo "💾 資料庫狀態："
    docker exec localauth-postgres psql -U postgres -d localauth -c "SELECT email, \"emailVerified\", \"createdAt\" FROM \"User\" WHERE email = '$EMAIL';"
    echo ""
    
    echo "📮 下一步："
    echo "  1. 檢查郵箱: $EMAIL"
    echo "  2. 點擊驗證連結"
    echo "  3. 完成 Email 驗證"
    echo ""
    
    # 測試登入
    read -p "是否測試登入？(y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔐 測試登入..."
        LOGIN=$(curl -s -X POST http://localhost:3000/auth/login \
          -H "Content-Type: application/json" \
          -d "{
            \"email\": \"$EMAIL\",
            \"password\": \"$PASSWORD\"
          }")
        
        echo "$LOGIN" | python3 -m json.tool
        
        if echo "$LOGIN" | grep -q "access_token"; then
            echo ""
            echo "✅ 登入成功！"
        fi
    fi
    
else
    echo "========================================="
    echo "❌ 註冊失敗"
    echo "========================================="
    echo ""
    echo "可能原因："
    echo "  - Email 已被註冊"
    echo "  - 資料格式錯誤"
    echo "  - 郵件服務問題（Resend 限制）"
    echo ""
fi

echo "========================================="
