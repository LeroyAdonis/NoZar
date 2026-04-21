CREATE TABLE "reputation" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"target_item_id" integer NOT NULL,
	"offered_item_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reputation" ADD CONSTRAINT "reputation_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation" ADD CONSTRAINT "reputation_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD CONSTRAINT "trade_proposals_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD CONSTRAINT "trade_proposals_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD CONSTRAINT "trade_proposals_target_item_id_listings_id_fk" FOREIGN KEY ("target_item_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_proposals" ADD CONSTRAINT "trade_proposals_offered_item_id_listings_id_fk" FOREIGN KEY ("offered_item_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;