CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT 'Bhubaneswar' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"branch_id" uuid,
	"org_role" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "need_responses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"need_id" uuid NOT NULL,
	"responder_type" text NOT NULL,
	"responder_id" uuid NOT NULL,
	"product_id" uuid,
	"message" text NOT NULL,
	"offered_price_paise" bigint,
	"status" text DEFAULT 'SENT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "needs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid,
	"title" text DEFAULT 'Customer Need' NOT NULL,
	"category_slug" text,
	"city" text DEFAULT 'Bhubaneswar' NOT NULL,
	"budget_max_paise" bigint,
	"notes" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"state" text DEFAULT 'CLAIMED' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text NOT NULL,
	"type" text DEFAULT 'BUSINESS' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"verification_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"amount_paise" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"method" text,
	"idempotency_key" text NOT NULL,
	"captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "pc_carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"items_json" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pc_inventory_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"available_qty" integer DEFAULT 0 NOT NULL,
	"reserved_qty" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pc_inventory_nonnegative" CHECK ("pc_inventory_items"."available_qty" >= 0 AND "pc_inventory_items"."reserved_qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pc_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"total_paise" bigint NOT NULL,
	"state" text DEFAULT 'PENDING' NOT NULL,
	"shipping_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pc_orders_total_positive" CHECK ("pc_orders"."total_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "pc_product_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"attributes_json" text DEFAULT '{}' NOT NULL,
	"price_paise" bigint NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pc_variants_price_positive" CHECK ("pc_product_variants"."price_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "pc_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"base_price_paise" bigint NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pc_products_price_positive" CHECK ("pc_products"."base_price_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"claim_id" uuid NOT NULL,
	"booking_ref" text,
	"status" text DEFAULT 'REDEEMED' NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"signature_valid" boolean NOT NULL,
	"payload_ref" text NOT NULL,
	"result" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "interests" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_secret_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_responses" ADD CONSTRAINT "need_responses_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need_responses" ADD CONSTRAINT "need_responses_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_customer_id_customer_profiles_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_customer_id_customer_profiles_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_carts" ADD CONSTRAINT "pc_carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_inventory_items" ADD CONSTRAINT "pc_inventory_items_variant_id_pc_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."pc_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_orders" ADD CONSTRAINT "pc_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_orders" ADD CONSTRAINT "pc_orders_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_product_variants" ADD CONSTRAINT "pc_product_variants_product_id_pc_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pc_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_products" ADD CONSTRAINT "pc_products_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pc_products" ADD CONSTRAINT "pc_products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_claim_id_offer_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."offer_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branches_organisation_idx" ON "branches" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_branch_unique" ON "memberships" USING btree ("user_id","organisation_id","branch_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "need_responses_need_idx" ON "need_responses" USING btree ("need_id","created_at");--> statement-breakpoint
CREATE INDEX "needs_customer_idx" ON "needs" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "needs_status_idx" ON "needs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_claims_customer_product_unique" ON "offer_claims" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "offer_claims_customer_state_idx" ON "offer_claims" USING btree ("customer_id","state");--> statement-breakpoint
CREATE INDEX "organisations_status_idx" ON "organisations" USING btree ("status","verification_status");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_idx" ON "otp_challenges" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_user_idx" ON "otp_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key_unique" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_unique" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "pc_carts_user_idx" ON "pc_carts" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "pc_inventory_items_variant_unique" ON "pc_inventory_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pc_orders_order_no_unique" ON "pc_orders" USING btree ("order_no");--> statement-breakpoint
CREATE INDEX "pc_orders_user_idx" ON "pc_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pc_product_variants_sku_unique" ON "pc_product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "pc_product_variants_product_idx" ON "pc_product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pc_products_slug_unique" ON "pc_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pc_products_business_idx" ON "pc_products" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redemptions_claim_unique" ON "redemptions" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "redemptions_redeemed_at_idx" ON "redemptions" USING btree ("redeemed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_unique" ON "webhook_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");