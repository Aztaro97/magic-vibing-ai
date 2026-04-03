CREATE TYPE "public"."sandbox_lifecycle_event" AS ENUM('sandbox.lifecycle.created', 'sandbox.lifecycle.killed', 'sandbox.lifecycle.updated', 'sandbox.lifecycle.paused', 'sandbox.lifecycle.resumed', 'sandbox.lifecycle.checkpointed');--> statement-breakpoint
CREATE TABLE "sandbox_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"e2b_event_id" text NOT NULL,
	"sandbox_id" text NOT NULL,
	"sandbox_execution_id" text,
	"sandbox_template_id" text,
	"sandbox_build_id" text,
	"sandbox_team_id" text,
	"type" "sandbox_lifecycle_event" NOT NULL,
	"sandbox_metadata" jsonb,
	"execution_started_at" timestamp,
	"execution_vcpu_count" integer,
	"execution_memory_mb" integer,
	"execution_time_ms" integer,
	"event_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sandbox_event_e2b_event_id_unique" UNIQUE("e2b_event_id")
);
--> statement-breakpoint
CREATE INDEX "sandbox_event_sandbox_id_idx" ON "sandbox_event" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "sandbox_event_type_idx" ON "sandbox_event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sandbox_event_timestamp_idx" ON "sandbox_event" USING btree ("event_timestamp");