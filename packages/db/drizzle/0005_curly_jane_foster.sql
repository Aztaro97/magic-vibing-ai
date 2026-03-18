CREATE TYPE "public"."sandbox_provider" AS ENUM('e2b', 'daytona');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('running', 'paused', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."agent_event_type" AS ENUM('thinking', 'token', 'tool_start', 'tool_end', 'todo_update', 'subagent_start', 'subagent_end', 'hitl_pause', 'hitl_resume', 'done', 'error');--> statement-breakpoint
CREATE TABLE "agent_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "agent_event_type" NOT NULL,
	"data" jsonb NOT NULL,
	"seq" integer NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"sandbox_id" text,
	"sandbox_provider" "sandbox_provider",
	"status" "session_status" DEFAULT 'running' NOT NULL,
	"initial_prompt" text NOT NULL,
	"summary" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_session_thread_id_unique" UNIQUE("thread_id")
);
--> statement-breakpoint
CREATE TABLE "agent_todo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"text" text NOT NULL,
	"done" text DEFAULT 'false' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_event" ADD CONSTRAINT "agent_event_session_id_agent_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_todo" ADD CONSTRAINT "agent_todo_session_id_agent_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_event_session_idx" ON "agent_event" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "agent_event_seq_idx" ON "agent_event" USING btree ("session_id","seq");--> statement-breakpoint
CREATE INDEX "agent_session_project_idx" ON "agent_session" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "agent_session_user_idx" ON "agent_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_session_status_idx" ON "agent_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_session_thread_idx" ON "agent_session" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "agent_todo_session_idx" ON "agent_todo" USING btree ("session_id");