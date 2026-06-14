CREATE TYPE "public"."curation_candidate_status" AS ENUM('discovered', 'enriching', 'needs_review', 'rejected', 'imported');--> statement-breakpoint
CREATE TYPE "public"."curation_run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."curation_source_kind" AS ENUM('search', 'api', 'feed', 'browser');--> statement-breakpoint
CREATE TABLE "curation_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"source_id" text NOT NULL,
	"run_id" uuid,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enriched" jsonb,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"status" "curation_candidate_status" DEFAULT 'discovered' NOT NULL,
	"reject_reason" text,
	"destination_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curation_candidates_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "curation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_by_user_id" uuid,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "curation_run_status" DEFAULT 'pending' NOT NULL,
	"discovered" integer DEFAULT 0 NOT NULL,
	"enriched" integer DEFAULT 0 NOT NULL,
	"accepted" integer DEFAULT 0 NOT NULL,
	"rejected" integer DEFAULT 0 NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "curation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"kind" "curation_source_kind" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rate_limit" jsonb,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curation_sources_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
ALTER TABLE "curation_candidates" ADD CONSTRAINT "curation_candidates_run_id_curation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."curation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curation_candidates" ADD CONSTRAINT "curation_candidates_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curation_runs" ADD CONSTRAINT "curation_runs_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "curation_candidates_status_idx" ON "curation_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "curation_candidates_domain_idx" ON "curation_candidates" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "curation_candidates_source_idx" ON "curation_candidates" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "curation_candidates_run_idx" ON "curation_candidates" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "curation_candidates_quality_idx" ON "curation_candidates" USING btree ("quality_score");