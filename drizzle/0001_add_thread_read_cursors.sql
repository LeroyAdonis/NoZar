CREATE TABLE "thread_read_cursors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"trade_id" integer NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "thread_read_cursors_user_id_trade_id_unique" UNIQUE("user_id","trade_id")
);
--> statement-breakpoint
ALTER TABLE "thread_read_cursors" ADD CONSTRAINT "thread_read_cursors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_read_cursors" ADD CONSTRAINT "thread_read_cursors_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;
