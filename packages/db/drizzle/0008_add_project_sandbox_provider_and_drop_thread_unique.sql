ALTER TABLE "agent_session" DROP CONSTRAINT "agent_session_thread_id_unique";--> statement-breakpoint
ALTER TABLE "agent_session" ALTER COLUMN "project_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "sandbox_provider" text;