CREATE TYPE "public"."message_role" AS ENUM('USER', 'ASSISTANT');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('RESULT', 'ERROR');--> statement-breakpoint
CREATE TABLE "fragment" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"sandbox_url" text NOT NULL,
	"title" text NOT NULL,
	"files" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fragment_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "llm_key" (
	"id" text PRIMARY KEY NOT NULL,
	"llm" text NOT NULL,
	"key" text NOT NULL,
	"model" text NOT NULL,
	"in_use" boolean DEFAULT false NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"role" "message_role" NOT NULL,
	"type" "message_type" NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
