// ========================================
// ReadyQA 整合 LocalAuth 範例
// ========================================

// 假設這是 ReadyQA 的註冊函數
async function registerUser(email, password, name) {
  console.log('📤 ReadyQA 發送註冊請求...');
  console.log(`Email: ${email}`);
  
  // 1. 呼叫 LocalAuth API
  const response = await fetch('http://localhost:4000/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      password: password,
      name: name
    })
  });
  
  // 2. 收到回應（包含 token）
  const data = await response.json();
  
  console.log('\n📥 ReadyQA 收到回應：');
  console.log(JSON.stringify(data, null, 2));
  
  // 3. 從回應中直接拿到 token
  const accessToken = data.access_token;   // ← token 在這裡！
  const refreshToken = data.refresh_token; // ← token 在這裡！
  
  console.log('\n✅ ReadyQA 取得 Token：');
  console.log(`Access Token: ${accessToken.substring(0, 40)}...`);
  console.log(`Refresh Token: ${refreshToken.substring(0, 40)}...`);
  
  // 4. 儲存 token（ReadyQA 的工作）
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  
  console.log('\n✅ Token 已儲存！');
  console.log('✅ 使用者登入成功！');
  console.log('\n💡 重點：');
  console.log('  - Token 在 HTTP 回應中');
  console.log('  - ReadyQA 從回應中拿到');
  console.log('  - 不需要從 console 或郵件拿');
  
  return data;
}

// 測試
console.log('========================================');
console.log('模擬 ReadyQA 註冊用戶');
console.log('========================================\n');

registerUser('test01@test.com', 'password123', 'Test User');
