CREATE TYPE "public"."account_status" AS ENUM('EVALUATION', 'FUNDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."market_status" AS ENUM('ACTIVE', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."position_type" AS ENUM('YES', 'NO');--> statement-breakpoint
CREATE TYPE "public"."resolved_outcome" AS ENUM('YES', 'NO');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('TRADER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"starting_balance" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) NOT NULL,
	"peak_balance" numeric(12, 2) NOT NULL,
	"profit_target" numeric(12, 2) NOT NULL,
	"max_drawdown" numeric(12, 2) NOT NULL,
	"current_drawdown" numeric(12, 2) DEFAULT '0' NOT NULL,
	"account_status" "account_status" DEFAULT 'EVALUATION' NOT NULL,
	"min_trades_required" integer NOT NULL,
	"trades_taken" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"current_price" numeric(10, 4) NOT NULL,
	"expiration_date" timestamp NOT NULL,
	"market_status" "market_status" DEFAULT 'ACTIVE' NOT NULL,
	"resolved_outcome" "resolved_outcome",
	"created_by_admin" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_stats" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_profit" numeric(12, 2),
	"win_rate" numeric(5, 4),
	"total_trades" integer DEFAULT 0 NOT NULL,
	"max_drawdown" numeric(12, 2),
	"leaderboard_rank" integer
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"position_type" "position_type" NOT NULL,
	"entry_price" numeric(10, 4) NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"status" "trade_status" DEFAULT 'OPEN' NOT NULL,
	"realized_pnl" numeric(12, 2),
	"created_at" timestamp DEFAULT now(),
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'TRADER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_created_by_admin_users_id_fk" FOREIGN KEY ("created_by_admin") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_stats" ADD CONSTRAINT "performance_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;