-- 修正既有使用者：將已存在於 User 表的使用者標記為已驗證
-- 這些使用者可能是 (1) 舊流程直接註冊 或 (2) verifyEmail 的 bug 導致未設 emailVerified
-- 一律設為已驗證以恢復登入能力
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
