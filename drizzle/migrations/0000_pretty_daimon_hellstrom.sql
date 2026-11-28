CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text,
	"metadata" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_wallet_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"balance_after_paise" bigint NOT NULL,
	"reference" text,
	"description" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid,
	"description" text NOT NULL,
	"website_url" text,
	"city" text DEFAULT 'Bhubaneswar' NOT NULL,
	"gstin" text,
	"logo_url" text,
	"wallet_balance_paise" bigint DEFAULT 0 NOT NULL,
	"total_deposited_paise" bigint DEFAULT 0 NOT NULL,
	"total_spent_paise" bigint DEFAULT 0 NOT NULL,
	"webhook_key" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_wallet_nonnegative" CHECK ("business_profiles"."wallet_balance_paise" >= 0 AND "business_profiles"."total_deposited_paise" >= 0 AND "business_profiles"."total_spent_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"city" text DEFAULT 'Bhubaneswar' NOT NULL,
	"preferences" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"influencer_id" uuid NOT NULL,
	"pitch_note" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"promo_code" text,
	"rejection_reason" text,
	"clicks_count" integer DEFAULT 0 NOT NULL,
	"total_sales_count" integer DEFAULT 0 NOT NULL,
	"total_units_sold" integer DEFAULT 0 NOT NULL,
	"total_gross_sales_paise" bigint DEFAULT 0 NOT NULL,
	"total_commission_paise" bigint DEFAULT 0 NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "influencer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text NOT NULL,
	"niche" text DEFAULT 'Lifestyle & Creator' NOT NULL,
	"instagram_url" text,
	"youtube_url" text,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"upi_id" text,
	"bank_account_number" text,
	"bank_ifsc" text,
	"pan_number" text,
	"bank_details_note" text,
	"total_earned_paise" bigint DEFAULT 0 NOT NULL,
	"pending_clearance_paise" bigint DEFAULT 0 NOT NULL,
	"available_balance_paise" bigint DEFAULT 0 NOT NULL,
	"pending_payout_paise" bigint DEFAULT 0 NOT NULL,
	"total_paid_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "influencer_wallet_nonnegative" CHECK ("influencer_profiles"."available_balance_paise" >= 0 AND "influencer_profiles"."pending_clearance_paise" >= 0 AND "influencer_profiles"."pending_payout_paise" >= 0 AND "influencer_profiles"."total_earned_paise" >= 0 AND "influencer_profiles"."total_paid_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text DEFAULT '/' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"influencer_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"payout_method_snapshot" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payment_reference" text,
	"note" text,
	"processed_by_user_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "payout_requests_positive" CHECK ("payout_requests"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"image_alt" text,
	"external_product_url" text,
	"retail_price_paise" bigint NOT NULL,
	"commission_type" text NOT NULL,
	"commission_fixed_paise" bigint,
	"commission_percent" integer,
	"buyer_discount_percent" integer DEFAULT 0 NOT NULL,
	"promo_code_prefix" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("products"."retail_price_paise" > 0),
	CONSTRAINT "products_buyer_discount_range" CHECK ("products"."buyer_discount_percent" >= 0 AND "products"."buyer_discount_percent" <= 80),
	CONSTRAINT "products_commission_valid" CHECK (("products"."commission_type" = 'FIXED_PER_SALE' AND "products"."commission_fixed_paise" IS NOT NULL AND "products"."commission_fixed_paise" > 0) OR ("products"."commission_type" = 'PERCENTAGE' AND "products"."commission_percent" IS NOT NULL AND "products"."commission_percent" >= 1 AND "products"."commission_percent" <= 90))
);
--> statement-breakpoint
CREATE TABLE "promo_clicks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"influencer_id" uuid NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"referer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"influencer_id" uuid NOT NULL,
	"promo_code_snapshot" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"gross_amount_paise" bigint NOT NULL,
	"commission_amount_paise" bigint NOT NULL,
	"platform_fee_paise" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"clears_at" timestamp with time zone,
	"refund_reason" text,
	"refunded_at" timestamp with time zone,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"order_reference" text,
	"customer_note" text,
	"logged_by_user_id" uuid NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_sales_positive" CHECK ("promo_sales"."quantity" >= 1 AND "promo_sales"."gross_amount_paise" > 0 AND "promo_sales"."commission_amount_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"avatar_url" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_wallet_transactions" ADD CONSTRAINT "brand_wallet_transactions_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_wallet_transactions" ADD CONSTRAINT "brand_wallet_transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_influencer_id_influencer_profiles_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influencer_profiles" ADD CONSTRAINT "influencer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_influencer_id_influencer_profiles_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_clicks" ADD CONSTRAINT "promo_clicks_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_clicks" ADD CONSTRAINT "promo_clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_clicks" ADD CONSTRAINT "promo_clicks_influencer_id_influencer_profiles_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sales" ADD CONSTRAINT "promo_sales_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sales" ADD CONSTRAINT "promo_sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sales" ADD CONSTRAINT "promo_sales_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sales" ADD CONSTRAINT "promo_sales_influencer_id_influencer_profiles_id_fk" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_sales" ADD CONSTRAINT "promo_sales_logged_by_user_id_users_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brand_wallet_tx_business_idx" ON "brand_wallet_transactions" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_user_unique" ON "business_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_slug_unique" ON "business_profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_webhook_key_unique" ON "business_profiles" USING btree ("webhook_key");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_profiles_user_unique" ON "customer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_tokens_hash_unique" ON "email_verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "email_verification_tokens_user_idx" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_product_influencer_unique" ON "enrollments" USING btree ("product_id","influencer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_promo_code_unique" ON "enrollments" USING btree ("promo_code");--> statement-breakpoint
CREATE INDEX "enrollments_influencer_idx" ON "enrollments" USING btree ("influencer_id");--> statement-breakpoint
CREATE INDEX "enrollments_product_status_idx" ON "enrollments" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "influencer_profiles_user_unique" ON "influencer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "influencer_profiles_handle_unique" ON "influencer_profiles" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_key_unique" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "payout_requests_influencer_idx" ON "payout_requests" USING btree ("influencer_id","requested_at");--> statement-breakpoint
CREATE INDEX "payout_requests_status_idx" ON "payout_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_business_idx" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "promo_clicks_enrollment_idx" ON "promo_clicks" USING btree ("enrollment_id","created_at");--> statement-breakpoint
CREATE INDEX "promo_clicks_influencer_idx" ON "promo_clicks" USING btree ("influencer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_sales_business_order_ref_unique" ON "promo_sales" USING btree ("business_id","order_reference");--> statement-breakpoint
CREATE INDEX "promo_sales_business_idx" ON "promo_sales" USING btree ("business_id","sold_at");--> statement-breakpoint
CREATE INDEX "promo_sales_influencer_idx" ON "promo_sales" USING btree ("influencer_id","sold_at");--> statement-breakpoint
CREATE INDEX "promo_sales_enrollment_idx" ON "promo_sales" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "promo_sales_status_clears_idx" ON "promo_sales" USING btree ("status","clears_at");--> statement-breakpoint
CREATE INDEX "rate_limit_hits_lookup_idx" ON "rate_limit_hits" USING btree ("namespace","key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");