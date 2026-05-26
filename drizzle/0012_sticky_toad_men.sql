CREATE TABLE "device_fingerprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"trust_level" text DEFAULT 'unknown' NOT NULL,
	"registration_fingerprint" boolean DEFAULT false NOT NULL,
	CONSTRAINT "device_fp_user_hash_uq" UNIQUE("user_id","fingerprint_hash")
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_fp_hash_idx" ON "device_fingerprints" USING btree ("fingerprint_hash");--> statement-breakpoint
CREATE INDEX "device_fp_user_idx" ON "device_fingerprints" USING btree ("user_id");