CREATE TYPE "public"."app_role" AS ENUM('admin', 'internal_staff', 'provider_user', 'client_user');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('active', 'inactive', 'ended');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'approve', 'deny', 'invite', 'submit', 'finalize', 'export', 'login');--> statement-breakpoint
CREATE TYPE "public"."doc_category" AS ENUM('general', 'pacr', 'credential', 'contract');--> statement-breakpoint
CREATE TYPE "public"."monthly_avail_status" AS ENUM('requested', 'submitted', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('client', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."pto_status" AS ENUM('submitted', 'approved', 'denied', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."schedule_finalization_status" AS ENUM('draft', 'finalized', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."time_off_change_type" AS ENUM('remove_day', 'add_day', 'swap', 'modify_shift');--> statement-breakpoint
CREATE TYPE "public"."time_off_status" AS ENUM('pending_review', 'approved', 'denied', 'cancelled');--> statement-breakpoint
CREATE TABLE "announcement_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text DEFAULT 'general' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"recruiter_id" uuid NOT NULL,
	"client_org_id" uuid NOT NULL,
	"specialty" text,
	"start_date" date,
	"end_date" date,
	"status" "assignment_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- auth.users is owned by Supabase Auth; do not CREATE here. FKs below reference auth.users(id).
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"original_filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"bucket" text DEFAULT 'secure-documents' NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"category" "doc_category" DEFAULT 'general' NOT NULL,
	"role_visibility" "app_role"[] NOT NULL,
	"owner_id" uuid NOT NULL,
	"uploader_id" uuid NOT NULL,
	"org_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"holiday_date" date NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'HR Support' NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_availability_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"month_year" date NOT NULL,
	"deadline" date NOT NULL,
	"status" "monthly_avail_status" DEFAULT 'requested' NOT NULL,
	"no_changes" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"submission_group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optum_pocs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_site_id" uuid,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "org_type" DEFAULT 'client' NOT NULL,
	"domain" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text,
	"full_name" text,
	"phone" text,
	"specialty" text,
	"state" text,
	"states_licensed" text,
	"employment_type" text,
	"schedule_type" text DEFAULT 'set' NOT NULL,
	"company" text DEFAULT 'Frontera' NOT NULL,
	"region" text,
	"facility_name" text,
	"facility_location" text,
	"primary_facility_id" uuid,
	"work_schedule" text,
	"provider_id" text,
	"recruiter_id" uuid,
	"recruiter_name" text,
	"recruiter_email" text,
	"recruiter_phone" text,
	"liaison_id" uuid,
	"liaison_name" text,
	"liaison_email" text,
	"liaison_phone" text,
	"portal_type" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE "provider_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"phone" text,
	"specialty" text,
	"state" text,
	"employment_type" text,
	"work_schedule" text,
	"region" text,
	"company" text,
	"provider_id_external" text,
	"recruiter_id" uuid,
	"liaison_id" uuid,
	"work_site_assignments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"invited_by" uuid,
	"created_user_id" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "provider_work_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"work_site_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"weekly_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pto_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"recruiter_id" uuid,
	"org_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"status" "pto_status" DEFAULT 'submitted' NOT NULL,
	"notes" text,
	"specialty" text,
	"states_licensed" text,
	"client_name" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "schedule_finalizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_site_id" uuid NOT NULL,
	"month_year" date NOT NULL,
	"status" "schedule_finalization_status" DEFAULT 'draft' NOT NULL,
	"finalized_by" uuid,
	"finalized_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_user_id" uuid,
	"template_name" text NOT NULL,
	"template_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"send_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"related_table" text,
	"related_id" text,
	"cancel_if_field" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"recruiter_id" uuid,
	"liaison_id" uuid,
	"work_site_id" uuid,
	"request_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_unavailable" boolean DEFAULT true NOT NULL,
	"change_type" time_off_change_type DEFAULT 'remove_day' NOT NULL,
	"status" time_off_status DEFAULT 'pending_review' NOT NULL,
	"client_name" text DEFAULT 'Optum' NOT NULL,
	"specialty" text,
	"notes" text,
	"submission_group_id" uuid,
	"pacr_document_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_name" text NOT NULL,
	"client_name" text DEFAULT 'Optum' NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"region" text,
	"latitude" numeric,
	"longitude" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_recipients" ADD CONSTRAINT "announcement_recipients_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_recipients" ADD CONSTRAINT "announcement_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_provider_id_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_recruiter_id_profiles_user_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_client_org_id_organizations_id_fk" FOREIGN KEY ("client_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_availability_requests" ADD CONSTRAINT "monthly_availability_requests_provider_id_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optum_pocs" ADD CONSTRAINT "optum_pocs_work_site_id_work_sites_id_fk" FOREIGN KEY ("work_site_id") REFERENCES "public"."work_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_primary_facility_id_work_sites_id_fk" FOREIGN KEY ("primary_facility_id") REFERENCES "public"."work_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_work_sites" ADD CONSTRAINT "provider_work_sites_provider_id_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_work_sites" ADD CONSTRAINT "provider_work_sites_work_site_id_work_sites_id_fk" FOREIGN KEY ("work_site_id") REFERENCES "public"."work_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pto_requests" ADD CONSTRAINT "pto_requests_provider_id_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_finalizations" ADD CONSTRAINT "schedule_finalizations_work_site_id_work_sites_id_fk" FOREIGN KEY ("work_site_id") REFERENCES "public"."work_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_finalizations" ADD CONSTRAINT "schedule_finalizations_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_provider_id_profiles_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_work_site_id_work_sites_id_fk" FOREIGN KEY ("work_site_id") REFERENCES "public"."work_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_pacr_document_id_documents_id_fk" FOREIGN KEY ("pacr_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_recipients_announcement_user_key" ON "announcement_recipients" USING btree ("announcement_id","user_id");--> statement-breakpoint
CREATE INDEX "assignments_recruiter_id_idx" ON "assignments" USING btree ("recruiter_id");--> statement-breakpoint
CREATE INDEX "assignments_provider_id_idx" ON "assignments" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "assignments_client_org_id_idx" ON "assignments" USING btree ("client_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_holiday_date_key" ON "holidays" USING btree ("holiday_date");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_availability_requests_provider_month_key" ON "monthly_availability_requests" USING btree ("provider_id","month_year");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_created_at_idx" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_memberships_user_id_org_id_key" ON "org_memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "profiles_recruiter_id_idx" ON "profiles" USING btree ("recruiter_id");--> statement-breakpoint
CREATE INDEX "profiles_liaison_id_idx" ON "profiles" USING btree ("liaison_id");--> statement-breakpoint
CREATE INDEX "profiles_primary_facility_id_idx" ON "profiles" USING btree ("primary_facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_work_sites_provider_work_site_key" ON "provider_work_sites" USING btree ("provider_id","work_site_id");--> statement-breakpoint
CREATE INDEX "provider_work_sites_provider_id_idx" ON "provider_work_sites" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_work_sites_work_site_id_idx" ON "provider_work_sites" USING btree ("work_site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_finalizations_work_site_month_key" ON "schedule_finalizations" USING btree ("work_site_id","month_year");--> statement-breakpoint
CREATE INDEX "scheduled_emails_status_send_at_idx" ON "scheduled_emails" USING btree ("status","send_at");--> statement-breakpoint
CREATE INDEX "time_off_requests_provider_id_request_date_idx" ON "time_off_requests" USING btree ("provider_id","request_date");--> statement-breakpoint
CREATE INDEX "time_off_requests_status_request_date_idx" ON "time_off_requests" USING btree ("status","request_date");--> statement-breakpoint
CREATE INDEX "time_off_requests_recruiter_id_idx" ON "time_off_requests" USING btree ("recruiter_id");--> statement-breakpoint
CREATE INDEX "time_off_requests_liaison_id_idx" ON "time_off_requests" USING btree ("liaison_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles" USING btree ("user_id","role");