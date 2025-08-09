ALTER TABLE "llm_key" ADD COLUMN "provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "model" text DEFAULT 'claude-3-5-sonnet-latest' NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_key" DROP COLUMN "llm";--> statement-breakpoint
ALTER TABLE "llm_key" DROP COLUMN "key";--> statement-breakpoint
ALTER TABLE "llm_key" DROP COLUMN "in_use";