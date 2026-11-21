CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `brand_wallet_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`balance_after_paise` integer NOT NULL,
	`reference` text,
	`description` text NOT NULL,
	`created_by_user_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `brand_wallet_tx_business_idx` ON `brand_wallet_transactions` (`business_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`brand_name` text NOT NULL,
	`slug` text NOT NULL,
	`category_id` text,
	`description` text NOT NULL,
	`website_url` text,
	`city` text DEFAULT 'Bhubaneswar' NOT NULL,
	`gstin` text,
	`logo_url` text,
	`wallet_balance_paise` integer DEFAULT 0 NOT NULL,
	`total_deposited_paise` integer DEFAULT 0 NOT NULL,
	`total_spent_paise` integer DEFAULT 0 NOT NULL,
	`webhook_key` text NOT NULL,
	`webhook_secret` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "business_wallet_nonnegative" CHECK("business_profiles"."wallet_balance_paise" >= 0 AND "business_profiles"."total_deposited_paise" >= 0 AND "business_profiles"."total_spent_paise" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_profiles_user_unique` ON `business_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `business_profiles_slug_unique` ON `business_profiles` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `business_profiles_webhook_key_unique` ON `business_profiles` (`webhook_key`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_tokens_hash_unique` ON `email_verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_user_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`influencer_id` text NOT NULL,
	`pitch_note` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`promo_code` text,
	`rejection_reason` text,
	`clicks_count` integer DEFAULT 0 NOT NULL,
	`total_sales_count` integer DEFAULT 0 NOT NULL,
	`total_units_sold` integer DEFAULT 0 NOT NULL,
	`total_gross_sales_paise` integer DEFAULT 0 NOT NULL,
	`total_commission_paise` integer DEFAULT 0 NOT NULL,
	`applied_at` text NOT NULL,
	`decided_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`influencer_id`) REFERENCES `influencer_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_product_influencer_unique` ON `enrollments` (`product_id`,`influencer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_promo_code_unique` ON `enrollments` (`promo_code`);--> statement-breakpoint
CREATE INDEX `enrollments_influencer_idx` ON `enrollments` (`influencer_id`);--> statement-breakpoint
CREATE INDEX `enrollments_product_status_idx` ON `enrollments` (`product_id`,`status`);--> statement-breakpoint
CREATE TABLE `influencer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text NOT NULL,
	`niche` text DEFAULT 'Lifestyle & Creator' NOT NULL,
	`instagram_url` text,
	`youtube_url` text,
	`follower_count` integer DEFAULT 0 NOT NULL,
	`upi_id` text,
	`bank_account_number` text,
	`bank_ifsc` text,
	`pan_number` text,
	`bank_details_note` text,
	`total_earned_paise` integer DEFAULT 0 NOT NULL,
	`pending_clearance_paise` integer DEFAULT 0 NOT NULL,
	`available_balance_paise` integer DEFAULT 0 NOT NULL,
	`pending_payout_paise` integer DEFAULT 0 NOT NULL,
	`total_paid_paise` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "influencer_wallet_nonnegative" CHECK("influencer_profiles"."available_balance_paise" >= 0 AND "influencer_profiles"."pending_clearance_paise" >= 0 AND "influencer_profiles"."pending_payout_paise" >= 0 AND "influencer_profiles"."total_earned_paise" >= 0 AND "influencer_profiles"."total_paid_paise" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `influencer_profiles_user_unique` ON `influencer_profiles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `influencer_profiles_handle_unique` ON `influencer_profiles` (`handle`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`alt_text` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_assets_key_unique` ON `media_assets` (`storage_key`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text DEFAULT '/' NOT NULL,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `payout_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`influencer_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`payout_method_snapshot` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payment_reference` text,
	`note` text,
	`processed_by_user_id` text,
	`requested_at` text NOT NULL,
	`processed_at` text,
	FOREIGN KEY (`influencer_id`) REFERENCES `influencer_profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`processed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "payout_requests_positive" CHECK("payout_requests"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE INDEX `payout_requests_influencer_idx` ON `payout_requests` (`influencer_id`,`requested_at`);--> statement-breakpoint
CREATE INDEX `payout_requests_status_idx` ON `payout_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`image_url` text,
	`image_alt` text,
	`external_product_url` text,
	`retail_price_paise` integer NOT NULL,
	`commission_type` text NOT NULL,
	`commission_fixed_paise` integer,
	`commission_percent` integer,
	`buyer_discount_percent` integer DEFAULT 0 NOT NULL,
	`promo_code_prefix` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "products_price_positive" CHECK("products"."retail_price_paise" > 0),
	CONSTRAINT "products_buyer_discount_range" CHECK("products"."buyer_discount_percent" >= 0 AND "products"."buyer_discount_percent" <= 80),
	CONSTRAINT "products_commission_valid" CHECK(("products"."commission_type" = 'FIXED_PER_SALE' AND "products"."commission_fixed_paise" IS NOT NULL AND "products"."commission_fixed_paise" > 0) OR ("products"."commission_type" = 'PERCENTAGE' AND "products"."commission_percent" IS NOT NULL AND "products"."commission_percent" >= 1 AND "products"."commission_percent" <= 90))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_business_idx` ON `products` (`business_id`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE TABLE `promo_clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`product_id` text NOT NULL,
	`influencer_id` text NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	`referer` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`influencer_id`) REFERENCES `influencer_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `promo_clicks_enrollment_idx` ON `promo_clicks` (`enrollment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `promo_clicks_influencer_idx` ON `promo_clicks` (`influencer_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `promo_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`product_id` text NOT NULL,
	`business_id` text NOT NULL,
	`influencer_id` text NOT NULL,
	`promo_code_snapshot` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`gross_amount_paise` integer NOT NULL,
	`commission_amount_paise` integer NOT NULL,
	`platform_fee_paise` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'CONFIRMED' NOT NULL,
	`clears_at` text,
	`refund_reason` text,
	`refunded_at` text,
	`source` text DEFAULT 'MANUAL' NOT NULL,
	`order_reference` text,
	`customer_note` text,
	`logged_by_user_id` text NOT NULL,
	`sold_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`business_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`influencer_id`) REFERENCES `influencer_profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`logged_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "promo_sales_positive" CHECK("promo_sales"."quantity" >= 1 AND "promo_sales"."gross_amount_paise" > 0 AND "promo_sales"."commission_amount_paise" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promo_sales_business_order_ref_unique` ON `promo_sales` (`business_id`,`order_reference`);--> statement-breakpoint
CREATE INDEX `promo_sales_business_idx` ON `promo_sales` (`business_id`,`sold_at`);--> statement-breakpoint
CREATE INDEX `promo_sales_influencer_idx` ON `promo_sales` (`influencer_id`,`sold_at`);--> statement-breakpoint
CREATE INDEX `promo_sales_enrollment_idx` ON `promo_sales` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `promo_sales_status_clears_idx` ON `promo_sales` (`status`,`clears_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_hits` (
	`id` text PRIMARY KEY NOT NULL,
	`namespace` text NOT NULL,
	`key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_hits_lookup_idx` ON `rate_limit_hits` (`namespace`,`key`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`avatar_url` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`email_verified_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);