INSERT INTO "plans" ("id", "audience", "code", "name", "price_paise", "period_days", "limits", "active", "created_at")
VALUES 
  ('merchant_starter', 'merchant', 'starter', 'Starter', 29900, 30, '{"jobs_per_month": 100, "customers_per_month": 50, "devices": 1, "staff_logins": 1}'::jsonb, true, NOW()),
  ('merchant_growth', 'merchant', 'growth', 'Growth', 59900, 30, '{"jobs_per_month": 500, "customers_per_month": 250, "devices": 2, "staff_logins": 2, "priority_list": true}'::jsonb, true, NOW()),
  ('merchant_pro', 'merchant', 'pro', 'Pro', 99900, 30, '{"jobs_per_month": 1500, "customers_per_month": null, "devices": 5, "staff_logins": 5, "analytics": true}'::jsonb, true, NOW()),
  ('customer_free', 'customer', 'free', 'Free', 0, 3650, '{"uploads_per_month": 10, "vault_mb": 100}'::jsonb, true, NOW()),
  ('customer_plus', 'customer', 'plus', 'Plus', 4900, 30, '{"uploads_per_month": 100, "vault_mb": 2048}'::jsonb, true, NOW())
ON CONFLICT ("id") DO NOTHING;
