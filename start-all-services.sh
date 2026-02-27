#!/bin/bash

# Mac 開發環境 - 同時啟動所有服務

echo "========================================="
echo "🚀 啟動所有服務"
echo "========================================="
echo ""

# 檢查 PostgreSQL
echo "1️⃣  檢查 PostgreSQL..."
if docker ps | grep -q localauth-postgres; then
  echo "✅ PostgreSQL 正在運行"
else
  echo "⚠️  PostgreSQL 未運行，正在啟動..."
  docker start localauth-postgres 2>/dev/null || \
  docker run -d \
    --name localauth-postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=localauth \
    -p 5433:5432 \
    postgres:15
  sleep 3
  echo "✅ PostgreSQL 已啟動"
fi
echo ""

# 啟動 LocalAuth
echo "2️⃣  啟動 LocalAuth (port 4000)..."
if lsof -ti:4000 > /dev/null 2>&1; then
  echo "⚠️  Port 4000 已被佔用"
  read -p "是否停止並重啟？(y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    lsof -ti:4000 | xargs kill -9 2>/dev/null
    sleep 2
  else
    echo "❌ 取消啟動"
    exit 1
  fi
fi

cd /Users/fweng/localauth
npm run start:dev > /tmp/localauth.log 2>&1 &
LOCALAUTH_PID=$!
echo "✅ LocalAuth 啟動中... (PID: $LOCALAUTH_PID)"
echo "   日誌: tail -f /tmp/localauth.log"
sleep 8

if lsof -ti:4000 > /dev/null 2>&1; then
  echo "✅ LocalAuth 運行正常"
else
  echo "❌ LocalAuth 啟動失敗，請查看日誌"
  cat /tmp/localauth.log
  exit 1
fi
echo ""

echo "========================================="
echo "✅ 服務啟動完成！"
echo "========================================="
echo ""
echo "📊 Port 分配："
echo "  ReadyQA 前端: http://localhost:3000  ← 你的 ReadyQA"
echo "  ReadyQA 後端: http://localhost:8000  ← 你的 ReadyQA API"
echo "  LocalAuth:   http://localhost:4000  ← 認證服務"
echo "  Admin UI:    http://localhost:4000/admin"
echo "  PostgreSQL:  localhost:5433"
echo ""
echo "🧪 測試 LocalAuth："
echo "  curl http://localhost:4000/users"
echo ""
echo "📝 ReadyQA 整合設定："
echo "  API URL: http://localhost:4000"
echo "  註冊: POST http://localhost:4000/auth/register"
echo "  登入: POST http://localhost:4000/auth/login"
echo ""
echo "📋 查看日誌："
echo "  LocalAuth: tail -f /tmp/localauth.log"
echo ""
echo "🛑 停止服務："
echo "  killall node"
echo "  docker stop localauth-postgres"
echo ""
echo "========================================="
